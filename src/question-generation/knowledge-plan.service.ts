import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { DocumentRepository } from '../learning-documents/document.repository';
import { RagClient } from '../learning-documents/rag-client.service';
import { DocumentProcessingError } from '../learning-documents/document-client.service';
import { DocumentGenerationService } from './document-generation.service';
import { KnowledgePlanRepository } from './knowledge-plan.repository';
import {
  ContentMap,
  PlanMatrix,
  freezeMatrix,
  outlineSchema,
  planMatrixSchema,
} from './knowledge-plan.contract';
import {
  expandQuestionConfigs,
  questionConfigsSchema,
} from './question-generation.contract';
import type { QuestionConfig } from './question-generation.contract';

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
    const plan = await this.repository.get(owner, id);
    const matrix = planMatrixSchema.safeParse(plan.matrix);
    return {
      ...plan,
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

  /** Approval freezes the matrix only; no chapters/questions are created here. */
  async approve(owner: string, id: string, input: unknown) {
    const parsed = revisionSchema.safeParse(input);
    if (!parsed.success) throw new BadRequestException('Invalid revision');
    const plan = await this.repository.owned(owner, id);
    if (plan.status !== 'REVIEW_REQUIRED')
      throw new ConflictException('Plan is not awaiting approval');
    const matrix = planMatrixSchema.parse(plan.matrix);
    this.validateUnits(matrix, outlineSchema.parse(plan.content_map));
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
    const snapshot = freezeMatrix(
      id,
      plan.revision,
      planMatrixSchema.parse(plan.matrix),
    );
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
        const map = await this.client.outline({
          owner_id: plan.created_by,
          index_id: state.index.id,
          profile_id: state.index.profile_id,
          title: source.document.title,
        });
        if (
          map.version_id !== source.id ||
          map.document_id !== source.document_id ||
          map.source_sha256 !== source.source_sha256
        )
          throw new BadRequestException('Source identity changed');
        const configs = questionConfigsSchema.parse(plan.question_configs);
        const matrix = this.suggest(map, configs);
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
        await this.repository.finish(
          candidate.id,
          token,
          candidate.created_by,
          {
            status: retry ? 'WAITING_SOURCE' : 'FAILED',
            error_code: retry ? null : 'PLAN_SOURCE_UNAVAILABLE',
          },
        );
      }
    }
  }

  private suggest(map: ContentMap, configs: QuestionConfig[]): PlanMatrix {
    const parents = new Set(map.nodes.map((node) => node.parent_id));
    const leaves = map.nodes.filter((node) => !parents.has(node.id));
    const slots = expandQuestionConfigs(configs);
    const selected = Array.from(
      { length: Math.min(leaves.length, slots.length) },
      (_, index) =>
        leaves[
          Math.floor(
            (index * leaves.length) / Math.min(leaves.length, slots.length),
          )
        ],
    );
    const grouped = new Map<string, PlanMatrix['rows'][number]>();
    for (const [index, slot] of slots.entries()) {
      const node = selected[index % selected.length];
      const key = `${node.id}/${slot.question_type}`;
      const row = grouped.get(key) ?? {
        id: randomUUID(),
        node_id: node.id,
        question_type: slot.question_type,
        objective: `Kiểm tra kiến thức về ${node.name}`.slice(0, 400),
        source_units: node.source_units,
        counts: { KNOWLEDGE: 0, UNDERSTANDING: 0, APPLYING: 0, ADVANCED: 0 },
      };
      row.counts[slot.question_format]++;
      grouped.set(key, row);
    }
    return planMatrixSchema.parse({
      nodes: map.nodes.map(({ id, parent_id, name, source_units }) => ({
        id,
        parent_id,
        name,
        source_units,
      })),
      rows: [...grouped.values()],
    });
  }
}
