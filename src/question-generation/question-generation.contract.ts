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

export const MAX_GENERATION_QUESTIONS = 20;
export const MAX_GENERATION_CONFIGS = 10;
export const GENERATION_QUESTION_TYPES = [
  QuestionType.SINGLE_CHOICE,
  QuestionType.MULTIPLE_CHOICE,
] as const;
export type GenerationQuestionType = (typeof GENERATION_QUESTION_TYPES)[number];

/** SINGLE_CHOICE has one correct option; MULTIPLE_CHOICE has two or more, never all. */
export function hasValidAnswers(
  questionType: GenerationQuestionType,
  options: { isCorrect: boolean }[],
): boolean {
  const correct = options.filter((option) => option.isCorrect).length;
  return questionType === QuestionType.SINGLE_CHOICE
    ? correct === 1
    : correct >= 2 && correct < options.length;
}

const optionSchema = z
  .object({ text: boundedText(1, 500), isCorrect: z.boolean() })
  .strict();

export const generatedQuestionBaseSchema = z
  .object({
    question_text: boundedText(1, 2_000),
    options: z.array(optionSchema).length(4),
    question_type: z.enum(GENERATION_QUESTION_TYPES),
    question_format: z.nativeEnum(QuestionFormat),
    correct_answer: z.null(),
  })
  .strict();

export const generatedQuestionSchema = generatedQuestionBaseSchema
  .refine(({ question_type, options }) =>
    hasValidAnswers(question_type, options),
  )
  .refine(
    ({ options }) =>
      new Set(options.map((option) => option.text.toLowerCase())).size === 4,
  );

/** One requested row: question type, cognitive level and number of questions. */
export const questionConfigSchema = z
  .object({
    question_type: z.enum(GENERATION_QUESTION_TYPES),
    question_format: z.nativeEnum(QuestionFormat),
    count: z.number().int().min(1).max(MAX_GENERATION_QUESTIONS),
  })
  .strict();
export type QuestionConfig = z.infer<typeof questionConfigSchema>;
type QuestionSlot = Pick<QuestionConfig, 'question_type' | 'question_format'>;

/** Total number of questions requested by all config rows. */
export function totalQuestionCount(configs: QuestionConfig[]): number {
  return configs.reduce((total, config) => total + config.count, 0);
}

export const questionConfigsSchema = z
  .array(questionConfigSchema)
  .min(1)
  .max(MAX_GENERATION_CONFIGS)
  .refine((configs) => totalQuestionCount(configs) <= MAX_GENERATION_QUESTIONS);

/** Expand config rows into the ordered type/level expected for every question. */
export function expandQuestionConfigs(
  configs: QuestionConfig[],
): QuestionSlot[] {
  return configs.flatMap(({ question_type, question_format, count }) =>
    Array.from({ length: count }, () => ({ question_type, question_format })),
  );
}

/** True when drafts follow the requested configs position by position. */
export function matchesQuestionConfigs(
  questions: QuestionSlot[],
  configs: QuestionConfig[],
): boolean {
  const slots = expandQuestionConfigs(configs);
  return (
    questions.length === slots.length &&
    questions.every(
      (question, index) =>
        question.question_type === slots[index].question_type &&
        question.question_format === slots[index].question_format,
    )
  );
}

export const aiGenerateRequestSchema = z
  .object({
    text: boundedText(20, 20_000),
    topic: z.preprocess(
      (value) => (typeof value === 'string' ? value.trim() || null : value),
      boundedText(1, 200).nullable().optional(),
    ),
    question_configs: questionConfigsSchema,
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

const textSourceSchema = z
  .object({ mode: z.literal('text'), text: boundedText(20, 20_000) })
  .strict();

const commandBaseSchema = z
  .object({
    topic_id: z.string().uuid(),
    chapter_id: z.string().uuid(),
    source: z.discriminatedUnion('mode', [
      textSourceSchema,
      z
        .object({
          mode: z.literal('document'),
          version_id: z.string().uuid(),
          query: boundedText(0, 400).default(''),
        })
        .strict(),
    ]),
    // Legacy single-row form, still accepted; question_configs supersedes it.
    question_type: z.literal(QuestionType.SINGLE_CHOICE).optional(),
    question_format: z.nativeEnum(QuestionFormat).optional(),
    count: z.number().int().min(1).max(MAX_GENERATION_QUESTIONS).optional(),
    question_configs: questionConfigsSchema.optional(),
    language: z.literal('vi'),
    external_processing_consent: z.literal(true),
  })
  .strict();

type BlueprintInput = {
  question_type?: typeof QuestionType.SINGLE_CHOICE;
  question_format?: QuestionFormat;
  count?: number;
  question_configs?: QuestionConfig[];
};

/** Accept either the legacy fields or question_configs; output only question_configs. */
function normalizeBlueprint<T extends BlueprintInput>(
  value: T,
  ctx: z.RefinementCtx,
) {
  const { question_type, question_format, count, question_configs, ...rest } =
    value;
  const legacy =
    question_type !== undefined ||
    question_format !== undefined ||
    count !== undefined;
  if (question_configs && !legacy) return { ...rest, question_configs };
  if (!question_configs && question_type && question_format && count)
    return {
      ...rest,
      question_configs: [{ question_type, question_format, count }],
    };
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['question_configs'],
    message: 'Provide question_configs or the legacy type/format/count fields',
  });
  return z.NEVER;
}

/** Frozen command shared by the authenticated batch API and worker. */
export const generationCommandSchema =
  commandBaseSchema.transform(normalizeBlueprint);

export const textGenerationCommandSchema = commandBaseSchema
  .extend({ source: textSourceSchema })
  .transform(normalizeBlueprint);
export type GenerationCommand = z.infer<typeof generationCommandSchema>;
export type TextGenerationCommand = z.infer<typeof textGenerationCommandSchema>;
export type AiGenerateRequest = z.infer<typeof aiGenerateRequestSchema>;
export type AiGenerateResponse = z.infer<typeof aiGenerateResponseSchema>;
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

// Compatibility union including future workflow values. Current persisted batch
// states are defined by Prisma's QuestionGenerationBatchStatus; do not infer
// implemented transitions from this larger frontend-facing reserved list.
export const GENERATION_BATCH_STATUSES = [
  'WAITING_SOURCE',
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
  question_type: GenerationQuestionType;
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
