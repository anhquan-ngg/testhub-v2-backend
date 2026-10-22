import { Logger } from '@nestjs/common';
import type { Queue, RedisClient } from 'bullmq';
import { RagDispatcher } from './rag.worker';
import { RagRepository } from './rag.repository';
import { RagClient } from './rag-client.service';
import { RagExecution } from './rag-execution.service';

describe('RAG dispatcher availability', () => {
  const setup = (client: Promise<RedisClient>) => {
    const repository = {
      recover: jest.fn().mockResolvedValue(undefined),
      due: jest.fn().mockResolvedValue([{ id: 'index', step_count: 2 }]),
      dispatched: jest.fn().mockResolvedValue(undefined),
    };
    const queue = {
      client,
      getJob: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockResolvedValue(undefined),
    };
    const execution = { revoke: jest.fn().mockResolvedValue(undefined) };
    const dispatcher = new RagDispatcher(
      repository as unknown as RagRepository,
      { enabled: true } as RagClient,
      execution as unknown as RagExecution,
      queue as unknown as Queue,
    );
    return { dispatcher, repository, queue, execution };
  };
  beforeEach(() =>
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {}),
  );
  afterEach(() => jest.restoreAllMocks());

  it('continues lease recovery and shutdown while initial Redis never resolves', async () => {
    const { dispatcher, repository, queue } = setup(new Promise(() => {}));
    await dispatcher.tick();
    await dispatcher.tick();
    await dispatcher.onModuleDestroy();
    expect(repository.recover).toHaveBeenCalledTimes(2);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('handles Redis initialization rejection without blocking later ticks', async () => {
    const { dispatcher, repository } = setup(
      Promise.reject(new Error('offline')),
    );
    await dispatcher.tick();
    await dispatcher.tick();
    expect(repository.recover).toHaveBeenCalledTimes(2);
  });

  it('dispatches indexing even when revocation fails', async () => {
    const { dispatcher, repository, execution, queue } = setup(
      Promise.resolve({ status: 'ready' } as RedisClient),
    );
    execution.revoke.mockRejectedValue(new Error('revocation unavailable'));
    await dispatcher.tick();
    expect(queue.add).toHaveBeenCalledWith(
      'index-step',
      { indexId: 'index' },
      expect.objectContaining({ jobId: 'index-index-2', attempts: 1 }),
    );
    expect(repository.dispatched).toHaveBeenCalledWith('index', 2);
  });
});
