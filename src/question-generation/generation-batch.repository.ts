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
import type {
  TextGenerationCommand,
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
  status: true,
  question_type: true,
  question_format: true,
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
      creator: { role: UserRole.LECTURER, status: UserStatus.ACTIVE },
      topic: { created_by: ownerId, is_deleted: false },
      chapter: {
        is_deleted: false,
        topic: { created_by: ownerId, is_deleted: false },
      },
    };
  }

  /** Create an owner/key-unique batch and outbox atomically; races reuse the winner. */
  async create(input: {
    ownerId: string;
    key: string;
    hash: string;
    command: TextGenerationCommand;
  }) {
    const { ownerId, key, hash, command } = input;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const target = await tx.chapter.findFirst({
          where: {
            id: command.chapter_id,
            topic_id: command.topic_id,
            is_deleted: false,
            topic: { created_by: ownerId, is_deleted: false },
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
        return tx.questionGenerationBatch.create({
          data: {
            id: randomUUID(),
            created_by: ownerId,
            topic_id: command.topic_id,
            chapter_id: command.chapter_id,
            idempotency_key: key,
            request_hash: hash,
            source_text: command.source.text,
            question_type: command.question_type,
            question_format: command.question_format,
            requested_count: command.count,
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
    if (!batch || batch.chapter.topic_id !== batch.topic_id) return null;
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
  ) {
    const saved = await this.prisma.questionGenerationAttempt.updateMany({
      where: {
        id: executionId,
        batch_id: id,
        status: AttemptStatus.RUNNING,
        batch: { status: BatchStatus.GENERATING, execution_id: executionId },
      },
      data: { result: { questions } satisfies Prisma.InputJsonObject },
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
  ) {
    await this.prisma.$transaction(async (tx) => {
      const batch = await tx.questionGenerationBatch.findUnique({
        where: { id },
        select: { topic_id: true },
      });
      if (!batch)
        throw new ConflictException('Generation batch no longer exists');
      const changed = await tx.questionGenerationBatch.updateMany({
        where: {
          id,
          ...this.ownerScope(ownerId),
          chapter: { is_deleted: false, topic_id: batch.topic_id },
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
      await tx.questionGenerationItem.createMany({
        data: questions.map((question, index) => ({
          batch_id: id,
          source_index: index + 1,
          original_data: question,
          data: question,
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
        batch: { status: BatchStatus.QUEUED },
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
