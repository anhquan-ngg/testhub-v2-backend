import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaService } from './prisma.service';

describe('Prisma deferred effects', () => {
  let service: PrismaService;
  let log: jest.SpyInstance;
  const tx = {} as Prisma.TransactionClient;

  beforeEach(() => {
    // Exercise transaction bookkeeping without constructing a database pool.
    service = Object.assign(
      Object.create(PrismaService.prototype) as PrismaService,
      {
        transactionContext: new AsyncLocalStorage<Prisma.TransactionClient>(),
        commitEffects: new WeakMap(),
        logger: new Logger(PrismaService.name),
      },
    );
    log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('settles every effect, logs each failure and preserves committed success', async () => {
    const ran: number[] = [];
    await service.withTransaction(tx, async () => {
      await service.afterCommit(() => {
        ran.push(0);
        throw new Error('PRIVATE effect details');
      });
      await service.afterCommit(async () => {
        await Promise.resolve();
        ran.push(1);
        throw new Error('PRIVATE async details');
      });
      await service.afterCommit(() => {
        ran.push(2);
      });
    });
    expect(ran).toEqual([]);
    await expect(service.finishEffects(tx, true)).resolves.toBeUndefined();
    expect(ran.sort()).toEqual([0, 1, 2]);
    expect(log.mock.calls).toEqual([
      [{ event: 'after_commit_effect_failed', effect_index: 0 }],
      [{ event: 'after_commit_effect_failed', effect_index: 1 }],
    ]);
    await service.finishEffects(tx, true);
    expect(log).toHaveBeenCalledTimes(2);
    expect(ran).toHaveLength(3);
  });

  it('discards rolled-back effects without executing or logging them', async () => {
    const effect = jest.fn();
    await service.withTransaction(tx, async () => {
      await service.afterCommit(effect);
    });
    await service.finishEffects(tx, false);
    await service.finishEffects(tx, true);
    expect(effect).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('keeps immediate effect errors outside transactions unchanged', async () => {
    await expect(
      service.afterCommit(() => {
        throw new Error('immediate');
      }),
    ).rejects.toThrow('immediate');
  });
});
