import { z } from 'zod';

export const generationEvidenceDetailsSchema = z
  .object({
    issues: z
      .array(
        z
          .object({
            slot: z.number().int().min(1).max(20),
            reason: z.enum(['INSUFFICIENT_EVIDENCE', 'NO_RETRIEVED_CONTEXT']),
          })
          .strict(),
      )
      .max(20),
  })
  .strict()
  .refine(
    ({ issues }) =>
      new Set(issues.map(({ slot }) => slot)).size === issues.length,
  );

export type GenerationEvidenceDetails = z.infer<
  typeof generationEvidenceDetailsSchema
>;

export const generationFailureSchema = z
  .object({
    contract_version: z.literal('question-generation-failure.v1'),
    code: z.literal('AI_INSUFFICIENT_EVIDENCE'),
    error_details: generationEvidenceDetailsSchema.optional(),
  })
  .strict();

/** Reject the entire diagnostic payload unless every issue matches a requested slot. */
export function parseGenerationEvidenceDetails(
  value: unknown,
  requestedCount: number,
): GenerationEvidenceDetails | undefined {
  const parsed = generationEvidenceDetailsSchema.safeParse(value);
  if (
    !Number.isInteger(requestedCount) ||
    requestedCount < 1 ||
    requestedCount > 20 ||
    !parsed.success ||
    parsed.data.issues.some(({ slot }) => slot > requestedCount)
  )
    return undefined;
  return parsed.data;
}
