import { ConflictException, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { RagService } from './rag.service';
import { RagRepository } from './rag.repository';
import { RagClient } from './rag-client.service';
import { DocumentRepository } from './document.repository';

describe('RAG business scope and lifecycle', () => {
  const owner = randomUUID(),
    version = randomUUID(),
    document = randomUUID(),
    index = randomUUID();
  const profile = { profile_id: 'a'.repeat(64), config: { model: 'fixture' } };
  let repo: {
    versions: jest.Mock;
    create: jest.Mock;
    retry: jest.Mock;
    detail: jest.Mock;
  };
  let client: { enabled: boolean; profile: jest.Mock; retrieve: jest.Mock };
  let documents: { version: jest.Mock };
  let service: RagService;
  const source = () => ({
    id: version,
    document_id: document,
    source_sha256: 'b'.repeat(64),
    indexes: [{ id: index, profile_id: profile.profile_id }],
  });
  beforeEach(() => {
    repo = {
      versions: jest.fn().mockResolvedValue([source()]),
      create: jest.fn().mockResolvedValue({ id: index, status: 'QUEUED' }),
      retry: jest.fn().mockResolvedValue({ count: 1 }),
      detail: jest.fn(),
    };
    client = {
      enabled: true,
      profile: jest.fn().mockResolvedValue(profile),
      retrieve: jest.fn().mockResolvedValue({ chunks: [] }),
    };
    documents = {
      version: jest.fn().mockResolvedValue({ status: 'EXTRACTED' }),
    };
    service = new RagService(
      repo as unknown as RagRepository,
      documents as unknown as DocumentRepository,
      client as unknown as RagClient,
    );
  });
  it('rejects a mixed foreign version set before calling Python or embedding', async () => {
    await expect(
      service.retrieve(owner, {
        version_ids: [version, randomUUID()],
        query: 'LIFO',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(client.retrieve).not.toHaveBeenCalled();
    expect(client.profile).not.toHaveBeenCalled();
  });
  it('requires a completed index for the current profile', async () => {
    repo.versions.mockResolvedValue([{ ...source(), indexes: [] }]);
    await expect(
      service.retrieve(owner, { version_ids: [version], query: 'LIFO' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(client.retrieve).not.toHaveBeenCalled();
  });
  it('rechecks revocation after query embedding/search', async () => {
    repo.versions.mockResolvedValueOnce([source()]).mockResolvedValueOnce([]);
    await expect(
      service.retrieve(owner, { version_ids: [version], query: 'LIFO' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('validates returned source identity and text hash', async () => {
    const chunk = {
      index_id: index,
      document_id: document,
      version_id: version,
      source_sha256: 'b'.repeat(64),
      text: 'LIFO',
      text_sha256: createHash('sha256').update('LIFO').digest('hex'),
    };
    client.retrieve.mockResolvedValue({ chunks: [chunk] });
    await expect(
      service.retrieve(owner, { version_ids: [version], query: 'LIFO' }),
    ).resolves.toEqual({ chunks: [chunk] });
    client.retrieve.mockResolvedValue({
      chunks: [{ ...chunk, document_id: randomUUID() }],
    });
    await expect(
      service.retrieve(owner, { version_ids: [version], query: 'LIFO' }),
    ).rejects.toThrow('RAG_OUTPUT_INVALID');
  });
  it('replays an existing index and rejects OCR before profile lookup', async () => {
    await service.start(owner, document, version);
    await service.start(owner, document, version);
    expect(repo.create).toHaveBeenLastCalledWith(
      owner,
      document,
      version,
      profile,
    );
    client.profile.mockClear();
    documents.version.mockResolvedValue({ status: 'OCR_REQUIRED' });
    await expect(service.start(owner, document, version)).rejects.toThrow(
      'RAG_SOURCE_NOT_EXTRACTED',
    );
    expect(client.profile).not.toHaveBeenCalled();
  });
  it('does not allow caller-supplied ownership, duplicate versions or string top_k', async () => {
    for (const body of [
      { version_ids: [version], query: 'LIFO', owner_id: owner },
      { version_ids: [version, version], query: 'LIFO' },
      { version_ids: [version], query: 'LIFO', top_k: '6' },
    ])
      await expect(service.retrieve(owner, body)).rejects.toThrow(
        'Invalid retrieval request',
      );
    expect(client.profile).not.toHaveBeenCalled();
  });
});
