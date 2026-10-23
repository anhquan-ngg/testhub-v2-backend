import { createHash, randomUUID } from 'node:crypto';
import { DocumentGenerationService } from './document-generation.service';
import { DocumentRepository } from '../learning-documents/document.repository';
import { RagRepository } from '../learning-documents/rag.repository';
import { RagService } from '../learning-documents/rag.service';
import { RagClient } from '../learning-documents/rag-client.service';
import { readContractFixture } from './fixtures/contract-fixture';

describe('Document generation authorization and preparation', () => {
  const fixture = readContractFixture();
  const version = randomUUID(),
    indexId = randomUUID(),
    document = randomUUID();
  const source = {
    id: version,
    document_id: document,
    source_sha256: 'a'.repeat(64),
    status: 'EXTRACTED',
    consented_at: new Date(),
    document: {
      topic_id: fixture.command.topic_id,
      chapter_id: fixture.command.chapter_id,
      title: 'Stack',
    },
  };
  const index = { id: indexId, profile_id: 'b'.repeat(64), status: 'READY' };
  const input = {
    created_by: 'owner',
    topic_id: fixture.command.topic_id,
    chapter_id: fixture.command.chapter_id,
    source_version_id: version,
    source_index_id: indexId,
    source_profile_id: index.profile_id,
    source_query: 'Stack',
    requested_count: 1,
    question_format: fixture.command.question_format,
  };
  let documents: { source: jest.Mock };
  let indexes: { forVersion: jest.Mock };
  let rag: { start: jest.Mock };
  let client: { enabled: boolean; generate: jest.Mock };
  let service: DocumentGenerationService;
  beforeEach(() => {
    documents = { source: jest.fn().mockResolvedValue(source) };
    indexes = { forVersion: jest.fn().mockResolvedValue(index) };
    rag = { start: jest.fn().mockResolvedValue(index) };
    const text = 'A stack uses LIFO.';
    const chunk = {
      index_id: indexId,
      version_id: version,
      document_id: document,
      source_sha256: source.source_sha256,
      text,
      text_sha256: createHash('sha256').update(text).digest('hex'),
    };
    client = {
      enabled: true,
      generate: jest.fn().mockResolvedValue({
        profile_id: index.profile_id,
        questions: [
          {
            ...fixture.internal_response.questions[0],
            citations: [{ chunk, quote: 'LIFO' }],
          },
        ],
      }),
    };
    service = new DocumentGenerationService(
      documents as unknown as DocumentRepository,
      indexes as unknown as RagRepository,
      rag as unknown as RagService,
      client as unknown as RagClient,
    );
  });
  it('rejects foreign sources, mismatched targets and OCR before model calls', async () => {
    for (const candidate of [
      null,
      { ...source, document: { ...source.document, chapter_id: randomUUID() } },
      { ...source, status: 'OCR_REQUIRED' },
      { ...source, status: 'UPLOADING' },
    ]) {
      documents.source.mockResolvedValue(candidate);
      await expect(
        service.authorize('owner', {
          ...fixture.command,
          source: { mode: 'document', version_id: version, query: '' },
        }),
      ).rejects.toBeDefined();
    }
    expect(client.generate).not.toHaveBeenCalled();
    expect(rag.start).not.toHaveBeenCalled();
  });
  it('waits for extraction without queueing embeddings or invoking generation', async () => {
    documents.source.mockResolvedValue({ ...source, status: 'PROCESSING' });
    expect((await service.prepare(input)).stage).toBe('EXTRACTING');
    expect(rag.start).not.toHaveBeenCalled();
    expect(client.generate).not.toHaveBeenCalled();
  });
  it('pins one index/profile and never silently replaces it while polling', async () => {
    expect(
      (await service.prepare({ ...input, source_index_id: null })).index?.id,
    ).toBe(indexId);
    expect(rag.start).toHaveBeenCalledTimes(1);
    rag.start.mockClear();
    expect((await service.prepare(input)).ready).toBe(true);
    expect(rag.start).not.toHaveBeenCalled();
  });
  it('retains evidence separately from editable bank-shaped JSON', async () => {
    const result = await service.generate(input, 'Data structures');
    expect(result.questions[0]).toEqual(fixture.internal_response.questions[0]);
    expect(result.provenance[0].quality_status).toBe('UNASSESSED');
    expect(result.provenance[0].citations[0].quote).toBe('LIFO');
    expect(documents.source).toHaveBeenCalledTimes(2);
  });
  it('rejects late results after document revocation and modified evidence', async () => {
    documents.source.mockResolvedValueOnce(source).mockResolvedValueOnce(null);
    await expect(service.generate(input, 'Data')).rejects.toMatchObject({
      code: 'AI_DOCUMENT_SOURCE_INVALID',
    });
    documents.source.mockResolvedValue(source);
    const returned = (await client.generate()) as {
      questions: { citations: { chunk: { source_sha256: string } }[] }[];
    };
    returned.questions[0].citations[0].chunk.source_sha256 = 'c'.repeat(64);
    await expect(service.generate(input, 'Data')).rejects.toMatchObject({
      code: 'AI_OUTPUT_INVALID',
    });
  });
});
