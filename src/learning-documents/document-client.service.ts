import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readAiServiceOptions } from '../question-generation/ai-service.config';
import {
  DOCUMENT_RESULT_MAX_BYTES,
  Extraction,
  extractionSchema,
} from './document.contract';

/** Allowlisted processing failures; never propagate upstream messages or bodies. */
export class DocumentProcessingError extends Error {
  constructor(
    readonly code: string,
    readonly retryable = false,
  ) {
    super(code);
  }
}

/** Internal binary HTTP client; no source URL, key or browser identity reaches Python. */
@Injectable()
export class DocumentClient {
  private readonly options: ReturnType<typeof readAiServiceOptions>;
  private readonly timeoutMs: number;
  constructor(config: ConfigService) {
    this.options = readAiServiceOptions(config);
    const raw = config.get<string>('DOCUMENT_SERVICE_TIMEOUT_MS') ?? '55000';
    this.timeoutMs = Number(raw);
    if (!/^\d+$/.test(raw) || this.timeoutMs < 100 || this.timeoutMs > 55_000)
      throw new Error(
        'DOCUMENT_SERVICE_TIMEOUT_MS must be between 100 and 55000',
      );
  }

  /** Reject new uploads if internal integration configuration is disabled. */
  get enabled(): boolean {
    return this.options.enabled;
  }

  /** Send exactly one extraction invocation; the durable worker bounds retries. */
  async extract(
    bytes: Buffer,
    sourceType: 'PDF' | 'PPTX',
    includeNotes: boolean,
  ): Promise<Extraction> {
    if (!this.options.enabled)
      throw new DocumentProcessingError('DOCUMENT_SERVICE_DISABLED');
    const url = new URL(
      '/internal/documents/extract',
      this.options.generateUrl,
    );
    url.searchParams.set('source_type', sourceType);
    url.searchParams.set('include_notes', String(includeNotes));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'Content-Type': 'application/octet-stream',
          Accept: 'application/json',
          'X-Internal-Token': this.options.token,
        },
        body: new Uint8Array(bytes),
        signal: controller.signal,
      });
      if (!response.ok) {
        const codes: Record<number, string> = {
          401: 'DOCUMENT_SERVICE_AUTH_FAILED',
          403: 'DOCUMENT_SERVICE_AUTH_FAILED',
          413: 'DOCUMENT_LIMIT_EXCEEDED',
          415: 'DOCUMENT_CONTRACT_MISMATCH',
          422: 'DOCUMENT_INVALID',
          429: 'DOCUMENT_SERVICE_BUSY',
          503: 'DOCUMENT_SERVICE_BUSY',
          504: 'DOCUMENT_TIMEOUT',
        };
        throw new DocumentProcessingError(
          codes[response.status] ?? 'DOCUMENT_SERVICE_FAILED',
          [429, 502, 503, 504].includes(response.status),
        );
      }
      if (
        !/^application\/json(?:;|$)/i.test(
          response.headers.get('content-type') ?? '',
        ) ||
        Number(response.headers.get('content-length') ?? 0) >
          DOCUMENT_RESULT_MAX_BYTES ||
        !response.body
      )
        throw new DocumentProcessingError('DOCUMENT_OUTPUT_INVALID');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > DOCUMENT_RESULT_MAX_BYTES)
            throw new DocumentProcessingError('DOCUMENT_OUTPUT_INVALID');
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const result = extractionSchema.safeParse(
        JSON.parse(Buffer.concat(chunks).toString('utf8')),
      );
      if (
        !result.success ||
        result.data.source_type !== sourceType ||
        result.data.include_notes !== includeNotes
      )
        throw new DocumentProcessingError('DOCUMENT_OUTPUT_INVALID');
      return result.data;
    } catch (error) {
      if (error instanceof DocumentProcessingError) throw error;
      if (controller.signal.aborted)
        throw new DocumentProcessingError('DOCUMENT_TIMEOUT', true);
      if (error instanceof SyntaxError)
        throw new DocumentProcessingError('DOCUMENT_OUTPUT_INVALID');
      throw new DocumentProcessingError('DOCUMENT_SERVICE_UNAVAILABLE', true);
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
}
