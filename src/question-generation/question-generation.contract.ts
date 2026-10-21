import { QuestionFormat, QuestionType } from '@prisma/client';
import { z } from 'zod';

// Pydantic counts Unicode code points; JavaScript string.length counts UTF-16 units.
function boundedText(minimum: number, maximum: number) {
  return z
    .string()
    .trim()
    .refine((value) => {
      const length = Array.from(value).length;
      return length >= minimum && length <= maximum;
    });
}

const optionSchema = z
  .object({ text: boundedText(1, 500), isCorrect: z.boolean() })
  .strict();

export const generatedQuestionSchema = z
  .object({
    question_text: boundedText(1, 2_000),
    options: z.array(optionSchema).length(4),
    question_type: z.literal(QuestionType.SINGLE_CHOICE),
    question_format: z.nativeEnum(QuestionFormat),
    correct_answer: z.null(),
  })
  .strict()
  .refine(
    ({ options }) => options.filter((option) => option.isCorrect).length === 1,
  )
  .refine(
    ({ options }) =>
      new Set(options.map((option) => option.text.toLowerCase())).size === 4,
  );

export const aiGenerateRequestSchema = z
  .object({
    text: boundedText(20, 20_000),
    topic: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() || null : value),
      boundedText(1, 200).nullable().optional(),
    ),
    question_format: z.nativeEnum(QuestionFormat),
    count: z.number().int().min(1).max(20),
  })
  .strict();

export const aiGenerateResponseSchema = z
  .object({ questions: z.array(generatedQuestionSchema).min(1).max(20) })
  .strict()
  .refine(
    ({ questions }) =>
      new Set(questions.map((question) => question.question_text.toLowerCase()))
        .size === questions.length,
  );

/** Frozen text command shared by the authenticated batch API and worker. */
export const textGenerationCommandSchema = z
  .object({
    topic_id: z.string().uuid(),
    chapter_id: z.string().uuid(),
    source: z
      .object({ mode: z.literal('text'), text: boundedText(20, 20_000) })
      .strict(),
    question_type: z.literal(QuestionType.SINGLE_CHOICE),
    question_format: z.nativeEnum(QuestionFormat),
    count: z.number().int().min(1).max(20),
    language: z.literal('vi'),
    external_processing_consent: z.literal(true),
  })
  .strict();

export type TextGenerationCommand = z.infer<typeof textGenerationCommandSchema>;
export type AiGenerateRequest = z.infer<typeof aiGenerateRequestSchema>;
export type AiGenerateResponse = z.infer<typeof aiGenerateResponseSchema>;
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

// Compatibility union including future workflow values. Current persisted batch
// states are defined by Prisma's QuestionGenerationBatchStatus; do not infer
// implemented transitions from this larger frontend-facing reserved list.
export const GENERATION_BATCH_STATUSES = [
  'QUEUED',
  'GENERATING',
  'RETRY_WAIT',
  'REVIEW_REQUIRED',
  'COMMITTING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
] as const;
export const GENERATION_DRAFT_STATUSES = [
  'VALID',
  'APPROVED',
  'INVALID',
  'REJECTED',
  'COMMITTED',
  'SKIPPED',
] as const;

export type QuestionBankDraft = {
  chapter_id: string;
  question_text: string;
  options: string;
  question_type: typeof QuestionType.SINGLE_CHOICE;
  question_format: QuestionFormat;
  correct_answer: null;
};

/** Serialize validated choices for a future approved bank write; performs no IO. */
export function toQuestionBankDraft(
  question: GeneratedQuestion,
  chapterId: string,
): QuestionBankDraft {
  const validated = generatedQuestionSchema.parse(question);
  return {
    ...validated,
    chapter_id: z.string().uuid().parse(chapterId),
    options: JSON.stringify(validated.options),
  };
}
