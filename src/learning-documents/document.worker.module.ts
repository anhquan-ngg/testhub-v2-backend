import { RagExecution } from './rag-execution.service';
import { RagProcessor, RagDispatcher } from './rag.worker';
import { RAG_QUEUE } from './rag.contract';
import {
  Injectable,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule, InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import type { RedisClient } from 'bullmq';
import { z } from 'zod';
import { getRedisConnection } from '../common/redis-connection';
import { DocumentModule } from './document.module';
import { DocumentRepository } from './document.repository';
import { DocumentClient } from './document-client.service';
import { DocumentExecution } from './document-execution.service';
import { DOCUMENT_JOB, DOCUMENT_QUEUE } from './document.contract';

/** Run CPU/memory-bound authoring work outside the exam/API process. */
@Processor(DOCUMENT_QUEUE, { concurrency: 1, maxStalledCount: 1 })
export class DocumentProcessor extends WorkerHost {
  constructor(
    private readonly execution: DocumentExecution,
    private readonly client: DocumentClient,
  ) {
    super();
  }
  /** Database claims fence repeated or recovered queue delivery. */
  async process(job: Job<unknown>): Promise<void> {
    if (!this.client.enabled) return;
    const input = z
      .object({ versionId: z.string().uuid() })
      .strict()
      .safeParse(job.data);
    if (job.name !== DOCUMENT_JOB || !input.success)
      throw new Error('Invalid document job');
    try {
      await this.execution.process(input.data.versionId);
    } catch {
      throw new Error('Document execution deferred for reconciliation');
    }
  }
}

/** A queued version is its durable outbox; Redis loss does not lose accepted work. */
@Injectable()
export class DocumentDispatcher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentDispatcher.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private redis?: RedisClient;
  private stopping = false;
  constructor(
    private readonly repository: DocumentRepository,
    private readonly client: DocumentClient,
    @InjectQueue(DOCUMENT_QUEUE) private readonly queue: Queue,
  ) {
    void queue.client
      .then((redis) => {
        this.redis = redis;
      })
      .catch(() => {
        this.logger.warn({ event: 'document_queue_unavailable' });
      });
  }
  /** Start background reconciliation only when integration is enabled. */
  onModuleInit(): void {
    if (!this.client.enabled) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 5000);
    void this.tick();
  }
  /** Finish in-flight database work before shutting down pools. */
  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
  /** Coalesce local ticks; conditional writes fence multiple worker processes. */
  async tick(): Promise<void> {
    if (this.stopping || this.running || !this.client.enabled) return;
    this.running = this.reconcile().catch(() => {
      this.logger.warn({ event: 'document_reconciliation_deferred' });
    });
    try {
      await this.running;
    } finally {
      this.running = undefined;
    }
  }
  private async reconcile(): Promise<void> {
    await this.repository.recover();
    if (this.redis?.status !== 'ready') return;
    for (const row of await this.repository.due()) {
      try {
        const jobId = `extract-${row.id}`;
        const existing = await this.queue.getJob(jobId);
        if (
          existing &&
          ['failed', 'completed'].includes(await existing.getState())
        )
          await existing.remove();
        await this.queue.add(
          DOCUMENT_JOB,
          { versionId: row.id },
          {
            jobId,
            attempts: 1,
            removeOnComplete: true,
            removeOnFail: 100,
          },
        );
        await this.repository.dispatched(row.id, 60_000);
      } catch {
        await this.repository.dispatched(
          row.id,
          Math.min(300_000, 5000 * 2 ** Math.min(row.dispatch_count, 6)),
        );
        break;
      }
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DocumentModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          ...getRedisConnection(config),
          connectTimeout: 5000,
          commandTimeout: 10_000,
          enableOfflineQueue: false,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue({ name: DOCUMENT_QUEUE }, { name: RAG_QUEUE }),
  ],
  providers: [
    DocumentExecution,
    DocumentDispatcher,
    DocumentProcessor,
    RagExecution,
    RagDispatcher,
    RagProcessor,
  ],
})
export class DocumentWorkerModule {}
