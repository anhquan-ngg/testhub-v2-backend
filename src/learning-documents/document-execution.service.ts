import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { S3Service } from '../s3/s3.service';
import { DocumentRepository } from './document.repository';
import {
  DocumentClient,
  DocumentProcessingError,
} from './document-client.service';
import { DOCUMENT_MAX_BYTES } from './document.contract';

/** Idempotent pure extraction, independent of the paid generation queue. */
@Injectable()
export class DocumentExecution {
  constructor(
    private readonly repository: DocumentRepository,
    private readonly storage: S3Service,
    private readonly client: DocumentClient,
  ) {}

  /** Claim once per delivery and publish only under a live, authorized execution lease. */
  async process(versionId: string): Promise<void> {
    const executionId = randomUUID();
    const version = await this.repository.claim(versionId, executionId);
    if (!version) return;
    const ownerId = version.document.created_by;
    try {
      if (!version.source_key || !version.source_sha256)
        throw new DocumentProcessingError('DOCUMENT_SOURCE_MISSING');
      const bytes = await this.storage.getBoundedObject(
        version.source_key,
        DOCUMENT_MAX_BYTES,
      );
      if (
        createHash('sha256').update(bytes).digest('hex') !==
        version.source_sha256
      )
        throw new DocumentProcessingError('DOCUMENT_SOURCE_CHANGED');
      if (!(await this.repository.active(versionId, executionId, ownerId)))
        return;
      const result = await this.client.extract(
        bytes,
        version.source_type,
        version.include_notes,
      );
      if (result.source_sha256 !== version.source_sha256)
        throw new DocumentProcessingError('DOCUMENT_OUTPUT_INVALID');
      if (!(await this.repository.active(versionId, executionId, ownerId)))
        return;
      const artifact = Buffer.from(JSON.stringify(result));
      const key = `learning-documents/${version.document_id}/${versionId}/extraction/${executionId}.json`;
      await this.storage.putBoundedObject(key, artifact, 'application/json');
      await this.repository.finish(
        versionId,
        executionId,
        {
          status: result.status,
          artifact_key: key,
          artifact_sha256: createHash('sha256').update(artifact).digest('hex'),
          parser_version: result.parser_version,
          unit_count: result.unit_count,
          warnings: result.warnings,
          error_code: null,
        },
        ownerId,
      );
    } catch (error) {
      // A DB/S3 ambiguity is safe to retry: this pipeline performs no paid calls.
      const safe =
        error instanceof DocumentProcessingError
          ? error
          : new DocumentProcessingError('DOCUMENT_STORAGE_UNAVAILABLE', true);
      const retry = safe.retryable && version.extraction_count < 3;
      await this.repository.finish(
        versionId,
        executionId,
        {
          status: retry ? 'QUEUED' : 'FAILED',
          error_code: safe.code,
          next_dispatch_at: new Date(
            Date.now() + 5000 * 2 ** version.extraction_count,
          ),
        },
        ownerId,
      );
    }
  }
}
