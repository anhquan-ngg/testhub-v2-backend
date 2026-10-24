import { groundedResponseSchema } from '../question-generation/grounded-generation.contract';
import { matchesQuestionConfigs } from '../question-generation/question-generation.contract';
import type { QuestionConfig } from '../question-generation/question-generation.contract';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readAiServiceOptions } from '../question-generation/ai-service.config';
import { DocumentProcessingError } from './document-client.service';
import {
  ragProfileSchema,
  ragProgressSchema,
  retrieveResponseSchema,
  RagCommand,
  RagProfile,
  RagProgress,
} from './rag.contract';
import type { Extraction } from './document.contract';

/** Safe typed internal JSON client. Never retries a provider invocation here. */
@Injectable()
export class RagClient {
  readonly enabled: boolean;
  private readonly options: ReturnType<typeof readAiServiceOptions>;
  constructor(config: ConfigService) {
    this.options = readAiServiceOptions(config);
    const flag = config.get<string>('AI_RAG_ENABLED') ?? 'false';
    if (!['true', 'false'].includes(flag))
      throw new Error('AI_RAG_ENABLED must be true or false');
    this.enabled = flag === 'true' && this.options.enabled;
  }
  private async request(
    path: string,
    body?: unknown,
    timeout = 55_000,
  ): Promise<unknown> {
    if (!this.enabled || !this.options.enabled)
      throw new DocumentProcessingError('RAG_DISABLED');
    const maximumBytes = path === 'generate' ? 1_048_576 : 256_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(
        new URL(`/internal/rag/${path}`, this.options.generateUrl),
        {
          method: body === undefined ? 'GET' : 'POST',
          redirect: 'error',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Internal-Token': this.options.token,
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      );
      if (response.status === 204) return undefined;
      if (
        !response.headers
          .get('content-type')
          ?.toLowerCase()
          .includes('application/json')
      )
        throw new DocumentProcessingError(
          'RAG_SERVICE_FAILED',
          [429, 502, 503, 504].includes(response.status),
        );
      if (
        !response.body ||
        Number(response.headers.get('content-length') ?? 0) > maximumBytes
      )
        throw new DocumentProcessingError('RAG_OUTPUT_INVALID');
      const reader = response.body.getReader();
      let size = 0;
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > maximumBytes)
            throw new DocumentProcessingError('RAG_OUTPUT_INVALID');
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      let json: unknown;
      try {
        json = JSON.parse(
          new TextDecoder('utf-8', { fatal: true }).decode(
            Buffer.concat(chunks),
          ),
        );
      } catch {
        throw new DocumentProcessingError(
          response.ok ? 'RAG_OUTPUT_INVALID' : 'RAG_SERVICE_FAILED',
          [429, 502, 503, 504].includes(response.status),
        );
      }
      if (!response.ok) {
        const error =
          typeof json === 'object' && json !== null && 'detail' in json
            ? json.detail
            : undefined;
        const code =
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          typeof error.code === 'string' &&
          /^RAG_[A-Z_]{1,60}$/.test(error.code)
            ? error.code
            : 'RAG_SERVICE_FAILED';
        const retry =
          typeof error === 'object' &&
          error !== null &&
          'retryable' in error &&
          error.retryable === true &&
          [429, 502, 503, 504].includes(response.status);
        throw new DocumentProcessingError(code, retry);
      }
      return json;
    } catch (error) {
      if (error instanceof DocumentProcessingError) throw error;
      throw new DocumentProcessingError(
        controller.signal.aborted ? 'RAG_DEADLINE' : 'RAG_SERVICE_UNAVAILABLE',
        true,
      );
    } finally {
      clearTimeout(timer);
      controller.abort();
    }
  }
  /** Fetch current immutable profile; no paid call occurs. */
  async profile(): Promise<RagProfile> {
    const v = ragProfileSchema.safeParse(
      await this.request('profile', undefined, 10_000),
    );
    if (!v.success) throw new DocumentProcessingError('RAG_OUTPUT_INVALID');
    return v.data;
  }
  /** Persist a deterministic chunk plan for the pinned source. */
  async prepare(
    command: RagCommand,
    extraction: Extraction,
  ): Promise<RagProgress> {
    return this.progress(
      command,
      await this.request('prepare', { ...command, extraction }),
    );
  }
  /** Advance at most one provider batch; Python persists its result before replying. */
  async step(command: RagCommand): Promise<RagProgress> {
    return this.progress(command, await this.request('step', command));
  }
  private progress(command: RagCommand, value: unknown): RagProgress {
    const v = ragProgressSchema.safeParse(value);
    if (
      !v.success ||
      v.data.index_id !== command.index_id ||
      v.data.profile_id !== command.profile_id
    )
      throw new DocumentProcessingError('RAG_OUTPUT_INVALID');
    return v.data;
  }
  /** Revoke technical scope, including a tombstone if preparation has not happened. */
  async revoke(command: RagCommand): Promise<void> {
    await this.request('revoke', command);
  }
  /** Return strictly checked scoped source candidates, never a question-bank write. */
  async retrieve(body: {
    owner_id: string;
    profile_id: string;
    index_ids: string[];
    query: string;
    top_k: number;
  }) {
    const v = retrieveResponseSchema.safeParse(
      await this.request('retrieve', body),
    );
    if (
      !v.success ||
      v.data.profile_id !== body.profile_id ||
      v.data.chunks.length > body.top_k ||
      v.data.chunks.some((c) => !body.index_ids.includes(c.index_id))
    )
      throw new DocumentProcessingError('RAG_OUTPUT_INVALID');
    return v.data;
  }
  /** Retrieve and generate cited drafts with one bounded HTTP invocation. */
  async generate(body: {
    owner_id: string;
    profile_id: string;
    index_ids: string[];
    query: string;
    top_k: number;
    question_configs: QuestionConfig[];
  }) {
    const parsed = groundedResponseSchema.safeParse(
      await this.request('generate', body, 85_000),
    );
    if (
      !parsed.success ||
      parsed.data.profile_id !== body.profile_id ||
      !matchesQuestionConfigs(parsed.data.questions, body.question_configs) ||
      parsed.data.questions.some((q) =>
        q.citations.some((c) => !body.index_ids.includes(c.chunk.index_id)),
      )
    )
      throw new DocumentProcessingError('RAG_OUTPUT_INVALID');
    return parsed.data;
  }
}
