import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentRepository } from './document.repository';

type StoredDocument = {
  id: string;
  next_version: number;
  sizes: number[];
};

/** Create an explicit gate for deterministic transaction scheduling. */
function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Model transaction-local writes and row-lock waiters without a DB connection. */
function fixture() {
  const stored = new Map<string, StoredDocument[]>();
  const locks = new Map<string, Promise<void>>();
  const attempts: string[] = [];
  const reads: string[] = [];
  const gate = deferred();
  const reading = deferred();
  let pausedOwner: string | undefined;
  let failWrite = false;
  const transaction = jest.fn(
    async (
      run: (tx: Prisma.TransactionClient) => Promise<unknown>,
      options?: { isolationLevel: Prisma.TransactionIsolationLevel },
    ) => {
      expect(options?.isolationLevel).toBe(
        Prisma.TransactionIsolationLevel.ReadCommitted,
      );
      let owner: string | undefined;
      let local: StoredDocument[] | undefined;
      let unlock: () => void = () => undefined;
      const records = () => {
        if (!local) throw new Error('Usage/write attempted before owner lock');
        return local;
      };
      const tx = {
        $queryRaw: jest.fn(
          async (sql: TemplateStringsArray, ownerId: string) => {
            expect(sql.join('?')).toBe(
              'SELECT id FROM users WHERE id = ?::uuid FOR UPDATE',
            );
            attempts.push(ownerId);
            const previous = locks.get(ownerId) ?? Promise.resolve();
            const released = deferred();
            locks.set(ownerId, released.promise);
            await previous;
            owner = ownerId;
            unlock = released.resolve;
            local = structuredClone(stored.get(ownerId) ?? []);
            return [{ id: ownerId }];
          },
        ),
        learningDocument: {
          count: jest.fn(async (args: Prisma.LearningDocumentCountArgs) => {
            expect(args.where).toEqual({
              created_by: owner,
              is_deleted: false,
            });
            reads.push(String(owner));
            if (owner === pausedOwner) {
              pausedOwner = undefined;
              reading.resolve();
              await gate.promise;
            }
            return records().length;
          }),
          create: jest.fn((args: Prisma.LearningDocumentCreateArgs) => {
            const data = args.data;
            const version = data.versions
              ?.create as Prisma.LearningDocumentVersionUncheckedCreateWithoutDocumentInput;
            records().push({
              id: String(data.id),
              next_version: 2,
              sizes: [version.declared_size],
            });
            if (failWrite) throw new Error('write failed');
            return Promise.resolve({ id: data.id });
          }),
          updateMany: jest.fn((args: Prisma.LearningDocumentUpdateManyArgs) => {
            const doc = records().find((row) => row.id === args.where?.id);
            if (doc) doc.next_version++;
            return Promise.resolve({ count: doc ? 1 : 0 });
          }),
          findUniqueOrThrow: jest.fn(
            (args: Prisma.LearningDocumentFindUniqueOrThrowArgs) => {
              const doc = records().find((row) => row.id === args.where.id);
              if (!doc) throw new Error('document missing');
              return Promise.resolve(doc);
            },
          ),
        },
        learningDocumentVersion: {
          aggregate: jest.fn(
            (args: Prisma.LearningDocumentVersionAggregateArgs) => {
              expect(args).toEqual({
                where: {
                  document: { created_by: owner, is_deleted: false },
                  NOT: { status: 'FAILED', source_key: null },
                },
                _sum: { declared_size: true },
              });
              return Promise.resolve({
                _sum: {
                  declared_size: records()
                    .flatMap((doc) => doc.sizes)
                    .reduce((a, b) => a + b, 0),
                },
              });
            },
          ),
          create: jest.fn((args: Prisma.LearningDocumentVersionCreateArgs) => {
            const data =
              args.data as Prisma.LearningDocumentVersionUncheckedCreateInput;
            const doc = records().find((row) => row.id === data.document_id);
            if (!doc) throw new Error('document missing');
            expect(data.version).toBe(doc.next_version - 1);
            doc.sizes.push(data.declared_size);
            if (failWrite) throw new Error('write failed');
            return Promise.resolve({ id: 'version' });
          }),
        },
      };
      try {
        const result = await run(tx as unknown as Prisma.TransactionClient);
        if (owner && local) stored.set(owner, local);
        return result;
      } finally {
        unlock();
      }
    },
  );
  const repository = new DocumentRepository({
    $transaction: transaction,
  } as unknown as PrismaService);
  const version = (size: number) => ({
    version: 1,
    file_name: 'source.pdf',
    source_type: 'PDF' as const,
    mime_type: 'application/pdf',
    declared_size: size,
    consented_at: new Date(),
    upload_key: 'quarantine',
    upload_expires_at: new Date(Date.now() + 3600_000),
  });
  return {
    stored,
    attempts,
    reads,
    transaction,
    repository,
    create: (ownerId: string, id: string, size: number) =>
      repository.create({
        id,
        ownerId,
        title: 'Fixture',
        topicId: 'topic',
        chapterId: null,
        version: version(size),
      }),
    add: (ownerId: string, id: string, size: number) =>
      repository.addVersion(ownerId, id, version(size)),
    failWrites: (value: boolean) => {
      failWrite = value;
    },
    pauseRead: (ownerId: string) => {
      pausedOwner = ownerId;
      return { started: reading.promise, release: gate.resolve };
    },
  };
}

describe('DocumentRepository atomic owner quotas (offline transactions)', () => {
  const originalDocuments = process.env.DOCUMENT_MAX_ACTIVE_PER_OWNER;
  const originalBytes = process.env.DOCUMENT_MAX_TOTAL_BYTES_PER_OWNER;
  beforeEach(() => {
    process.env.DOCUMENT_MAX_ACTIVE_PER_OWNER = '2';
    process.env.DOCUMENT_MAX_TOTAL_BYTES_PER_OWNER = '100';
  });
  afterEach(() => {
    if (originalDocuments === undefined)
      delete process.env.DOCUMENT_MAX_ACTIVE_PER_OWNER;
    else process.env.DOCUMENT_MAX_ACTIVE_PER_OWNER = originalDocuments;
    if (originalBytes === undefined)
      delete process.env.DOCUMENT_MAX_TOTAL_BYTES_PER_OWNER;
    else process.env.DOCUMENT_MAX_TOTAL_BYTES_PER_OWNER = originalBytes;
  });

  it('serializes simultaneous creates at the document-count boundary', async () => {
    process.env.DOCUMENT_MAX_ACTIVE_PER_OWNER = '1';
    const db = fixture();
    const pause = db.pauseRead('owner');
    const first = db.create('owner', 'first', 10);
    await pause.started;
    const second = db.create('owner', 'second', 10);
    const results = Promise.allSettled([first, second]);
    expect(db.attempts).toEqual(['owner', 'owner']);
    expect(db.reads).toEqual(['owner']);
    pause.release();
    expect((await results).map((result) => result.status)).toEqual([
      'fulfilled',
      'rejected',
    ]);
    await expect(second).rejects.toThrow('Document library limit reached');
    expect(db.stored.get('owner')?.map((doc) => doc.id)).toEqual(['first']);
    for (const call of db.transaction.mock.calls) {
      expect(call[1]).toEqual({
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    }
  });

  it.each(['create', 'add'] as const)(
    'shares the owner byte lock when %s precedes the other operation',
    async (operation) => {
      const db = fixture();
      db.stored.set('owner', [
        { id: 'existing', next_version: 2, sizes: [30] },
      ]);
      const pause = db.pauseRead('owner');
      const create = () => db.create('owner', 'new', 50);
      const add = () => db.add('owner', 'existing', 50);
      const first = operation === 'create' ? create() : add();
      await pause.started;
      const second = operation === 'create' ? add() : create();
      const results = Promise.allSettled([first, second]);
      expect(db.attempts).toEqual(['owner', 'owner']);
      expect(db.reads).toEqual(['owner']);
      pause.release();
      expect((await results).map((result) => result.status)).toEqual([
        'fulfilled',
        'rejected',
      ]);
      await expect(second).rejects.toThrow('Document storage quota exceeded');
      expect(
        db.stored
          .get('owner')
          ?.flatMap((doc) => doc.sizes)
          .reduce((a, b) => a + b, 0),
      ).toBe(80);
    },
  );

  it('serializes replacements, accepts the exact byte limit, and rejects without advancing versions', async () => {
    const db = fixture();
    db.stored.set('owner', [{ id: 'existing', next_version: 2, sizes: [30] }]);
    const results = await Promise.allSettled([
      db.add('owner', 'existing', 70),
      db.add('owner', 'existing', 1),
    ]);
    expect(results.map((result) => result.status)).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(db.stored.get('owner')).toEqual([
      { id: 'existing', next_version: 3, sizes: [30, 70] },
    ]);
  });

  it.each(['create', 'add'] as const)(
    'rolls back a failed %s write and releases its owner lock for retry',
    async (operation) => {
      const db = fixture();
      db.stored.set('owner', [
        { id: 'existing', next_version: 2, sizes: [30] },
      ]);
      const write = () =>
        operation === 'create'
          ? db.create('owner', 'new', 70)
          : db.add('owner', 'existing', 70);
      db.failWrites(true);
      await expect(write()).rejects.toThrow('write failed');
      expect(db.stored.get('owner')).toEqual([
        { id: 'existing', next_version: 2, sizes: [30] },
      ]);
      db.failWrites(false);
      await expect(write()).resolves.toBeDefined();
      expect(db.stored.get('owner')?.flatMap((doc) => doc.sizes)).toEqual([
        30, 70,
      ]);
    },
  );

  it('does not block independent owners and rejects over-quota creates without rows', async () => {
    const db = fixture();
    const pause = db.pauseRead('owner');
    const blocked = db.create('owner', 'first', 101);
    const rejected = expect(blocked).rejects.toBeInstanceOf(ConflictException);
    await pause.started;
    await expect(db.create('other', 'independent', 100)).resolves.toEqual({
      id: 'independent',
    });
    pause.release();
    await rejected;
    expect(db.stored.has('owner')).toBe(false);
    expect(db.stored.get('other')).toHaveLength(1);
  });
});
