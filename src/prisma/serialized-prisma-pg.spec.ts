import { PrismaPg } from '@prisma/adapter-pg';
import { EventEmitter } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import { Pool, PoolClient } from 'pg';
import { SerializedPrismaPg } from './serialized-prisma-pg';

type PgAdapter = Awaited<ReturnType<PrismaPg['connect']>>;

function fakeConnection() {
  let active = 0;
  let peak = 0;
  const statements: string[] = [];
  const query = jest.fn(async (config: { text: string }) => {
    const { text } = config;
    statements.push(text);
    peak = Math.max(peak, ++active);
    try {
      await setImmediate();
      if (text === 'FAIL') {
        throw Object.assign(new Error('synthetic query failure'), {
          code: '23505',
        });
      }
      return { fields: [], rows: [], rowCount: 1 };
    } finally {
      active--;
    }
  });
  const release = jest.fn(() => {
    expect(active).toBe(0);
  });
  const client = Object.assign(new EventEmitter(), { query, release });
  return {
    client: client as unknown as PoolClient,
    query,
    release,
    statements,
    get peak() {
      return peak;
    },
  };
}

const sql = (text: string) => ({ sql: text, args: [], argTypes: [] });

describe('SerializedPrismaPg with the real adapter and an offline driver', () => {
  let pool: Pool;
  let adapter: PgAdapter;
  let connections: ReturnType<typeof fakeConnection>[];

  beforeEach(() => {
    pool = new Pool();
    connections = [];
    const connectable: { connect: () => Promise<PoolClient> } = pool;
    jest.spyOn(connectable, 'connect').mockImplementation(() => {
      const connection = fakeConnection();
      connections.push(connection);
      return Promise.resolve(connection.client);
    });
  });

  afterEach(async () => {
    await adapter?.dispose();
    await pool.end();
    jest.restoreAllMocks();
  });

  it.each([
    [PrismaPg, 3],
    [SerializedPrismaPg, 1],
  ] as const)(
    '%p dispatches concurrent transaction queries with peak %i',
    async (Factory, expectedPeak) => {
      adapter = await new Factory(pool).connect();
      const tx = await adapter.startTransaction('SERIALIZABLE');
      expect(tx.provider).toBe(adapter.provider);
      expect(tx.adapterName).toBe(adapter.adapterName);
      expect(tx.options).toEqual({ usePhantomQuery: false });
      await expect(
        Promise.all([
          tx.queryRaw(sql('SELECT 1')),
          tx.executeRaw(sql('UPDATE synthetic')),
          tx.queryRaw(sql('SELECT 2')),
        ]),
      ).resolves.toEqual([
        { columnNames: [], columnTypes: [], rows: [] },
        1,
        { columnNames: [], columnTypes: [], rows: [] },
      ]);
      await tx.commit();
      expect(connections[0].peak).toBe(expectedPeak);
      expect(connections[0].statements).toEqual([
        'BEGIN',
        'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE',
        'SELECT 1',
        'UPDATE synthetic',
        'SELECT 2',
      ]);
      expect(connections[0].release).toHaveBeenCalledTimes(1);
      expect(connections[0].client.listenerCount('error')).toBe(0);
    },
  );

  it.each(['commit', 'rollback'] as const)(
    'waits for pending queries before %s releases the connection',
    async (finish) => {
      adapter = await new SerializedPrismaPg(pool).connect();
      const tx = await adapter.startTransaction();
      const pending = tx.queryRaw(sql('SELECT pending'));
      const finished = tx[finish]();
      expect(connections[0].release).not.toHaveBeenCalled();
      await Promise.all([pending, finished]);
      expect(connections[0].release).toHaveBeenCalledTimes(1);
      expect(connections[0].peak).toBe(1);
    },
  );

  it('preserves query failures and permits rollback SQL and release afterwards', async () => {
    adapter = await new SerializedPrismaPg(pool).connect();
    const tx = await adapter.startTransaction();
    const failed = expect(tx.queryRaw(sql('FAIL'))).rejects.toThrow();
    const rollbackSql = tx.executeRaw(sql('ROLLBACK'));
    const released = tx.rollback();
    await Promise.all([failed, rollbackSql, released]);
    expect(connections[0].statements).toEqual(['BEGIN', 'FAIL', 'ROLLBACK']);
    expect(connections[0].release).toHaveBeenCalledTimes(1);
    expect(connections[0].peak).toBe(1);
  });

  it('serializes savepoints with queries without deadlocking their internal executeRaw', async () => {
    adapter = await new SerializedPrismaPg(pool).connect();
    const tx = await adapter.startTransaction();
    expect(typeof tx.createSavepoint).toBe('function');
    expect(typeof tx.rollbackToSavepoint).toBe('function');
    expect(typeof tx.releaseSavepoint).toBe('function');
    await Promise.all([
      tx.queryRaw(sql('SELECT before')),
      tx.createSavepoint?.('test_savepoint'),
      tx.executeRaw(sql('UPDATE after_savepoint')),
      tx.rollbackToSavepoint?.('test_savepoint'),
      tx.releaseSavepoint?.('test_savepoint'),
      tx.queryRaw(sql('SELECT after')),
      tx.commit(),
    ]);
    expect(connections[0].statements).toEqual([
      'BEGIN',
      'SELECT before',
      'SAVEPOINT test_savepoint',
      'UPDATE after_savepoint',
      'ROLLBACK TO SAVEPOINT test_savepoint',
      'RELEASE SAVEPOINT test_savepoint',
      'SELECT after',
    ]);
    expect(connections[0].peak).toBe(1);
  });

  it('keeps independent transactions parallel rather than sharing one global queue', async () => {
    adapter = await new SerializedPrismaPg(pool).connect();
    const [first, second] = await Promise.all([
      adapter.startTransaction(),
      adapter.startTransaction(),
    ]);
    let unblock: () => void = () => {};
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    connections[0].query.mockImplementationOnce(async () => {
      await blocked;
      return { fields: [], rows: [], rowCount: 1 };
    });
    const pending = first.queryRaw(sql('SELECT blocked'));
    try {
      await second.queryRaw(sql('SELECT independent'));
      expect(connections[1].statements).toContain('SELECT independent');
    } finally {
      unblock();
      await pending;
      await Promise.all([first.rollback(), second.rollback()]);
    }
  });

  it('leaves pooled queries concurrent and preserves adapter metadata and disposal', async () => {
    const driver = fakeConnection();
    const queryable = pool as unknown as { query: typeof driver.query };
    jest.spyOn(queryable, 'query').mockImplementation(driver.query);
    adapter = await new SerializedPrismaPg(pool).connect();
    expect(adapter.underlyingDriver()).toBe(pool);
    expect(adapter.getConnectionInfo()).toEqual({
      schemaName: undefined,
      supportsRelationJoins: true,
    });
    await Promise.all([
      adapter.queryRaw(sql('SELECT 1')),
      adapter.queryRaw(sql('SELECT 2')),
      adapter.executeRaw(sql('UPDATE synthetic')),
    ]);
    expect(driver.peak).toBe(3);
    expect(connections).toHaveLength(0);
    await adapter.dispose();
    expect(pool.listenerCount('error')).toBe(0);
  });
});
