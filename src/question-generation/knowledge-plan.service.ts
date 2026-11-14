import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { DocumentRepository } from '../learning-documents/document.repository';
import { RagClient } from '../learning-documents/rag-client.service';
import { DocumentProcessingError } from '../learning-documents/document-client.service';
import { DocumentGenerationService } from './document-generation.service';
import { KnowledgePlanRepository } from './knowledge-plan.repository';
import {
  ContentMap,
  PlanMatrix,
  PlanOutlineInvalidError,
  buildMatrix,
  disambiguateSiblings,
  freezeMatrix,
  matrixTotal,
  outlineSchema,
  planMatrixSchema,
  planNodeSchema,
} from './knowledge-plan.contract';
import {
  questionConfigsSchema,
  totalQuestionCount,
} from './question-generation.contract';

const createSchema = z
  .object({
    topic_id: z.string().uuid(),
    version_id: z.string().uuid(),
    question_configs: questionConfigsSchema,
    external_processing_consent: z.literal(true),
  })
  .strict();
const editSchema = z
  .object({ revision: z.number().int().positive(), matrix: planMatrixSchema })
  .strict();
const rebuildSchema = z
  .object({
    revision: z.number().int().positive(),
    nodes: z.array(planNodeSchema).min(1).max(1000),
  })
  .strict();
const revisionSchema = z
  .object({ revision: z.number().int().positive() })
  .strict();

/** Source-wide planning and teacher confirmation. Bank changes occur exclusively at question commit. */
@Injectable()
export class KnowledgePlanService {
  constructor(
    private readonly repository: KnowledgePlanRepository,
    private readonly documents: DocumentRepository,
    private readonly sources: DocumentGenerationService,
    private readonly client: RagClient,
  ) {}

  /** Accept a durable, idempotent plan before extraction/indexing finishes. */
  async create(owner: string, input: unknown, key?: string) {
    if (!this.client.enabled)
      throw new ServiceUnavailableException('Document generation requires RAG');
    const parsed = createSchema.safeParse(input);
    if (!parsed.success || !key || !/^[A-Za-z0-9._-]{16,128}$/.test(key))
      throw new BadRequestException('Invalid plan, consent or Idempotency-Key');
    const canonical = {
      topic_id: parsed.data.topic_id,
      version_id: parsed.data.version_id,
      question_configs: parsed.data.question_configs,
      external_processing_consent: true,
    };
    return this.repository.create(
      owner,
      parsed.data,
      key,
      createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
    );
  }

  /** Read the proposal and current conservative matches in the bank. */
  async get(owner: string, id: string) {
    const { question_configs, ...plan } = await this.repository.get(owner, id);
    const matrix = planMatrixSchema.safeParse(plan.matrix);
    return {
      ...plan,
      target_total: this.targetTotal(question_configs),
      chapter_matches: matrix.success
        ? await this.repository.matches(owner, plan.topic_id, matrix.data)
        : [],
    };
  }

  /** Resume plans after navigation without browser source storage. */
  list(owner: string, page: number, limit: number) {
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1_000_000 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    )
      throw new BadRequestException('Invalid pagination');
    return this.repository.list(owner, page, limit);
  }

  /** Batch size the lecturer asked for; every approved matrix must add up to it. */
  private targetTotal(configs: unknown): number | null {
    const parsed = questionConfigsSchema.safeParse(configs);
    return parsed.success ? totalQuestionCount(parsed.data) : null;
  }

  private validateUnits(matrix: PlanMatrix, map: ContentMap) {
    const allowed = new Set(
      map.source_units.map((unit) => `${unit.kind}:${unit.position}`),
    );
    if (
      [
        ...matrix.nodes.flatMap((node) => node.source_units),
        ...matrix.rows.flatMap((row) => row.source_units),
      ].some((unit) => !allowed.has(`${unit.kind}:${unit.position}`))
    )
      throw new BadRequestException(
        'Source pages/slides are outside the pinned document',
      );
  }

  /** Save an exact revision of the editable tree, objectives, units and cognitive counts. */
  async edit(owner: string, id: string, input: unknown) {
    const parsed = editSchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException('Invalid matrix or cyclic chapter tree');
    const plan = await this.repository.owned(owner, id);
    if (!['REVIEW_REQUIRED', 'APPROVED'].includes(plan.status))
      throw new ConflictException('Plan is not editable');
    this.validateUnits(
      parsed.data.matrix,
      outlineSchema.parse(plan.content_map),
    );
    await this.repository.edit(
      owner,
      id,
      parsed.data.revision,
      parsed.data.matrix,
    );
    return this.get(owner, id);
  }

  /**
   * Regenerate the topic x cognitive-level rows for an edited chapter list so
   * the matrix again adds up to the batch size. Editing or deleting chapters
   * never requires deleting rows by hand; this clears any approval.
   */
  async rebuildMatrix(owner: string, id: string, input: unknown) {
    const parsed = rebuildSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid chapter list');
    const plan = await this.repository.owned(owner, id);
    if (!['REVIEW_REQUIRED', 'APPROVED'].includes(plan.status))
      throw new ConflictException('Plan is not editable');
    this.validateUnits(
      { nodes: parsed.data.nodes, rows: [] },
      outlineSchema.parse(plan.content_map),
    );
    let matrix: PlanMatrix;
    try {
      matrix = buildMatrix(
        parsed.data.nodes,
        questionConfigsSchema.parse(plan.question_configs),
      );
    } catch (error) {
      if (error instanceof PlanOutlineInvalidError)
        throw new BadRequestException('Invalid or cyclic chapter tree');
      throw error;
    }
    await this.repository.edit(owner, id, parsed.data.revision, matrix);
    return this.get(owner, id);
  }

  private assertBatchTotal(matrix: PlanMatrix, configs: unknown) {
    const target = this.targetTotal(configs);
    if (target !== null && matrixTotal(matrix.rows) !== target)
      throw new ConflictException('PLAN_MATRIX_TOTAL_MISMATCH');
  }

  /** Approval freezes the matrix only; no chapters/questions are created here. */
  async approve(owner: string, id: string, input: unknown) {
    const parsed = revisionSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid revision');
    const plan = await this.repository.owned(owner, id);
    if (plan.status !== 'REVIEW_REQUIRED')
      throw new ConflictException('Plan is not awaiting approval');
    const matrix = planMatrixSchema.parse(plan.matrix);
    this.validateUnits(matrix, outlineSchema.parse(plan.content_map));
    this.assertBatchTotal(matrix, plan.question_configs);
    await this.repository.edit(owner, id, parsed.data.revision, matrix, true);
    return this.get(owner, id);
  }

  /** Build a source-pinned generation command exclusively from the approved stored revision. */
  async generation(owner: string, id: string, input: unknown) {
    const parsed = revisionSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid revision');
    const plan = await this.repository.owned(owner, id);
    if (plan.status !== 'APPROVED' || plan.revision !== parsed.data.revision)
      throw new ConflictException('Plan changed or is not approved');
    const matrix = planMatrixSchema.parse(plan.matrix);
    this.assertBatchTotal(matrix, plan.question_configs);
    const snapshot = freezeMatrix(id, plan.revision, matrix);
    return {
      snapshot,
      command: {
        topic_id: plan.topic_id,
        chapter_id: null,
        plan_id: id,
        source: {
          mode: 'document' as const,
          version_id: plan.source_version_id,
          query: '',
        },
        question_configs: snapshot.items.map(
          ({ question_type, question_format, count }) => ({
            question_type,
            question_format,
            count,
          }),
        ),
        language: 'vi' as const,
        external_processing_consent: true as const,
      },
    };
  }

  /** Run only from the existing dedicated AI worker's durable reconciliation loop. */
  async prepareDue() {
    for (const candidate of await this.repository.due()) {
      const token = await this.repository.claim(
        candidate.created_by,
        candidate.id,
      );
      if (!token) continue;
      try {
        const plan = await this.repository.owned(
          candidate.created_by,
          candidate.id,
        );
        if (Date.now() - plan.created_at.getTime() > 20 * 60_000) {
          await this.repository.finish(plan.id, token, plan.created_by, {
            status: 'FAILED',
            error_code: 'PLAN_SOURCE_TIMEOUT',
          });
          continue;
        }
        const source = await this.documents.source(
          plan.created_by,
          plan.source_version_id,
        );
        if (!source || source.document.topic_id !== plan.topic_id)
          throw new NotFoundException('Source unavailable');
        const state = await this.sources.prepare({
          created_by: plan.created_by,
          topic_id: plan.topic_id,
          chapter_id: source.document.chapter_id,
          source_version_id: source.id,
          source_index_id: plan.source_index_id,
          source_profile_id: plan.source_profile_id,
          source_query: '',
        });
        if (!state.ready || !state.index) {
          await this.repository.finish(plan.id, token, plan.created_by, {
            status: 'WAITING_SOURCE',
            ...(state.index
              ? {
                  source_index_id: state.index.id,
                  source_profile_id: state.index.profile_id,
                }
              : {}),
          });
          continue;
        }
        const raw = await this.client.outline({
          owner_id: plan.created_by,
          index_id: state.index.id,
          profile_id: state.index.profile_id,
          title: source.document.title,
        });
        if (
          raw.version_id !== source.id ||
          raw.document_id !== source.document_id ||
          raw.source_sha256 !== source.source_sha256
        )
          throw new BadRequestException('Source identity changed');
        // Older AI outlines may repeat sibling names; never fail a plan on that.
        const map: ContentMap = {
          ...raw,
          nodes: disambiguateSiblings(raw.nodes, (node) => node.evidence),
        };
        const configs = questionConfigsSchema.parse(plan.question_configs);
        const matrix = buildMatrix(map.nodes, configs);
        await this.repository.finish(plan.id, token, plan.created_by, {
          status: 'REVIEW_REQUIRED',
          content_map: map,
          matrix,
          source_sha256: source.source_sha256,
          source_index_id: state.index.id,
          source_profile_id: state.index.profile_id,
        });
      } catch (error) {
        const retry =
          (error instanceof DocumentProcessingError && error.retryable) ||
          (error instanceof HttpException &&
            [503, 504].includes(error.getStatus()));
        const invalid =
          error instanceof PlanOutlineInvalidError ||
          error instanceof z.ZodError;
        await this.repository.finish(
          candidate.id,
          token,
          candidate.created_by,
          {
            status: retry ? 'WAITING_SOURCE' : 'FAILED',
            error_code: retry
              ? null
              : invalid
                ? 'PLAN_OUTLINE_INVALID'
                : 'PLAN_SOURCE_UNAVAILABLE',
          },
        );
      }
    }
  }

  /** Explicitly re-queue a FAILED plan; reading a plan never does this. */
  async retry(owner: string, id: string) {
    const plan = await this.repository.owned(owner, id);
    if (plan.status !== 'FAILED' || !plan.error_code?.startsWith('PLAN_'))
      throw new ConflictException('PLAN_NOT_RETRYABLE');
    if (plan.error_code === 'PLAN_SCOPE_REVOKED')
      throw new ConflictException('PLAN_NOT_RETRYABLE');
    if (!(await this.repository.retry(owner, id)).count)
      throw new ConflictException('PLAN_NOT_RETRYABLE');
    return this.get(owner, id);
  }
}
