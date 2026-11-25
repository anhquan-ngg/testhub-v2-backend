import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentRepository } from '../learning-documents/document.repository';
import { KnowledgePlanRepository } from './knowledge-plan.repository';
import { PlanSourceState } from './knowledge-plan-progress';

const containing = (value: Record<string, unknown>): unknown =>
  expect.objectContaining(value);

const owner = randomUUID(),
  id = randomUUID(),
  version = randomUUID(),
  topic = randomUUID();
const indexId = randomUUID(),
  profile = 'f'.repeat(64),
  token = randomUUID();
const input = {
  topic_id: topic,
  version_id: version,
  question_configs: [
    {
      question_type: 'SINGLE_CHOICE' as const,
      question_format: 'KNOWLEDGE' as const,
      count: 3,
    },
  ],
};

describe('Durable knowledge plan checkpoints, safe reads and equivalent replay', () => {
  const db = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    knowledgePlan: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    knowledgePlanRequestKey: { findUnique: jest.fn(), create: jest.fn() },
    learningDocumentVersion: { findFirst: jest.fn() },
    learningDocument: { updateMany: jest.fn() },
    learningDocumentIndex: { findFirst: jest.fn() },
  };
  const docs = {
    scope: jest.fn(() => ({ created_by: owner, is_deleted: false })),
  };
  let repository: KnowledgePlanRepository;
  let plan: {
    id: string;
    status: string;
    created_at: Date;
    preparation_started_at: Date;
    source_progress_at: Date;
    source_checkpoint: unknown;
    source_index_id: string | null;
    source_profile_id: string | null;
    error_code?: string;
  };
  const state = (completed = 16): PlanSourceState => ({
    stage: 'INDEXING',
    index: {
      id: indexId,
      profile_id: profile,
      status: 'QUEUED',
      completed_chunks: completed,
      chunk_count: 349,
      error_code: 'RAG_EMBEDDING_RATE_LIMITED',
    },
  });
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-25T00:00:00Z'));
    docs.scope.mockReturnValue({ created_by: owner, is_deleted: false });
    plan = {
      id,
      status: 'PREPARING',
      created_at: new Date(),
      preparation_started_at: new Date(),
      source_progress_at: new Date(),
      source_checkpoint: null,
      source_index_id: null,
      source_profile_id: null,
    };
    db.$transaction.mockImplementation((callback: (tx: typeof db) => unknown) =>
      callback(db),
    );
    db.knowledgePlan.findFirst.mockImplementation(() => Promise.resolve(plan));
    db.knowledgePlan.updateMany.mockImplementation(
      ({ data }: { data: object }) => {
        Object.assign(plan, data);
        return Promise.resolve({ count: 1 });
      },
    );
    db.learningDocumentVersion.findFirst.mockResolvedValue({
      id: version,
      document_id: randomUUID(),
    });
    db.learningDocument.updateMany.mockResolvedValue({ count: 1 });
    repository = new KnowledgePlanRepository(
      db as unknown as PrismaService,
      docs as unknown as DocumentRepository,
    );
  });
  afterEach(() => jest.useRealTimers());

  it('persists high-water marks across worker instances and ignores polling, retries and regressed counters', async () => {
    await expect(
      repository.checkpoint(owner, id, token, state()),
    ).resolves.toBe(true);
    const initial = plan.source_progress_at;
    jest.advanceTimersByTime(15 * 60_000);
    const restarted = new KnowledgePlanRepository(
      db as unknown as PrismaService,
      docs as unknown as DocumentRepository,
    );
    await restarted.checkpoint(owner, id, token, state(15));
    expect(plan.source_progress_at).toEqual(initial);
    expect(plan.source_checkpoint).toMatchObject({ completed_chunks: 16 });
    await restarted.checkpoint(owner, id, token, state(32));
    expect(plan.source_progress_at.getTime()).toBe(Date.now());
    jest.advanceTimersByTime(19 * 60_000);
    expect(await restarted.checkpoint(owner, id, token, state(32))).toBe(true);
    jest.advanceTimersByTime(60_000);
    expect(await restarted.checkpoint(owner, id, token, state(32))).toBe(false);
    expect(plan.error_code).toBe('PLAN_SOURCE_TIMEOUT');
  });

  it('counts usable extraction, first pin and READY once each, never index lease/status churn', async () => {
    await repository.checkpoint(owner, id, token, {
      stage: 'EXTRACTING',
      index: null,
    });
    jest.advanceTimersByTime(10 * 60_000);
    await repository.checkpoint(owner, id, token, {
      stage: 'INDEXING',
      index: null,
    });
    expect(plan.source_progress_at.getTime()).toBe(Date.now());
    jest.advanceTimersByTime(10 * 60_000);
    await repository.checkpoint(owner, id, token, state(0));
    expect(plan.source_index_id).toBe(indexId);
    const pinnedAt = plan.source_progress_at;
    jest.advanceTimersByTime(5 * 60_000);
    const busy = state(0);
    if (busy.index) busy.index.status = 'INDEXING';
    await repository.checkpoint(owner, id, token, busy);
    expect(plan.source_progress_at).toEqual(pinnedAt);
    if (busy.index) busy.index.status = 'READY';
    busy.stage = 'READY';
    await repository.checkpoint(owner, id, token, busy);
    expect(plan.source_progress_at.getTime()).toBe(Date.now());
  });

  it('never lets new progress or retryable failures bypass the hard sixty-minute cap', async () => {
    await repository.checkpoint(owner, id, token, state());
    jest.advanceTimersByTime(60 * 60_000);
    expect(await repository.checkpoint(owner, id, token, state(100))).toBe(
      false,
    );
    expect(plan.error_code).toBe('PLAN_SOURCE_TOTAL_TIMEOUT');
    expect(db.knowledgePlan.updateMany).toHaveBeenLastCalledWith(
      containing({
        data: containing({
          execution_id: null,
          lease_expires_at: null,
        }),
      }),
    );
  });

  it('uses existing legacy baselines rather than granting a fresh idle window at rollout', async () => {
    plan.source_checkpoint = {
      usable: true,
      index_id: indexId,
      completed_chunks: 16,
      ready: false,
    };
    plan.source_index_id = indexId;
    plan.source_profile_id = profile;
    jest.advanceTimersByTime(21 * 60_000);
    expect(await repository.checkpoint(owner, id, token, state())).toBe(false);
    expect(plan.error_code).toBe('PLAN_SOURCE_TIMEOUT');
  });

  it('rejects stale executions and mismatched profile/index pins without changing clocks', async () => {
    db.knowledgePlan.findFirst.mockResolvedValueOnce(null);
    expect(await repository.checkpoint(owner, id, 'stale', state())).toBe(
      false,
    );
    expect(db.knowledgePlan.updateMany).not.toHaveBeenCalled();
    expect(db.knowledgePlan.findFirst).toHaveBeenCalledWith({
      where: containing({
        execution_id: 'stale',
        status: 'PREPARING',
        lease_expires_at: { gt: new Date() },
        created_by: owner,
      }),
    });
    plan.source_index_id = indexId;
    plan.source_profile_id = 'other';
    expect(await repository.checkpoint(owner, id, token, state())).toBe(false);
    expect(db.knowledgePlan.updateMany).not.toHaveBeenCalled();
  });

  it('starts a new explicit retry window without changing the creation timestamp or source pin', async () => {
    const created = plan.created_at;
    plan.status = 'FAILED';
    jest.advanceTimersByTime(120 * 60_000);
    await repository.retry(owner, id);
    expect(plan.preparation_started_at.getTime()).toBe(Date.now());
    expect(plan.source_progress_at.getTime()).toBe(Date.now());
    expect(plan.source_checkpoint).toBe(Prisma.DbNull);
    expect(plan.created_at).toEqual(created);
    expect(db.knowledgePlan.updateMany).toHaveBeenCalledWith(
      containing({
        where: containing({ created_by: owner, status: 'FAILED' }),
      }),
    );
  });

  it('reads actual pinned counters while WAITING_SOURCE without publishing private pins or starting work', async () => {
    db.knowledgePlan.findFirst.mockResolvedValue({
      id,
      status: 'WAITING_SOURCE',
      source_version_id: version,
      source_index_id: indexId,
      source_profile_id: profile,
      sourceVersion: {
        file_name: 'book.pdf',
        document_id: randomUUID(),
        status: 'EXTRACTED',
        partial_confirmed_at: null,
        error_code: null,
      },
    });
    db.learningDocumentIndex.findFirst.mockResolvedValue(state(80).index);
    const detail = await repository.get(owner, id);
    expect(detail.source_progress).toEqual({
      stage: 'INDEXING',
      completed_chunks: 80,
      total_chunks: 349,
      percent: 22,
      index_status: 'QUEUED',
      error_code: 'RAG_EMBEDDING_RATE_LIMITED',
    });
    expect(detail).not.toHaveProperty('source_index_id');
    expect(detail).not.toHaveProperty('source_profile_id');
    expect(db.learningDocumentIndex.findFirst).toHaveBeenCalledWith(
      containing({
        where: containing({
          id: indexId,
          profile_id: profile,
          version_id: version,
          owner_id: owner,
          version: { document: { created_by: owner, is_deleted: false } },
        }),
      }),
    );
    expect(db.knowledgePlan.updateMany).not.toHaveBeenCalled();
    expect(db.knowledgePlanRequestKey.create).not.toHaveBeenCalled();
  });

  it('hides a revoked/foreign/missing pinned index and refuses foreign plan detail', async () => {
    db.knowledgePlan.findFirst.mockResolvedValue({
      id,
      status: 'WAITING_SOURCE',
      source_version_id: version,
      source_index_id: indexId,
      source_profile_id: profile,
      sourceVersion: {
        file_name: 'book.pdf',
        document_id: randomUUID(),
        status: 'EXTRACTED',
        partial_confirmed_at: null,
      },
    });
    db.learningDocumentIndex.findFirst.mockResolvedValue(null);
    expect((await repository.get(owner, id)).source_progress).toBeNull();
    db.knowledgePlan.findFirst.mockResolvedValue(null);
    await expect(repository.get('foreign', id)).rejects.toThrow(
      'Plan unavailable',
    );
  });

  it('uses null for unknown denominator, floors percentages and bounds oversized counters', async () => {
    db.knowledgePlan.findFirst.mockResolvedValue({
      id,
      status: 'WAITING_SOURCE',
      source_version_id: version,
      source_index_id: indexId,
      source_profile_id: profile,
      sourceVersion: {
        file_name: 'book.pdf',
        document_id: randomUUID(),
        status: 'EXTRACTED',
        partial_confirmed_at: null,
        error_code: null,
      },
    });
    db.learningDocumentIndex.findFirst.mockResolvedValue({
      ...state(0).index,
      chunk_count: 0,
    });
    expect(
      (await repository.get(owner, id)).source_progress?.percent,
    ).toBeNull();
    db.learningDocumentIndex.findFirst.mockResolvedValue({
      ...state(600).index,
      status: 'READY',
    });
    expect((await repository.get(owner, id)).source_progress).toMatchObject({
      stage: 'OUTLINING',
      percent: 100,
    });
  });

  it('binds a new key durably to an equivalent preparing plan and replays it after completion', async () => {
    const existing = { id, status: 'WAITING_SOURCE' };
    db.knowledgePlan.findFirst.mockResolvedValue(existing);
    db.knowledgePlanRequestKey.findUnique.mockResolvedValue(null);
    const result = await repository.create(
      owner,
      input,
      'new-equivalent-key',
      'a'.repeat(64),
    );
    expect(result).toMatchObject({ id, reused: true });
    expect(db.knowledgePlan.create).not.toHaveBeenCalled();
    expect(db.knowledgePlan.findFirst).toHaveBeenCalledWith(
      containing({
        where: containing({
          created_by: owner,
          topic_id: topic,
          source_version_id: version,
          status: { in: ['WAITING_SOURCE', 'PREPARING'] },
          question_configs: { equals: input.question_configs },
        }),
      }),
    );
    expect(db.knowledgePlanRequestKey.create).toHaveBeenCalledWith({
      data: {
        created_by: owner,
        key: 'new-equivalent-key',
        request_hash: 'a'.repeat(64),
        plan_id: id,
      },
    });
    db.knowledgePlanRequestKey.findUnique.mockResolvedValue({
      request_hash: 'a'.repeat(64),
      plan_id: id,
    });
    db.knowledgePlan.findFirst.mockResolvedValue({
      ...existing,
      status: 'REVIEW_REQUIRED',
    });
    expect(
      await repository.create(
        owner,
        input,
        'new-equivalent-key',
        'a'.repeat(64),
      ),
    ).toMatchObject({ id, status: 'REVIEW_REQUIRED', reused: true });
    await expect(
      repository.create(owner, input, 'new-equivalent-key', 'b'.repeat(64)),
    ).rejects.toThrow('Idempotency-Key already used');
  });

  it('creates a new plan when no exact ordered active configuration exists', async () => {
    db.knowledgePlanRequestKey.findUnique.mockResolvedValue(null);
    db.knowledgePlan.findFirst.mockResolvedValue(null);
    db.knowledgePlan.create.mockResolvedValue({
      id: 'new',
      status: 'WAITING_SOURCE',
    });
    expect(
      await repository.create(
        owner,
        input,
        'new-plan-key-1234',
        'a'.repeat(64),
      ),
    ).toMatchObject({ id: 'new', reused: false });
    expect(db.$queryRaw).toHaveBeenCalled();
    expect(db.knowledgePlanRequestKey.create).toHaveBeenCalledWith({
      data: containing({ plan_id: 'new' }),
    });
  });
});
