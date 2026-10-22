import { DocumentGenerationService } from './document-generation.service';
import { storedGenerationResultSchema } from './grounded-generation.contract';
import type { QuestionProvenance } from './grounded-generation.contract';
import {
  ConflictException,
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  QuestionGenerationBatchStatus as BatchStatus,
  UserStatus,
} from '@prisma/client';
import { setTimeout as delay } from 'node:timers/promises';
import { GenerationBatchRepository } from './generation-batch.repository';
import { QuestionGenerationService } from './question-generation.service';
import type { GeneratedQuestion } from './question-generation.contract';
import { QuestionGenerationException } from './question-generation.errors';
import { AI_PERSISTENCE_ATTEMPTS } from './question-generation.constants';

/** One provider invocation per claimed execution; persistence can be replayed. */
@Injectable()
export class GenerationExecutionService {
  private readonly logger = new Logger(GenerationExecutionService.name);

  constructor(
    private readonly repository: GenerationBatchRepository,
    private readonly generation: QuestionGenerationService,
    private readonly documents: DocumentGenerationService,
  ) {}

  /** Duplicate queue deliveries cannot claim or rerun an active/completed batch. */
  async process(batchId: string): Promise<void> {
    const batch = await this.repository.executionInput(batchId);
    if (!batch) return;
    if (batch.status === BatchStatus.WAITING_SOURCE) {
      if (Date.now() - batch.created_at.getTime() > 20 * 60_000) {
        await this.repository.failPreparation(batchId, 'AI_SOURCE_TIMEOUT');
        return;
      }
      try {
        if (batch.creator.status !== UserStatus.ACTIVE)
          throw new QuestionGenerationException(
            'AI_ROLE_FORBIDDEN',
            HttpStatus.FORBIDDEN,
            'Inactive actor',
          );
        await this.generation.authorizeTarget(
          { id: batch.creator.id, role: batch.creator.role },
          batch,
        );
        const state = await this.documents.prepare(batch);
        await this.repository.prepared(batchId, batch.created_by, state);
      } catch (error) {
        if (
          error instanceof HttpException &&
          [503, 504].includes(error.getStatus())
        )
          return;
        if (!(error instanceof HttpException)) throw error;
        await this.repository.failPreparation(
          batchId,
          error instanceof QuestionGenerationException
            ? error.code
            : 'AI_DOCUMENT_SOURCE_INVALID',
        );
      }
      return;
    }
    if (batch.status !== BatchStatus.QUEUED) return;
    const executionId = await this.repository.claim(batchId);
    if (!executionId) return;
    let questions: GeneratedQuestion[];
    let provenance: QuestionProvenance[] | undefined;
    try {
      if (batch.creator.status !== UserStatus.ACTIVE)
        throw new Error('inactive actor');
      if (batch.source_mode === 'document') {
        const actor = { id: batch.creator.id, role: batch.creator.role };
        const target = await this.generation.authorizeTarget(actor, batch);
        const result = await this.documents.generate(batch, target.topic.name);
        await this.generation.authorizeTarget(actor, batch);
        questions = result.questions;
        provenance = result.provenance;
      } else {
        const result = await this.generation.generateDrafts(
          { id: batch.creator.id, role: batch.creator.role },
          {
            topic_id: batch.topic_id,
            chapter_id: batch.chapter_id,
            source: { mode: 'text', text: batch.source_text },
            question_type: batch.question_type,
            question_format: batch.question_format,
            count: batch.requested_count,
            language: batch.language,
            external_processing_consent: Boolean(batch.consented_at),
          },
        );
        questions = result.questions;
      }
    } catch (error: unknown) {
      const code =
        error instanceof QuestionGenerationException
          ? error.code
          : 'AI_EXECUTION_REJECTED';
      await this.persist(() =>
        this.repository.fail(batchId, executionId, code),
      );
      return;
    }
    // Failure from here leaves a GENERATING lease for reconciliation. Do not
    // overwrite a durable provider result with an indiscriminate FAILED state.
    await this.persist(() =>
      provenance
        ? this.repository.saveResult(
            batchId,
            executionId,
            questions,
            provenance,
          )
        : this.repository.saveResult(batchId, executionId, questions),
    );
    await this.finish(
      batchId,
      executionId,
      batch.created_by,
      questions,
      provenance,
    );
  }

  /** Recover results after worker death; ambiguous calls become UNKNOWN, not a paid retry. */
  async recover(batchId: string): Promise<void> {
    const batch = await this.repository.executionInput(batchId);
    if (
      !batch ||
      batch.status !== BatchStatus.GENERATING ||
      !batch.execution_id ||
      !batch.lease_expires_at ||
      batch.lease_expires_at.getTime() >= Date.now()
    )
      return;
    const attempt = batch.attempts.find(
      (candidate) => candidate.id === batch.execution_id,
    );
    const result = storedGenerationResultSchema.safeParse(attempt?.result);
    if (
      !result.success ||
      (batch.source_mode === 'document' && !result.data.provenance) ||
      result.data.questions.length !== batch.requested_count ||
      result.data.questions.some(
        (question) => question.question_format !== batch.question_format,
      )
    ) {
      await this.repository.fail(
        batchId,
        batch.execution_id,
        'AI_EXECUTION_INTERRUPTED',
        true,
      );
      return;
    }
    await this.finish(
      batchId,
      batch.execution_id,
      batch.created_by,
      result.data.questions,
      result.data.provenance,
    );
  }

  private async finish(
    batchId: string,
    executionId: string,
    ownerId: string,
    questions: GeneratedQuestion[],
    provenance?: QuestionProvenance[],
  ) {
    try {
      await this.persist(() =>
        provenance
          ? this.repository.finish(
              batchId,
              executionId,
              ownerId,
              questions,
              provenance,
            )
          : this.repository.finish(batchId, executionId, ownerId, questions),
      );
    } catch (error: unknown) {
      if (!(error instanceof ConflictException)) throw error;
      await this.persist(() =>
        this.repository.fail(batchId, executionId, 'AI_EXECUTION_REJECTED'),
      );
    }
  }

  private async persist<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        if (error instanceof ConflictException) throw error;
        if (attempt >= AI_PERSISTENCE_ATTEMPTS) {
          this.logger.warn({ event: 'ai_persistence_deferred' });
          // Raw DB errors may contain source/result data; BullMQ must not log them.
          throw new Error(
            'AI persistence deferred; execution will be reconciled',
          );
        }
        await delay(attempt * 100);
      }
    }
  }
}
