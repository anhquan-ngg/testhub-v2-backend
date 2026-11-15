import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerationBatchRepository } from './generation-batch.repository';
import { GenerationEvidenceDetails } from './generation-evidence.contract';

const details: GenerationEvidenceDetails = {
  issues: [{ slot: 1, reason: 'INSUFFICIENT_EVIDENCE' }],
};
const envelope = {
  contract_version: 'question-generation-failure.v1',
  code: 'AI_INSUFFICIENT_EVIDENCE',
  error_details: details,
};

describe('Durable evidence failure persistence and owned reload', () => {
  let batch: {
    id: string;
    created_by: string;
    topic_id: string;
    chapter: { topic_id: string };
    execution_id: string;
    status: string;
    error_code: string | null;
    requested_count: number;
  };
  let attempt: {
    id: string;
    status: string;
    error_code: string | null;
    result: unknown;
  };
  let batchUpdate: jest.Mock;
  let attemptUpdate: jest.Mock;
  let resultUpdate: jest.Mock;
  let findOwned: jest.Mock;
  let prisma: PrismaService;
  let repository: GenerationBatchRepository;

  beforeEach(() => {
    batch = {
      id: 'batch',
      created_by: 'owner',
      topic_id: 'topic',
      chapter: { topic_id: 'topic' },
      execution_id: 'execution',
      status: 'GENERATING',
      error_code: null,
      requested_count: 2,
    };
    attempt = {
      id: 'execution',
      status: 'RUNNING',
      error_code: null,
      result: null,
    };
    batchUpdate = jest
      .fn()
      .mockImplementation(
        ({
          where,
          data,
        }: {
          where: { id: string; execution_id: string; status: string };
          data: { status: string; error_code: string };
        }) => {
          const matches =
            where.id === batch.id &&
            where.execution_id === batch.execution_id &&
            where.status === batch.status;
          if (matches) Object.assign(batch, data);
          return Promise.resolve({ count: Number(matches) });
        },
      );
    attemptUpdate = jest
      .fn()
      .mockImplementation(({ data }: { data: object }) => {
        Object.assign(attempt, data);
        return Promise.resolve(attempt);
      });
    resultUpdate = jest
      .fn()
      .mockImplementation(({ data }: { data: { result: unknown } }) => {
        if (attempt.result !== null) return Promise.resolve({ count: 0 });
        attempt.result = data.result;
        return Promise.resolve({ count: 1 });
      });
    findOwned = jest
      .fn()
      .mockImplementation(({ where }: { where: { created_by: string } }) =>
        Promise.resolve(
          where.created_by !== batch.created_by
            ? null
            : {
                ...batch,
                attempts:
                  attempt.status === 'FAILED' &&
                  attempt.error_code === 'AI_INSUFFICIENT_EVIDENCE'
                    ? [{ id: attempt.id, result: attempt.result }]
                    : [],
              },
        ),
      );
    const tx = {
      questionGenerationBatch: {
        updateMany: batchUpdate,
        findUnique: jest
          .fn()
          .mockImplementation(() =>
            Promise.resolve({ requested_count: batch.requested_count }),
          ),
        findFirst: findOwned,
      },
      questionGenerationAttempt: {
        update: attemptUpdate,
        updateMany: resultUpdate,
      },
    };
    prisma = {
      ...tx,
      $transaction: jest
        .fn()
        .mockImplementation((operation: (value: typeof tx) => unknown) =>
          operation(tx),
        ),
    } as unknown as PrismaService;
    repository = new GenerationBatchRepository(prisma);
  });

  it.each([details, { issues: [] }])(
    'stores a tagged safe failure and reloads it without exposing attempts: %j',
    async (diagnostics) => {
      await repository.fail(
        'batch',
        'execution',
        'AI_INSUFFICIENT_EVIDENCE',
        false,
        diagnostics,
      );
      expect(attempt.result).toEqual({
        ...envelope,
        error_details: diagnostics,
      });
      expect(resultUpdate).toHaveBeenCalledWith({
        where: {
          id: 'execution',
          batch_id: 'batch',
          status: 'FAILED',
          result: { equals: Prisma.DbNull },
          batch: { execution_id: 'execution', status: 'FAILED' },
        },
        data: { result: { ...envelope, error_details: diagnostics } },
      });
      const reloaded = await new GenerationBatchRepository(prisma).findOwned(
        'owner',
        'batch',
      );
      expect(reloaded).toMatchObject({
        status: 'FAILED',
        error_code: 'AI_INSUFFICIENT_EVIDENCE',
        error_details: diagnostics,
      });
      expect(reloaded).not.toHaveProperty('execution_id');
      expect(reloaded).not.toHaveProperty('attempts');
      expect(reloaded).not.toHaveProperty('chapter');
      const [query] = findOwned.mock.calls[0] as [{ where: unknown }];
      expect(query.where).toMatchObject({ id: 'batch', created_by: 'owner' });
    },
  );

  it.each(['stale-execution', 'completed'])(
    'fences a %s failure before writing any attempt data',
    async (mode) => {
      if (mode === 'completed') batch.status = 'REVIEW_REQUIRED';
      else batch.execution_id = 'new-execution';
      await repository.fail(
        'batch',
        'execution',
        'AI_INSUFFICIENT_EVIDENCE',
        false,
        details,
      );
      expect(attemptUpdate).not.toHaveBeenCalled();
      expect(resultUpdate).not.toHaveBeenCalled();
      expect(attempt.result).toBeNull();
    },
  );

  it('does not clobber a successful durable result', async () => {
    const success = {
      questions: [{ question_text: 'Durable generated output' }],
    };
    attempt.result = success;
    await repository.fail(
      'batch',
      'execution',
      'AI_INSUFFICIENT_EVIDENCE',
      false,
      details,
    );
    expect(attempt.result).toEqual(success);
    expect(await repository.findOwned('owner', 'batch')).not.toHaveProperty(
      'error_details',
    );
  });

  it('revalidates against persisted requested_count and never stores raw unsafe details', async () => {
    const unsafe = {
      issues: [
        { slot: 3, reason: 'INSUFFICIENT_EVIDENCE', provider_text: 'private' },
      ],
    };
    await repository.fail(
      'batch',
      'execution',
      'AI_INSUFFICIENT_EVIDENCE',
      false,
      unsafe as GenerationEvidenceDetails,
    );
    expect(attempt.result).toEqual({
      contract_version: envelope.contract_version,
      code: envelope.code,
    });
    expect(JSON.stringify(attempt.result)).not.toContain('private');
    expect(await repository.findOwned('owner', 'batch')).not.toHaveProperty(
      'error_details',
    );
  });

  it.each([
    ['AI_OUTPUT_INVALID', false],
    ['AI_EXECUTION_INTERRUPTED', true],
    ['AI_INSUFFICIENT_EVIDENCE', true],
  ])(
    'preserves %s / unknown=%s without adding evidence JSON',
    async (code, unknown) => {
      await repository.fail('batch', 'execution', code, unknown, details);
      expect(resultUpdate).not.toHaveBeenCalled();
      expect(attempt.status).toBe(unknown ? 'UNKNOWN' : 'FAILED');
    },
  );

  it.each([
    {
      ...envelope,
      error_details: { issues: [{ slot: 3, reason: 'INSUFFICIENT_EVIDENCE' }] },
    },
    {
      ...envelope,
      error_details: { issues: [details.issues[0], details.issues[0]] },
    },
    {
      ...envelope,
      error_details: { issues: [{ slot: 1, reason: 'provider prose' }] },
    },
    { ...envelope, provider_text: 'private' },
    { code: 'AI_INSUFFICIENT_EVIDENCE', error_details: details },
  ])(
    'rejects malformed or unmatched persisted envelopes on reload: %j',
    async (result) => {
      await repository.fail(
        'batch',
        'execution',
        'AI_INSUFFICIENT_EVIDENCE',
        false,
        details,
      );
      attempt.result = result;
      expect(await repository.findOwned('owner', 'batch')).not.toHaveProperty(
        'error_details',
      );
    },
  );

  it('does not expose diagnostics from an older execution, another code, or a successful batch', async () => {
    await repository.fail(
      'batch',
      'execution',
      'AI_INSUFFICIENT_EVIDENCE',
      false,
      details,
    );
    batch.execution_id = 'new-execution';
    expect(await repository.findOwned('owner', 'batch')).not.toHaveProperty(
      'error_details',
    );
    batch.execution_id = 'execution';
    batch.error_code = 'AI_OUTPUT_INVALID';
    expect(await repository.findOwned('owner', 'batch')).not.toHaveProperty(
      'error_details',
    );
    batch.error_code = 'AI_INSUFFICIENT_EVIDENCE';
    batch.status = 'REVIEW_REQUIRED';
    expect(await repository.findOwned('owner', 'batch')).not.toHaveProperty(
      'error_details',
    );
  });

  it('keeps ownership and target checks on the detail projection', async () => {
    await repository.fail(
      'batch',
      'execution',
      'AI_INSUFFICIENT_EVIDENCE',
      false,
      details,
    );
    expect(await repository.findOwned('other-owner', 'batch')).toBeNull();
    batch.chapter.topic_id = 'foreign-topic';
    expect(await repository.findOwned('owner', 'batch')).toBeNull();
  });
});
