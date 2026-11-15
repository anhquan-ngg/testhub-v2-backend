import { ConfigService } from '@nestjs/config';
import { RagClient } from './rag-client.service';
import { DocumentProcessingError } from './document-client.service';
import { readContractFixture } from '../question-generation/fixtures/contract-fixture';

const issue = { slot: 1, reason: 'INSUFFICIENT_EVIDENCE' };

describe('RAG generation failure diagnostics', () => {
  const body = {
    owner_id: 'owner',
    profile_id: 'b'.repeat(64),
    index_ids: ['index'],
    query: 'Stack',
    top_k: 8,
    question_configs: readContractFixture().command.question_configs.map(
      (config) => ({ ...config, count: 2 }),
    ),
  };
  let client: RagClient;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    client = new RagClient(
      new ConfigService({
        AI_QUESTION_GENERATION_ENABLED: 'true',
        AI_RAG_ENABLED: 'true',
        AI_SERVICE_BASE_URL: 'http://127.0.0.1:8000',
        AI_SERVICE_INTERNAL_TOKEN: 't'.repeat(32),
      }),
    );
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });
  afterEach(() => jest.restoreAllMocks());

  function reply(
    diagnostics: unknown,
    code = 'RAG_INSUFFICIENT_EVIDENCE',
    status = 422,
    retryable: unknown = false,
  ) {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ detail: { code, retryable, diagnostics } }),
        {
          status,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
  }

  it.each([
    { issues: [issue, { slot: 2, reason: 'NO_RETRIEVED_CONTEXT' }] },
    { issues: [] },
  ])(
    'retains only valid numbered issues, including unknown legacy slots: %j',
    async (diagnostics) => {
      reply(diagnostics);
      await expect(client.generate(body)).rejects.toMatchObject({
        code: 'RAG_INSUFFICIENT_EVIDENCE',
        retryable: false,
        evidenceDetails: diagnostics,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    undefined,
    null,
    [],
    { issues: [issue], provider: 'private' },
    { issues: [{ ...issue, text: 'private source' }] },
    { issues: [{ ...issue, plan_item_id: 'private-id' }] },
    { issues: [{ ...issue, reason: 'provider reason prose' }] },
    { issues: [{ ...issue, slot: 0 }] },
    { issues: [{ ...issue, slot: -1 }] },
    { issues: [{ ...issue, slot: 1.5 }] },
    { issues: [{ ...issue, slot: '1' }] },
    { issues: [{ ...issue, slot: 3 }] },
    { issues: [issue, issue] },
    {
      issues: Array.from({ length: 21 }, (_, i) => ({ ...issue, slot: i + 1 })),
    },
  ])(
    'drops the whole unsafe or unmatched diagnostic payload: %j',
    async (diagnostics) => {
      reply(diagnostics);
      await expect(client.generate(body)).rejects.toMatchObject({
        code: 'RAG_INSUFFICIENT_EVIDENCE',
        evidenceDetails: undefined,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    ['RAG_OUTPUT_INVALID', 422],
    ['RAG_PLAN_ITEM_INSUFFICIENT_CONTEXT', 422],
    ['RAG_INSUFFICIENT_CONTEXT', 422],
    ['RAG_GENERATION_TIMEOUT', 504],
    ['RAG_INSUFFICIENT_EVIDENCE', 500],
  ])('does not trust diagnostics on %s / HTTP %i', async (code, status) => {
    reply({ issues: [issue] }, code, status);
    await expect(client.generate(body)).rejects.toMatchObject({
      code,
      evidenceDetails: undefined,
    });
  });

  it.each([true, null, 'false'])(
    'drops diagnostics unless retryable is explicitly false: %j',
    async (retryable) => {
      reply({ issues: [issue] }, 'RAG_INSUFFICIENT_EVIDENCE', 422, retryable);
      await expect(client.generate(body)).rejects.toMatchObject({
        code: 'RAG_INSUFFICIENT_EVIDENCE',
        evidenceDetails: undefined,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('does not accept generation diagnostics from another RAG operation', async () => {
    reply({ issues: [issue] });
    await expect(client.profile()).rejects.toMatchObject({
      evidenceDetails: undefined,
    });
  });

  it('continues rejecting malformed successful model output', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ questions: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(client.generate(body)).rejects.toEqual(
      new DocumentProcessingError('RAG_OUTPUT_INVALID'),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
