import { HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { QuestionFormat } from '@prisma/client';
import { DocumentRepository } from '../learning-documents/document.repository';
import { RagRepository } from '../learning-documents/rag.repository';
import { RagService } from '../learning-documents/rag.service';
import { RagClient } from '../learning-documents/rag-client.service';
import { DocumentProcessingError } from '../learning-documents/document-client.service';
import {
  QuestionGenerationException,
  GenerationErrorCode,
} from './question-generation.errors';
import { GenerationCommand } from './question-generation.contract';
import { QuestionProvenance } from './grounded-generation.contract';

type SourceInput = {
  created_by: string;
  topic_id: string;
  chapter_id: string;
  source_version_id: string | null;
  source_index_id: string | null;
  source_profile_id: string | null;
  source_query: string | null;
};
/** Authorize immutable document sources and bridge their preparation/generation. */
@Injectable()
export class DocumentGenerationService {
  constructor(
    private readonly documents: DocumentRepository,
    private readonly indexes: RagRepository,
    private readonly rag: RagService,
    private readonly client: RagClient,
  ) {}
  private fail(code: GenerationErrorCode): never {
    throw new QuestionGenerationException(code, HttpStatus.CONFLICT, code);
  }
  private enabled() {
    if (!this.client.enabled)
      throw new QuestionGenerationException(
        'AI_RAG_DISABLED',
        HttpStatus.SERVICE_UNAVAILABLE,
        'Document generation requires RAG',
      );
  }
  /** Validate upload completion, consent and matching subject/chapter before accepting a batch. */
  async authorize(owner: string, command: GenerationCommand) {
    this.enabled();
    if (command.source.mode !== 'document')
      this.fail('AI_DOCUMENT_SOURCE_INVALID');
    return this.source({
      created_by: owner,
      topic_id: command.topic_id,
      chapter_id: command.chapter_id,
      source_version_id: command.source.version_id,
      source_index_id: null,
      source_profile_id: null,
      source_query: command.source.query,
    });
  }
  private async source(input: SourceInput) {
    if (!input.source_version_id) this.fail('AI_DOCUMENT_SOURCE_INVALID');
    const source = await this.documents.source(
      input.created_by,
      input.source_version_id,
    );
    if (
      !source ||
      source.document.topic_id !== input.topic_id ||
      source.document.chapter_id !== input.chapter_id ||
      !source.consented_at ||
      source.status === 'UPLOADING'
    )
      this.fail('AI_DOCUMENT_SOURCE_INVALID');
    if (source.status === 'OCR_REQUIRED') this.fail('AI_DOCUMENT_OCR_REQUIRED');
    if (source.status === 'FAILED') this.fail('AI_DOCUMENT_FAILED');
    return source;
  }
  /** Queue indexing exactly once, then resolve the same pinned profile across worker restarts. */
  async prepare(input: SourceInput) {
    this.enabled();
    const source = await this.source(input);
    if (source.status !== 'EXTRACTED')
      return { ready: false, stage: 'EXTRACTING' as const, index: null };
    const index = input.source_index_id
      ? await this.indexes.forVersion(
          input.created_by,
          input.source_index_id,
          source.id,
        )
      : await this.rag.start(input.created_by, source.document_id, source.id);
    if (!index || index.status === 'REVOKED')
      this.fail('AI_DOCUMENT_SOURCE_INVALID');
    if (index.status === 'FAILED') this.fail('AI_INDEX_FAILED');
    return {
      ready: index.status === 'READY',
      stage:
        index.status === 'READY' ? ('READY' as const) : ('INDEXING' as const),
      index,
    };
  }
  /** Recheck all source/index identities around the only paid generation invocation. */
  async generate(
    input: SourceInput & {
      question_format: QuestionFormat;
      requested_count: number;
    },
    topic: string,
  ) {
    this.enabled();
    const source = await this.source(input);
    if (!input.source_index_id || !input.source_profile_id)
      this.fail('AI_DOCUMENT_SOURCE_INVALID');
    const index = await this.indexes.forVersion(
      input.created_by,
      input.source_index_id,
      source.id,
    );
    if (
      !index ||
      index.status !== 'READY' ||
      index.profile_id !== input.source_profile_id
    )
      this.fail('AI_DOCUMENT_SOURCE_INVALID');
    const query =
      input.source_query?.trim() ||
      Array.from(topic.trim() || source.document.title)
        .slice(0, 300)
        .join('');
    let result: Awaited<ReturnType<RagClient['generate']>>;
    try {
      result = await this.client.generate({
        owner_id: input.created_by,
        profile_id: input.source_profile_id,
        index_ids: [index.id],
        query,
        top_k: 8,
        count: input.requested_count,
        question_format: input.question_format,
      });
    } catch (error) {
      if (error instanceof DocumentProcessingError)
        throw new QuestionGenerationException(
          ['RAG_DEADLINE', 'RAG_GENERATION_TIMEOUT'].includes(error.code)
            ? 'AI_SERVICE_TIMEOUT'
            : error.code === 'RAG_OUTPUT_INVALID'
              ? 'AI_OUTPUT_INVALID'
              : 'AI_SERVICE_FAILED',
          HttpStatus.BAD_GATEWAY,
          'Document generation failed',
        );
      throw error;
    }
    await this.source(input);
    const current = await this.indexes.forVersion(
      input.created_by,
      index.id,
      source.id,
    );
    if (!current || current.status !== 'READY')
      this.fail('AI_DOCUMENT_SOURCE_INVALID');
    const provenance: QuestionProvenance[] = [];
    const questions = result.questions.map((question) => {
      const { citations, ...data } = question;
      for (const { chunk } of citations)
        if (
          chunk.index_id !== index.id ||
          chunk.document_id !== source.document_id ||
          chunk.version_id !== source.id ||
          chunk.source_sha256 !== source.source_sha256 ||
          createHash('sha256').update(chunk.text).digest('hex') !==
            chunk.text_sha256
        )
          throw new QuestionGenerationException(
            'AI_OUTPUT_INVALID',
            HttpStatus.BAD_GATEWAY,
            'Invalid source evidence',
          );
      provenance.push({
        contract_version: 'rag-generation.v1',
        profile_id: result.profile_id,
        quality_status: 'UNASSESSED',
        citations,
      });
      return data;
    });
    return { questions, provenance };
  }
}
