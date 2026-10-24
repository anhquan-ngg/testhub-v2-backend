import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import {
  AI_HTTP_FETCH,
  AI_MAX_RESPONSE_BYTES,
  AI_SERVICE_OPTIONS,
} from './ai-service.config';
import type { AiServiceOptions } from './ai-service.config';
import {
  aiGenerateRequestSchema,
  aiGenerateResponseSchema,
  matchesQuestionConfigs,
} from './question-generation.contract';
import type {
  AiGenerateRequest,
  AiGenerateResponse,
} from './question-generation.contract';
import { QuestionGenerationException } from './question-generation.errors';

/** Bounded internal HTTP adapter. Python owns all provider calls and retries. */
@Injectable()
export class AiQuestionClient {
  private readonly logger = new Logger(AiQuestionClient.name);

  constructor(
    @Inject(AI_SERVICE_OPTIONS) private readonly options: AiServiceOptions,
    @Inject(AI_HTTP_FETCH) private readonly httpFetch: typeof fetch,
  ) {}

  private enabledOptions(): Extract<AiServiceOptions, { enabled: true }> {
    if (!this.options.enabled) {
      throw new QuestionGenerationException(
        'AI_GENERATION_DISABLED',
        HttpStatus.SERVICE_UNAVAILABLE,
        'AI question generation is disabled',
      );
    }
    return this.options;
  }

  /** Send one HTTP invocation and validate its complete response within a deadline. */
  async generate(input: AiGenerateRequest): Promise<AiGenerateResponse> {
    const options = this.enabledOptions();
    const request = aiGenerateRequestSchema.safeParse(input);
    if (!request.success) {
      throw new QuestionGenerationException(
        'AI_REQUEST_INVALID',
        HttpStatus.BAD_REQUEST,
        'Invalid internal generation request',
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    let response: Response | undefined;
    try {
      response = await this.httpFetch(options.generateUrl, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Internal-Token': options.token,
        },
        body: JSON.stringify(request.data),
        signal: controller.signal,
      });
      if (controller.signal.aborted) throw this.timeoutError();
      if (response.status !== 200) throw this.upstreamError(response.status);
      if (
        !/^application\/(?:[\w.+-]+\+)?json(?:\s*;|$)/i.test(
          response.headers.get('content-type') ?? '',
        )
      ) {
        throw this.invalidOutput();
      }
      const body = await this.readBoundedBody(response);
      let value: unknown;
      try {
        value = JSON.parse(body);
      } catch {
        throw this.invalidOutput();
      }
      const result = aiGenerateResponseSchema.safeParse(value);
      if (
        !result.success ||
        !matchesQuestionConfigs(
          result.data.questions,
          request.data.question_configs,
        )
      ) {
        throw this.invalidOutput();
      }
      if (controller.signal.aborted) throw this.timeoutError();
      return result.data;
    } catch (error: unknown) {
      const safeError = controller.signal.aborted
        ? this.timeoutError()
        : error instanceof QuestionGenerationException
          ? error
          : new QuestionGenerationException(
              'AI_SERVICE_UNAVAILABLE',
              HttpStatus.SERVICE_UNAVAILABLE,
              'AI generation service could not be reached',
            );
      this.logger.warn({
        event: 'ai_generation_failed',
        code: safeError.code,
        upstream_status: response?.status,
      });
      throw safeError;
    } finally {
      clearTimeout(timer);
      // Abort unread/error bodies too; they may contain input or SDK diagnostics.
      controller.abort();
    }
  }

  private async readBoundedBody(response: Response): Promise<string> {
    const declaredSize = response.headers.get('content-length');
    if (declaredSize && Number(declaredSize) > AI_MAX_RESPONSE_BYTES) {
      throw this.invalidOutput();
    }
    if (!response.body) throw this.invalidOutput();
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > AI_MAX_RESPONSE_BYTES) throw this.invalidOutput();
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(
        Buffer.concat(chunks),
      );
    } catch {
      throw this.invalidOutput();
    }
  }

  private timeoutError(): QuestionGenerationException {
    return new QuestionGenerationException(
      'AI_SERVICE_TIMEOUT',
      HttpStatus.GATEWAY_TIMEOUT,
      'AI generation service timed out',
    );
  }

  private invalidOutput(): QuestionGenerationException {
    return new QuestionGenerationException(
      'AI_OUTPUT_INVALID',
      HttpStatus.BAD_GATEWAY,
      'AI generation service returned invalid questions',
    );
  }

  private upstreamError(status: number): QuestionGenerationException {
    switch (status) {
      case 401:
      case 403:
        return new QuestionGenerationException(
          'AI_SERVICE_AUTH_FAILED',
          HttpStatus.BAD_GATEWAY,
          'AI generation service authentication failed',
        );
      case 422:
        return new QuestionGenerationException(
          'AI_SERVICE_CONTRACT_MISMATCH',
          HttpStatus.BAD_GATEWAY,
          'AI generation service rejected its internal request',
        );
      case 502:
        return new QuestionGenerationException(
          'AI_PROVIDER_FAILED',
          HttpStatus.BAD_GATEWAY,
          'AI provider could not generate valid questions',
        );
      case 429:
      case 503:
        return new QuestionGenerationException(
          'AI_SERVICE_UNAVAILABLE',
          HttpStatus.SERVICE_UNAVAILABLE,
          'AI generation service is unavailable',
        );
      case 504:
        return this.timeoutError();
      default:
        return new QuestionGenerationException(
          'AI_SERVICE_FAILED',
          HttpStatus.BAD_GATEWAY,
          'AI generation service failed',
        );
    }
  }
}
