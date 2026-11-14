import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { DocxQuestionImportParser } from './docx-question-import.parser';
import { XlsxQuestionImportParser } from './xlsx-question-import.parser';
import { ImportOption, ParsedImportQuestion } from '../question-import.types';
import expected from './fixtures/import-expected.json';

const fixture = (name: string) =>
  readFile(path.join(__dirname, 'fixtures', name));

function observable(question: ParsedImportQuestion) {
  return {
    sourceCode: question.sourceCode,
    chapterName: question.chapterName,
    questionText: question.questionText,
    questionType: question.questionType,
    questionFormat: question.questionFormat,
    options: question.options,
    ...(question.correctAnswer
      ? { correctAnswer: question.correctAnswer }
      : {}),
    imageCount: question.assets.length,
  };
}

it('rejects a Word question missing its code field instead of silently importing the remaining tables', async () => {
  await expect(
    new DocxQuestionImportParser().parse(await fixture('missing-code.docx')),
  ).rejects.toThrow('code');
});

for (const [ext, parser] of [
  ['docx', new DocxQuestionImportParser()],
  ['xlsx', new XlsxQuestionImportParser()],
] as const) {
  describe(`${ext} import extraction accuracy`, () => {
    it.each(['mixed', 'single'])(
      '%s matches independently authored content, answer keys and ordering',
      async (name) => {
        const result = await parser.parse(await fixture(`${name}.${ext}`));
        expect(result.map(observable)).toEqual(
          name === 'single'
            ? expected.questions.slice(0, 1)
            : expected.questions,
        );
        expect(result.every((q) => !q.parserErrors?.length)).toBe(true);
        const official = await parser.parse(
          await fixture(`question-import-template.${ext}`),
        );
        expect(result[0].assets[0].buffer).toEqual(
          official[0].assets[0].buffer,
        );
        expect(result.map((q) => q.sourceIndex)).toEqual(
          result.map((_, i) => i + (ext === 'xlsx' ? 2 : 1)),
        );
      },
    );

    it.each(['unknown-answer', 'missing-answer-option'])(
      '%s cannot silently discard a selected answer',
      async (name) => {
        const result = await parser.parse(await fixture(`${name}.${ext}`));
        expect(result).toHaveLength(3);
        expect(result[0].parserErrors).toEqual([
          expect.stringContaining('correct_keys'),
        ]);
        expect(result.slice(1).map(observable)).toEqual(
          expected.questions.slice(1),
        );
      },
    );

    it.each(['missing-header', 'duplicate-field', 'corrupt'])(
      'rejects ambiguous or malformed %s',
      async (name) => {
        await expect(
          parser.parse(await fixture(`${name}.${ext}`)),
        ).rejects.toThrow();
      },
    );

    it('retains incomplete records for validation rather than silently dropping them', async () => {
      const result = await parser.parse(await fixture(`incomplete-row.${ext}`));
      expect(result).toHaveLength(4);
      expect(result.slice(0, 3).map(observable)).toEqual(expected.questions);
      expect(result[3]).toMatchObject({
        sourceCode: 'BROKEN-ROW',
        questionText: '',
        questionType: '',
      });
    });

    it('returns no rows for a template with no question data', async () => {
      expect(await parser.parse(await fixture(`empty.${ext}`))).toEqual([]);
    });

    it('preserves long Unicode text and rich-text content without markup', async () => {
      const result = await parser.parse(await fixture(`long-rich.${ext}`));
      const first = {
        ...expected.questions[0],
        questionText:
          expected.questions[0].questionText +
          '\n' +
          'Nội dung dài — giữ nguyên dấu tiếng Việt. '.repeat(250).trimEnd(),
      };
      expect(result.map(observable)).toEqual([
        first,
        ...expected.questions.slice(1),
      ]);
    });

    it('ignores blank separators but preserves duplicate question records for commit policy', async () => {
      const separated = await parser.parse(await fixture(`blank-row.${ext}`));
      expect(separated.map(observable)).toEqual(expected.questions);
      expect(separated.map((q) => q.sourceIndex)).toEqual(
        ext === 'xlsx' ? [2, 4, 5] : [1, 2, 3],
      );
      const duplicated = await parser.parse(
        await fixture(`duplicate-questions.${ext}`),
      );
      expect(duplicated.map(observable)).toEqual([
        ...expected.questions,
        expected.questions[2],
      ]);
    });

    it.each(['no-answer', 'invalid-type'])(
      'keeps %s visible for service validation',
      async (name) => {
        const result = await parser.parse(await fixture(`${name}.${ext}`));
        expect(result).toHaveLength(3);
        const first =
          name === 'no-answer'
            ? {
                ...expected.questions[0],
                options: expected.questions[0].options.map(
                  (option: ImportOption) => ({
                    ...option,
                    isCorrect: false,
                  }),
                ),
              }
            : { ...expected.questions[0], questionType: 'TRUE_FALSE' };
        expect(result.map(observable)).toEqual([
          first,
          ...expected.questions.slice(1),
        ]);
      },
    );

    it('preserves every image in its source order', async () => {
      const result = await parser.parse(
        await fixture(`multiple-images.${ext}`),
      );
      expect(result.map(observable)).toEqual([
        { ...expected.questions[0], imageCount: 2 },
        ...expected.questions.slice(1),
      ]);
      expect(result[0].assets).toHaveLength(2);
      expect(result[0].assets.map((a) => a.order)).toEqual([0, 1]);
      expect(result[0].assets[0].buffer).toEqual(result[0].assets[1].buffer);
      expect(result.slice(1).every((q) => q.assets.length === 0)).toBe(true);
    });
  });
}
