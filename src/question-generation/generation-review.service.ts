import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';
import type { GenerationActor } from './question-generation.service';
import { GenerationReviewRepository } from './generation-review.repository';
import {
  commitGenerationItemsSchema,
  editGenerationItemSchema,
  reviewGenerationItemSchema,
} from './generation-review.contract';

/** Validate review commands independently of global implicit conversion. */
@Injectable()
export class GenerationReviewService {
  private readonly logger = new Logger(GenerationReviewService.name);
  constructor(private readonly repository: GenerationReviewRepository) {}

  /** Save a validated draft and invalidate earlier approval. */
  edit(
    actor: GenerationActor,
    batchId: string,
    itemId: string,
    input: unknown,
  ) {
    const command = this.parse(actor, editGenerationItemSchema, input);
    return this.storage(() =>
      this.repository.edit(actor.id, batchId, itemId, command),
    );
  }
  /** Approve/reject one exact revision as the authenticated lecturer. */
  review(
    actor: GenerationActor,
    batchId: string,
    itemId: string,
    input: unknown,
  ) {
    const command = this.parse(actor, reviewGenerationItemSchema, input);
    return this.storage(() =>
      this.repository.review(actor.id, batchId, itemId, command),
    );
  }
  /** Commit an explicitly selected set of approved drafts with replay-safe mappings. */
  commit(actor: GenerationActor, batchId: string, input: unknown) {
    const command = this.parse(actor, commitGenerationItemsSchema, input);
    return this.storage(() =>
      this.repository.commit(actor.id, batchId, command),
    );
  }
  private parse<T>(
    actor: GenerationActor,
    schema: z.ZodType<T>,
    input: unknown,
  ): T {
    if (
      actor?.role !== 'LECTURER' ||
      !z.string().uuid().safeParse(actor.id).success
    )
      throw new ForbiddenException('Lecturer required');
    const parsed = schema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException('Invalid draft/review command');
    return parsed.data;
  }
  private async storage<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      this.logger.warn({ event: 'ai_review_storage_unavailable' });
      throw new ServiceUnavailableException(
        'Review storage is temporarily unavailable; reload or retry the same commit',
      );
    }
  }
}
