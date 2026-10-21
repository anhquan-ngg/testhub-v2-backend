import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma, UserRole } from '@prisma/client';
import { AI_SERVICE_OPTIONS } from './ai-service.config';
import type { AiServiceOptions } from './ai-service.config';
import { GenerationBatchRepository } from './generation-batch.repository';
import { QuestionGenerationService } from './question-generation.service';
import type { GenerationActor } from './question-generation.service';

type StorageOperation =
  | 'authorize_target'
  | 'create_batch'
  | 'get_batch'
  | 'list_batches'
  | 'list_items';

/** Public batch use cases; queue dispatch is performed from the durable outbox. */
@Injectable()
export class GenerationBatchService {
  private readonly logger = new Logger(GenerationBatchService.name);
  constructor(
    private readonly repository: GenerationBatchRepository,
    private readonly generation: QuestionGenerationService,
    @Inject(AI_SERVICE_OPTIONS) private readonly options: AiServiceOptions,
  ) {}

  /** Persist a command without waiting for Redis, FastAPI or the provider. */
  async create(
    actor: GenerationActor,
    input: unknown,
    key: string | undefined,
  ) {
    this.assertLecturer(actor);
    if (!this.options.enabled)
      throw new ServiceUnavailableException(
        'AI question generation is disabled',
      );
    if (!key || !/^[A-Za-z0-9._-]{16,128}$/.test(key)) {
      throw new BadRequestException(
        'Idempotency-Key must contain 16-128 letters, digits, dots, underscores or hyphens',
      );
    }
    const command = this.generation.parseCommand(input);
    await this.storage('authorize_target', () =>
      this.generation.authorizeTarget(actor, command),
    );
    // Explicit canonical order: semantically identical commands have the same hash.
    const canonical = {
      contract_version: 'text-generation.v1',
      topic_id: command.topic_id,
      chapter_id: command.chapter_id,
      source: command.source,
      question_type: command.question_type,
      question_format: command.question_format,
      count: command.count,
      language: command.language,
      external_processing_consent: command.external_processing_consent,
    };
    const hash = createHash('sha256')
      .update(JSON.stringify(canonical))
      .digest('hex');
    const batch = await this.storage('create_batch', () =>
      this.repository.create({
        ownerId: actor.id,
        key,
        hash,
        command,
      }),
    );
    return {
      batch_id: batch.id,
      status: batch.status,
      status_url: `/question-generation-batches/${batch.id}`,
    };
  }

  /** Poll persisted state with the same owner policy as item reads. */
  async findOne(actor: GenerationActor, id: string) {
    this.assertLecturer(actor);
    const batch = await this.storage('get_batch', () =>
      this.repository.findOwned(actor.id, id),
    );
    if (!batch)
      throw new NotFoundException('Question generation batch not found');
    return batch;
  }

  /** List current owned batches for resumable review. */
  async list(actor: GenerationActor, page = 1, limit = 20, topicId?: string) {
    this.assertLecturer(actor);
    this.pagination(page, limit);
    return this.storage('list_batches', () =>
      this.repository.list(actor.id, page, limit, topicId),
    );
  }

  /** Return current drafts, including review/commit metadata. */
  async items(actor: GenerationActor, id: string, page = 1, limit = 20) {
    await this.findOne(actor, id);
    this.pagination(page, limit);
    return this.storage('list_items', () =>
      this.repository.items(actor.id, id, page, limit),
    );
  }

  private pagination(page: number, limit: number) {
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1_000_000 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new BadRequestException('Invalid pagination');
    }
  }

  private async storage<T>(
    operationName: StorageOperation,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      // Prisma's detailed exceptions may contain the entire source/result. Do
      // not pass them to Nest's default exception logger or the HTTP response.
      let errorType = 'UnknownError';
      let code: string | undefined;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        errorType = 'PrismaClientKnownRequestError';
        code = error.code;
      } else if (error instanceof Prisma.PrismaClientInitializationError) {
        errorType = 'PrismaClientInitializationError';
        code = error.errorCode;
      } else if (error instanceof Prisma.PrismaClientValidationError) {
        errorType = 'PrismaClientValidationError';
      } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
        errorType = 'PrismaClientUnknownRequestError';
      } else if (error instanceof TypeError) {
        errorType = 'TypeError';
      } else if (error instanceof Error) {
        errorType = 'Error';
      }
      // Allowlist codes/types; never emit name/message/stack/meta from the error.
      this.logger.warn({
        event: 'ai_staging_storage_unavailable',
        operation: operationName,
        error_type: errorType,
        ...(code && /^P\d{4}$/.test(code) ? { prisma_code: code } : {}),
      });
      throw new ServiceUnavailableException(
        'Question generation storage is temporarily unavailable',
      );
    }
  }

  private assertLecturer(actor: GenerationActor) {
    if (!actor?.id || actor.role !== UserRole.LECTURER) {
      throw new ForbiddenException(
        'AI question generation requires a lecturer',
      );
    }
  }
}
