import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  QuestionGenerationBatchStatus as BatchStatus,
  QuestionGenerationItemStatus as ItemStatus,
  QuestionGenerationReviewAction as Action,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GenerationBatchRepository } from './generation-batch.repository';
import {
  generatedQuestionSchema,
  toQuestionBankDraft,
} from './question-generation.contract';
import type {
  CommitGenerationItems,
  EditGenerationItem,
  ReviewGenerationItem,
} from './generation-review.contract';

const itemSelect = {
  id: true,
  source_index: true,
  revision: true,
  status: true,
  data: true,
  provenance: true,
  errors: true,
  warnings: true,
  question_id: true,
  reviewed_by: true,
  reviewed_at: true,
  committed_at: true,
} satisfies Prisma.QuestionGenerationItemSelect;

/** Transactional review/commit boundary. Every mutation locks batch before items. */
@Injectable()
export class GenerationReviewRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly batches: GenerationBatchRepository,
  ) {}

  private async lock(
    tx: Prisma.TransactionClient,
    ownerId: string,
    batchId: string,
    allowCompleted = false,
  ) {
    // A conditional write acquires the PostgreSQL row lock without raw SQL.
    // All edits/reviews/commits serialize here, including overlapping selections.
    const locked = await tx.questionGenerationBatch.updateMany({
      where: { id: batchId, ...this.batches.ownerScope(ownerId) },
      data: { updated_at: new Date() },
    });
    if (!locked.count)
      throw new NotFoundException('Question generation batch not found');
    const batch = await tx.questionGenerationBatch.findUniqueOrThrow({
      where: { id: batchId },
      select: {
        status: true,
        topic_id: true,
        chapter_id: true,
        chapter: { select: { topic_id: true } },
      },
    });
    // Recheck under the transaction after waiting for another request's lock.
    const authorized = await tx.questionGenerationBatch.count({
      where: { id: batchId, ...this.batches.ownerScope(ownerId) },
    });
    if (!authorized || batch.chapter.topic_id !== batch.topic_id)
      throw new NotFoundException('Question generation batch not found');
    if (
      batch.status !== BatchStatus.REVIEW_REQUIRED &&
      !(allowCompleted && batch.status === BatchStatus.COMPLETED)
    ) {
      throw new ConflictException('Batch is not available for review');
    }
    return batch;
  }

  private async item(
    tx: Prisma.TransactionClient,
    batchId: string,
    itemId: string,
    revision: number,
  ) {
    const item = await tx.questionGenerationItem.findFirst({
      where: { id: itemId, batch_id: batchId },
      select: itemSelect,
    });
    if (!item)
      throw new NotFoundException('Question generation item not found');
    if (item.revision !== revision)
      throw new ConflictException('Draft changed; reload before continuing');
    return item;
  }

  /** Edits invalidate approval and retain the immutable original provider output. */
  async edit(
    ownerId: string,
    batchId: string,
    itemId: string,
    input: EditGenerationItem,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, ownerId, batchId);
      const before = await this.item(tx, batchId, itemId, input.revision);
      if (
        before.status === ItemStatus.COMMITTED ||
        before.status === ItemStatus.SKIPPED
      )
        throw new ConflictException(
          'Committed or skipped items cannot be edited',
        );
      const changed = await tx.questionGenerationItem.updateMany({
        where: {
          id: itemId,
          batch_id: batchId,
          revision: input.revision,
          status: before.status,
        },
        data: {
          data: input.data,
          status: ItemStatus.VALID,
          revision: { increment: 1 },
          reviewed_by: null,
          reviewed_at: null,
          errors: [],
          warnings: before.provenance ? ['AI_SOURCE_RECHECK_AFTER_EDIT'] : [],
          fingerprint: createHash('sha256')
            .update(JSON.stringify(input.data))
            .digest('hex'),
        },
      });
      if (!changed.count)
        throw new ConflictException('Draft changed; reload before continuing');
      await tx.questionGenerationReview.create({
        data: {
          batch_id: batchId,
          item_id: itemId,
          actor_id: ownerId,
          action: Action.EDIT,
          revision: input.revision + 1,
          before_status: before.status,
          after_status: ItemStatus.VALID,
          before_data: before.data as Prisma.InputJsonValue,
          after_data: input.data,
        },
      });
      return tx.questionGenerationItem.findUniqueOrThrow({
        where: { id: itemId },
        select: itemSelect,
      });
    });
  }

  /** Approve exactly the displayed revision or explicitly reject it. */
  async review(
    ownerId: string,
    batchId: string,
    itemId: string,
    input: ReviewGenerationItem,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, ownerId, batchId);
      const before = await this.item(tx, batchId, itemId, input.revision);
      if (
        before.status === ItemStatus.COMMITTED ||
        before.status === ItemStatus.SKIPPED
      )
        throw new ConflictException(
          'Committed or skipped items cannot be reviewed',
        );
      if (
        input.decision === 'APPROVE' &&
        (before.status === ItemStatus.INVALID ||
          !generatedQuestionSchema.safeParse(before.data).success)
      ) {
        throw new ConflictException(
          'Invalid drafts must be corrected before approval',
        );
      }
      const status =
        input.decision === 'APPROVE'
          ? ItemStatus.APPROVED
          : ItemStatus.REJECTED;
      const changed = await tx.questionGenerationItem.updateMany({
        where: {
          id: itemId,
          batch_id: batchId,
          revision: input.revision,
          status: before.status,
        },
        data: {
          status,
          revision: { increment: 1 },
          reviewed_by: ownerId,
          reviewed_at: new Date(),
        },
      });
      if (!changed.count)
        throw new ConflictException('Draft changed; reload before continuing');
      await tx.questionGenerationReview.create({
        data: {
          batch_id: batchId,
          item_id: itemId,
          actor_id: ownerId,
          action: input.decision === 'APPROVE' ? Action.APPROVE : Action.REJECT,
          revision: input.revision + 1,
          before_status: before.status,
          after_status: status,
          before_data: before.data as Prisma.InputJsonValue,
          after_data: before.data as Prisma.InputJsonValue,
        },
      });
      return tx.questionGenerationItem.findUniqueOrThrow({
        where: { id: itemId },
        select: itemSelect,
      });
    });
  }

  /** Atomically commit only approved revisions. Replays return existing mappings. */
  async commit(ownerId: string, batchId: string, input: CommitGenerationItems) {
    return this.prisma.$transaction(
      async (tx) => {
        const batch = await this.lock(tx, ownerId, batchId, true);
        const mappings: { item_id: string; question_id: string }[] = [];
        for (const ref of input.items) {
          const item = await this.item(tx, batchId, ref.id, ref.revision);
          if (item.status === ItemStatus.COMMITTED) {
            // A deleted bank row must not cause a retry to silently recreate it.
            if (!item.question_id)
              throw new ConflictException(
                'Previously committed bank question is no longer available',
              );
            mappings.push({ item_id: item.id, question_id: item.question_id });
            continue;
          }
          if (
            batch.status !== BatchStatus.REVIEW_REQUIRED ||
            item.status !== ItemStatus.APPROVED ||
            item.reviewed_by !== ownerId ||
            !item.reviewed_at
          ) {
            throw new ConflictException(
              'Only explicitly approved revisions can be committed',
            );
          }
          const validated = generatedQuestionSchema.safeParse(item.data);
          if (!validated.success)
            throw new ConflictException(
              'Approved draft is invalid; edit and approve it again',
            );
          const question = await tx.question.create({
            data: toQuestionBankDraft(validated.data, batch.chapter_id),
            select: { id: true },
          });
          const changed = await tx.questionGenerationItem.updateMany({
            where: {
              id: item.id,
              batch_id: batchId,
              status: ItemStatus.APPROVED,
              revision: ref.revision,
              question_id: null,
            },
            data: {
              status: ItemStatus.COMMITTED,
              question_id: question.id,
              committed_at: new Date(),
            },
          });
          if (!changed.count)
            throw new ConflictException('Draft changed during commit');
          // Commit keeps the approved revision so lost-response retries are stable.
          await tx.questionGenerationReview.create({
            data: {
              batch_id: batchId,
              item_id: item.id,
              actor_id: ownerId,
              action: Action.COMMIT,
              revision: item.revision,
              before_status: item.status,
              after_status: ItemStatus.COMMITTED,
              before_data: item.data as Prisma.InputJsonValue,
              after_data: item.data as Prisma.InputJsonValue,
              question_id: question.id,
            },
          });
          mappings.push({ item_id: item.id, question_id: question.id });
        }
        const remaining = await tx.questionGenerationItem.count({
          where: {
            batch_id: batchId,
            status: {
              notIn: [
                ItemStatus.COMMITTED,
                ItemStatus.REJECTED,
                ItemStatus.SKIPPED,
              ],
            },
          },
        });
        const status = remaining
          ? BatchStatus.REVIEW_REQUIRED
          : BatchStatus.COMPLETED;
        await tx.questionGenerationBatch.update({
          where: { id: batchId },
          data: { status },
        });
        return { batch_id: batchId, status, questions: mappings };
      },
      { timeout: 15_000 },
    );
  }
}
