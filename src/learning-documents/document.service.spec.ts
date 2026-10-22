import { ConflictException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { DocumentService } from './document.service';
import { DocumentRepository } from './document.repository';
import { S3Service } from '../s3/s3.service';
import { DocumentClient } from './document-client.service';
import { extractionSchema, uploadDocumentSchema } from './document.contract';

describe('Document upload and source boundaries', () => {
  const bytes = Buffer.from('%PDF-1.7 fixture');
  const hash = createHash('sha256').update(bytes).digest('hex');
  let repository: { version: jest.Mock; complete: jest.Mock };
  let storage: { getBoundedObject: jest.Mock; putBoundedObject: jest.Mock };
  let service: DocumentService;
  beforeEach(() => {
    repository = {
      version: jest.fn().mockResolvedValue({
        status: 'UPLOADING',
        declared_size: bytes.length,
        upload_expires_at: new Date(Date.now() + 60_000),
        source_type: 'PDF',
        upload_key: 'quarantine',
        mime_type: 'application/pdf',
      }),
      complete: jest.fn().mockResolvedValue({ count: 1 }),
    };
    storage = {
      getBoundedObject: jest.fn().mockResolvedValue(bytes),
      putBoundedObject: jest.fn(),
    };
    service = new DocumentService(
      repository as unknown as DocumentRepository,
      storage as unknown as S3Service,
      { enabled: true } as DocumentClient,
    );
  });
  it('freezes checked bytes before queuing, never uses a client object key', async () => {
    expect(await service.complete('owner', 'doc', 'version')).toMatchObject({
      status: 'QUEUED',
    });
    expect(storage.putBoundedObject).toHaveBeenCalledWith(
      `learning-documents/doc/version/source/${hash}`,
      bytes,
      'application/pdf',
    );
    expect(repository.complete).toHaveBeenCalledWith(
      'owner',
      'version',
      expect.any(String),
      hash,
    );
  });
  it('does not enqueue incomplete or size-mismatched uploads', async () => {
    storage.getBoundedObject.mockRejectedValueOnce(new Error('not uploaded'));
    await expect(
      service.complete('owner', 'doc', 'version'),
    ).rejects.toBeInstanceOf(ConflictException);
    storage.getBoundedObject.mockResolvedValue(Buffer.from('short'));
    await expect(
      service.complete('owner', 'doc', 'version'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.complete).not.toHaveBeenCalled();
  });
  it('checks ownership before source access', async () => {
    repository.version.mockResolvedValue(null);
    await expect(
      service.complete('foreign', 'doc', 'version'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.getBoundedObject).not.toHaveBeenCalled();
  });
  it('replays completion without another storage call', async () => {
    repository.version.mockResolvedValue({ status: 'PROCESSING' });
    expect(await service.complete('owner', 'doc', 'version')).toMatchObject({
      status: 'PROCESSING',
    });
    expect(storage.getBoundedObject).not.toHaveBeenCalled();
  });
  it('rejects expired uploads', async () => {
    repository.version.mockResolvedValue({
      status: 'UPLOADING',
      upload_expires_at: new Date(0),
    });
    await expect(
      service.complete('owner', 'doc', 'version'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.complete).not.toHaveBeenCalled();
  });
  it('requires explicit consent and matching file/MIME types without coercion', () => {
    const input = {
      file_name: 'a.pdf',
      source_type: 'PDF',
      mime_type: 'application/pdf',
      size: 100,
      consent: true,
    };
    expect(uploadDocumentSchema.safeParse(input).success).toBe(true);
    for (const patch of [
      { consent: false },
      { consent: 'true' },
      { size: '100' },
      { file_name: 'a.pptx' },
      { mime_type: 'text/plain' },
      { include_notes: true },
    ])
      expect(
        uploadDocumentSchema.safeParse({ ...input, ...patch }).success,
      ).toBe(false);
  });
  it('rejects fabricated page manifests and empty successful extractions', () => {
    const result = {
      contract_version: 'document-extraction.v1',
      parser_version: 'pdf/fixture;text/v1',
      source_type: 'PDF',
      source_sha256: hash,
      include_notes: false,
      status: 'EXTRACTED',
      unit_count: 1,
      spans: [{ kind: 'PAGE', position: 1, text: 'valid' }],
      warnings: [],
    };
    expect(extractionSchema.safeParse(result).success).toBe(true);
    expect(
      extractionSchema.safeParse({
        ...result,
        spans: [{ kind: 'PAGE', position: 2, text: 'fake' }],
      }).success,
    ).toBe(false);
    expect(
      extractionSchema.safeParse({
        ...result,
        spans: [{ kind: 'PAGE', position: 1, text: ' ' }],
      }).success,
    ).toBe(false);
  });
});
