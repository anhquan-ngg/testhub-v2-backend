import { DocumentGenerationService } from './document-generation.service';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { GenerationDispatcher } from './generation-dispatcher.service';
import { GenerationExecutionService } from './generation-execution.service';
import { GenerationBatchRepository } from './generation-batch.repository';
import { GenerationBatchService } from './generation-batch.service';
import { QuestionGenerationService } from './question-generation.service';
import { readContractFixture } from './fixtures/contract-fixture';

const fixture = readContractFixture();
const enabled = {
  enabled: true as const,
  generateUrl: 'http://127.0.0.1/internal/generate',
  token: 'test-only',
  timeoutMs: 35_000,
};

describe('Generation orchestration failure boundaries', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  function dispatcherSetup(status = 'ready') {
    const repository = {
      staleExecutions: jest.fn().mockResolvedValue([{ id: 'stale-batch' }]),
      dispatchable: jest
        .fn()
        .mockResolvedValue([
          { id: 'outbox', batch_id: 'batch', dispatch_count: 0 },
        ]),
      markDispatch: jest.fn().mockResolvedValue({}),
    };
    const execution = { recover: jest.fn().mockResolvedValue(undefined) };
    const queue = {
      client: Promise.resolve({ status }),
      getJob: jest.fn().mockResolvedValue(null),
      add: jest.fn().mockResolvedValue({}),
    };
    const dispatcher = new GenerationDispatcher(
      repository as unknown as GenerationBatchRepository,
      execution as unknown as GenerationExecutionService,
      queue as unknown as Queue,
      enabled,
    );
    return { repository, execution, queue, dispatcher };
  }

  it('recovers DB leases while Redis is unavailable and issues no queued Redis commands', async () => {
    const { dispatcher, execution, repository, queue } =
      dispatcherSetup('reconnecting');
    await dispatcher.tick();
    expect(execution.recover).toHaveBeenCalledWith('stale-batch');
    expect(repository.dispatchable).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
    await dispatcher.onModuleDestroy();
  });

  it('keeps recovery working when Redis has never connected', async () => {
    const { repository, execution } = dispatcherSetup();
    const queue = { client: new Promise(() => undefined), getJob: jest.fn() };
    const dispatcher = new GenerationDispatcher(
      repository as unknown as GenerationBatchRepository,
      execution as unknown as GenerationExecutionService,
      queue as unknown as Queue,
      enabled,
    );
    await dispatcher.tick();
    expect(execution.recover).toHaveBeenCalledTimes(1);
    expect(queue.getJob).not.toHaveBeenCalled();
    await dispatcher.onModuleDestroy();
  });

  it('records delivery backoff without discarding an accepted command', async () => {
    const { dispatcher, repository, queue } = dispatcherSetup();
    queue.getJob.mockRejectedValue(new Error('private Redis details'));
    await dispatcher.tick();
    expect(repository.markDispatch).toHaveBeenCalledWith(
      'outbox',
      5_000,
      false,
    );
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('coalesces overlapping ticks and publishes only stable IDs with one queue attempt', async () => {
    const { dispatcher, repository, queue } = dispatcherSetup();
    await Promise.all([
      dispatcher.tick(),
      dispatcher.tick(),
      dispatcher.tick(),
    ]);
    expect(repository.dispatchable).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      'generate-text-questions',
      { batchId: 'batch' },
      expect.objectContaining({ jobId: 'generate-batch', attempts: 1 }),
    );
  });

  it('disables creation before touching persistence or the AI adapter', async () => {
    const repository = { create: jest.fn() };
    const generation = { authorizeTarget: jest.fn() };
    const service = new GenerationBatchService(
      repository as unknown as GenerationBatchRepository,
      generation as unknown as QuestionGenerationService,
      { enabled: false },
      {} as DocumentGenerationService,
    );
    await expect(
      service.create(
        { id: 'actor', role: 'LECTURER' },
        fixture.command,
        'a-valid-key-for-tests',
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(repository.create).not.toHaveBeenCalled();
    expect(generation.authorizeTarget).not.toHaveBeenCalled();
  });

  it('sanitizes storage failures before Nest can log source-bearing Prisma errors', async () => {
    const repository = {
      create: jest.fn().mockRejectedValue(new Error('private source and SQL')),
    };
    const generation = {
      parseCommand: jest.fn().mockReturnValue(fixture.command),
      authorizeTarget: jest.fn().mockResolvedValue({}),
    };
    const service = new GenerationBatchService(
      repository as unknown as GenerationBatchRepository,
      generation as unknown as QuestionGenerationService,
      enabled,
      {} as DocumentGenerationService,
    );
    await expect(
      service.create(
        { id: 'actor', role: 'LECTURER' },
        fixture.command,
        'a-valid-key-for-tests',
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private');
  });

  it.each(['P2021', 'P2022'])(
    'reports %s and the failing operation without source-bearing Prisma metadata',
    async (code) => {
      const repository = {
        list: jest.fn().mockRejectedValue(
          new Prisma.PrismaClientKnownRequestError('private source and SQL', {
            clientVersion: 'test',
            code,
            meta: { table: 'private database metadata' },
          }),
        ),
      };
      const service = new GenerationBatchService(
        repository as unknown as GenerationBatchRepository,
        {} as QuestionGenerationService,
        enabled,
        {} as DocumentGenerationService,
      );
      await expect(
        service.list({ id: 'actor', role: 'LECTURER' }),
      ).rejects.toMatchObject({ status: 503 });
      expect(warn).toHaveBeenCalledWith({
        event: 'ai_staging_storage_unavailable',
        operation: 'list_batches',
        error_type: 'PrismaClientKnownRequestError',
        prisma_code: code,
      });
      expect(JSON.stringify(warn.mock.calls)).not.toContain('private');
    },
  );

  it('classifies initialization/validation errors without logging arbitrary exception names or codes', async () => {
    const repository = { findOwned: jest.fn() };
    const service = new GenerationBatchService(
      repository as unknown as GenerationBatchRepository,
      {} as QuestionGenerationService,
      enabled,
      {} as DocumentGenerationService,
    );
    const cases = [
      {
        error: new Prisma.PrismaClientInitializationError(
          'private URL',
          'test',
          'P1001',
        ),
        type: 'PrismaClientInitializationError',
        code: 'P1001',
      },
      {
        error: new Prisma.PrismaClientValidationError('private query', {
          clientVersion: 'test',
        }),
        type: 'PrismaClientValidationError',
      },
      {
        error: Object.assign(new TypeError('private source'), {
          name: 'private exception name',
        }),
        type: 'TypeError',
      },
      {
        error: new Prisma.PrismaClientKnownRequestError('private source', {
          clientVersion: 'test',
          code: 'private invalid code',
        }),
        type: 'PrismaClientKnownRequestError',
      },
    ];
    for (const example of cases) {
      repository.findOwned.mockRejectedValue(example.error);
      await expect(
        service.findOne({ id: 'actor', role: 'LECTURER' }, 'batch'),
      ).rejects.toMatchObject({ status: 503 });
      expect(warn).toHaveBeenLastCalledWith({
        event: 'ai_staging_storage_unavailable',
        operation: 'get_batch',
        error_type: example.type,
        ...(example.code ? { prisma_code: example.code } : {}),
      });
    }
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private');
  });

  it('retries a result write only three times, never repeating the provider invocation', async () => {
    const repository = {
      executionInput: jest.fn().mockResolvedValue({
        status: 'QUEUED',
        creator: { id: 'actor', role: 'LECTURER', status: 'ACTIVE' },
        ...fixture.command,
        created_by: 'actor',
        source_text: fixture.command.source.text,
        requested_count: 1,
        consented_at: new Date(),
      }),
      claim: jest.fn().mockResolvedValue('execution'),
      saveResult: jest
        .fn()
        .mockRejectedValue(new Error('private database data')),
      finish: jest.fn(),
      fail: jest.fn(),
    };
    const generation = {
      generateDrafts: jest.fn().mockResolvedValue(fixture.internal_response),
    };
    const execution = new GenerationExecutionService(
      repository as unknown as GenerationBatchRepository,
      generation as unknown as QuestionGenerationService,
      {} as DocumentGenerationService,
    );
    await expect(execution.process('batch')).rejects.toThrow(
      'AI persistence deferred',
    );
    expect(repository.saveResult).toHaveBeenCalledTimes(3);
    expect(generation.generateDrafts).toHaveBeenCalledTimes(1);
    expect(repository.fail).not.toHaveBeenCalled();
    expect(repository.finish).not.toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private');
  });
});
