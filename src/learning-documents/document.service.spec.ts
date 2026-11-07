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
  describe('library management', () => {
    let lib: Record<string, jest.Mock>;
    let remove: jest.Mock;
    let manager: DocumentService;
    beforeEach(() => {
      lib = {
        purgeTarget: jest.fn(),
        activeWork: jest.fn().mockResolvedValue(0),
        purge: jest.fn().mockResolvedValue(undefined),
        rename: jest.fn().mockResolvedValue({ count: 1 }),
        detail: jest.fn().mockResolvedValue({ id: 'doc' }),
        quota: jest.fn().mockResolvedValue({ documents: 1, bytes: 10 }),
      };
      remove = jest.fn().mockResolvedValue(undefined);
      manager = new DocumentService(
        lib as unknown as DocumentRepository,
        { remove } as unknown as S3Service,
        { enabled: true } as DocumentClient,
      );
    });
    it('purges archived documents: removes every stored key, then the rows', async () => {
      lib.purgeTarget.mockResolvedValue({
        id: 'doc',
        is_deleted: false,
        archived_at: new Date(),
        purged_at: null,
        versions: [
          { id: 'v1', upload_key: 'u1', source_key: 's1', artifact_key: null },
          { id: 'v2', upload_key: 'u2', source_key: null, artifact_key: 'a2' },
        ],
      });
      await manager.purge('owner', 'doc');
      expect(remove.mock.calls.map(([key]) => key as string).sort()).toEqual([
        'a2',
        's1',
        'u1',
        'u2',
      ]);
      expect(lib.purge).toHaveBeenCalledWith('doc');
    });
    it('rejects purge unless archived/revoked and idle; replays when purged', async () => {
      lib.purgeTarget.mockResolvedValue({
        id: 'doc',
        is_deleted: false,
        archived_at: null,
        purged_at: null,
        versions: [],
      });
      await expect(manager.purge('owner', 'doc')).rejects.toBeInstanceOf(
        ConflictException,
      );
      lib.purgeTarget.mockResolvedValue({
        id: 'doc',
        is_deleted: true,
        archived_at: null,
        purged_at: null,
        versions: [],
      });
      lib.activeWork.mockResolvedValue(2);
      await expect(manager.purge('owner', 'doc')).rejects.toBeInstanceOf(
        ConflictException,
      );
      lib.purgeTarget.mockResolvedValue({ id: 'doc', purged_at: new Date() });
      await manager.purge('owner', 'doc');
      lib.purgeTarget.mockResolvedValue(null);
      await expect(manager.purge('owner', 'doc')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(lib.purge).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
    });
    it('validates rename and hides foreign documents', async () => {
      await expect(manager.rename('owner', 'doc', { title: '  ' })).rejects.toThrow();
      await expect(
        manager.rename('owner', 'doc', { title: 'x', extra: 1 }),
      ).rejects.toThrow();
      lib.rename.mockResolvedValue({ count: 0 });
      await expect(
        manager.rename('foreign', 'doc', { title: 'New' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
    it('reports quota usage against limits', async () => {
      expect(await manager.quota('owner')).toMatchObject({
        documents: { used: 1 },
        bytes: { used: 10 },
      });
    });
  });
  describe('duplicate detection and extraction reuse', () => {
    const artifact = Buffer.from(
      JSON.stringify({
        contract_version: 'document-extraction.v1',
        parser_version: 'pdf/fixture;text/v1',
        source_type: 'PDF',
        source_sha256: hash,
        include_notes: false,
        status: 'EXTRACTED',
        unit_count: 1,
        spans: [{ kind: 'PAGE', position: 1, text: 'valid' }],
        warnings: [],
      }),
    );
    const artifactHash = createHash('sha256').update(artifact).digest('hex');
    const donor = {
      status: 'EXTRACTED',
      artifact_key: 'donor-artifact',
      artifact_sha256: artifactHash,
      parser_version: 'pdf/fixture;text/v1',
      unit_count: 1,
      warnings: [],
    };
    type Repo = typeof repository & {
      reusable: jest.Mock;
      completeReused: jest.Mock;
      duplicates: jest.Mock;
    };
    let repo: Repo;
    let store: { getBoundedObject: jest.Mock; putBoundedObject: jest.Mock; remove: jest.Mock };
    let reuse: DocumentService;
    beforeEach(() => {
      store = {
        getBoundedObject: jest.fn(async (key: string) =>
          key === 'donor-artifact' ? artifact : bytes,
        ),
        putBoundedObject: jest.fn(),
        remove: jest.fn(),
      };
      repo = {
        ...repository,
        version: jest.fn().mockResolvedValue({
          id: 'version',
          status: 'UPLOADING',
          declared_size: bytes.length,
          upload_expires_at: new Date(Date.now() + 60_000),
          source_type: 'PDF',
          include_notes: false,
          upload_key: 'quarantine',
          mime_type: 'application/pdf',
        }),
        reusable: jest.fn().mockResolvedValue(donor),
        completeReused: jest.fn().mockResolvedValue({ count: 1 }),
        duplicates: jest.fn().mockResolvedValue([]),
      };
      reuse = new DocumentService(
        repo as unknown as DocumentRepository,
        store as unknown as S3Service,
        { enabled: true } as DocumentClient,
      );
    });
    it('publishes a copied artifact and skips the queue when identical bytes were extracted', async () => {
      const result = await reuse.complete('owner', 'doc', 'version');
      expect(result).toMatchObject({
        status: 'EXTRACTED',
        reused_extraction: true,
      });
      expect(repo.reusable).toHaveBeenCalledWith(
        'owner',
        hash,
        'PDF',
        false,
        'version',
      );
      expect(repo.completeReused).toHaveBeenCalledWith(
        'owner',
        'version',
        expect.objectContaining({
          source_sha256: hash,
          artifact_sha256: artifactHash,
          status: 'EXTRACTED',
        }),
      );
      expect(repo.complete).not.toHaveBeenCalled();
    });
    it('falls back to the queue without a donor, with a tampered artifact, or after a lost race', async () => {
      repo.reusable.mockResolvedValueOnce(null);
      expect(await reuse.complete('owner', 'doc', 'version')).toMatchObject({
        status: 'QUEUED',
      });
      repo.reusable.mockResolvedValueOnce({ ...donor, artifact_sha256: 'x' });
      expect(await reuse.complete('owner', 'doc', 'version')).toMatchObject({
        status: 'QUEUED',
      });
      repo.completeReused.mockResolvedValueOnce({ count: 0 });
      expect(await reuse.complete('owner', 'doc', 'version')).toMatchObject({
        status: 'QUEUED',
      });
      expect(store.remove).toHaveBeenCalledTimes(1);
      expect(repo.complete).toHaveBeenCalledTimes(3);
    });
    it('falls back to the queue when storage copy fails and cleans up', async () => {
      store.putBoundedObject
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('s3 down'));
      expect(await reuse.complete('owner', 'doc', 'version')).toMatchObject({
        status: 'QUEUED',
      });
      expect(repo.completeReused).not.toHaveBeenCalled();
    });
    it('validates the hash and returns only owner-scoped match metadata', async () => {
      await expect(
        reuse.checkDuplicate('owner', { sha256: 'abc', source_type: 'PDF' }),
      ).rejects.toThrow();
      repo.duplicates.mockResolvedValue([
        {
          id: 'v1',
          version: 2,
          file_name: 'a.pdf',
          status: 'EXTRACTED',
          include_notes: false,
          created_at: new Date(0),
          document: {
            id: 'd1',
            title: 'T',
            topic_id: 't',
            chapter_id: null,
            archived_at: null,
          },
        },
      ]);
      const out = await reuse.checkDuplicate('owner', {
        sha256: hash,
        source_type: 'PDF',
      });
      expect(out.data).toEqual([
        expect.objectContaining({ document_id: 'd1', version_id: 'v1' }),
      ]);
      expect(repo.duplicates).toHaveBeenCalledWith('owner', hash, 'PDF');
    });
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
