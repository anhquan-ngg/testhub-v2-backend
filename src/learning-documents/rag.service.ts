import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RagClient } from './rag-client.service';
import { RagRepository } from './rag.repository';
import { retrieveCommandSchema } from './rag.contract';
import { DocumentRepository } from './document.repository';
import { DocumentProcessingError } from './document-client.service';

/** Authoritative document authorization before and after internal retrieval. */
@Injectable()
export class RagService {
  constructor(
    private readonly repository: RagRepository,
    private readonly documents: DocumentRepository,
    private readonly client: RagClient,
  ) {}
  private enabled() {
    if (!this.client.enabled)
      throw new ServiceUnavailableException('RAG_DISABLED');
  }
  private async call<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof DocumentProcessingError) {
        if (error.code === 'RAG_SCOPE_UNAVAILABLE')
          throw new NotFoundException(error.code);
        if (error.code === 'RAG_INSUFFICIENT_CONTEXT')
          throw new UnprocessableEntityException(error.code);
        if (
          [
            'RAG_PROFILE_MISMATCH',
            'RAG_RETRY_EXHAUSTED',
            'RAG_INDEX_CONFLICT',
          ].includes(error.code)
        )
          throw new ConflictException(error.code);
        throw new ServiceUnavailableException(error.code);
      }
      throw error;
    }
  }
  /** Queue one immutable profile/version index; replay returns the existing index. */
  async start(owner: string, document: string, version: string) {
    this.enabled();
    const source = await this.documents.version(owner, document, version);
    if (!source) throw new NotFoundException('Document version not found');
    if (source.status !== 'EXTRACTED')
      throw new ConflictException('RAG_SOURCE_NOT_EXTRACTED');
    const profile = await this.call(() => this.client.profile());
    const result = await this.repository.create(
      owner,
      document,
      version,
      profile,
    );
    if (!result) throw new ConflictException('RAG_SOURCE_UNAVAILABLE');
    return result;
  }
  /** Resume only an accessible failed index, preserving durable vectors and call budget. */
  async retry(owner: string, id: string) {
    this.enabled();
    if (!(await this.repository.retry(owner, id)).count)
      throw new ConflictException('RAG_INDEX_NOT_RETRYABLE');
    return this.repository.detail(owner, id);
  }
  /** Reject mixed foreign/stale scope as a whole before any query embedding. */
  async retrieve(owner: string, body: unknown) {
    this.enabled();
    const parsed = retrieveCommandSchema.safeParse(body);
    if (!parsed.success)
      throw new BadRequestException('Invalid retrieval request');
    const input = parsed.data;
    const versions = await this.repository.versions(owner, input.version_ids);
    if (versions.length !== input.version_ids.length)
      throw new NotFoundException('RAG_SCOPE_UNAVAILABLE');
    const profile = await this.call(() => this.client.profile());
    const indexes = versions.map((v) =>
      v.indexes.find((i) => i.profile_id === profile.profile_id),
    );
    if (indexes.some((i) => !i))
      throw new ConflictException('RAG_INDEX_NOT_READY');
    const ids = indexes.flatMap((i) => (i ? [i.id] : []));
    const result = await this.call(() =>
      this.client.retrieve({
        owner_id: owner,
        profile_id: profile.profile_id,
        index_ids: ids,
        query: input.query,
        top_k: input.top_k,
      }),
    );
    const latest = await this.repository.versions(owner, input.version_ids);
    if (
      latest.length !== versions.length ||
      latest.some((v) => !v.indexes.some((i) => ids.includes(i.id)))
    )
      throw new NotFoundException('RAG_SCOPE_UNAVAILABLE');
    for (const chunk of result.chunks) {
      const source = latest.find((v) => v.id === chunk.version_id);
      if (
        !source ||
        source.document_id !== chunk.document_id ||
        source.source_sha256 !== chunk.source_sha256 ||
        !source.indexes.some((i) => i.id === chunk.index_id) ||
        createHash('sha256').update(chunk.text).digest('hex') !==
          chunk.text_sha256
      )
        throw new ServiceUnavailableException('RAG_OUTPUT_INVALID');
    }
    return result;
  }
}
