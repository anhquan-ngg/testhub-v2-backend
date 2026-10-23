import { createHash } from 'node:crypto';
import { RagExecution } from './rag-execution.service';
import { RagRepository } from './rag.repository';
import { RagClient } from './rag-client.service';
import { S3Service } from '../s3/s3.service';
import { DocumentProcessingError } from './document-client.service';

describe('RAG checkpoint execution', () => {
  let row: Record<string, unknown>;
  let repo: {
    claim: jest.Mock;
    active: jest.Mock;
    finish: jest.Mock;
    revoked: jest.Mock;
    acknowledged: jest.Mock;
    deferRevocation: jest.Mock;
  };
  let client: { step: jest.Mock; prepare: jest.Mock; revoke: jest.Mock };
  let storage: { getBoundedObject: jest.Mock };
  let execution: RagExecution;
  const artifact = {
    contract_version: 'document-extraction.v1',
    source_type: 'PDF',
    source_sha256: 'a'.repeat(64),
    parser_version: 'pdf/fixture;text/v1',
    include_notes: false,
    status: 'EXTRACTED',
    unit_count: 1,
    spans: [{ kind: 'PAGE', position: 1, text: 'LIFO' }],
    warnings: [],
  };
  beforeEach(() => {
    const bytes = Buffer.from(JSON.stringify(artifact));
    row = {
      id: 'index',
      version_id: 'version',
      profile_id: 'profile',
      owner_id: 'owner',
      prepared: true,
      failure_count: 0,
      version: {
        document_id: 'doc',
        document: { topic_id: 'topic', chapter_id: 'chapter' },
        artifact_key: 'private-artifact',
        artifact_sha256: createHash('sha256').update(bytes).digest('hex'),
        source_sha256: artifact.source_sha256,
        source_type: 'PDF',
        parser_version: artifact.parser_version,
        include_notes: false,
      },
    };
    repo = {
      claim: jest.fn().mockImplementation(() => Promise.resolve(row)),
      active: jest.fn().mockResolvedValue({ id: 'index' }),
      finish: jest.fn(),
      revoked: jest.fn().mockResolvedValue([]),
      acknowledged: jest.fn().mockResolvedValue(undefined),
      deferRevocation: jest.fn().mockResolvedValue(undefined),
    };
    client = {
      revoke: jest.fn().mockResolvedValue(undefined),
      step: jest.fn().mockResolvedValue({
        status: 'BUILDING',
        chunk_count: 30,
        completed_chunks: 16,
      }),
      prepare: jest.fn().mockResolvedValue({
        status: 'BUILDING',
        chunk_count: 30,
        completed_chunks: 0,
      }),
    };
    storage = { getBoundedObject: jest.fn().mockResolvedValue(bytes) };
    execution = new RagExecution(
      repo as unknown as RagRepository,
      storage as unknown as S3Service,
      client as unknown as RagClient,
    );
  });
  it('skips duplicate delivery without paid calls', async () => {
    repo.claim.mockResolvedValue(null);
    await execution.process('index');
    expect(client.step).not.toHaveBeenCalled();
  });
  it('defers a failed tombstone and still acknowledges another revoked index', async () => {
    repo.revoked.mockResolvedValue([row, { ...row, id: 'other' }]);
    client.revoke.mockRejectedValueOnce(new Error('unavailable'));
    await execution.revoke();
    expect(repo.deferRevocation).toHaveBeenCalledWith('index', 0);
    expect(repo.acknowledged).not.toHaveBeenCalledWith('index');
    expect(repo.acknowledged).toHaveBeenCalledWith('other');
  });
  it('checkpoints one batch and queues the next step', async () => {
    await execution.process('index');
    expect(client.step).toHaveBeenCalledTimes(1);
    expect(repo.finish).toHaveBeenCalledWith(
      'index',
      expect.any(String),
      'owner',
      expect.objectContaining({
        status: 'QUEUED',
        completed_chunks: 16,
        failure_count: 0,
      }),
    );
  });
  it('prepares only hash-checked extraction before embedding', async () => {
    row.prepared = false;
    await execution.process('index');
    expect(client.prepare).toHaveBeenCalledTimes(1);
    expect(client.step).not.toHaveBeenCalled();
  });
  it('rejects changed artifacts without any AI invocation', async () => {
    row.prepared = false;
    storage.getBoundedObject.mockResolvedValue(Buffer.from('changed'));
    await execution.process('index');
    expect(client.prepare).not.toHaveBeenCalled();
    expect(repo.finish).toHaveBeenCalledWith(
      'index',
      expect.any(String),
      'owner',
      expect.objectContaining({
        status: 'FAILED',
        error_code: 'RAG_SOURCE_CHANGED',
      }),
    );
  });
  it('rechecks access after artifact I/O', async () => {
    row.prepared = false;
    repo.active
      .mockResolvedValueOnce({ id: 'index' })
      .mockResolvedValueOnce(null);
    await execution.process('index');
    expect(client.prepare).not.toHaveBeenCalled();
    expect(repo.finish).not.toHaveBeenCalled();
  });
  it('caps consecutive transient failures and never retries permanent errors', async () => {
    client.step.mockRejectedValue(
      new DocumentProcessingError('RAG_EMBEDDING_UNAVAILABLE', true),
    );
    await execution.process('index');
    expect(repo.finish).toHaveBeenLastCalledWith(
      'index',
      expect.any(String),
      'owner',
      expect.objectContaining({ status: 'QUEUED', failure_count: 1 }),
    );
    row.failure_count = 2;
    await execution.process('index');
    expect(repo.finish).toHaveBeenLastCalledWith(
      'index',
      expect.any(String),
      'owner',
      expect.objectContaining({ status: 'FAILED', failure_count: 3 }),
    );
    row.failure_count = 0;
    client.step.mockRejectedValue(
      new DocumentProcessingError('RAG_EMBEDDING_CONFIG'),
    );
    await execution.process('index');
    expect(repo.finish).toHaveBeenLastCalledWith(
      'index',
      expect.any(String),
      'owner',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });
});
