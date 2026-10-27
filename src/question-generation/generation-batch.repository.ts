import {
  FrozenPlan,
  frozenPlanSchema,
  expandPlanItems,
} from './knowledge-plan.contract';
import type { QuestionProvenance } from './grounded-generation.contract';
import { ConflictException, Injectable } from '@nestjs/common';
import {
  Prisma,
  QuestionGenerationBatchStatus as BatchStatus,
  QuestionGenerationAttemptStatus as AttemptStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { totalQuestionCount } from './question-generation.contract';
import type {
  GenerationCommand,
  GeneratedQuestion,
} from './question-generation.contract';
import {
  AI_EXECUTION_LEASE_MS,
  AI_RECONCILE_PAGE_SIZE,
} from './question-generation.constants';

const publicBatchSelect = {
  id: true,
  topic_id: true,
  chapter_id: true,
  plan_id: true,
  plan_snapshot: true,
  status: true,
  question_type: true,
  question_format: true,
  question_configs: true,
  sourceVersion: {
    select: { file_name: true, version: true, document_id: true },
  },
  source_mode: true,
  source_version_id: true,
  preparation_stage: true,
  requested_count: true,
  total_items: true,
  error_code: true,
  created_at: true,
  started_at: true,
  finished_at: true,
} satisfies Prisma.QuestionGenerationBatchSelect;

/** Business persistence for AI staging; never writes Question or import tables. */
@Injectable()
export class GenerationBatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Scope reads to current ownership, active targets and the original creator. */
  ownerScope(ownerId: string): Prisma.QuestionGenerationBatchWhereInput {
    return {
      created_by: ownerId,
      OR: [
        { source_mode: 'text' },
        {
          source_mode: 'document',
          sourceVersion: {
            document: {
              created_by: ownerId,
              is_deleted: false,
              topic: { created_by: ownerId, is_deleted: false },
              OR: [{ chapter_id: null }, { chapter: { is_deleted: false } }],
            },
          },
        },
      ],
      creator: { role: UserRole.LECTURER, status: UserStatus.ACTIVE },
      topic: { created_by: ownerId, is_deleted: false },
      AND: [
        {
          OR: [
            {
              chapter: {
                is_deleted: false,
                topic: { created_by: ownerId, is_deleted: false },
              },
            },
            { chapter_id: null, plan_id: { not: null } },
          ],
        },
      ],
    };
  }

  /** Create an owner/key-unique batch and outbox atomically; races reuse the winner. */
  async create(input: {
    ownerId: string;
    key: string;
    hash: string;
    command: GenerationCommand;
    plan?: FrozenPlan;
  }) {
    const { ownerId, key, hash, command, plan } = input;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const target = command.chapter_id
          ? await tx.chapter.findFirst({
              where: {
                id: command.chapter_id,
                topic_id: command.topic_id,
                is_deleted: false,
                topic: { created_by: ownerId, is_deleted: false },
              },
              select: { id: true },
            })
          : await tx.topic.findFirst({
              where: {
                id: command.topic_id,
                created_by: ownerId,
                is_deleted: false,
              },
              select: { id: true },
            });
        const actor = await tx.user.findFirst({
          where: {
            id: ownerId,
            role: UserRole.LECTURER,
            status: UserStatus.ACTIVE,
          },
          select: { id: true },
        });
        if (!target || !actor)
          throw new ConflictException(
            'Generation target is no longer available',
          );
        const approvedPlan = plan
          ? await tx.knowledgePlan.findFirst({
              where: {
                id: plan.plan_id,
                created_by: ownerId,
                topic_id: command.topic_id,
                status: 'APPROVED',
                revision: plan.revision,
              },
            })
          : null;
        if (
          plan &&
          (!approvedPlan ||
            approvedPlan.source_version_id !==
              (command.source.mode === 'document'
                ? command.source.version_id
                : null) ||
            !approvedPlan.source_index_id ||
            !approvedPlan.source_profile_id)
        )
          throw new ConflictException('Plan is no longer available');
        if (command.source.mode === 'document') {
          const version = await tx.learningDocumentVersion.findFirst({
            where: {
              id: command.source.version_id,
              status: { in: ['QUEUED', 'PROCESSING', 'EXTRACTED'] },
              document: {
                created_by: ownerId,
                is_deleted: false,
                topic_id: command.topic_id,
                ...(!plan ? { chapter_id: command.chapter_id } : {}),
              },
            },
          });
          if (!version)
            throw new ConflictException(
              'Document source is no longer available',
            );
        }
        return tx.questionGenerationBatch.create({
          data: {
            id: randomUUID(),
            created_by: ownerId,
            topic_id: command.topic_id,
            chapter_id: command.chapter_id,
            ...(plan ? { plan_id: plan.plan_id, plan_snapshot: plan } : {}),
            idempotency_key: key,
            request_hash: hash,
            source_text:
              command.source.mode === 'text' ? command.source.text : '',
            source_mode: command.source.mode,
            contract_version:
              command.source.mode === 'document'
                ? 'rag-generation.v1'
                : 'text-generation.v1',
            ...(command.source.mode === 'document'
              ? {
                  source_version_id: command.source.version_id,
                  source_query: command.source.query,
                  status: BatchStatus.WAITING_SOURCE,
                  preparation_stage: plan ? 'READY' : 'EXTRACTING',
                  ...(approvedPlan
                    ? {
                        status: BatchStatus.QUEUED,
                        source_index_id: approvedPlan.source_index_id,
                        source_profile_id: approvedPlan.source_profile_id,
                      }
                    : {}),
                }
              : {}),
            // Legacy columns summarize the first row for older readers.
            question_type: command.question_configs[0].question_type,
            question_format: command.question_configs[0].question_format,
            question_configs: command.question_configs,
            requested_count: totalQuestionCount(command.question_configs),
            language: command.language,
            consented_at: new Date(),
            outbox: { create: {} },
          },
          select: publicBatchSelect,
        });
      });
    } catch (error: unknown) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      const existing = await this.prisma.questionGenerationBatch.findFirst({
        where: { ...this.ownerScope(ownerId), idempotency_key: key },
        select: { ...publicBatchSelect, request_hash: true },
      });
      if (!existing || existing.request_hash !== hash) {
        throw new ConflictException(
          'Idempotency-Key was already used for a different request',
        );
      }
      const { request_hash: omitted, ...safe } = existing;
      void omitted;
      return safe;
    }
  }

  /** Return safe batch state; source text, internal IDs and provider result stay private. */
  async findOwned(ownerId: string, id: string) {
    const batch = await this.prisma.questionGenerationBatch.findFirst({
      where: { id, ...this.ownerScope(ownerId) },
      select: { ...publicBatchSelect, chapter: { select: { topic_id: true } } },
    });
    if (!batch || (batch.chapter && batch.chapter.topic_id !== batch.topic_id))
      return null;
    const { chapter, ...safe } = batch;
    void chapter;
    return safe;
  }

  /** Return a consistent paginated view of persisted review drafts. */
  async list(ownerId: string, page: number, limit: number, topicId?: string) {
    const where = {
      ...this.ownerScope(ownerId),
      ...(topicId ? { topic_id: topicId } : {}),
    };
    const [data, total] = await this.prisma.$transaction(
      [
        this.prisma.questionGenerationBatch.findMany({
          where,
          select: publicBatchSelect,
          orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.questionGenerationBatch.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { data, total, page, limit };
  }

  /** Return a consistent paginated view of persisted review drafts. */
  async items(ownerId: string, id: string, page: number, limit: number) {
    const where: Prisma.QuestionGenerationItemWhereInput = {
      batch_id: id,
      batch: this.ownerScope(ownerId),
    };
    const [data, total] = await this.prisma.$transaction(
      [
        this.prisma.questionGenerationItem.findMany({
          where,
          orderBy: { source_index: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            source_index: true,
            revision: true,
            status: true,
            data: true,
            provenance: true,
            plan_item_id: true,
            target_chapter_id: true,
            errors: true,
            warnings: true,
            reviewed_by: true,
            reviewed_at: true,
            committed_at: true,
            question_id: true,
          },
        }),
        this.prisma.questionGenerationItem.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { data, total, page, limit };
  }

  /** Worker resolves actor/role afresh rather than trusting queue payload claims. */
  executionInput(id: string) {
    return this.prisma.questionGenerationBatch.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, role: true, status: true } },
        attempts: true,
      },
    });
  }

  /** Claim exactly one execution per batch and persist its durable lease. */
  async claim(id: string) {
    const executionId = randomUUID();
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.questionGenerationBatch.updateMany({
        where: { id, status: BatchStatus.QUEUED },
        data: {
          status: BatchStatus.GENERATING,
          execution_id: executionId,
          started_at: new Date(),
          error_code: null,
          lease_expires_at: new Date(Date.now() + AI_EXECUTION_LEASE_MS),
        },
      });
      if (!claimed.count) return null;
      await tx.questionGenerationAttempt.create({
        data: { id: executionId, batch_id: id },
      });
      return executionId;
    });
  }

  /** Store validated output before constructing items so recovery never needs another AI call. */
  async saveResult(
    id: string,
    executionId: string,
    questions: GeneratedQuestion[],
    provenance?: QuestionProvenance[],
  ) {
    const saved = await this.prisma.questionGenerationAttempt.updateMany({
      where: {
        id: executionId,
        batch_id: id,
        status: AttemptStatus.RUNNING,
        batch: { status: BatchStatus.GENERATING, execution_id: executionId },
      },
      data: {
        result: {
          questions,
          ...(provenance ? { provenance } : {}),
        } satisfies Prisma.InputJsonObject,
      },
    });
    if (!saved.count)
      throw new ConflictException('Generation execution is no longer active');
  }

  /** Fence late/duplicate results and atomically persist all drafts plus review state. */
  async finish(
    id: string,
    executionId: string,
    ownerId: string,
    questions: GeneratedQuestion[],
    provenance?: QuestionProvenance[],
  ) {
    await this.prisma.$transaction(async (tx) => {
      const batch = await tx.questionGenerationBatch.findUnique({
        where: { id },
        select: {
          topic_id: true,
          source_mode: true,
          plan_snapshot: true,
          chapter_id: true,
          source_version_id: true,
          source_index_id: true,
          source_profile_id: true,
        },
      });
      if (!batch)
        throw new ConflictException('Generation batch no longer exists');
      if (
        batch.source_mode === 'document' &&
        (!provenance ||
          provenance.length !== questions.length ||
          !batch.source_index_id ||
          !batch.source_version_id ||
          !batch.source_profile_id ||
          provenance.some(
            (p) =>
              p.profile_id !== batch.source_profile_id ||
              p.citations.some(
                (c) =>
                  c.chunk.version_id !== batch.source_version_id ||
                  c.chunk.index_id !== batch.source_index_id,
              ),
          ))
      )
        throw new ConflictException('Source evidence is no longer valid');
      const changed = await tx.questionGenerationBatch.updateMany({
        where: {
          id,
          ...this.ownerScope(ownerId),
          ...(batch.source_mode === 'document'
            ? {
                sourceIndex: {
                  status: 'READY',
                  version_id: batch.source_version_id ?? undefined,
                  profile_id: batch.source_profile_id ?? undefined,
                },
              }
            : {}),
          ...(batch.chapter_id
            ? { chapter: { is_deleted: false, topic_id: batch.topic_id } }
            : {}),
          status: BatchStatus.GENERATING,
          execution_id: executionId,
        },
        data: {
          status: BatchStatus.REVIEW_REQUIRED,
          total_items: questions.length,
          finished_at: new Date(),
          lease_expires_at: null,
          error_code: null,
        },
      });
      if (!changed.count)
        throw new ConflictException(
          'Generation execution is no longer active or authorized',
        );
      const slots = batch.plan_snapshot
        ? expandPlanItems(frozenPlanSchema.parse(batch.plan_snapshot))
        : undefined;
      if (
        slots &&
        (slots.length !== questions.length ||
          provenance?.some((p, i) => p.plan_item_id !== slots[i].id))
      )
        throw new ConflictException('Plan item mismatch');
      await tx.questionGenerationItem.createMany({
        data: questions.map((question, index) => ({
          batch_id: id,
          source_index: index + 1,
          ...(slots ? { plan_item_id: slots[index].id } : {}),
          original_data: question,
          data: question,
          ...(provenance ? { provenance: provenance[index] } : {}),
          errors: [],
          warnings: [],
          fingerprint: createHash('sha256')
            .update(JSON.stringify(question))
            .digest('hex'),
        })),
      });
      await tx.questionGenerationAttempt.update({
        where: { id: executionId },
        data: { status: AttemptStatus.SUCCEEDED, finished_at: new Date() },
      });
    });
  }

  /** Keep failures safe and fence old workers from overwriting completed executions. */
  async fail(id: string, executionId: string, code: string, unknown = false) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.questionGenerationBatch.updateMany({
        where: {
          id,
          execution_id: executionId,
          status: BatchStatus.GENERATING,
        },
        data: {
          status: BatchStatus.FAILED,
          error_code: code,
          finished_at: new Date(),
          lease_expires_at: null,
        },
      });
      if (changed.count)
        await tx.questionGenerationAttempt.update({
          where: { id: executionId },
          data: {
            status: unknown ? AttemptStatus.UNKNOWN : AttemptStatus.FAILED,
            error_code: code,
            finished_at: new Date(),
          },
        });
    });
  }

  /** Prepare sources without claiming a paid LLM attempt. Conditional writes fence duplicate jobs. */
  async prepared(
    id: string,
    owner: string,
    result: {
      ready: boolean;
      stage: string;
      index: { id: string; profile_id: string } | null;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.questionGenerationBatch.updateMany({
        where: {
          id,
          status: BatchStatus.WAITING_SOURCE,
          AND: [
            this.ownerScope(owner),
            ...(result.index
              ? [
                  {
                    OR: [
                      { source_index_id: null },
                      { source_index_id: result.index.id },
                    ],
                  },
                ]
              : []),
          ],
        },
        data: {
          status: result.ready
            ? BatchStatus.QUEUED
            : BatchStatus.WAITING_SOURCE,
          preparation_stage: result.stage,
          ...(result.index
            ? {
                source_index_id: result.index.id,
                source_profile_id: result.index.profile_id,
              }
            : {}),
        },
      });
      if (changed.count)
        await tx.questionGenerationOutbox.updateMany({
          where: { batch_id: id },
          data: {
            next_dispatch_at: new Date(Date.now() + (result.ready ? 0 : 15000)),
          },
        });
      return changed;
    });
  }
  /** Terminal preparation errors do not create an attempt or invoke the LLM. */
  failPreparation(id: string, code: string) {
    return this.prisma.questionGenerationBatch.updateMany({
      where: { id, status: BatchStatus.WAITING_SOURCE },
      data: {
        status: BatchStatus.FAILED,
        error_code: code,
        finished_at: new Date(),
      },
    });
  }

  /** Reconcile only expired executions; never reissue an ambiguous provider call. */
  staleExecutions() {
    return this.prisma.questionGenerationBatch.findMany({
      where: {
        status: BatchStatus.GENERATING,
        lease_expires_at: { lt: new Date() },
      },
      orderBy: { lease_expires_at: 'asc' },
      select: { id: true },
      take: AI_RECONCILE_PAGE_SIZE,
    });
  }

  /** Periodic redis reconciliation includes previously published but still queued work. */
  dispatchable() {
    return this.prisma.questionGenerationOutbox.findMany({
      where: {
        next_dispatch_at: { lte: new Date() },
        batch: {
          status: { in: [BatchStatus.QUEUED, BatchStatus.WAITING_SOURCE] },
        },
      },
      orderBy: { next_dispatch_at: 'asc' },
      take: AI_RECONCILE_PAGE_SIZE,
    });
  }

  /** A delivery failure never discards the PostgreSQL command. */
  markDispatch(id: string, delay: number, success: boolean) {
    return this.prisma.questionGenerationOutbox.update({
      where: { id },
      data: {
        dispatch_count: { increment: 1 },
        next_dispatch_at: new Date(Date.now() + delay),
        ...(success ? { dispatched_at: new Date() } : {}),
        error_code: success ? null : 'QUEUE_UNAVAILABLE',
      },
    });
  }
}
