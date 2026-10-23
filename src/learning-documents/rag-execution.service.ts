import { Injectable } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { S3Service } from '../s3/s3.service';
import { RagRepository } from './rag.repository';
import { RagClient } from './rag-client.service';
import { DocumentProcessingError } from './document-client.service';
import { extractionSchema } from './document.contract';
import { RagCommand, RagProgress } from './rag.contract';

type IndexRow = NonNullable<Awaited<ReturnType<RagRepository['claim']>>>;
/** Derive internal scope solely from persisted business metadata. */
export function indexCommand(row: IndexRow): RagCommand {
  return {
    index_id: row.id,
    profile_id: row.profile_id,
    scope: {
      owner_id: row.owner_id,
      topic_id: row.version.document.topic_id,
      chapter_id: row.version.document.chapter_id,
      document_id: row.version.document_id,
      version_id: row.version_id,
    },
  };
}
/** Execute one preparation or embedding checkpoint per queue delivery. */
@Injectable()
export class RagExecution {
  constructor(
    private readonly repository: RagRepository,
    private readonly storage: S3Service,
    private readonly client: RagClient,
  ) {}
  /** Fence late output and recover transient failures without discarding prior vectors. */
  async process(id: string): Promise<void> {
    const token = randomUUID();
    const row = await this.repository.claim(id, token);
    if (!row) return;
    try {
      const command = indexCommand(row);
      if (!(await this.repository.active(id, token, row.owner_id))) return;
      let result: RagProgress;
      if (!row.prepared) {
        const v = row.version;
        if (!v.artifact_key || !v.artifact_sha256)
          throw new DocumentProcessingError('RAG_SOURCE_MISSING');
        const bytes = await this.storage.getBoundedObject(
          v.artifact_key,
          8 * 1024 * 1024,
        );
        if (
          createHash('sha256').update(bytes).digest('hex') !== v.artifact_sha256
        )
          throw new DocumentProcessingError('RAG_SOURCE_CHANGED');
        const extraction = extractionSchema.safeParse(
          JSON.parse(
            new TextDecoder('utf-8', { fatal: true }).decode(bytes),
          ) as unknown,
        );
        if (
          !extraction.success ||
          extraction.data.status !== 'EXTRACTED' ||
          extraction.data.source_sha256 !== v.source_sha256 ||
          extraction.data.parser_version !== v.parser_version ||
          extraction.data.include_notes !== v.include_notes ||
          extraction.data.source_type !== v.source_type
        )
          throw new DocumentProcessingError('RAG_SOURCE_INVALID');
        if (!(await this.repository.active(id, token, row.owner_id))) return;
        result = await this.client.prepare(command, extraction.data);
      } else result = await this.client.step(command);
      if (result.status === 'REVOKED')
        throw new DocumentProcessingError('RAG_SCOPE_UNAVAILABLE');
      await this.repository.finish(id, token, row.owner_id, {
        prepared: true,
        status: result.status === 'READY' ? 'READY' : 'QUEUED',
        chunk_count: result.chunk_count,
        completed_chunks: result.completed_chunks,
        failure_count: 0,
        error_code: null,
        next_dispatch_at: new Date(),
      });
    } catch (error) {
      const safe =
        error instanceof DocumentProcessingError
          ? error
          : new DocumentProcessingError('RAG_STORAGE_UNAVAILABLE', true);
      const failures = row.failure_count + 1;
      await this.repository.finish(id, token, row.owner_id, {
        status: safe.retryable && failures < 3 ? 'QUEUED' : 'FAILED',
        failure_count: failures,
        error_code: safe.code,
        next_dispatch_at: new Date(Date.now() + 5000 * 2 ** failures),
      });
    }
  }
  /** Persist remote tombstones independently, backing off failed deliveries per row. */
  async revoke(): Promise<void> {
    for (const row of await this.repository.revoked()) {
      try {
        await this.client.revoke(indexCommand(row));
        await this.repository.acknowledged(row.id);
      } catch {
        await this.repository.deferRevocation(row.id, row.failure_count);
      }
    }
  }
}
