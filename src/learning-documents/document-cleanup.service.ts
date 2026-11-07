import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { S3Service } from '../s3/s3.service';
import { DocumentRepository } from './document.repository';
import { uploadAbandonGraceMs } from './document.contract';

const CLEANUP_INTERVAL_MS = 10 * 60_000;
const CLEANUP_BATCH = 25;

/** Reclaims storage of uploads that were never completed. */
@Injectable()
export class DocumentCleanup implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DocumentCleanup.name);
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<void>;
  private stopping = false;
  constructor(
    private readonly repository: DocumentRepository,
    private readonly storage: S3Service,
  ) {}

  /** Start periodic cleanup; each tick is idempotent and safe across processes. */
  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, CLEANUP_INTERVAL_MS);
    void this.tick();
  }

  /** Let an in-flight sweep finish before pools close. */
  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }

  /** Coalesce overlapping local ticks; failures are retried on the next tick. */
  async tick(): Promise<void> {
    if (this.stopping || this.running) return;
    this.running = this.sweep().then(undefined, () => {
      this.logger.warn({ event: 'document_cleanup_deferred' });
    });
    try {
      await this.running;
    } finally {
      this.running = undefined;
    }
  }

  /** Remove the quarantined object first, then fence the row on UPLOADING. */
  async sweep(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - uploadAbandonGraceMs());
    const rows = await this.repository.abandonedUploads(cutoff, CLEANUP_BATCH);
    let expired = 0;
    for (const row of rows) {
      await this.storage.remove(row.upload_key);
      expired += (await this.repository.markUploadExpired(row.id)).count;
    }
    return expired;
  }
}
