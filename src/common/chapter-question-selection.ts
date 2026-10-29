import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { activeChapterTree } from './chapter-tree';

const distributionSchema = z
  .array(
    z
      .object({
        chapter_id: z.string().uuid(),
        quantity: z.number().int().positive().max(10000),
      })
      .strict(),
  )
  .min(1)
  .max(1000)
  .refine((rows) => rows.reduce((sum, row) => sum + row.quantity, 0) <= 10000);
export type ChapterDistribution = z.infer<typeof distributionSchema>;

/** Parse persisted/posted BY_CHAPTER JSON, preserving ordered quotas and legacy shape. */
export function parseChapterDistribution(value: unknown): ChapterDistribution {
  let raw: unknown = value;
  try {
    if (typeof value === 'string') raw = JSON.parse(value);
  } catch {
    throw new BadRequestException('Invalid BY_CHAPTER distribution');
  }
  const parsed = distributionSchema.safeParse(raw);
  if (!parsed.success)
    throw new BadRequestException(
      'BY_CHAPTER requires chapter UUIDs and positive integer quantities (max 1000 rows / 10000 questions)',
    );
  return parsed.data;
}

/** Maximum bipartite matching via iterative augmenting paths; never greedily starve overlapping quotas. */
export function allocateChapterQuestions(
  rows: ChapterDistribution,
  candidates: string[][],
): string[] {
  const slots = rows.flatMap((row, index) =>
    Array.from({ length: row.quantity }, () => index),
  );
  const assignments = new Map<number, string>(),
    owners = new Map<string, number>();
  for (let start = 0; start < slots.length; start++) {
    const queue = [start],
      seenSlots = new Set([start]),
      seenQuestions = new Set<string>(),
      via = new Map<string, number>();
    let available: string | undefined;
    for (let head = 0; head < queue.length && !available; head++) {
      const slot = queue[head];
      for (const question of candidates[slots[slot]] ?? []) {
        if (seenQuestions.has(question)) continue;
        seenQuestions.add(question);
        via.set(question, slot);
        const occupant = owners.get(question);
        if (occupant === undefined) {
          available = question;
          break;
        }
        if (!seenSlots.has(occupant)) {
          seenSlots.add(occupant);
          queue.push(occupant);
        }
      }
    }
    if (!available)
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        code: 'CHAPTER_DISTRIBUTION_INSUFFICIENT',
        message:
          'Not enough distinct questions to satisfy all BY_CHAPTER rows, including overlapping subtrees',
      });
    while (available) {
      const slot = via.get(available);
      if (slot === undefined)
        throw new BadRequestException('Invalid chapter question allocation');
      const previous = assignments.get(slot);
      assignments.set(slot, available);
      owners.set(available, slot);
      available = previous;
    }
  }
  return slots.map((_, index) => assignments.get(index) ?? '');
}

/** Fetch every candidate once per row under a single SQL snapshot, then satisfy disjoint quotas. */
export async function selectChapterQuestionIds(
  db: Prisma.TransactionClient,
  topicId: string,
  value: unknown,
): Promise<string[]> {
  const rows = parseChapterDistribution(value);
  const expanded = await db.$queryRaw<
    Array<{ row_index: number; question_id: string | null }>
  >(Prisma.sql`
    WITH RECURSIVE ${activeChapterTree(topicId)}, requested AS (
      SELECT (ordinality-1)::integer row_index,(item->>'chapter_id')::uuid chapter_id
      FROM jsonb_array_elements(${JSON.stringify(rows)}::jsonb) WITH ORDINALITY AS input(item,ordinality)
    ), subtree(row_index,id) AS (
      SELECT r.row_index,a.id FROM requested r JOIN active_chapters a ON a.id=r.chapter_id
      UNION
      SELECT s.row_index,c.id FROM subtree s JOIN chapters c ON c.parent_id=s.id
      JOIN active_chapters a ON a.id=c.id
    )
    SELECT r.row_index,q.id AS question_id FROM requested r
    LEFT JOIN subtree s ON s.row_index=r.row_index
    LEFT JOIN questions q ON q.chapter_id=s.id AND q.is_deleted=false
    ORDER BY random()`);
  const candidates = rows.map(() => [] as string[]);
  for (const entry of expanded)
    if (entry.question_id) candidates[entry.row_index].push(entry.question_id);
  return allocateChapterQuestions(rows, candidates);
}
