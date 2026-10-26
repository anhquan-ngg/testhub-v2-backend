import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { RedisClient } from 'bullmq';
import { AI_SERVICE_OPTIONS } from './ai-service.config';
import type { AiServiceOptions } from './ai-service.config';
import { GenerationBatchRepository } from './generation-batch.repository';
import { GenerationExecutionService } from './generation-execution.service';
import { KnowledgePlanService } from './knowledge-plan.service';
import {
  AI_DISPATCH_RECHECK_MS,
  AI_GENERATION_JOB,
  AI_GENERATION_QUEUE,
  AI_RECONCILE_INTERVAL_MS,
} from './question-generation.constants';

/** Worker-owned reconciliation: PostgreSQL remains authoritative if Redis loses work. */
@Injectable()
export class GenerationDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GenerationDispatcher.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopping = false;
  private redisClient?: RedisClient;

  constructor(
    private readonly repository: GenerationBatchRepository,
    private readonly execution: GenerationExecutionService,
    @InjectQueue(AI_GENERATION_QUEUE) private readonly queue: Queue,
    @Inject(AI_SERVICE_OPTIONS) private readonly options: AiServiceOptions,
    @Optional() private readonly plans?: KnowledgePlanService,
  ) {
    // Observe initialization once. Never let an unavailable initial Redis
    // connection block lease recovery or accumulate pending dispatch commands.
    void this.queue.client
      .then((client) => {
        this.redisClient = client;
      })
      .catch(() => {
        this.logger.warn({ event: 'ai_queue_initialization_failed' });
      });
  }

  /** Start only in the dedicated worker process, after migrations are available. */
  onModuleInit(): void {
    if (!this.options.enabled) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, AI_RECONCILE_INTERVAL_MS);
    void this.tick();
  }

  /** Do not close Prisma while a reconciliation write is still running. */
  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }

  /** Coalesce ticks in one process; DB claims and stable IDs handle multiple workers. */
  async tick(): Promise<void> {
    if (!this.options.enabled || this.stopping || this.running) return;
    this.running = this.reconcile().catch(() => {
      this.logger.warn({ event: 'ai_reconciliation_deferred' });
    });
    try {
      await this.running;
    } finally {
      this.running = undefined;
    }
  }

  private async reconcile(): Promise<void> {
    await this.plans?.prepareDue();
    for (const stale of await this.repository.staleExecutions()) {
      try {
        await this.execution.recover(stale.id);
      } catch {
        this.logger.warn({ event: 'ai_execution_recovery_deferred' });
      }
    }
    if (this.redisClient?.status !== 'ready') return;
    for (const command of await this.repository.dispatchable()) {
      try {
        const jobId = `generate-${command.batch_id}`;
        const existing = await this.queue.getJob(jobId);
        if (existing) {
          const state = await existing.getState();
          if (state === 'failed' || state === 'completed')
            await existing.remove();
        }
        await this.queue.add(
          AI_GENERATION_JOB,
          { batchId: command.batch_id },
          {
            jobId,
            attempts: 1,
            removeOnComplete: true,
            removeOnFail: 1000,
          },
        );
        await this.repository.markDispatch(
          command.id,
          AI_DISPATCH_RECHECK_MS,
          true,
        );
      } catch {
        // Retry delivery, never the provider call. Backoff survives worker restarts.
        const delay = Math.min(
          300_000,
          AI_RECONCILE_INTERVAL_MS * 2 ** Math.min(command.dispatch_count, 6),
        );
        await this.repository.markDispatch(command.id, delay, false);
        // A shared Redis outage should not delay all lease recovery by N timeouts.
        break;
      }
    }
  }
}
