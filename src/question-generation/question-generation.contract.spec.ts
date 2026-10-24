import { QuestionFormat } from '@prisma/client';
import { readContractFixture } from './fixtures/contract-fixture';
import {
  aiGenerateRequestSchema,
  aiGenerateResponseSchema,
  generatedQuestionSchema,
  generationCommandSchema,
  matchesQuestionConfigs,
  textGenerationCommandSchema,
  toQuestionBankDraft,
} from './question-generation.contract';

const fixture = readContractFixture();

describe('text-generation.v1 contract', () => {
  it('uses the Prisma/frontend cognitive-level values', () => {
    expect(Object.values(QuestionFormat)).toEqual([
      'KNOWLEDGE',
      'UNDERSTANDING',
      'APPLYING',
      'ADVANCED',
    ]);
    expect(aiGenerateRequestSchema.parse(fixture.internal_request)).toEqual(
      fixture.internal_request,
    );
  });

  it.each([
    { count: '1' },
    { count: 1.5 },
    { count: 0 },
    { count: 21 },
    { question_format: 'DIFFICULT' },
    { question_type: 'ESSAY' },
    { language: 'en' },
    { source: { mode: 'documents', document_version_ids: [] } },
    { source: { mode: 'text', text: '   ' } },
    { source: { ...fixture.command.source, document_version_ids: [] } },
    { topic: 'forged topic' },
    { external_processing_consent: false },
    { external_processing_consent: 'true' },
  ])('rejects unsupported or coerced command fields: %j', (change) => {
    expect(
      textGenerationCommandSchema.safeParse({
        ...fixture.command,
        ...change,
      }).success,
    ).toBe(false);
  });

  it('normalizes the legacy single-row command into question_configs', () => {
    const { question_configs: configs, ...rest } = fixture.command;
    const [config] = configs;
    expect(
      generationCommandSchema.parse({
        ...rest,
        question_type: config.question_type,
        question_format: config.question_format,
        count: config.count,
      }),
    ).toEqual(fixture.command);
  });

  it('accepts ordered mixed rows up to 20 questions', () => {
    const configs = [
      {
        question_type: 'SINGLE_CHOICE',
        question_format: 'KNOWLEDGE',
        count: 12,
      },
      {
        question_type: 'MULTIPLE_CHOICE',
        question_format: 'APPLYING',
        count: 8,
      },
    ];
    expect(
      generationCommandSchema.parse({
        ...fixture.command,
        question_configs: configs,
      }).question_configs,
    ).toEqual(configs);
  });

  it.each([
    { question_configs: [] },
    {
      question_configs: [
        { question_type: 'ESSAY', question_format: 'KNOWLEDGE', count: 1 },
      ],
    },
    {
      question_configs: [
        {
          question_type: 'SINGLE_CHOICE',
          question_format: 'KNOWLEDGE',
          count: 11,
        },
        {
          question_type: 'SINGLE_CHOICE',
          question_format: 'KNOWLEDGE',
          count: 10,
        },
      ],
    },
    {
      question_configs: Array.from({ length: 11 }, () => ({
        question_type: 'SINGLE_CHOICE',
        question_format: 'KNOWLEDGE',
        count: 1,
      })),
    },
    {
      question_configs: [
        {
          question_type: 'SINGLE_CHOICE',
          question_format: 'KNOWLEDGE',
          count: 1,
          extra: true,
        },
      ],
    },
    { question_configs: undefined },
    { question_format: 'KNOWLEDGE' },
    { question_type: 'SINGLE_CHOICE', question_format: 'KNOWLEDGE', count: 1 },
  ])('rejects ambiguous or unsupported question configs: %j', (change) => {
    expect(
      generationCommandSchema.safeParse({ ...fixture.command, ...change })
        .success,
    ).toBe(false);
  });

  it('applies the correct-option rule of each question type', () => {
    const question = fixture.internal_response.questions[0];
    const multiple = (correct: number) => ({
      ...question,
      question_type: 'MULTIPLE_CHOICE',
      options: question.options.map((option, index) => ({
        ...option,
        isCorrect: index < correct,
      })),
    });
    expect(generatedQuestionSchema.safeParse(multiple(2)).success).toBe(true);
    expect(generatedQuestionSchema.safeParse(multiple(3)).success).toBe(true);
    for (const correct of [0, 1, 4])
      expect(generatedQuestionSchema.safeParse(multiple(correct)).success).toBe(
        false,
      );
    expect(
      generatedQuestionSchema.safeParse({ ...question, question_type: 'ESSAY' })
        .success,
    ).toBe(false);
  });

  it('matches drafts to configs by position', () => {
    const configs = [
      {
        question_type: 'SINGLE_CHOICE',
        question_format: 'KNOWLEDGE',
        count: 1,
      },
      {
        question_type: 'MULTIPLE_CHOICE',
        question_format: 'APPLYING',
        count: 1,
      },
    ] as const;
    const single = {
      question_type: 'SINGLE_CHOICE',
      question_format: 'KNOWLEDGE',
    } as const;
    const multiple = {
      question_type: 'MULTIPLE_CHOICE',
      question_format: 'APPLYING',
    } as const;
    expect(matchesQuestionConfigs([single, multiple], [...configs])).toBe(true);
    expect(matchesQuestionConfigs([multiple, single], [...configs])).toBe(
      false,
    );
    expect(matchesQuestionConfigs([single], [...configs])).toBe(false);
  });

  it('normalizes blank topics and counts Unicode code points like Python', () => {
    expect(
      aiGenerateRequestSchema.parse({
        ...fixture.internal_request,
        topic: '   ',
        text: '😀'.repeat(20_000),
      }),
    ).toMatchObject({ topic: null });
    expect(
      aiGenerateRequestSchema.safeParse({
        ...fixture.internal_request,
        text: '😀'.repeat(20_001),
      }).success,
    ).toBe(false);
  });

  it('serializes choices once and keeps correct_answer null without bank IO', () => {
    const question = fixture.internal_response.questions[0];
    const bank = toQuestionBankDraft(question, fixture.command.chapter_id);
    expect(bank).toEqual({
      ...question,
      chapter_id: fixture.command.chapter_id,
      options: JSON.stringify(question.options),
    });
    expect(JSON.parse(bank.options)).toEqual(question.options);
  });

  it('rejects wrong answers, duplicate choices and duplicate questions', () => {
    const question = fixture.internal_response.questions[0];
    const invalid = [
      {
        ...question,
        options: question.options.map((o) => ({ ...o, isCorrect: false })),
      },
      {
        ...question,
        options: question.options.map((o) => ({ ...o, isCorrect: true })),
      },
      {
        ...question,
        options: [
          question.options[0],
          question.options[0],
          ...question.options.slice(2),
        ],
      },
      { ...question, options: question.options.slice(1) },
      { ...question, correct_answer: 'O(log n)' },
      { ...question, extra: 'unexpected field' },
    ];
    for (const candidate of invalid) {
      expect(
        aiGenerateResponseSchema.safeParse({ questions: [candidate] }).success,
      ).toBe(false);
    }
    expect(
      aiGenerateResponseSchema.safeParse({
        questions: [
          question,
          {
            ...question,
            question_text: `  ${question.question_text.toUpperCase()} `,
          },
        ],
      }).success,
    ).toBe(false);
  });
});
