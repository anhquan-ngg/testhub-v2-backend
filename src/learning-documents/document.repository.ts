import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DOCUMENT_LEASE_MS, documentQuota } from './document.contract';

/** Business ownership and fenced processing state. No source text is stored here. */
@Injectable()
export class DocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** All reads and writes require an active owner and active target hierarchy. */
  scope(ownerId?: string): Prisma.LearningDocumentWhereInput {
    return {
      ...(ownerId ? { created_by: ownerId } : {}),
      is_deleted: false,
      creator: { role: UserRole.LECTURER, status: UserStatus.ACTIVE },
      OR: [{ chapter_id: null }, { chapter: { is_deleted: false } }],
      topic: { is_deleted: false, ...(ownerId ? { created_by: ownerId } : {}) },
    };
  }

  /** Verify chapter membership and current target ownership. */
  target(ownerId: string, topicId: string, chapterId: string | null) {
    if (!chapterId)
      return this.prisma.topic.findFirst({
        where: {
          id: topicId,
          created_by: ownerId,
          is_deleted: false,
          creator: { role: UserRole.LECTURER, status: UserStatus.ACTIVE },
        },
        select: { id: true },
      });
    return this.prisma.chapter.findFirst({
      where: {
        id: chapterId,
        topic_id: topicId,
        is_deleted: false,
        topic: {
          created_by: ownerId,
          is_deleted: false,
          creator: { role: UserRole.LECTURER, status: UserStatus.ACTIVE },
        },
      },
      select: { id: true },
    });
  }

  /** Reserve owner quota and create the first immutable version atomically. */
  create(input: {
    id: string;
    ownerId: string;
    title: string;
    topicId: string;
    chapterId: string | null;
    version: Prisma.LearningDocumentVersionUncheckedCreateWithoutDocumentInput;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.reserveQuota(tx, {
          ownerId: input.ownerId,
          size: input.version.declared_size,
          newDocument: true,
        });
        return tx.learningDocument.create({
          data: {
            id: input.id,
            created_by: input.ownerId,
            title: input.title,
            topic_id: input.topicId,
            chapter_id: input.chapterId,
            versions: { create: input.version },
          },
          select: { id: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  /** Reserve owner quota and allocate replacement version numbers atomically. */
  addVersion(
    ownerId: string,
    id: string,
    data: Prisma.LearningDocumentVersionUncheckedCreateWithoutDocumentInput,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.reserveQuota(tx, {
          ownerId,
          size: data.declared_size,
          newDocument: false,
        });
        const updated = await tx.learningDocument.updateMany({
          where: { id, ...this.scope(ownerId) },
          data: { next_version: { increment: 1 } },
        });
        if (!updated.count) return null;
        const document = await tx.learningDocument.findUniqueOrThrow({
          where: { id },
          select: { next_version: true },
        });
        return tx.learningDocumentVersion.create({
          data: {
            ...data,
            document_id: id,
            version: document.next_version - 1,
          },
          select: { id: true },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  /** Return metadata only; object keys, leases and consent internals are private. */
  async list(
    ownerId: string,
    page: number,
    limit: number,
    topicId?: string,
    filter: { q?: string; archived?: 'true' | 'false' | 'all' } = {},
  ) {
    const archived = filter.archived ?? 'false';
    const where: Prisma.LearningDocumentWhereInput = {
      ...this.scope(ownerId),
      ...(topicId ? { topic_id: topicId } : {}),
      ...(filter.q
        ? { title: { contains: filter.q, mode: 'insensitive' } }
        : {}),
      ...(archived === 'false' ? { archived_at: null } : {}),
      ...(archived === 'true' ? { archived_at: { not: null } } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.learningDocument.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: documentSelect,
      }),
      this.prisma.learningDocument.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  /** Resolve one currently accessible document. */
  detail(ownerId: string, id: string) {
    return this.prisma.learningDocument.findFirst({
      where: { id, ...this.scope(ownerId) },
      select: documentSelect,
    });
  }

  /** Resolve a private version only after rechecking current ownership. */
  version(ownerId: string, documentId: string, id: string) {
    return this.prisma.learningDocumentVersion.findFirst({
      where: {
        id,
        document_id: documentId,
        document: this.scope(ownerId),
      },
    });
  }

  /** Resolve a source version by ID under current ownership; never accepts object keys. */
  source(ownerId: string, versionId: string) {
    return this.prisma.learningDocumentVersion.findFirst({
      where: { id: versionId, document: this.scope(ownerId) },
      include: { document: true },
    });
  }

  /** Record the lecturer's informed choice to use a PARTIAL extraction as-is. */
  confirmPartial(ownerId: string, documentId: string, id: string) {
    return this.prisma.learningDocumentVersion.updateMany({
      where: {
        id,
        document_id: documentId,
        status: 'PARTIAL',
        document: { ...this.scope(ownerId), purged_at: null },
      },
      data: { partial_confirmed_at: new Date() },
    });
  }

  /** Persist immutable source identity and a durable queue command in one write. */
  complete(ownerId: string, id: string, sourceKey: string, sha256: string) {
    return this.prisma.learningDocumentVersion.updateMany({
      where: {
        id,
        status: 'UPLOADING',
        upload_expires_at: { gt: new Date() },
        document: this.scope(ownerId),
      },
      data: {
        source_key: sourceKey,
        source_sha256: sha256,
        status: 'QUEUED',
        next_dispatch_at: new Date(),
      },
    });
  }

  /** Owner-scoped lookup of already-stored copies of identical bytes; never crosses owners. */
  duplicates(ownerId: string, sha256: string, sourceType: 'PDF' | 'PPTX') {
    return this.prisma.learningDocumentVersion.findMany({
      where: {
        source_sha256: sha256,
        source_type: sourceType,
        source_key: { not: null },
        status: { not: 'FAILED' },
        document: { ...this.scope(ownerId), purged_at: null },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: {
        id: true,
        version: true,
        file_name: true,
        status: true,
        include_notes: true,
        created_at: true,
        document: {
          select: {
            id: true,
            title: true,
            topic_id: true,
            chapter_id: true,
            archived_at: true,
          },
        },
      },
    });
  }

  /** Find a finished extraction of identical bytes and options that can be reused. */
  reusable(
    ownerId: string,
    sha256: string,
    sourceType: 'PDF' | 'PPTX',
    includeNotes: boolean,
    excludeVersionId: string,
  ) {
    return this.prisma.learningDocumentVersion.findFirst({
      where: {
        id: { not: excludeVersionId },
        source_sha256: sha256,
        source_type: sourceType,
        include_notes: includeNotes,
        status: { in: ['EXTRACTED', 'PARTIAL', 'OCR_REQUIRED'] },
        artifact_key: { not: null },
        artifact_sha256: { not: null },
        parser_version: { not: null },
        document: { ...this.scope(ownerId), purged_at: null },
      },
      orderBy: { created_at: 'desc' },
      select: {
        status: true,
        artifact_key: true,
        artifact_sha256: true,
        parser_version: true,
        unit_count: true,
        warnings: true,
        quality: true,
      },
    });
  }

  /** Freeze the source and publish a reused extraction in one fenced write. */
  completeReused(
    ownerId: string,
    id: string,
    data: {
      source_key: string;
      source_sha256: string;
      artifact_key: string;
      artifact_sha256: string;
      parser_version: string;
      unit_count: number | null;
      warnings: Prisma.InputJsonValue | null;
      quality: Prisma.InputJsonValue | null;
      status: 'EXTRACTED' | 'PARTIAL' | 'OCR_REQUIRED';
    },
  ) {
    const { warnings, quality, ...rest } = data;
    return this.prisma.learningDocumentVersion.updateMany({
      where: {
        id,
        status: 'UPLOADING',
        upload_expires_at: { gt: new Date() },
        document: this.scope(ownerId),
      },
      data: {
        ...rest,
        warnings: warnings ?? Prisma.JsonNull,
        quality: quality ?? Prisma.JsonNull,
        partial_confirmed_at: null,
        error_code: null,
      },
    });
  }

  /** Revoke access immediately; physical object retention is a separate policy. */
  revoke(ownerId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.learningDocument.updateMany({
        where: { id, ...this.scope(ownerId) },
        data: { is_deleted: true },
      });
      if (changed.count)
        await tx.learningDocumentIndex.updateMany({
          where: { version: { document_id: id } },
          data: {
            status: 'REVOKED',
            remote_revoked: false,
            execution_id: null,
            lease_expires_at: null,
          },
        });
      return changed;
    });
  }

  /** Rename only; versions and indexes are immutable and unaffected. */
  rename(ownerId: string, id: string, title: string) {
    return this.prisma.learningDocument.updateMany({
      where: { id, ...this.scope(ownerId) },
      data: { title },
    });
  }

  /** Reversible hide: blocks new plans and batches but keeps indexes and in-flight work. */
  archive(ownerId: string, id: string) {
    return this.prisma.learningDocument.updateMany({
      where: { id, archived_at: null, ...this.scope(ownerId) },
      data: { archived_at: new Date() },
    });
  }

  /** Restore an archived document to the default library view. */
  unarchive(ownerId: string, id: string) {
    return this.prisma.learningDocument.updateMany({
      where: { id, archived_at: { not: null }, ...this.scope(ownerId) },
      data: { archived_at: null },
    });
  }

  /** Paginate versions beyond the bounded list in the document summary. */
  async versions(ownerId: string, id: string, page: number, limit: number) {
    const where = { document_id: id, document: this.scope(ownerId) };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.learningDocumentVersion.findMany({
        where,
        orderBy: { version: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: versionSelect,
      }),
      this.prisma.learningDocumentVersion.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  /** Recent plans and batches that consumed any version of this document. */
  async history(ownerId: string, id: string, limit: number) {
    const sourceVersion = { document_id: id };
    const [plans, batches] = await this.prisma.$transaction([
      this.prisma.knowledgePlan.findMany({
        where: { created_by: ownerId, sourceVersion },
        orderBy: { created_at: 'desc' },
        take: limit,
        select: {
          id: true,
          status: true,
          revision: true,
          error_code: true,
          created_at: true,
          sourceVersion: { select: { id: true, version: true } },
        },
      }),
      this.prisma.questionGenerationBatch.findMany({
        where: { created_by: ownerId, sourceVersion },
        orderBy: { created_at: 'desc' },
        take: limit,
        select: {
          id: true,
          plan_id: true,
          status: true,
          requested_count: true,
          total_items: true,
          error_code: true,
          created_at: true,
          finished_at: true,
          sourceVersion: { select: { id: true, version: true } },
        },
      }),
    ]);
    return { plans, batches };
  }

  /** Storage and document usage; failed uploads without a stored source are free. */
  async quota(ownerId: string) {
    return this.prisma.$transaction((tx) => this.quotaUsage(tx, ownerId));
  }

  /** Lock the shared owner row before reading usage; hold it through commit/rollback. */
  private async reserveQuota(
    tx: Prisma.TransactionClient,
    {
      ownerId,
      size,
      newDocument,
    }: { ownerId: string; size: number; newDocument: boolean },
  ): Promise<void> {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${ownerId}::uuid FOR UPDATE`;
    const limits = documentQuota();
    const used = await this.quotaUsage(tx, ownerId);
    if (newDocument && used.documents + 1 > limits.maxDocuments)
      throw new ConflictException('Document library limit reached');
    if (used.bytes + size > limits.maxBytes)
      throw new ConflictException('Document storage quota exceeded');
  }

  /** Keep usage rules identical for reporting and transactional admission. */
  private async quotaUsage(tx: Prisma.TransactionClient, ownerId: string) {
    const document = { created_by: ownerId, is_deleted: false };
    const documents = await tx.learningDocument.count({ where: document });
    const bytes = await tx.learningDocumentVersion.aggregate({
      where: { document, NOT: { status: 'FAILED', source_key: null } },
      _sum: { declared_size: true },
    });
    return { documents, bytes: bytes._sum.declared_size ?? 0 };
  }

  /** Owner lookup for purge; unlike scope(), revoked documents remain reachable. */
  purgeTarget(ownerId: string, id: string) {
    return this.prisma.learningDocument.findFirst({
      where: { id, created_by: ownerId },
      select: {
        id: true,
        is_deleted: true,
        archived_at: true,
        purged_at: true,
        versions: {
          select: {
            id: true,
            upload_key: true,
            source_key: true,
            artifact_key: true,
          },
        },
      },
    });
  }

  /** Work that still needs the document; purge must wait for it to finish. */
  async activeWork(id: string) {
    const sourceVersion = { document_id: id };
    const [plans, batches] = await this.prisma.$transaction([
      this.prisma.knowledgePlan.count({
        where: {
          sourceVersion,
          status: { in: ['WAITING_SOURCE', 'PREPARING'] },
        },
      }),
      this.prisma.questionGenerationBatch.count({
        where: {
          sourceVersion,
          status: { in: ['QUEUED', 'GENERATING', 'WAITING_SOURCE'] },
        },
      }),
    ]);
    return plans + batches;
  }

  /** Irreversibly drop stored bytes after objects were removed; rows stay for audit. */
  purge(id: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.learningDocumentIndex.updateMany({
        where: { version: { document_id: id } },
        data: {
          status: 'REVOKED',
          remote_revoked: false,
          execution_id: null,
          lease_expires_at: null,
        },
      });
      await tx.learningDocumentVersion.updateMany({
        where: { document_id: id },
        data: {
          source_key: null,
          artifact_key: null,
          status: 'FAILED',
          error_code: 'DOCUMENT_PURGED',
          execution_id: null,
          lease_expires_at: null,
        },
      });
      return tx.learningDocument.updateMany({
        where: { id, purged_at: null },
        data: { is_deleted: true, purged_at: new Date() },
      });
    });
  }

  /** Uploads that never completed and are past the grace window. */
  abandonedUploads(cutoff: Date, take: number) {
    return this.prisma.learningDocumentVersion.findMany({
      where: { status: 'UPLOADING', upload_expires_at: { lt: cutoff } },
      select: { id: true, upload_key: true },
      orderBy: { upload_expires_at: 'asc' },
      take,
    });
  }

  /** Fenced on status so a concurrent complete() always wins. */
  markUploadExpired(id: string) {
    return this.prisma.learningDocumentVersion.updateMany({
      where: { id, status: 'UPLOADING' },
      data: { status: 'FAILED', error_code: 'UPLOAD_EXPIRED' },
    });
  }

  /** Recover interrupted pure extraction without repeating any paid provider call. */
  async recover() {
    const where = {
      status: 'PROCESSING' as const,
      lease_expires_at: { lt: new Date() },
    };
    await this.prisma.learningDocumentVersion.updateMany({
      where: { ...where, extraction_count: { gte: 3 } },
      data: {
        status: 'FAILED',
        error_code: 'DOCUMENT_RETRY_EXHAUSTED',
        execution_id: null,
        lease_expires_at: null,
      },
    });
    await this.prisma.learningDocumentVersion.updateMany({
      where: { ...where, extraction_count: { lt: 3 } },
      data: {
        status: 'QUEUED',
        execution_id: null,
        lease_expires_at: null,
        next_dispatch_at: new Date(),
      },
    });
  }

  /** Reconciliation treats queued rows as the transactional outbox. */
  due() {
    return this.prisma.learningDocumentVersion.findMany({
      where: {
        status: 'QUEUED',
        next_dispatch_at: { lte: new Date() },
        document: this.scope(),
      },
      select: { id: true, dispatch_count: true },
      take: 25,
      orderBy: { next_dispatch_at: 'asc' },
    });
  }

  /** Bound Redis publication retries independently from extraction attempts. */
  dispatched(id: string, delay: number) {
    return this.prisma.learningDocumentVersion.updateMany({
      where: { id, status: 'QUEUED' },
      data: {
        next_dispatch_at: new Date(Date.now() + delay),
        dispatch_count: { increment: 1 },
      },
    });
  }

  /** A unique execution token fences duplicate jobs and late parser responses. */
  async claim(id: string, executionId: string) {
    const candidate = await this.prisma.learningDocumentVersion.findUnique({
      where: { id },
      select: { document: { select: { created_by: true } } },
    });
    if (!candidate) return null;
    const changed = await this.prisma.learningDocumentVersion.updateMany({
      where: {
        id,
        status: 'QUEUED',
        extraction_count: { lt: 3 },
        document: this.scope(candidate.document.created_by),
      },
      data: {
        status: 'PROCESSING',
        execution_id: executionId,
        lease_expires_at: new Date(Date.now() + DOCUMENT_LEASE_MS),
        extraction_count: { increment: 1 },
        error_code: null,
      },
    });
    if (!changed.count) return null;
    return this.prisma.learningDocumentVersion.findFirst({
      where: { id, execution_id: executionId },
      include: { document: { select: { created_by: true } } },
    });
  }

  /** Recheck revocation immediately before publishing source content/results. */
  active(id: string, executionId: string, ownerId: string) {
    return this.prisma.learningDocumentVersion.findFirst({
      where: {
        id,
        status: 'PROCESSING',
        execution_id: executionId,
        lease_expires_at: { gt: new Date() },
        document: this.scope(ownerId),
      },
      select: { id: true },
    });
  }

  /** Only the current execution may finish, fail or return a unit to the queue. */
  finish(
    id: string,
    executionId: string,
    data: Prisma.LearningDocumentVersionUpdateManyMutationInput,
    ownerId: string,
  ) {
    return this.prisma.learningDocumentVersion.updateMany({
      where: {
        id,
        status: 'PROCESSING',
        execution_id: executionId,
        lease_expires_at: { gt: new Date() },
        document: this.scope(ownerId),
      },
      data: { ...data, execution_id: null, lease_expires_at: null },
    });
  }
}

import { indexSelect } from './rag.contract';

const versionSelect = {
  indexes: { orderBy: { created_at: 'desc' }, take: 10, select: indexSelect },
  id: true,
  version: true,
  created_at: true,
  file_name: true,
  source_type: true,
  declared_size: true,
  include_notes: true,
  status: true,
  error_code: true,
  unit_count: true,
  warnings: true,
  quality: true,
  partial_confirmed_at: true,
  parser_version: true,
} satisfies Prisma.LearningDocumentVersionSelect;
const documentSelect = {
  id: true,
  title: true,
  topic_id: true,
  chapter_id: true,
  created_at: true,
  archived_at: true,
  last_used_at: true,
  versions: { orderBy: { version: 'desc' }, take: 50, select: versionSelect },
} satisfies Prisma.LearningDocumentSelect;
