import { BadRequestException } from '@nestjs/common';
import { QuestionFormat, QuestionType } from '@prisma/client';
import { z } from 'zod';
import {
  MAX_DISTRIBUTION_QUESTIONS,
  MAX_QUESTION_DISTRIBUTION_ROWS,
  MAX_QUESTIONS_PER_DISTRIBUTION_ROW,
} from './question-distribution.constants';

/** Cognitive levels ordered from the easiest to the hardest. */
export const QUESTION_FORMAT_ORDER: readonly QuestionFormat[] = [
  QuestionFormat.KNOWLEDGE,
  QuestionFormat.UNDERSTANDING,
  QuestionFormat.APPLYING,
  QuestionFormat.ADVANCED,
];

const typeDistributionSchema = z
  .array(
    z.object({
      question_type: z.nativeEnum(QuestionType),
      question_format: z.nativeEnum(QuestionFormat),
      quantity: z
        .number()
        .int()
        .positive()
        .max(MAX_QUESTIONS_PER_DISTRIBUTION_ROW),
    }),
  )
  .min(1)
  .max(MAX_QUESTION_DISTRIBUTION_ROWS);

export type TypeDistributionItem = z.infer<
  typeof typeDistributionSchema
>[number];

/** Sum of the quantities of a distribution (BY_TYPE or BY_CHAPTER). */
export function sumDistributionQuantity(
  rows: ReadonlyArray<{ quantity: number }>,
): number {
  return rows.reduce((sum, row) => sum + row.quantity, 0);
}

/**
 * Merge rows sharing the same (question_type, question_format) so each group
 * is selected once. Keeps first-seen order.
 */
export function normalizeTypeDistribution(
  rows: readonly TypeDistributionItem[],
): TypeDistributionItem[] {
  const merged = new Map<string, TypeDistributionItem>();
  for (const row of rows) {
    const key = `${row.question_type}|${row.question_format}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += row.quantity;
    else merged.set(key, { ...row });
  }
  return [...merged.values()];
}

/** Parse persisted/posted BY_TYPE JSON into validated, merged rows. */
export function parseTypeDistribution(value: unknown): TypeDistributionItem[] {
  let raw: unknown = value;
  try {
    if (typeof value === 'string') raw = JSON.parse(value);
  } catch {
    throw new BadRequestException(
      'Exam distribution data is malformed (BY_TYPE)',
    );
  }
  const parsed = typeDistributionSchema.safeParse(raw);
  if (!parsed.success)
    throw new BadRequestException(
      `BY_TYPE requires valid question_type/question_format and positive integer quantities (max ${MAX_QUESTION_DISTRIBUTION_ROWS} rows / ${MAX_DISTRIBUTION_QUESTIONS} questions)`,
    );
  const rows = normalizeTypeDistribution(parsed.data);
  if (sumDistributionQuantity(rows) > MAX_DISTRIBUTION_QUESTIONS)
    throw new BadRequestException(
      `BY_TYPE distribution exceeds ${MAX_DISTRIBUTION_QUESTIONS} questions`,
    );
  return rows;
}
