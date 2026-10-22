import { z } from 'zod';
import {
  generatedQuestionBaseSchema,
  generatedQuestionSchema,
  aiGenerateResponseSchema,
} from './question-generation.contract';
import { retrievedChunkSchema } from '../learning-documents/rag.contract';

export const sourceCitationSchema = z
  .object({
    chunk: retrievedChunkSchema,
    quote: z
      .string()
      .min(1)
      .refine((v) => Array.from(v).length <= 600),
  })
  .strict()
  .refine((v) => v.quote.trim().length > 0 && v.chunk.text.includes(v.quote));
export const provenanceSchema = z
  .object({
    contract_version: z.literal('rag-generation.v1'),
    profile_id: z.string().regex(/^[a-f0-9]{64}$/),
    quality_status: z.literal('UNASSESSED'),
    citations: z.array(sourceCitationSchema).min(1).max(3),
  })
  .strict();
export type QuestionProvenance = z.infer<typeof provenanceSchema>;
const groundedQuestionSchema = generatedQuestionBaseSchema
  .extend({ citations: z.array(sourceCitationSchema).min(1).max(3) })
  .strict()
  .refine((value) => {
    const { citations, ...question } = value;
    return (
      generatedQuestionSchema.safeParse(question).success &&
      new Set(citations.map((c) => c.chunk.chunk_id)).size === citations.length
    );
  });
export const groundedResponseSchema = z
  .object({
    contract_version: z.literal('rag-generation.v1'),
    profile_id: z.string().regex(/^[a-f0-9]{64}$/),
    quality_status: z.literal('UNASSESSED'),
    questions: z.array(groundedQuestionSchema).min(1).max(20),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.questions.map((q) => q.question_text.toLowerCase())).size ===
      v.questions.length,
  );
export const storedGenerationResultSchema = z
  .object({
    questions: aiGenerateResponseSchema.innerType().shape.questions,
    provenance: z.array(provenanceSchema).min(1).max(20).optional(),
  })
  .strict()
  .refine(
    (v) =>
      aiGenerateResponseSchema.safeParse({ questions: v.questions }).success &&
      (!v.provenance || v.provenance.length === v.questions.length),
  );
