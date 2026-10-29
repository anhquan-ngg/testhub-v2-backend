import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SerializedPrismaPg } from './serialized-prisma-pg';
import { Pool } from 'pg';
import { Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;
  private readonly rootClient: Prisma.TransactionClient;
  private closed = false;
  private readonly logger = new Logger(PrismaService.name);
  private readonly transactionContext =
    new AsyncLocalStorage<Prisma.TransactionClient>();
  private readonly commitEffects = new WeakMap<
    Prisma.TransactionClient,
    Array<() => void | Promise<unknown>>
  >();

  /** Uses the request's fenced transaction when one is active. */
  get current(): Prisma.TransactionClient {
    return this.transactionContext.getStore() ?? this.rootClient;
  }

  /** Runs database operations in the already locked student transaction. */
  withTransaction<T>(
    tx: Prisma.TransactionClient,
    action: () => Promise<T>,
  ): Promise<T> {
    this.commitEffects.set(tx, []);
    return this.transactionContext.run(tx, action);
  }

  /** Defers queue and realtime effects until a fenced mutation has committed. */
  async afterCommit(action: () => void | Promise<unknown>): Promise<void> {
    const tx = this.transactionContext.getStore();
    if (tx) this.commitEffects.get(tx)?.push(action);
    else await action();
  }

  /** Releases effects after commit, or discards them after rollback. */
  async finishEffects(
    tx: Prisma.TransactionClient,
    committed: boolean,
  ): Promise<void> {
    const effects = this.commitEffects.get(tx) ?? [];
    this.commitEffects.delete(tx);
    if (committed) {
      const results = await Promise.allSettled(
        effects.map((action) => Promise.resolve().then(action)),
      );
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.error({
            event: 'after_commit_effect_failed',
            effect_index: index,
          });
        }
      });
    }
  }

  /** Reuses an enclosing transaction instead of starting an independent nested one. */
  inTransaction<T>(
    action: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const tx = this.transactionContext.getStore();
    return tx ? action(tx) : this.$transaction(action);
  }

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    const pool = new Pool({ connectionString });
    const adapter = new SerializedPrismaPg(pool);

    super({
      adapter,
    });
    this.pool = pool;
    // Keep the public Prisma proxy; getters may otherwise receive its raw target.
    this.rootClient = this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    if (this.closed) return;
    this.closed = true;
    await this.$disconnect();
    await this.pool.end();
  }
}
