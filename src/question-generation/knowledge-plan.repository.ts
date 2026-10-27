import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentRepository } from '../learning-documents/document.repository';
import {
  PlanMatrix,
  normalizedChapterName,
  topologicalNodes,
} from './knowledge-plan.contract';
import type { QuestionConfig } from './question-generation.contract';

const publicSelect = {
  id: true,
  created_at: true,
  topic_id: true,
  source_version_id: true,
  status: true,
  revision: true,
  content_map: true,
  matrix: true,
  error_code: true,
  sourceVersion: { select: { file_name: true } },
} satisfies Prisma.KnowledgePlanSelect;

/** Durable source preparation and lecturer-reviewed plans; never creates bank chapters. */
@Injectable()
export class KnowledgePlanRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentRepository,
  ) {}

  /** Enforce current owner, lecturer, subject and document access on all plan operations. */
  scope(owner: string): Prisma.KnowledgePlanWhereInput {
    return {
      created_by: owner,
      creator: { role: 'LECTURER', status: 'ACTIVE' },
      topic: { created_by: owner, is_deleted: false },
      sourceVersion: { document: this.documents.scope(owner) },
    };
  }

  /** Owner/key replay returns the original plan, never another source's proposal. */
  async create(
    owner: string,
    input: {
      topic_id: string;
      version_id: string;
      question_configs: QuestionConfig[];
    },
    key: string,
    hash: string,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const old = await tx.knowledgePlan.findUnique({
          where: {
            created_by_idempotency_key: {
              created_by: owner,
              idempotency_key: key,
            },
          },
        });
        if (old) {
          if (old.request_hash !== hash)
            throw new ConflictException('Idempotency-Key already used');
          const owned = await tx.knowledgePlan.findFirst({
            where: { id: old.id, ...this.scope(owner) },
            select: publicSelect,
          });
          if (!owned) throw new NotFoundException('Plan unavailable');
          return owned;
        }
        const version = await tx.learningDocumentVersion.findFirst({
          where: {
            id: input.version_id,
            document: {
              ...this.documents.scope(owner),
              topic_id: input.topic_id,
            },
            status: { in: ['QUEUED', 'PROCESSING', 'EXTRACTED'] },
          },
          select: { id: true },
        });
        if (!version)
          throw new NotFoundException('Document source unavailable');
        return tx.knowledgePlan.create({
          data: {
            created_by: owner,
            topic_id: input.topic_id,
            source_version_id: version.id,
            question_configs: input.question_configs,
            idempotency_key: key,
            request_hash: hash,
          },
          select: publicSelect,
        });
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      const old = await this.prisma.knowledgePlan.findFirst({
        where: {
          created_by: owner,
          idempotency_key: key,
          ...this.scope(owner),
        },
        select: { ...publicSelect, request_hash: true },
      });
      if (!old || old.request_hash !== hash)
        throw new ConflictException('Idempotency-Key already used');
      const { request_hash, ...safe } = old;
      void request_hash;
      return safe;
    }
  }

  /** Read private source metadata only inside the worker/application boundary. */
  async owned(owner: string, id: string) {
    const value = await this.prisma.knowledgePlan.findFirst({
      where: { id, ...this.scope(owner) },
    });
    if (!value) throw new NotFoundException('Plan unavailable');
    return value;
  }

  /** Metadata and editable proposals are owner scoped, with bounded pagination. */
  async list(owner: string, page: number, limit: number) {
    const where = this.scope(owner);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.knowledgePlan.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          topic_id: true,
          source_version_id: true,
          created_at: true,
          status: true,
          revision: true,
          error_code: true,
          sourceVersion: { select: { file_name: true } },
        },
      }),
      this.prisma.knowledgePlan.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  /** Return only display/proposal fields; no object keys, internal leases or embeddings. */
  async get(owner: string, id: string) {
    const value = await this.prisma.knowledgePlan.findFirst({
      where: { id, ...this.scope(owner) },
      select: publicSelect,
    });
    if (!value) throw new NotFoundException('Plan unavailable');
    return value;
  }

  /** Claim/recover pure preparation work; no paid question generation occurs here. */
  async due() {
    await this.prisma.knowledgePlan.updateMany({
      where: { status: 'PREPARING', lease_expires_at: { lt: new Date() } },
      data: {
        status: 'WAITING_SOURCE',
        execution_id: null,
        lease_expires_at: null,
      },
    });
    return this.prisma.knowledgePlan.findMany({
      where: {
        status: 'WAITING_SOURCE',
        creator: { role: 'LECTURER', status: 'ACTIVE' },
        topic: { is_deleted: false },
        sourceVersion: {
          document: {
            is_deleted: false,
            OR: [{ chapter_id: null }, { chapter: { is_deleted: false } }],
          },
        },
        next_prepare_at: { lte: new Date() },
      },
      select: { id: true, created_by: true },
      orderBy: { next_prepare_at: 'asc' },
      take: 5,
    });
  }

  /** A conditional claim fences late results from duplicate worker processes. */
  async claim(owner: string, id: string) {
    const token = randomUUID();
    const changed = await this.prisma.knowledgePlan.updateMany({
      where: { id, status: 'WAITING_SOURCE', ...this.scope(owner) },
      data: {
        status: 'PREPARING',
        execution_id: token,
        lease_expires_at: new Date(Date.now() + 90_000),
      },
    });
    if (!changed.count) {
      // Retire a waiting plan whose ownership changed so it cannot occupy the
      // oldest due slots indefinitely. Never overwrite another worker's claim.
      await this.prisma.knowledgePlan.updateMany({
        where: {
          id,
          created_by: owner,
          status: 'WAITING_SOURCE',
          NOT: this.scope(owner),
        },
        data: { status: 'FAILED', error_code: 'PLAN_SCOPE_REVOKED' },
      });
    }
    return changed.count ? token : null;
  }

  /** Store one source-pinned proposal or a bounded preparation checkpoint. */
  finish(
    id: string,
    token: string,
    owner: string,
    data: Prisma.KnowledgePlanUpdateManyMutationInput,
  ) {
    return this.prisma.knowledgePlan.updateMany({
      where: {
        id,
        execution_id: token,
        status: 'PREPARING',
        ...this.scope(owner),
      },
      data: {
        ...data,
        execution_id: null,
        lease_expires_at: null,
        next_prepare_at: new Date(Date.now() + 5000),
      },
    });
  }

  /** Revisions prevent one tab from approving another tab's edits. Approval writes no chapters. */
  async edit(
    owner: string,
    id: string,
    revision: number,
    matrix: PlanMatrix,
    approve = false,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.knowledgePlan.updateMany({
        where: {
          id,
          revision,
          status: {
            in: approve ? ['REVIEW_REQUIRED'] : ['REVIEW_REQUIRED', 'APPROVED'],
          },
          ...this.scope(owner),
        },
        data: {
          matrix,
          revision: { increment: 1 },
          status: approve ? 'APPROVED' : 'REVIEW_REQUIRED',
        },
      });
      if (!changed.count)
        throw new ConflictException('Plan changed or is not editable');
      return tx.knowledgePlan.findUniqueOrThrow({
        where: { id },
        select: publicSelect,
      });
    });
  }

  /** Describe conservative existing matches without creating/renaming any bank chapters. */
  async matches(owner: string, topicId: string, matrix: PlanMatrix) {
    const chapters = await this.prisma.chapter.findMany({
      where: {
        topic_id: topicId,
        is_deleted: false,
        topic: { created_by: owner, is_deleted: false },
      },
      select: { id: true, parent_id: true, name: true },
    });
    const mapped = new Map<string, string>();
    const result: Array<{
      node_id: string;
      chapter_id: string | null;
      ambiguous: boolean;
    }> = [];
    for (const node of topologicalNodes(matrix.nodes)) {
      const parent = node.parent_id ? mapped.get(node.parent_id) : null;
      const candidates =
        node.parent_id && !parent
          ? []
          : chapters.filter(
              (chapter) =>
                chapter.parent_id === parent &&
                normalizedChapterName(chapter.name) ===
                  normalizedChapterName(node.name),
            );
      if (candidates.length === 1) mapped.set(node.id, candidates[0].id);
      result.push({
        node_id: node.id,
        chapter_id: candidates.length === 1 ? candidates[0].id : null,
        ambiguous: candidates.length > 1,
      });
    }
    return result;
  }
}
