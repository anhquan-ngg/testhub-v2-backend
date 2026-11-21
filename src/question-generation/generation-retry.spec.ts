import { HttpStatus } from '@nestjs/common';
import { GenerationExecutionService } from './generation-execution.service';
import type { QuestionGenerationService } from './question-generation.service';
import type { DocumentGenerationService } from './document-generation.service';
import {
  isSafeToRetryGeneration,
  QuestionGenerationException,
} from './question-generation.errors';
import {
  AI_MAX_GENERATION_RETRIES,
  generationRetryDelayMs,
} from './question-generation.constants';
import { PrismaService } from '../prisma/prisma.service';
import { GenerationBatchRepository } from './generation-batch.repository';
import { readContractFixture } from './fixtures/contract-fixture';

describe('Transient AI failure retry', () => {
  const fixture = readContractFixture();
  let repo: Record<string, jest.Mock>;
  let docs: { generate: jest.Mock };
  let execution: GenerationExecutionService;
  const failure = (retryable: boolean, code = 'AI_SERVICE_FAILED' as const) =>
    new QuestionGenerationException(
      code,
      HttpStatus.BAD_GATEWAY,
      'failed',
      undefined,
      retryable,
    );

  beforeEach(() => {
    repo = {
      executionInput: jest.fn().mockResolvedValue({
        status: 'QUEUED',
        created_at: new Date(),
        created_by: 'owner',
        source_mode: 'document',
        generation_retry_count: 1,
        creator: { id: 'owner', role: 'LECTURER', status: 'ACTIVE' },
        requested_count: 1,
        question_configs: fixture.command.question_configs,
      }),
      claim: jest.fn().mockResolvedValue('execution'),
      requeueForRetry: jest.fn().mockResolvedValue(true),
      fail: jest.fn(),
      saveResult: jest.fn(),
      finish: jest.fn(),
    };
    docs = { generate: jest.fn() };
    execution = new GenerationExecutionService(
      repo as unknown as GenerationBatchRepository,
      {
        authorizeTarget: jest.fn().mockResolvedValue({ topic: { name: 'T' } }),
      } as unknown as QuestionGenerationService,
      docs as unknown as DocumentGenerationService,
    );
  });

  it('re-queues a retryable failure with backoff instead of failing the batch', async () => {
    docs.generate.mockRejectedValue(failure(true));
    await execution.process('batch');
    expect(repo.requeueForRetry).toHaveBeenCalledWith(
      'batch',
      'execution',
      'AI_SERVICE_FAILED',
      expect.any(Number),
      AI_MAX_GENERATION_RETRIES,
    );
    expect(repo.fail).not.toHaveBeenCalled();
  });

  it('fails the batch when the retry budget is exhausted', async () => {
    docs.generate.mockRejectedValue(failure(true));
    repo.requeueForRetry.mockResolvedValue(false);
    await execution.process('batch');
    expect(repo.fail).toHaveBeenCalledWith(
      'batch',
      'execution',
      'AI_SERVICE_FAILED',
    );
  });

  it('never retries non-retryable failures', async () => {
    docs.generate.mockRejectedValue(failure(false));
    await execution.process('batch');
    expect(repo.requeueForRetry).not.toHaveBeenCalled();
    expect(repo.fail).toHaveBeenCalled();
  });

  it('only treats pre-generation codes as safe to retry', () => {
    expect(
      isSafeToRetryGeneration({
        code: 'RAG_EMBEDDING_RATE_LIMITED',
        retryable: true,
      }),
    ).toBe(true);
    expect(
      isSafeToRetryGeneration({ code: 'RAG_DEADLINE', retryable: true }),
    ).toBe(false);
    expect(
      isSafeToRetryGeneration({
        code: 'RAG_EMBEDDING_QUOTA_EXHAUSTED',
        retryable: true,
      }),
    ).toBe(false);
    expect(
      isSafeToRetryGeneration({
        code: 'RAG_EMBEDDING_RATE_LIMITED',
        retryable: false,
      }),
    ).toBe(false);
  });

  it.each([true, false])(
    'honors the upstream pre-model storage guarantee retryable=%s',
    (retryable) => {
      expect(
        isSafeToRetryGeneration({ code: 'RAG_STORAGE_UNAVAILABLE', retryable }),
      ).toBe(retryable);
    },
  );

  it('backs off exponentially with jitter and a cap', () => {
    const mid = () => 0.5;
    expect(generationRetryDelayMs(0, mid)).toBe(15_000);
    expect(generationRetryDelayMs(1, mid)).toBe(30_000);
    expect(generationRetryDelayMs(10, mid)).toBe(120_000);
    expect(generationRetryDelayMs(0, () => 0)).toBe(12_000);
  });
});

describe('GenerationBatchRepository.requeueForRetry', () => {
  const build = (count: number) => {
    const tx = {
      questionGenerationBatch: {
        updateMany: jest.fn().mockResolvedValue({ count }),
      },
      questionGenerationAttempt: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      questionGenerationOutbox: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: (operation: (value: typeof tx) => unknown) =>
        Promise.resolve(operation(tx)),
    } as unknown as PrismaService;
    return { tx, repository: new GenerationBatchRepository(prisma) };
  };

  it('fences on execution, status, retry cap and empty result, then schedules redispatch', async () => {
    const { tx, repository } = build(1);
    await expect(
      repository.requeueForRetry('b', 'e', 'AI_SERVICE_FAILED', 5000, 3),
    ).resolves.toBe(true);
    const call = (
      tx.questionGenerationBatch.updateMany.mock.calls as unknown[][]
    )[0][0] as {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    };
    expect(call.where).toMatchObject({
      id: 'b',
      execution_id: 'e',
      status: 'GENERATING',
      generation_retry_count: { lt: 3 },
    });
    expect(call.data).toMatchObject({
      status: 'QUEUED',
      execution_id: null,
      generation_retry_count: { increment: 1 },
    });
    expect(tx.questionGenerationAttempt.deleteMany).toHaveBeenCalled();
    expect(tx.questionGenerationOutbox.updateMany).toHaveBeenCalled();
  });

  it('changes nothing when the fence or cap rejects the requeue', async () => {
    const { tx, repository } = build(0);
    await expect(
      repository.requeueForRetry('b', 'e', 'AI_SERVICE_FAILED', 5000, 3),
    ).resolves.toBe(false);
    expect(tx.questionGenerationAttempt.deleteMany).not.toHaveBeenCalled();
    expect(tx.questionGenerationOutbox.updateMany).not.toHaveBeenCalled();
  });
});

describe('GenerationBatchRepository.markDispatch', () => {
  it.each([true, false])(
    'does not replace a retry schedule after delivery success=%s',
    async (success) => {
      const observed = new Date('2026-01-01T00:00:00Z');
      const rescheduled = new Date(observed.getTime() + 30_000);
      const row = {
        next_dispatch_at: rescheduled,
        error_code: 'AI_SERVICE_FAILED',
      };
      const updateMany = jest
        .fn()
        .mockImplementation(
          (query: {
            where: { id: string; next_dispatch_at?: Date };
            data: typeof row;
          }) => {
            if (
              query.where.next_dispatch_at &&
              query.where.next_dispatch_at.getTime() !==
                row.next_dispatch_at.getTime()
            )
              return Promise.resolve({ count: 0 });
            Object.assign(row, query.data);
            return Promise.resolve({ count: 1 });
          },
        );
      const repository = new GenerationBatchRepository({
        questionGenerationOutbox: { updateMany },
      } as unknown as PrismaService);
      await expect(
        repository.markDispatch('o', 60_000, success, observed),
      ).resolves.toEqual({ count: 0 });
      expect(updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'o', next_dispatch_at: observed },
        }),
      );
      expect(row).toEqual({
        next_dispatch_at: rescheduled,
        error_code: 'AI_SERVICE_FAILED',
      });
    },
  );

  it.each([true, false])(
    'records unchanged delivery success=%s',
    async (success) => {
      const observed = new Date('2026-01-01T00:00:00Z');
      const updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const repository = new GenerationBatchRepository({
        questionGenerationOutbox: { updateMany },
      } as unknown as PrismaService);
      await expect(
        repository.markDispatch('o', 60_000, success, observed),
      ).resolves.toEqual({ count: 1 });
      expect(updateMany).toHaveBeenCalledWith({
        where: { id: 'o', next_dispatch_at: observed },
        data: {
          dispatch_count: { increment: 1 },
          next_dispatch_at: expect.any(Date) as unknown,
          ...(success ? { dispatched_at: expect.any(Date) as unknown } : {}),
          error_code: success ? null : 'QUEUE_UNAVAILABLE',
        },
      });
    },
  );
});
