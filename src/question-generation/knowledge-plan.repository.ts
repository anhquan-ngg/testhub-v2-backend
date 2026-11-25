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
import { isUsableSource } from '../learning-documents/document.contract';
import {
  observePlanSource,
  planSourceTimeout,
  summarizePlanSource,
  PlanSourceState,
} from './knowledge-plan-progress';

const publicSelect = {
  id: true,
  created_at: true,
  topic_id: true,
  source_version_id: true,
  status: true,
  revision: true,
  question_configs: true,
  content_map: true,
  matrix: true,
  error_code: true,
  sourceVersion: { select: { file_name: true, document_id: true } },
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
        // The immutable source serializes equivalent creates across all API processes.
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${owner + ':' + input.topic_id + ':' + input.version_id}, 0))`;
        const old = await tx.knowledgePlanRequestKey.findUnique({
          where: { created_by_key: { created_by: owner, key } },
        });
        if (old) {
          if (old.request_hash !== hash)
            throw new ConflictException('Idempotency-Key already used');
          const owned = await tx.knowledgePlan.findFirst({
            where: { id: old.plan_id, ...this.scope(owner) },
            select: publicSelect,
          });
          if (!owned) throw new NotFoundException('Plan unavailable');
          return { ...owned, reused: true };
        }
        const version = await tx.learningDocumentVersion.findFirst({
          where: {
            id: input.version_id,
            document: {
              ...this.documents.scope(owner),
              topic_id: input.topic_id,
              archived_at: null,
            },
            OR: [
              { status: { in: ['QUEUED', 'PROCESSING', 'EXTRACTED'] } },
              { status: 'PARTIAL', partial_confirmed_at: { not: null } },
            ],
          },
          select: { id: true, document_id: true },
        });
        if (!version)
          throw new NotFoundException('Document source unavailable');
        const locked = await tx.learningDocument.updateMany({
          where: {
            id: version.document_id,
            ...this.documents.scope(owner),
            topic_id: input.topic_id,
            archived_at: null,
          },
          data: { last_used_at: new Date() },
        });
        if (!locked.count)
          throw new NotFoundException('Document source unavailable');
        const equivalent = await tx.knowledgePlan.findFirst({
          where: {
            ...this.scope(owner),
            topic_id: input.topic_id,
            source_version_id: version.id,
            status: { in: ['WAITING_SOURCE', 'PREPARING'] },
            question_configs: { equals: input.question_configs },
          },
          orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
          select: publicSelect,
        });
        const plan =
          equivalent ??
          (await tx.knowledgePlan.create({
            data: {
              created_by: owner,
              topic_id: input.topic_id,
              source_version_id: version.id,
              question_configs: input.question_configs,
              idempotency_key: key,
              request_hash: hash,
            },
            select: publicSelect,
          }));
        await tx.knowledgePlanRequestKey.create({
          data: {
            created_by: owner,
            key,
            request_hash: hash,
            plan_id: plan.id,
          },
        });
        return { ...plan, reused: equivalent !== null };
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      const alias = await this.prisma.knowledgePlanRequestKey.findUnique({
        where: { created_by_key: { created_by: owner, key } },
      });
      if (!alias || alias.request_hash !== hash)
        throw new ConflictException('Idempotency-Key already used');
      const old = await this.prisma.knowledgePlan.findFirst({
        where: { id: alias.plan_id, ...this.scope(owner) },
        select: publicSelect,
      });
      if (!old) throw new NotFoundException('Plan unavailable');
      return { ...old, reused: true };
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
          sourceVersion: { select: { file_name: true, document_id: true } },
        },
      }),
      this.prisma.knowledgePlan.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  /** Return only display/proposal fields; no object keys, internal leases or embeddings. */
  async get(owner: string, id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const value = await tx.knowledgePlan.findFirst({
          where: { id, ...this.scope(owner) },
          select: {
            ...publicSelect,
            source_index_id: true,
            source_profile_id: true,
            sourceVersion: {
              select: {
                file_name: true,
                document_id: true,
                status: true,
                partial_confirmed_at: true,
                error_code: true,
              },
            },
          },
        });
        if (!value) throw new NotFoundException('Plan unavailable');
        const { source_index_id, source_profile_id, sourceVersion, ...safe } =
          value;
        const index =
          source_index_id && source_profile_id
            ? await tx.learningDocumentIndex.findFirst({
                where: {
                  id: source_index_id,
                  profile_id: source_profile_id,
                  version_id: value.source_version_id,
                  owner_id: owner,
                  status: { not: 'REVOKED' },
                  version: { document: this.documents.scope(owner) },
                },
                select: {
                  id: true,
                  profile_id: true,
                  status: true,
                  chunk_count: true,
                  completed_chunks: true,
                  error_code: true,
                },
              })
            : null;
        const usable = isUsableSource(
          sourceVersion.status,
          sourceVersion.partial_confirmed_at,
        );
        return {
          ...safe,
          sourceVersion: {
            file_name: sourceVersion.file_name,
            document_id: sourceVersion.document_id,
          },
          source_progress:
            (source_index_id && !index) ||
            !['WAITING_SOURCE', 'PREPARING', 'FAILED'].includes(value.status)
              ? null
              : {
                  ...summarizePlanSource({
                    stage: !usable
                      ? 'EXTRACTING'
                      : index?.status === 'READY'
                        ? 'READY'
                        : 'INDEXING',
                    index,
                  }),
                  error_code: index?.error_code ?? sourceVersion.error_code,
                },
        };
      },
      { isolationLevel: 'RepeatableRead' },
    );
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

  /** Persist measurable source progress under the execution/lease fence and enforce both clocks. */
  async checkpoint(
    owner: string,
    id: string,
    token: string,
    state?: PlanSourceState,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const where = {
        id,
        execution_id: token,
        status: 'PREPARING',
        lease_expires_at: { gt: now },
        ...this.scope(owner),
      };
      const plan = await tx.knowledgePlan.findFirst({ where });
      if (!plan) return false;
      if (
        state?.index &&
        plan.source_index_id &&
        (plan.source_index_id !== state.index.id ||
          plan.source_profile_id !== state.index.profile_id)
      )
        return false;
      const observation = state
        ? observePlanSource(plan.source_checkpoint, state)
        : null;
      const progressAt = observation?.advanced ? now : plan.source_progress_at;
      const code = planSourceTimeout(
        { ...plan, source_progress_at: progressAt },
        now.getTime(),
      );
      if (!observation && !code) return true;
      const changed = await tx.knowledgePlan.updateMany({
        where,
        data: code
          ? {
              status: 'FAILED',
              error_code: code,
              execution_id: null,
              lease_expires_at: null,
            }
          : {
              ...(observation
                ? {
                    source_checkpoint: observation.checkpoint,
                    source_progress_at: progressAt,
                  }
                : {}),
              ...(state?.index
                ? {
                    source_index_id: state.index.id,
                    source_profile_id: state.index.profile_id,
                  }
                : {}),
            },
      });
      return changed.count > 0 && !code;
    });
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
        lease_expires_at: { gt: new Date() },
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

  /** Explicit failed retry renews both preparation clocks, never the original creation time. */
  retry(owner: string, id: string) {
    return this.prisma.knowledgePlan.updateMany({
      where: { id, status: 'FAILED', ...this.scope(owner) },
      data: {
        status: 'WAITING_SOURCE',
        error_code: null,
        execution_id: null,
        lease_expires_at: null,
        next_prepare_at: new Date(),
        preparation_started_at: new Date(),
        source_progress_at: new Date(),
        source_checkpoint: Prisma.DbNull,
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
