import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import type { RedisClient } from 'bullmq';
import { z } from 'zod';
import { RagExecution } from './rag-execution.service';
import { RagRepository } from './rag.repository';
import { RagClient } from './rag-client.service';
import { RAG_JOB, RAG_QUEUE } from './rag.contract';
/** Indexing has an independent queue and concurrency limit from extraction/generation. */
@Processor(RAG_QUEUE, { concurrency: 1, maxStalledCount: 1 })
export class RagProcessor extends WorkerHost {
  constructor(
    private readonly execution: RagExecution,
    private readonly client: RagClient,
  ) {
    super();
  }
  /** Each delivery advances at most sixteen embeddings under database fences. */
  async process(job: Job<unknown>): Promise<void> {
    if (!this.client.enabled) return;
    const value = z
      .object({ indexId: z.string().uuid() })
      .strict()
      .safeParse(job.data);
    if (job.name !== RAG_JOB || !value.success)
      throw new Error('Invalid indexing job');
    try {
      await this.execution.process(value.data.indexId);
    } catch {
      throw new Error('Index reconciliation deferred');
    }
  }
}
/** Durable database outbox and revocation delivery. No processor is registered in API. */
@Injectable()
export class RagDispatcher implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopping = false;
  private redis?: RedisClient;
  private readonly logger = new Logger(RagDispatcher.name);
  constructor(
    private readonly repository: RagRepository,
    private readonly client: RagClient,
    private readonly execution: RagExecution,
    @InjectQueue(RAG_QUEUE) private readonly queue: Queue,
  ) {
    void queue.client
      .then((redis) => {
        this.redis = redis;
      })
      .catch(() => {
        this.logger.warn({ event: 'rag_queue_unavailable' });
      });
  }
  /** Start bounded reconciliation only when the feature is enabled. */
  onModuleInit(): void {
    if (!this.client.enabled) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 5000);
    void this.tick();
  }
  /** Drain current tick before closing shared database pools. */
  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
  /** Coalesce ticks; claims remain conditional across multiple worker processes. */
  async tick(): Promise<void> {
    if (this.stopping || this.running || !this.client.enabled) return;
    this.running = this.reconcile().catch(() => {
      this.logger.warn({ event: 'rag_reconciliation_deferred' });
    });
    try {
      await this.running;
    } finally {
      this.running = undefined;
    }
  }
  private async reconcile(): Promise<void> {
    await this.repository.recover();
    try {
      await this.execution.revoke();
    } catch {
      this.logger.warn({ event: 'rag_revocation_deferred' });
    }
    if (this.redis?.status !== 'ready') return;
    for (const row of await this.repository.due()) {
      const jobId = `index-${row.id}-${row.step_count}`;
      const old = await this.queue.getJob(jobId);
      if (old && ['failed', 'completed'].includes(await old.getState()))
        await old.remove();
      await this.queue.add(
        RAG_JOB,
        { indexId: row.id },
        { jobId, attempts: 1, removeOnComplete: true, removeOnFail: 100 },
      );
      await this.repository.dispatched(row.id, row.step_count);
    }
  }
}
