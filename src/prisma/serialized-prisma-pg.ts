import { PrismaPg } from '@prisma/adapter-pg';

type PgAdapter = Awaited<ReturnType<PrismaPg['connect']>>;
type PgTransaction = Awaited<ReturnType<PgAdapter['startTransaction']>>;

function serializeTransaction(transaction: PgTransaction): PgTransaction {
  let tail = Promise.resolve();
  const enqueue = <T>(action: () => Promise<T>): Promise<T> => {
    const result = tail.then(action);
    // A failed query must not prevent subsequent rollback or connection release.
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };

  const wrapped: PgTransaction = {
    provider: transaction.provider,
    adapterName: transaction.adapterName,
    options: transaction.options,
    queryRaw: (query) => enqueue(() => transaction.queryRaw(query)),
    executeRaw: (query) => enqueue(() => transaction.executeRaw(query)),
    commit: () => enqueue(() => transaction.commit()),
    rollback: () => enqueue(() => transaction.rollback()),
  };
  if (transaction.createSavepoint) {
    wrapped.createSavepoint = (name) =>
      enqueue(async () => {
        await transaction.createSavepoint?.(name);
      });
  }
  if (transaction.rollbackToSavepoint) {
    wrapped.rollbackToSavepoint = (name) =>
      enqueue(async () => {
        await transaction.rollbackToSavepoint?.(name);
      });
  }
  if (transaction.releaseSavepoint) {
    wrapped.releaseSavepoint = (name) =>
      enqueue(async () => {
        await transaction.releaseSavepoint?.(name);
      });
  }
  return wrapped;
}

function wrapAdapter(adapter: PgAdapter): PgAdapter {
  const startTransaction = adapter.startTransaction.bind(
    adapter,
  ) as PgAdapter['startTransaction'];
  adapter.startTransaction = async (isolationLevel) =>
    serializeTransaction(await startTransaction(isolationLevel));
  return adapter;
}

/** Serializes transaction I/O while leaving independent pooled queries parallel. */
export class SerializedPrismaPg extends PrismaPg {
  override async connect(): Promise<PgAdapter> {
    return wrapAdapter(await super.connect());
  }

  override async connectToShadowDb(): Promise<PgAdapter> {
    return wrapAdapter(await super.connectToShadowDb());
  }
}
