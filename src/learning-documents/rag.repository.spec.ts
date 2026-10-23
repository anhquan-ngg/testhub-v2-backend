import { RagRepository } from './rag.repository';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentRepository } from './document.repository';

describe('RAG revocation retry scheduling', () => {
  const indexes = { findMany: jest.fn(), updateMany: jest.fn() };
  const repository = new RagRepository(
    { learningDocumentIndex: indexes } as unknown as PrismaService,
    {} as DocumentRepository,
  );
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-23T00:00:00Z'));
    jest.clearAllMocks();
  });
  afterEach(() => jest.useRealTimers());

  it('selects only due unacknowledged tombstones, oldest first', async () => {
    await repository.revoked();
    expect(indexes.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'REVOKED',
          remote_revoked: false,
          next_dispatch_at: { lte: new Date() },
        },
        orderBy: { next_dispatch_at: 'asc' },
      }),
    );
  });

  it.each([
    [0, 5000],
    [2, 20_000],
    [40, 300_000],
  ])('persists bounded backoff after %i failures', async (failures, delay) => {
    await repository.deferRevocation('index', failures);
    expect(indexes.updateMany).toHaveBeenCalledWith({
      where: { id: 'index', status: 'REVOKED', remote_revoked: false },
      data: {
        failure_count: { increment: 1 },
        next_dispatch_at: new Date(Date.now() + delay),
      },
    });
  });
});
