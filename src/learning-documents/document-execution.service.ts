import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { S3Service } from '../s3/s3.service';
import { DocumentRepository } from './document.repository';
import {
  DocumentClient,
  DocumentProcessingError,
} from './document-client.service';
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_RESULT_MAX_BYTES,
  Extraction,
  extractionQualitySchema,
  extractionSchema,
} from './document.contract';
import {
  OCR_DELIVERY_LIMIT,
  OcrRequest,
  mergeOcrCheckpoint,
  ocrRequestSchema,
} from './document-ocr.contract';

/** Idempotent extraction (optional bounded OCR), independent of the paid generation queue. */
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
    let request: OcrRequest | undefined;
    try {
      if (version.ocr_request)
        request = ocrRequestSchema.parse(version.ocr_request);
      if (!version.source_key || !version.source_sha256)
        throw new DocumentProcessingError('DOCUMENT_SOURCE_MISSING');
      const parent = request
        ? await this.repository.source(ownerId, request.parent_version_id)
        : null;
      if (
        request &&
        (!parent ||
          parent.document_id !== version.document_id ||
          parent.source_sha256 !== version.source_sha256 ||
          !parent.source_key)
      )
        throw new DocumentProcessingError('DOCUMENT_SOURCE_CHANGED');
      const bytes = await this.storage.getBoundedObject(
        request?.deliveries === 0 && parent?.source_key
          ? parent.source_key
          : version.source_key,
        DOCUMENT_MAX_BYTES,
      );
      if (
        createHash('sha256').update(bytes).digest('hex') !==
        version.source_sha256
      )
        throw new DocumentProcessingError('DOCUMENT_SOURCE_CHANGED');
      if (!(await this.repository.active(versionId, executionId, ownerId)))
        return;
      let previous: Extraction | undefined;
      if (request) {
        if (request.deliveries === 0) {
          await this.storage.putBoundedObject(
            version.source_key,
            bytes,
            version.mime_type,
          );
        }
        const checkpoint = version.artifact_key ? version : parent;
        if (!checkpoint?.artifact_key || !checkpoint.artifact_sha256)
          throw new DocumentProcessingError('DOCUMENT_CHECKPOINT_MISSING');
        previous = await this.checkpoint(
          checkpoint.artifact_key,
          checkpoint.artifact_sha256,
        );
        if (
          previous.source_sha256 !== version.source_sha256 ||
          previous.source_type !== version.source_type ||
          previous.include_notes !== version.include_notes
        )
          throw new DocumentProcessingError('DOCUMENT_CHECKPOINT_CHANGED');
      }
      const attempted =
        request?.pages
          .filter((page) => page.status === 'PENDING')
          .slice(0, OCR_DELIVERY_LIMIT)
          .map((page) => page.position) ?? [];
      if (request && !attempted.length)
        throw new DocumentProcessingError('DOCUMENT_OCR_STATE_INVALID');
      if (!(await this.repository.active(versionId, executionId, ownerId)))
        return;
      let result = await this.client.extract(
        bytes,
        version.source_type,
        version.include_notes,
        attempted,
      );
      let pending = false;
      if (request && previous) {
        const merged = mergeOcrCheckpoint({
          previous,
          current: result,
          request,
          attempted,
        });
        result = extractionSchema.parse(merged.extraction);
        request = merged.request;
        pending = merged.pending;
      }
      if (result.source_sha256 !== version.source_sha256)
        throw new DocumentProcessingError('DOCUMENT_OUTPUT_INVALID');
      if (!(await this.repository.active(versionId, executionId, ownerId)))
        return;
      const artifact = Buffer.from(JSON.stringify(result));
      if (artifact.byteLength > DOCUMENT_RESULT_MAX_BYTES)
        throw new DocumentProcessingError('DOCUMENT_OUTPUT_INVALID');
      const key = `learning-documents/${version.document_id}/${versionId}/extraction/${executionId}.json`;
      await this.storage.putBoundedObject(key, artifact, 'application/json');
      await this.repository.finish(
        versionId,
        executionId,
        {
          status: pending ? 'QUEUED' : result.status,
          ...(request
            ? { ocr_request: request, next_dispatch_at: new Date() }
            : {}),
          artifact_key: key,
          artifact_sha256: createHash('sha256').update(artifact).digest('hex'),
          parser_version: result.parser_version,
          unit_count: result.unit_count,
          warnings: result.warnings,
          quality: result.quality ?? Prisma.JsonNull,
          partial_confirmed_at: null,
          error_code:
            request?.status === 'INCOMPLETE' ? 'DOCUMENT_OCR_INCOMPLETE' : null,
        },
        ownerId,
      );
    } catch (error) {
      // A timeout or crash may follow a charged call: only a new explicit request can retry OCR.
      const safe =
        error instanceof DocumentProcessingError
          ? error
          : new DocumentProcessingError('DOCUMENT_STORAGE_UNAVAILABLE', true);
      const retry =
        !version.ocr_request && safe.retryable && version.extraction_count < 3;
      const persistedRequest = ocrRequestSchema.safeParse(version.ocr_request);
      const failedRequest = persistedRequest.success
        ? persistedRequest.data
        : undefined;
      const quality = extractionQualitySchema.safeParse(version.quality);
      const checkpointStatus =
        quality.success && quality.data.text_units > 0
          ? 'PARTIAL'
          : 'OCR_REQUIRED';
      await this.repository.finish(
        versionId,
        executionId,
        {
          status: retry
            ? 'QUEUED'
            : version.ocr_request && version.artifact_key
              ? checkpointStatus
              : 'FAILED',
          ...(failedRequest
            ? {
                ocr_request: {
                  ...failedRequest,
                  status: 'INCOMPLETE',
                  pages: failedRequest.pages.map((page) =>
                    page.status === 'PENDING'
                      ? {
                          position: page.position,
                          status: 'FAILED',
                          reason: 'PROVIDER_ERROR',
                        }
                      : page,
                  ),
                },
              }
            : {}),
          error_code: safe.code,
          next_dispatch_at: new Date(
            Date.now() + 5000 * 2 ** version.extraction_count,
          ),
        },
        ownerId,
      );
    }
  }

  private async checkpoint(key: string, sha256: string): Promise<Extraction> {
    const bytes = await this.storage.getBoundedObject(
      key,
      DOCUMENT_RESULT_MAX_BYTES,
    );
    if (createHash('sha256').update(bytes).digest('hex') !== sha256)
      throw new DocumentProcessingError('DOCUMENT_CHECKPOINT_CHANGED');
    try {
      return extractionSchema.parse(JSON.parse(bytes.toString('utf8')));
    } catch {
      throw new DocumentProcessingError('DOCUMENT_OUTPUT_INVALID');
    }
  }
}
