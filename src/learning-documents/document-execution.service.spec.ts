import { createHash } from 'node:crypto';
import { DocumentExecution } from './document-execution.service';
import { DocumentRepository } from './document.repository';
import {
  DocumentClient,
  DocumentProcessingError,
} from './document-client.service';
import { S3Service } from '../s3/s3.service';

describe('Document extraction execution fencing and recovery', () => {
  const bytes = Buffer.from('%PDF-fixture');
  const hash = createHash('sha256').update(bytes).digest('hex');
  let repository: { claim: jest.Mock; active: jest.Mock; finish: jest.Mock };
  let storage: { getBoundedObject: jest.Mock; putBoundedObject: jest.Mock };
  let client: { extract: jest.Mock };
  let execution: DocumentExecution;
  beforeEach(() => {
    repository = {
      claim: jest.fn().mockResolvedValue({
        source_key: 'source',
        source_sha256: hash,
        source_type: 'PDF',
        include_notes: false,
        document_id: 'doc',
        document: { created_by: 'owner' },
        extraction_count: 1,
      }),
      active: jest.fn().mockResolvedValue({ id: 'version' }),
      finish: jest.fn(),
    };
    storage = {
      getBoundedObject: jest.fn().mockResolvedValue(bytes),
      putBoundedObject: jest.fn(),
    };
    client = {
      extract: jest.fn().mockResolvedValue({
        source_sha256: hash,
        status: 'EXTRACTED',
        contract_version: 'document-extraction.v1',
        parser_version: 'pdf/fixture;text/v1',
        unit_count: 1,
        warnings: [],
        spans: [],
      }),
    };
    execution = new DocumentExecution(
      repository as unknown as DocumentRepository,
      storage as unknown as S3Service,
      client as unknown as DocumentClient,
    );
  });
  it('does not repeat extraction for an unclaimed/duplicate delivery', async () => {
    repository.claim.mockResolvedValue(null);
    await execution.process('version');
    expect(client.extract).not.toHaveBeenCalled();
  });
  it('checks source hash and stores an execution-specific checked artifact', async () => {
    await execution.process('version');
    expect(storage.putBoundedObject).toHaveBeenCalledWith(
      expect.stringMatching(/\/extraction\/.+\.json$/),
      expect.any(Buffer),
      'application/json',
    );
    expect(repository.finish).toHaveBeenCalledWith(
      'version',
      expect.any(String),
      expect.objectContaining({ status: 'EXTRACTED' }),
      'owner',
    );
  });
  it('discards results after revocation or lease loss', async () => {
    repository.active
      .mockResolvedValueOnce({ id: 'version' })
      .mockResolvedValueOnce(null);
    await execution.process('version');
    expect(storage.putBoundedObject).not.toHaveBeenCalled();
    expect(repository.finish).not.toHaveBeenCalled();
  });
  it('does not accept changed source bytes', async () => {
    storage.getBoundedObject.mockResolvedValue(Buffer.from('changed'));
    await execution.process('version');
    expect(client.extract).not.toHaveBeenCalled();
    expect(repository.finish).toHaveBeenCalledWith(
      'version',
      expect.any(String),
      expect.objectContaining({
        status: 'FAILED',
        error_code: 'DOCUMENT_SOURCE_CHANGED',
      }),
      'owner',
    );
  });
  it('retries transient extraction errors but caps attempts at three', async () => {
    client.extract.mockRejectedValue(
      new DocumentProcessingError('DOCUMENT_TIMEOUT', true),
    );
    await execution.process('version');
    expect(repository.finish).toHaveBeenLastCalledWith(
      'version',
      expect.any(String),
      expect.objectContaining({ status: 'QUEUED' }),
      'owner',
    );
    repository.claim.mockResolvedValue({
      source_key: 'source',
      source_sha256: hash,
      source_type: 'PDF',
      include_notes: false,
      document: { created_by: 'owner' },
      extraction_count: 3,
    });
    await execution.process('version');
    expect(repository.finish).toHaveBeenLastCalledWith(
      'version',
      expect.any(String),
      expect.objectContaining({ status: 'FAILED' }),
      'owner',
    );
  });
  it('OCR_REQUIRED remains distinct from successful extraction', async () => {
    client.extract.mockResolvedValue({
      source_sha256: hash,
      status: 'OCR_REQUIRED',
      contract_version: 'document-extraction.v1',
      parser_version: 'pdf/fixture;text/v1',
      unit_count: 1,
      warnings: ['OCR_REQUIRED'],
    });
    await execution.process('version');
    expect(repository.finish).toHaveBeenCalledWith(
      'version',
      expect.any(String),
      expect.objectContaining({ status: 'OCR_REQUIRED' }),
      'owner',
    );
  });
});
