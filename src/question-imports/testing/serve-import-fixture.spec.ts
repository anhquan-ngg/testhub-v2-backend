import {
  startImportApplication,
  startImportDatabase,
} from './import-api.harness';
import { main } from './serve-import-fixture';

jest.mock('./import-api.harness');

/** Hold one initialization step until the test resolves or rejects it. */
function deferred<T>() {
  let resolve!: (value: T) => void; // Assigned synchronously by the executor.
  let reject!: (reason: Error) => void; // Assigned synchronously by the executor.
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('Import fixture startup shutdown', () => {
  const startDatabase = jest.mocked(startImportDatabase);
  const startApplication = jest.mocked(startImportApplication);
  let signals: Map<string | symbol, () => void>;
  let log: jest.SpyInstance;
  let databaseClose: jest.Mock;
  let applicationClose: jest.Mock;
  let database: Awaited<ReturnType<typeof startImportDatabase>>;
  let application: Awaited<ReturnType<typeof startImportApplication>>;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.replaceProperty(process, 'argv', [process.execPath, 'fixture']);
    signals = new Map();
    jest.spyOn(process, 'once').mockImplementation((event, listener) => {
      signals.set(event, listener);
      return process;
    });
    jest.spyOn(process, 'off').mockImplementation((event) => {
      signals.delete(event);
      return process;
    });
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    databaseClose = jest.fn().mockResolvedValue(undefined);
    applicationClose = jest.fn().mockResolvedValue(undefined);
    database = {
      prisma: {},
      name: 'synthetic',
      close: databaseClose,
    } as unknown as typeof database;
    application = {
      baseUrl: 'http://127.0.0.1:1234',
      owner: 'synthetic',
      topic: { id: 'topic' },
      chapter: { id: 'chapter' },
      close: applicationClose,
    } as unknown as typeof application;
    startDatabase.mockResolvedValue(database);
    startApplication.mockResolvedValue(application);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each(['SIGINT', 'SIGTERM'])(
    'waits for database startup on %s without opening the application',
    async (signal) => {
      const pending = deferred<typeof database>();
      startDatabase.mockImplementation(() => {
        expect(signals.has('SIGINT')).toBe(true);
        expect(signals.has('SIGTERM')).toBe(true);
        return pending.promise;
      });
      const running = main();
      signals.get(signal)?.();
      expect(databaseClose).not.toHaveBeenCalled();
      pending.resolve(database);
      await running;
      expect(startApplication).not.toHaveBeenCalled();
      expect(databaseClose).toHaveBeenCalledTimes(1);
      expect(log).not.toHaveBeenCalled();
      expect(signals.size).toBe(0);
    },
  );

  it('drains application initialization and closes both resources once after repeated signals', async () => {
    const pending = deferred<typeof application>();
    const starting = deferred<void>();
    const order: string[] = [];
    startApplication.mockImplementation(() => {
      starting.resolve();
      return pending.promise;
    });
    applicationClose.mockImplementation(() => {
      order.push('application');
      return Promise.resolve();
    });
    databaseClose.mockImplementation(() => {
      order.push('database');
      return Promise.resolve();
    });
    const running = main();
    await starting.promise;
    signals.get('SIGINT')?.();
    signals.get('SIGTERM')?.();
    expect(applicationClose).not.toHaveBeenCalled();
    expect(databaseClose).not.toHaveBeenCalled();
    pending.resolve(application);
    await running;
    expect(order).toEqual(['application', 'database']);
    expect(log).not.toHaveBeenCalled();
    expect(signals.size).toBe(0);
  });

  it('removes listeners when database initialization fails after a stop request', async () => {
    const pending = deferred<typeof database>();
    startDatabase.mockReturnValue(pending.promise);
    const running = main();
    signals.get('SIGTERM')?.();
    pending.reject(new Error('Synthetic database failure'));
    await expect(running).rejects.toThrow('Synthetic database failure');
    expect(startApplication).not.toHaveBeenCalled();
    expect(databaseClose).not.toHaveBeenCalled();
    expect(signals.size).toBe(0);
  });

  it('cleans the database and listeners when application initialization fails', async () => {
    startApplication.mockRejectedValue(
      new Error('Synthetic initialization failure'),
    );
    await expect(main()).rejects.toThrow('Synthetic initialization failure');
    expect(databaseClose).toHaveBeenCalledTimes(1);
    expect(applicationClose).not.toHaveBeenCalled();
    expect(signals.size).toBe(0);
  });

  it('keeps shutdown available after successful startup', async () => {
    await main();
    expect(log).toHaveBeenCalledTimes(1);
    expect(databaseClose).not.toHaveBeenCalled();
    expect(signals.has('SIGINT')).toBe(true);
    const shutdown = startApplication.mock.calls[0][2];
    expect(shutdown).toBeDefined();
    await shutdown?.();
    expect(applicationClose).toHaveBeenCalledTimes(1);
    expect(databaseClose).toHaveBeenCalledTimes(1);
    expect(signals.size).toBe(0);
  });
});
