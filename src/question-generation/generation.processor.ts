import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { z } from 'zod';
import { AI_SERVICE_OPTIONS } from './ai-service.config';
import type { AiServiceOptions } from './ai-service.config';
import { GenerationExecutionService } from './generation-execution.service';
import {
  AI_GENERATION_JOB,
  AI_GENERATION_QUEUE,
  AI_WORKER_CONCURRENCY,
} from './question-generation.constants';

/** Dedicated worker: payload contains a business UUID, never source text or tokens. */
@Processor(AI_GENERATION_QUEUE, {
  concurrency: AI_WORKER_CONCURRENCY,
  maxStalledCount: 1,
})
export class GenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(
    private readonly execution: GenerationExecutionService,
    @Inject(AI_SERVICE_OPTIONS) private readonly options: AiServiceOptions,
  ) {
    super();
  }

  /** Let the DB claim decide whether a delivery may execute; failures stay sanitized. */
  async process(job: Job<unknown>): Promise<void> {
    if (!this.options.enabled) return;
    if (job.name !== AI_GENERATION_JOB)
      throw new Error('Unsupported AI generation job');
    const payload = z
      .object({ batchId: z.string().uuid() })
      .strict()
      .safeParse(job.data);
    if (!payload.success) throw new Error('Invalid AI generation job');
    try {
      await this.execution.process(payload.data.batchId);
    } catch {
      this.logger.warn({ event: 'ai_worker_execution_deferred' });
      throw new Error('AI generation execution deferred for reconciliation');
    }
  }
}
