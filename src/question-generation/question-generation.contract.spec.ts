import { QuestionFormat } from '@prisma/client';
import { readContractFixture } from './fixtures/contract-fixture';
import {
  aiGenerateRequestSchema,
  aiGenerateResponseSchema,
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
