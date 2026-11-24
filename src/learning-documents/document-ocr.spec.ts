import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import {
  DocumentClient,
  DocumentProcessingError,
} from './document-client.service';
import { DocumentExecution } from './document-execution.service';
import { DocumentRepository } from './document.repository';
import { Extraction, extractionSchema } from './document.contract';
import { OcrRequest, mergeOcrCheckpoint } from './document-ocr.contract';

function containing(value: object): unknown {
  return expect.objectContaining(value) as unknown;
}

const owner = '11111111-1111-4111-8111-111111111111';
const planId = '22222222-2222-4222-8222-222222222222';
const parentId = '33333333-3333-4333-8333-333333333333';
const nodeId = '44444444-4444-4444-8444-444444444444';
const bytes = Buffer.from('%PDF-ocr-fixture');
const hash = createHash('sha256').update(bytes).digest('hex');
const request = (positions = [1, 2]): OcrRequest => ({
  origin_plan_id: planId,
  origin_revision: 2,
  parent_version_id: parentId,
  retry_of_version_id: null,
  positions,
  pages: positions.map((position) => ({ position, status: 'PENDING' })),
  deliveries: 0,
  status: 'PENDING',
});
const extraction = (
  texts = ['title', ''],
  pages: OcrRequest['pages'] = [],
): Extraction => ({
  contract_version: 'document-extraction.v1',
  source_type: 'PDF',
  source_sha256: hash,
  parser_version: 'pdf/fixture;text/v4',
  include_notes: false,
  status: 'PARTIAL',
  unit_count: texts.length,
  spans: texts.map((text, index) => ({
    kind: 'PAGE',
    position: index + 1,
    text,
  })),
  warnings: ['OCR_REQUIRED'],
  quality: {
    total_units: texts.length,
    text_units: texts.filter(Boolean).length,
    ocr_suspected_units: [2],
    ocr_candidate_units: [1, 2],
    blank_units: [2],
    ocr_units: [],
    ocr_pages: pages,
  },
});

function admissionFixture() {
  const source = {
    id: parentId,
    document_id: 'document',
    status: 'PARTIAL',
    unit_count: 2,
    source_key: 'original/source',
    source_sha256: hash,
    artifact_key: 'original/artifact',
    artifact_sha256: 'a'.repeat(64),
    declared_size: 20,
    file_name: 'fixture.pdf',
    source_type: 'PDF',
    mime_type: 'application/pdf',
    include_notes: false,
    quality: extraction().quality,
  };
  type Child = typeof source & { ocr_request: OcrRequest; version: number };
  const children: Child[] = [];
  let tail = Promise.resolve();
  let version = 2;
  const locks: string[] = [];
  const tx = {
    knowledgePlan: {
      findFirst: jest.fn().mockResolvedValue({
        id: planId,
        revision: 2,
        status: 'REVIEW_REQUIRED',
        source_version_id: parentId,
        topic_id: 'topic',
        matrix: {
          nodes: [
            {
              id: nodeId,
              parent_id: null,
              name: 'Structures',
              source_units: [
                { kind: 'PAGE', position: 1 },
                { kind: 'PAGE', position: 2 },
              ],
            },
          ],
          rows: [
            {
              id: owner,
              node_id: nodeId,
              question_type: 'SINGLE_CHOICE',
              objective: 'Explain stack ordering',
              source_units: [
                { kind: 'PAGE', position: 1 },
                { kind: 'PAGE', position: 2 },
              ],
              counts: {
                KNOWLEDGE: 1,
                UNDERSTANDING: 0,
                APPLYING: 0,
                ADVANCED: 0,
              },
            },
          ],
        },
      }),
    },
    learningDocument: {
      count: jest.fn().mockResolvedValue(1),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest
        .fn()
        .mockImplementation(() => Promise.resolve({ next_version: ++version })),
    },
    learningDocumentVersion: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { declared_size: 20 } }),
      findFirst: jest.fn().mockImplementation(
        (args: {
          where: {
            id?: string;
            AND?: { ocr_request: { path: string[]; equals: unknown } }[];
          };
        }) => {
          if (args.where.AND) {
            const retry = args.where.AND.find(
              (item) => item.ocr_request.path[0] === 'retry_of_version_id',
            )?.ocr_request.equals;
            return Promise.resolve(
              children.find(
                (child) =>
                  child.ocr_request.retry_of_version_id ===
                  (retry === Prisma.JsonNull ? null : retry),
              ) ?? null,
            );
          }
          return Promise.resolve(
            args.where.id === parentId
              ? source
              : (children.find((child) => child.id === args.where.id) ?? null),
          );
        },
      ),
      create: jest.fn().mockImplementation((args: { data: Child }) => {
        children.push(args.data);
        return Promise.resolve(args.data);
      }),
    },
  };
  const transaction = jest.fn(
    async (run: (client: Prisma.TransactionClient) => Promise<unknown>) => {
      let acquired = false;
      let release: () => void = () => undefined;
      try {
        return await run({
          ...tx,
          $queryRaw: async (sql: TemplateStringsArray) => {
            const statement = sql.join('?');
            locks.push(statement);
            if (statement.includes('users') && !acquired) {
              const before = tail;
              tail = new Promise<void>((done) => {
                release = done;
              });
              await before;
              acquired = true;
            }
            return [];
          },
        } as unknown as Prisma.TransactionClient);
      } finally {
        if (acquired) release();
      }
    },
  );
  const repository = new DocumentRepository({
    $transaction: transaction,
  } as unknown as PrismaService);
  return { repository, tx, children, source, locks };
}

describe('Explicit OCR admission (offline transactional repository)', () => {
  it('serializes same-revision clicks and creates one unique pinned child without modifying its parent', async () => {
    const fixture = admissionFixture();
    const before = structuredClone(fixture.source);
    const [a, b] = await Promise.all([
      fixture.repository.requestPlanOcr(owner, planId, 2),
      fixture.repository.requestPlanOcr(owner, planId, 2),
    ]);
    expect(a).toEqual(b);
    expect(fixture.tx.learningDocumentVersion.create).toHaveBeenCalledTimes(1);
    expect(fixture.source).toEqual(before);
    expect(fixture.children[0]).toMatchObject({
      status: 'QUEUED',
      source_sha256: hash,
      version: 2,
      ocr_request: {
        origin_plan_id: planId,
        origin_revision: 2,
        positions: [1, 2],
        status: 'PENDING',
      },
    });
    expect(fixture.children[0].source_key).not.toBe(fixture.source.source_key);
    expect(fixture.locks[0]).toContain('users');
    expect(
      fixture.locks.slice(1).some((lock) => lock.includes('knowledge_plans')),
    ).toBe(true);
  });
  it('rejects stale revisions, inaccessible plans and quota overflow before allocating a version', async () => {
    const stale = admissionFixture();
    await expect(
      stale.repository.requestPlanOcr(owner, planId, 1),
    ).rejects.toThrow('PLAN_REVISION_CONFLICT');
    expect(stale.tx.learningDocumentVersion.create).not.toHaveBeenCalled();
    stale.tx.knowledgePlan.findFirst.mockResolvedValueOnce(null);
    await expect(
      stale.repository.requestPlanOcr(owner, planId, 2),
    ).rejects.toThrow('Plan unavailable');
    const quota = admissionFixture();
    quota.tx.learningDocumentVersion.aggregate.mockResolvedValueOnce({
      _sum: { declared_size: Number.MAX_SAFE_INTEGER },
    });
    await expect(
      quota.repository.requestPlanOcr(owner, planId, 2),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(quota.tx.learningDocument.updateMany).not.toHaveBeenCalled();
  });
  it('requires terminal provenance for retries, skips completed pages and replays the same fresh retry child', async () => {
    const fixture = admissionFixture();
    const first = await fixture.repository.requestPlanOcr(owner, planId, 2);
    await expect(
      fixture.repository.requestPlanOcr(owner, planId, 2, first.version_id),
    ).rejects.toThrow('DOCUMENT_OCR_NOT_RETRYABLE');
    const failed = fixture.children[0];
    failed.status = 'PARTIAL';
    failed.unit_count = 2;
    failed.artifact_key = 'checkpoint';
    failed.artifact_sha256 = 'b'.repeat(64);
    failed.ocr_request = {
      ...failed.ocr_request,
      status: 'INCOMPLETE',
      pages: [
        { position: 1, status: 'COMPLETED' },
        { position: 2, status: 'BUDGET_EXHAUSTED', reason: 'TIME_BUDGET' },
      ],
    };
    const retry = await fixture.repository.requestPlanOcr(
      owner,
      planId,
      2,
      first.version_id,
    );
    expect(retry.version_id).not.toBe(first.version_id);
    expect(fixture.children[1].ocr_request).toMatchObject({
      parent_version_id: first.version_id,
      retry_of_version_id: first.version_id,
      positions: [2],
      status: 'PENDING',
    });
    expect(
      await fixture.repository.requestPlanOcr(
        owner,
        planId,
        2,
        first.version_id,
      ),
    ).toEqual(retry);
    expect(failed.ocr_request.status).toBe('INCOMPLETE');
  });
  it('excludes targeted donors from ordinary extraction reuse and exposes only safe metadata', async () => {
    const findFirst = jest
      .fn<Promise<null>, [unknown]>()
      .mockResolvedValue(null);
    const repository = new DocumentRepository({
      learningDocumentVersion: { findFirst },
    } as unknown as PrismaService);
    await repository.reusable(owner, hash, 'PDF', false, parentId);
    expect(findFirst).toHaveBeenLastCalledWith(
      containing({
        where: containing({
          ocr_request: { equals: Prisma.DbNull },
        }),
      }),
    );
    await repository.versionDetail(owner, parentId);
    const args = findFirst.mock.calls[1][0] as {
      where: unknown;
      select: Record<string, unknown>;
    };
    expect(args.select).toMatchObject({
      document_id: true,
      quality: true,
      ocr_request: true,
    });
    expect(args.select).not.toHaveProperty('source_key');
    expect(args.where).toMatchObject({
      id: parentId,
      document: { created_by: owner, is_deleted: false },
    });
  });
});

describe('OCR checkpoint merge', () => {
  it('preserves added transcripts and terminal NO_TEXT across a later smaller-cap delivery', () => {
    const previous = extraction(
      ['base\nRetained OCR transcript', 'base', 'pending'],
      [{ position: 1, status: 'COMPLETED' }],
    );
    if (previous.quality) previous.quality.ocr_units = [1];
    const current = extraction(
      ['base', 'base\nNew OCR transcript', 'pending'],
      [
        { position: 2, status: 'COMPLETED', reason: null },
        { position: 3, status: 'BUDGET_EXHAUSTED', reason: 'PAGE_LIMIT' },
      ],
    );
    if (current.quality) current.quality.ocr_units = [2];
    const progress = request([2, 3]);
    const merged = mergeOcrCheckpoint({
      previous,
      current,
      request: progress,
      attempted: [2, 3],
    });
    expect(merged.pending).toBe(true);
    expect(merged.extraction.spans.map((span) => span.text)).toEqual([
      'base\nRetained OCR transcript',
      'base\nNew OCR transcript',
      'pending',
    ]);
    expect(merged.extraction.quality?.ocr_units).toEqual([1, 2]);
    expect(merged.request.pages).toEqual([
      { position: 2, status: 'COMPLETED', reason: null },
      { position: 3, status: 'PENDING' },
    ]);
    expect(merged.extraction.quality?.ocr_pages).toContainEqual({
      position: 1,
      status: 'COMPLETED',
    });
  });
  it.each([
    'TIME_BUDGET',
    'DAILY_LIMIT',
    'PROVIDER_ERROR',
    'CACHE_UNAVAILABLE',
    'TEXT_LIMIT',
  ] as const)(
    'does not blindly retry %s and keeps an incomplete source non-EXTRACTED',
    (reason) => {
      const value = extraction(
        ['retained facts', 'title'],
        [{ position: 1, status: 'BUDGET_EXHAUSTED', reason }],
      );
      const merged = mergeOcrCheckpoint({
        previous: value,
        current: value,
        request: request([1, 2]),
        attempted: [1],
      });
      expect(merged.pending).toBe(false);
      expect(merged.request.status).toBe('INCOMPLETE');
      expect(merged.request.pages[1]).toEqual({
        position: 2,
        status: 'PENDING',
      });
      expect(merged.extraction.status).toBe('PARTIAL');
      expect(extractionSchema.safeParse(merged.extraction).success).toBe(true);
    },
  );
  it('fails missing results and bounds no-progress PAGE_LIMIT outcomes without repeated paid attempts', () => {
    for (const pages of [
      [],
      [
        {
          position: 1,
          status: 'BUDGET_EXHAUSTED' as const,
          reason: 'PAGE_LIMIT' as const,
        },
      ],
    ]) {
      const value = extraction(['facts', 'title'], pages);
      const merged = mergeOcrCheckpoint({
        previous: value,
        current: value,
        request: request([1]),
        attempted: [1],
      });
      expect(merged.pending).toBe(false);
      expect(merged.request.status).toBe('INCOMPLETE');
    }
  });
  it('NO_TEXT is terminal processing without claiming newly added transcript text', () => {
    const previous = extraction(
      ['facts', ''],
      [{ position: 1, status: 'NO_TEXT', reason: 'NO_ADDITIONAL_TEXT' }],
    );
    const current = extraction(
      ['facts', ''],
      [{ position: 2, status: 'NO_TEXT', reason: 'NO_ADDITIONAL_TEXT' }],
    );
    const merged = mergeOcrCheckpoint({
      previous,
      current,
      request: request([2]),
      attempted: [2],
    });
    expect(merged.request.status).toBe('COMPLETED');
    expect(merged.extraction.quality?.ocr_units).toEqual([]);
    expect(merged.extraction.quality?.ocr_pages).toHaveLength(2);
    expect(merged.extraction.status).toBe('PARTIAL');
  });
});

describe('OCR durable extraction deliveries', () => {
  function fixture(
    positions = Array.from({ length: 31 }, (_, index) => index + 1),
  ) {
    const prior = extraction(
      Array.from({ length: positions.length }, () => 'Original facts'),
    );
    const artifact = Buffer.from(JSON.stringify(prior));
    const artifactHash = createHash('sha256').update(artifact).digest('hex');
    const version = {
      document_id: 'document',
      source_key: 'new/source',
      source_sha256: hash,
      source_type: 'PDF',
      mime_type: 'application/pdf',
      include_notes: false,
      document: { created_by: owner },
      extraction_count: 1,
      ocr_request: request(positions),
      artifact_key: null as string | null,
      artifact_sha256: null as string | null,
      quality: prior.quality,
    };
    const repository = {
      claim: jest.fn().mockResolvedValue(version),
      source: jest.fn().mockResolvedValue({
        ...version,
        document_id: 'document',
        source_key: 'original/source',
        artifact_key: 'original/artifact',
        artifact_sha256: artifactHash,
      }),
      active: jest.fn().mockResolvedValue({ id: parentId }),
      finish: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const storage = {
      getBoundedObject: jest
        .fn()
        .mockImplementation((key: string) =>
          Promise.resolve(key.includes('artifact') ? artifact : bytes),
        ),
      putBoundedObject: jest.fn().mockResolvedValue(undefined),
    };
    const current = extraction(
      Array.from({ length: positions.length }, () => 'Original facts'),
      positions
        .slice(0, 30)
        .map((position) => ({ position, status: 'COMPLETED' })),
    );
    const client = { extract: jest.fn().mockResolvedValue(current) };
    const execution = new DocumentExecution(
      repository as unknown as DocumentRepository,
      storage as unknown as S3Service,
      client as unknown as DocumentClient,
    );
    return { execution, repository, storage, client, version, current };
  }
  it('dispatches at most thirty server-saved positions and atomically checkpoints the remainder back into the outbox', async () => {
    const test = fixture();
    await test.execution.process(parentId);
    expect(test.client.extract).toHaveBeenCalledWith(
      bytes,
      'PDF',
      false,
      Array.from({ length: 30 }, (_, index) => index + 1),
    );
    expect(test.storage.putBoundedObject).toHaveBeenNthCalledWith(
      1,
      'new/source',
      bytes,
      'application/pdf',
    );
    expect(test.repository.finish).toHaveBeenCalledWith(
      parentId,
      expect.any(String),
      containing({
        status: 'QUEUED',
        artifact_key: expect.stringContaining('/extraction/') as unknown,
        ocr_request: containing({
          deliveries: 1,
          status: 'PENDING',
          pages: expect.arrayContaining([
            { position: 31, status: 'PENDING' },
          ]) as unknown,
        }),
      }),
      owner,
    );
  });
  it('resumes from the child checkpoint without replacing earlier added transcripts or copying source again', async () => {
    const test = fixture();
    test.current.spans[0].text += '\nPreviously added OCR';
    if (test.current.quality) test.current.quality.ocr_units = [1];
    await test.execution.process(parentId);
    const [, checkpoint] = test.storage.putBoundedObject.mock.calls[1] as [
      string,
      Buffer,
    ];
    const [, , saved] = test.repository.finish.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    Object.assign(test.version, saved);
    test.storage.getBoundedObject.mockImplementation((key: string) =>
      Promise.resolve(key === saved.artifact_key ? checkpoint : bytes),
    );
    const current = extraction(
      Array.from({ length: 31 }, () => 'Original facts'),
      [{ position: 31, status: 'COMPLETED' }],
    );
    test.client.extract.mockResolvedValue(current);
    await test.execution.process(parentId);
    expect(test.client.extract).toHaveBeenLastCalledWith(bytes, 'PDF', false, [
      31,
    ]);
    expect(test.storage.putBoundedObject).toHaveBeenCalledTimes(3);
    const [, finalArtifact] = test.storage.putBoundedObject.mock.calls[2] as [
      string,
      Buffer,
    ];
    const final = extractionSchema.parse(
      JSON.parse(finalArtifact.toString('utf8')),
    );
    expect(final.spans[0].text).toContain('Previously added OCR');
    expect(final.quality?.ocr_units).toEqual([1]);
    const [, , finished] = test.repository.finish.mock.calls[1] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(finished.ocr_request).toMatchObject({
      deliveries: 2,
      status: 'COMPLETED',
    });
  });
  it('does not automatically retry paid OCR after a transient timeout', async () => {
    const test = fixture([1, 2]);
    test.client.extract.mockRejectedValue(
      new DocumentProcessingError('DOCUMENT_TIMEOUT', true),
    );
    await test.execution.process(parentId);
    expect(test.repository.finish).toHaveBeenCalledWith(
      parentId,
      expect.any(String),
      containing({
        status: 'FAILED',
        ocr_request: containing({
          status: 'INCOMPLETE',
          pages: [
            { position: 1, status: 'FAILED', reason: 'PROVIDER_ERROR' },
            { position: 2, status: 'FAILED', reason: 'PROVIDER_ERROR' },
          ],
        }),
      }),
      owner,
    );
  });
  it('never publishes a checkpoint or OCR success metadata when artifact storage fails', async () => {
    const test = fixture([1, 2]);
    test.storage.putBoundedObject
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('offline storage'));
    await test.execution.process(parentId);
    expect(test.repository.finish).toHaveBeenLastCalledWith(
      parentId,
      expect.any(String),
      containing({
        status: 'FAILED',
        ocr_request: containing({
          deliveries: 0,
          status: 'INCOMPLETE',
          pages: expect.arrayContaining([
            { position: 1, status: 'FAILED', reason: 'PROVIDER_ERROR' },
          ]) as unknown,
        }),
      }),
      owner,
    );
  });
  it('checks ownership and execution before source copy and before publishing extracted content', async () => {
    const test = fixture([1, 2]);
    test.repository.active.mockResolvedValueOnce(null);
    await test.execution.process(parentId);
    expect(test.storage.putBoundedObject).not.toHaveBeenCalled();
    expect(test.client.extract).not.toHaveBeenCalled();
    expect(test.repository.finish).not.toHaveBeenCalled();
    const late = fixture([1, 2]);
    late.repository.active
      .mockResolvedValueOnce({ id: parentId })
      .mockResolvedValueOnce({ id: parentId })
      .mockResolvedValueOnce(null);
    await late.execution.process(parentId);
    expect(late.client.extract).toHaveBeenCalledTimes(1);
    expect(late.storage.putBoundedObject).toHaveBeenCalledTimes(1);
    expect(late.repository.finish).not.toHaveBeenCalled();
  });
  it('fails expired OCR leases visibly rather than resubmitting them as ordinary extraction retries', async () => {
    const row = {
      id: parentId,
      execution_id: owner,
      ocr_request: request(),
      artifact_key: 'checkpoint',
      quality: extraction().quality,
    };
    const findMany = jest.fn().mockResolvedValue([row]);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const repository = new DocumentRepository({
      learningDocumentVersion: { findMany, updateMany },
    } as unknown as PrismaService);
    await repository.recover();
    expect(updateMany).toHaveBeenNthCalledWith(
      1,
      containing({
        where: containing({ id: parentId, execution_id: owner }),
        data: containing({
          status: 'PARTIAL',
          error_code: 'DOCUMENT_OCR_INTERRUPTED',
          ocr_request: containing({ status: 'INCOMPLETE' }),
        }),
      }),
    );
    expect(updateMany).toHaveBeenNthCalledWith(
      3,
      containing({
        where: containing({
          ocr_request: { equals: Prisma.DbNull },
        }),
        data: containing({ status: 'QUEUED' }),
      }),
    );
  });
});

describe('OCR transport is explicit, bounded and locally mocked', () => {
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
  });
  it('sends off for ordinary extraction, targeted positions only on explicit requests, and validates before fetch', async () => {
    const fetch = jest
      .fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(extraction()), {
            headers: { 'content-type': 'application/json' },
          }),
        ),
      );
    global.fetch = fetch;
    const client = new DocumentClient(
      new ConfigService({
        AI_QUESTION_GENERATION_ENABLED: 'true',
        AI_SERVICE_BASE_URL: 'http://127.0.0.1:1',
        AI_SERVICE_INTERNAL_TOKEN: 'offline-fixture-token-'.repeat(4),
      }),
    );
    await client.extract(bytes, 'PDF', false);
    expect((fetch.mock.calls[0][0] as URL).searchParams.get('ocr_mode')).toBe(
      'off',
    );
    await client.extract(bytes, 'PDF', false, [2, 1]);
    const url = fetch.mock.calls[1][0] as URL;
    expect(url.searchParams.get('ocr_mode')).toBe('targeted');
    expect(url.searchParams.get('ocr_positions')).toBe('2,1');
    await expect(
      client.extract(
        bytes,
        'PDF',
        false,
        Array.from({ length: 31 }, (_, i) => i + 1),
      ),
    ).rejects.toMatchObject({ code: 'DOCUMENT_OCR_POSITIONS_INVALID' });
    await expect(
      client.extract(bytes, 'PDF', false, [1, 1]),
    ).rejects.toMatchObject({ code: 'DOCUMENT_OCR_POSITIONS_INVALID' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
