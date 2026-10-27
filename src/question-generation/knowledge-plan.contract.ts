import { QuestionFormat } from '@prisma/client';
import { z } from 'zod';

export const sourceUnitSchema = z
  .object({
    kind: z.enum(['PAGE', 'SLIDE', 'NOTES']),
    position: z.number().int().min(1).max(500),
  })
  .strict();
const unitsSchema = z
  .array(sourceUnitSchema)
  .min(1)
  .max(1000)
  .refine(
    (units) =>
      new Set(units.map((unit) => `${unit.kind}:${unit.position}`)).size ===
      units.length,
  );
export const planNodeSchema = z
  .object({
    id: z.string().uuid(),
    parent_id: z.string().uuid().nullable(),
    name: z.string().trim().min(1).max(200),
    source_units: unitsSchema,
  })
  .strict();
const levels = ['KNOWLEDGE', 'UNDERSTANDING', 'APPLYING', 'ADVANCED'] as const;
export const matrixRowSchema = z
  .object({
    id: z.string().uuid(),
    node_id: z.string().uuid(),
    question_type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE']),
    objective: z.string().trim().min(1).max(400),
    source_units: unitsSchema,
    counts: z
      .object({
        KNOWLEDGE: z.number().int().min(0).max(20),
        UNDERSTANDING: z.number().int().min(0).max(20),
        APPLYING: z.number().int().min(0).max(20),
        ADVANCED: z.number().int().min(0).max(20),
      })
      .strict(),
  })
  .strict();
export const planMatrixSchema = z
  .object({
    nodes: z.array(planNodeSchema).min(1).max(1000),
    rows: z.array(matrixRowSchema).min(1).max(20),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set(value.nodes.map((node) => node.id));
    const siblingNames = new Map<string | null, Set<string>>();
    value.nodes.forEach((node, index) => {
      const names = siblingNames.get(node.parent_id) ?? new Set<string>();
      const name = normalizedChapterName(node.name);
      if (names.has(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['nodes', index, 'name'],
          message: 'Duplicate sibling chapter name',
        });
      }
      names.add(name);
      siblingNames.set(node.parent_id, names);
    });
    const nodeUnits = new Map(
      value.nodes.map((node) => [
        node.id,
        new Set(
          node.source_units.map((unit) => `${unit.kind}:${unit.position}`),
        ),
      ]),
    );
    const total = value.rows.reduce(
      (sum, row) => sum + levels.reduce((n, level) => n + row.counts[level], 0),
      0,
    );
    if (
      ids.size !== value.nodes.length ||
      new Set(value.rows.map((row) => row.id)).size !== value.rows.length ||
      total < 1 ||
      total > 20 ||
      value.rows.some(
        (row) =>
          !ids.has(row.node_id) ||
          row.source_units.some(
            (unit) =>
              !nodeUnits.get(row.node_id)?.has(`${unit.kind}:${unit.position}`),
          ) ||
          levels.every((level) => row.counts[level] === 0),
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid matrix IDs or total (1..20 questions)',
      });
    }
    try {
      topologicalNodes(value.nodes);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Chapter tree contains cycles or missing parents',
      });
    }
  });
export type SourceUnit = z.infer<typeof sourceUnitSchema>;
export type PlanNode = z.infer<typeof planNodeSchema>;
export type PlanMatrix = z.infer<typeof planMatrixSchema>;
export const outlineSchema = z
  .object({
    contract_version: z.literal('knowledge-outline.v1'),
    index_id: z.string().uuid(),
    document_id: z.string().uuid(),
    version_id: z.string().uuid(),
    source_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    nodes: z
      .array(
        planNodeSchema
          .extend({
            origin: z.enum(['HEADING', 'INFERRED']),
            evidence: z.string().min(1).max(200),
          })
          .strict(),
      )
      .min(1)
      .max(1000),
    source_units: unitsSchema,
    warnings: z.array(z.string().max(100)).max(10),
  })
  .strict();
export type ContentMap = z.infer<typeof outlineSchema>;
export const frozenPlanItemSchema = z
  .object({
    id: z.string().min(1).max(100),
    node_id: z.string().uuid(),
    knowledge_title: z.string().min(1).max(200),
    objective: z.string().min(1).max(400),
    source_units: unitsSchema,
    question_type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE']),
    question_format: z.nativeEnum(QuestionFormat),
    count: z.number().int().min(1).max(20),
  })
  .strict();
export const frozenPlanSchema = z
  .object({
    plan_id: z.string().uuid(),
    revision: z.number().int().positive(),
    nodes: z.array(planNodeSchema).min(1).max(1000),
    items: z.array(frozenPlanItemSchema).min(1).max(20),
  })
  .strict()
  .superRefine((value, ctx) => {
    const ids = new Set(value.nodes.map((node) => node.id));
    if (
      ids.size !== value.nodes.length ||
      new Set(value.items.map((item) => item.id)).size !== value.items.length ||
      value.items.some((item) => !ids.has(item.node_id)) ||
      value.items.reduce((sum, item) => sum + item.count, 0) > 20
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid frozen plan',
      });
    try {
      topologicalNodes(value.nodes);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid frozen tree',
      });
    }
  });
export type FrozenPlan = z.infer<typeof frozenPlanSchema>;

/** Sort an arbitrary-depth flat tree without recursion; reject cycles and orphan references. */
export function topologicalNodes(nodes: PlanNode[]): PlanNode[] {
  const children = new Map<string | null, PlanNode[]>();
  const ids = new Set(nodes.map((node) => node.id));
  for (const node of nodes) {
    if (node.parent_id && !ids.has(node.parent_id))
      throw new Error('Missing parent');
    const siblings = children.get(node.parent_id) ?? [];
    siblings.push(node);
    children.set(node.parent_id, siblings);
  }
  const result = [...(children.get(null) ?? [])];
  for (let index = 0; index < result.length; index++)
    result.push(...(children.get(result[index].id) ?? []));
  if (result.length !== nodes.length) throw new Error('Cycle');
  return result;
}

/** Match sibling names conservatively; preserve Vietnamese accents. */
export function normalizedChapterName(name: string): string {
  return name
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('vi');
}

/** Freeze the exact cognitive cells and their target nodes in deterministic row/level order. */
export function freezeMatrix(
  planId: string,
  revision: number,
  matrix: PlanMatrix,
): FrozenPlan {
  const nodes = new Map(matrix.nodes.map((node) => [node.id, node]));
  return frozenPlanSchema.parse({
    plan_id: planId,
    revision,
    nodes: matrix.nodes,
    items: matrix.rows.flatMap((row) =>
      levels
        .filter((level) => row.counts[level] > 0)
        .map((level) => ({
          id: `${row.id}/${level}`,
          node_id: row.node_id,
          knowledge_title: nodes.get(row.node_id)?.name,
          objective: row.objective,
          source_units: row.source_units,
          question_type: row.question_type,
          question_format: level,
          count: row.counts[level],
        })),
    ),
  });
}

/** Pin every generated position to one matrix item; never infer a target from model text. */
export function expandPlanItems(plan: FrozenPlan) {
  return plan.items.flatMap((item) =>
    Array.from({ length: item.count }, () => item),
  );
}
