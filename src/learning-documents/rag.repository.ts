import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentRepository } from './document.repository';
import { RagProfile, RAG_LEASE_MS, indexSelect } from './rag.contract';

/** Business index state; technical chunks remain exclusively in Python's rag schema. */
@Injectable()
export class RagRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentRepository,
  ) {}
  private scope(owner: string): Prisma.LearningDocumentIndexWhereInput {
    return {
      owner_id: owner,
      version: { document: this.documents.scope(owner) },
    };
  }
  /** Serialize initial index creation with document revocation. */
  async create(
    owner: string,
    document: string,
    version: string,
    profile: RagProfile,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.learningDocument.updateMany({
        where: { id: document, ...this.documents.scope(owner) },
        data: { is_deleted: false },
      });
      if (!locked.count) return null;
      const source = await tx.learningDocumentVersion.findFirst({
        where: { id: version, document_id: document, status: 'EXTRACTED' },
      });
      if (!source) return null;
      return tx.learningDocumentIndex.upsert({
        where: {
          version_id_profile_id: {
            version_id: version,
            profile_id: profile.profile_id,
          },
        },
        create: {
          version_id: version,
          owner_id: owner,
          profile_id: profile.profile_id,
          profile: profile.config,
        },
        update: {},
        select: indexSelect,
      });
    });
  }
  /** Resolve all requested sources together; callers reject an incomplete set. */
  versions(owner: string, ids: string[]) {
    return this.prisma.learningDocumentVersion.findMany({
      where: {
        id: { in: ids },
        status: 'EXTRACTED',
        document: this.documents.scope(owner),
      },
      include: {
        indexes: {
          where: { owner_id: owner, status: 'READY' },
          orderBy: { created_at: 'desc' },
        },
        document: true,
      },
    });
  }
  /** Resolve a pinned index only within its immutable source version. */
  forVersion(owner: string, id: string, version: string) {
    return this.prisma.learningDocumentIndex.findFirst({
      where: { id, version_id: version, ...this.scope(owner) },
      select: indexSelect,
    });
  }

  /** Explicit retry resumes checkpoints but does not reset Python's paid-call budget. */
  retry(owner: string, id: string) {
    return this.prisma.learningDocumentIndex.updateMany({
      where: { id, ...this.scope(owner), status: 'FAILED' },
      data: {
        status: 'QUEUED',
        failure_count: 0,
        error_code: null,
        next_dispatch_at: new Date(),
      },
    });
  }
  /** Read a safe summary without source keys or execution state. */
  detail(owner: string, id: string) {
    return this.prisma.learningDocumentIndex.findFirst({
      where: { id, ...this.scope(owner) },
      select: indexSelect,
    });
  }
  /** Fence duplicates, then retain private source metadata for one bounded work unit. */
  async claim(id: string, execution: string) {
    const candidate = await this.prisma.learningDocumentIndex.findUnique({
      where: { id },
      select: { owner_id: true },
    });
    if (!candidate) return null;
    const changed = await this.prisma.learningDocumentIndex.updateMany({
      where: {
        id,
        ...this.scope(candidate.owner_id),
        status: 'QUEUED',
        failure_count: { lt: 3 },
      },
      data: {
        status: 'INDEXING',
        step_count: { increment: 1 },
        execution_id: execution,
        lease_expires_at: new Date(Date.now() + RAG_LEASE_MS),
        error_code: null,
      },
    });
    if (!changed.count) return null;
    return this.prisma.learningDocumentIndex.findFirst({
      where: { id, execution_id: execution },
      include: { version: { include: { document: true } } },
    });
  }
  /** Recheck current ownership before sending source or initiating paid work. */
  active(id: string, execution: string, owner: string) {
    return this.prisma.learningDocumentIndex.findFirst({
      where: {
        id,
        ...this.scope(owner),
        status: 'INDEXING',
        execution_id: execution,
        lease_expires_at: { gt: new Date() },
      },
      select: { id: true },
    });
  }
  /** A stale worker cannot publish progress or overwrite revocation. */
  finish(
    id: string,
    execution: string,
    owner: string,
    data: Prisma.LearningDocumentIndexUpdateManyMutationInput,
  ) {
    return this.prisma.learningDocumentIndex.updateMany({
      where: {
        id,
        ...this.scope(owner),
        status: 'INDEXING',
        execution_id: execution,
        lease_expires_at: { gt: new Date() },
      },
      data: { ...data, execution_id: null, lease_expires_at: null },
    });
  }
  /** Recover expired leases and bound consecutive interrupted steps. */
  async recover() {
    const expired = {
      status: 'INDEXING' as const,
      lease_expires_at: { lt: new Date() },
    };
    await this.prisma.learningDocumentIndex.updateMany({
      where: { ...expired, failure_count: { gte: 2 } },
      data: {
        status: 'FAILED',
        error_code: 'RAG_RETRY_EXHAUSTED',
        execution_id: null,
        lease_expires_at: null,
        failure_count: { increment: 1 },
      },
    });
    await this.prisma.learningDocumentIndex.updateMany({
      where: { ...expired, failure_count: { lt: 2 } },
      data: {
        status: 'QUEUED',
        execution_id: null,
        lease_expires_at: null,
        failure_count: { increment: 1 },
        next_dispatch_at: new Date(),
      },
    });
  }
  /** Queued rows form the outbox; step number gives each checkpoint a new job id. */
  due() {
    return this.prisma.learningDocumentIndex.findMany({
      where: {
        status: 'QUEUED',
        next_dispatch_at: { lte: new Date() },
        version: { document: this.documents.scope() },
      },
      select: { id: true, step_count: true },
      orderBy: { next_dispatch_at: 'asc' },
      take: 25,
    });
  }
  /** Back off Redis dispatch without consuming provider attempts. */
  dispatched(id: string, step: number) {
    return this.prisma.learningDocumentIndex.updateMany({
      where: { id, status: 'QUEUED', step_count: step },
      data: {
        next_dispatch_at: new Date(Date.now() + 60_000),
        dispatch_count: { increment: 1 },
      },
    });
  }
  /** Revocations must dispatch even after the business document is inaccessible. */
  revoked() {
    return this.prisma.learningDocumentIndex.findMany({
      where: {
        status: 'REVOKED',
        remote_revoked: false,
        next_dispatch_at: { lte: new Date() },
      },
      include: { version: { include: { document: true } } },
      orderBy: { next_dispatch_at: 'asc' },
      take: 1,
    });
  }
  /** Defer only the failed tombstone so other revoked indexes remain eligible. */
  deferRevocation(id: string, failures: number) {
    return this.prisma.learningDocumentIndex.updateMany({
      where: { id, status: 'REVOKED', remote_revoked: false },
      data: {
        failure_count: { increment: 1 },
        next_dispatch_at: new Date(
          Date.now() + Math.min(300_000, 5000 * 2 ** Math.min(failures, 6)),
        ),
      },
    });
  }
  /** Record acknowledgement only after Python has persisted its tombstone. */
  acknowledged(id: string) {
    return this.prisma.learningDocumentIndex.updateMany({
      where: { id, status: 'REVOKED' },
      data: { remote_revoked: true },
    });
  }
}
