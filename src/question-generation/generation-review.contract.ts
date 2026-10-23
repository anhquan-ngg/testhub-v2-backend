import { z } from 'zod';
import { generatedQuestionSchema } from './question-generation.contract';

export const editGenerationItemSchema = z
  .object({
    revision: z.number().int().min(1).max(2_000_000_000),
    data: generatedQuestionSchema,
  })
  .strict();
export const reviewGenerationItemSchema = z
  .object({
    revision: z.number().int().min(1).max(2_000_000_000),
    decision: z.enum(['APPROVE', 'REJECT']),
  })
  .strict();
export const commitGenerationItemsSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            revision: z.number().int().min(1).max(2_000_000_000),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
  .refine(
    ({ items }) => new Set(items.map(({ id }) => id)).size === items.length,
  );
export type EditGenerationItem = z.infer<typeof editGenerationItemSchema>;
export type ReviewGenerationItem = z.infer<typeof reviewGenerationItemSchema>;
export type CommitGenerationItems = z.infer<typeof commitGenerationItemsSchema>;
