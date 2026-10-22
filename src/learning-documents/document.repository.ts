import { Injectable } from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DOCUMENT_LEASE_MS } from './document.contract';

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
      chapter: { is_deleted: false },
      topic: { is_deleted: false, ...(ownerId ? { created_by: ownerId } : {}) },
    };
  }

  /** Verify chapter membership and current target ownership. */
  target(ownerId: string, topicId: string, chapterId: string) {
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

  /** Atomically create the first immutable version of a document. */
  create(input: {
    id: string;
    ownerId: string;
    title: string;
    topicId: string;
    chapterId: string;
    version: Prisma.LearningDocumentVersionUncheckedCreateWithoutDocumentInput;
  }) {
    return this.prisma.learningDocument.create({
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
  }

  /** Allocate replacement version numbers atomically; older sources are never overwritten. */
  addVersion(
    ownerId: string,
    id: string,
    data: Prisma.LearningDocumentVersionUncheckedCreateWithoutDocumentInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
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
    });
  }

  /** Return metadata only; object keys, leases and consent internals are private. */
  async list(ownerId: string, page: number, limit: number, topicId?: string) {
    const where = {
      ...this.scope(ownerId),
      ...(topicId ? { topic_id: topicId } : {}),
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
  parser_version: true,
} satisfies Prisma.LearningDocumentVersionSelect;
const documentSelect = {
  id: true,
  title: true,
  topic_id: true,
  chapter_id: true,
  created_at: true,
  versions: { orderBy: { version: 'desc' }, take: 50, select: versionSelect },
} satisfies Prisma.LearningDocumentSelect;
