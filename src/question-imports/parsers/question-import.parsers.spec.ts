import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { DocxQuestionImportParser } from './docx-question-import.parser';
import { XlsxQuestionImportParser } from './xlsx-question-import.parser';

const templatePath = (name: string) =>
  path.resolve(process.cwd(), 'src/question-imports/parsers/fixtures', name);

describe('question import templates', () => {
  it('parses the published DOCX template including its embedded image', async () => {
    const parser = new DocxQuestionImportParser();
    const questions = await parser.parse(
      await readFile(templatePath('question-import-template.docx')),
    );

    expect(questions).toHaveLength(3);
    expect(questions[0]).toMatchObject({
      sourceCode: 'Q001',
      chapterName: 'Chương 1 > Hàm số',
      questionType: 'SINGLE_CHOICE',
      questionFormat: 'KNOWLEDGE',
    });
    expect(questions.map((question) => question.chapterName)).toEqual([
      'Chương 1 > Hàm số',
      'Số học',
      'Chương 2 > Phương trình',
    ]);
    expect(questions.every((question) => !question.chapterId)).toBe(true);
    expect(questions[0].options.filter((option) => option.isCorrect)).toEqual([
      expect.objectContaining({ key: 'A', text: 'y = 2x + 1' }),
    ]);
    expect(questions[0].assets).toHaveLength(1);
    expect(questions[0].assets[0].buffer.length).toBeGreaterThan(0);
  });

  it('parses the published XLSX template including its embedded image', async () => {
    const parser = new XlsxQuestionImportParser();
    const questions = await parser.parse(
      await readFile(templatePath('question-import-template.xlsx')),
    );

    expect(questions).toHaveLength(3);
    expect(questions[1]).toMatchObject({
      sourceCode: 'Q002',
      chapterName: 'Số học',
      questionType: 'MULTIPLE_CHOICE',
      questionFormat: 'UNDERSTANDING',
    });
    expect(questions[0].chapterName).toBe('Chương 1 > Hàm số');
    expect(questions[2].chapterName).toBe('Chương 2 > Phương trình');
    expect(
      questions[1].options
        .filter((option) => option.isCorrect)
        .map((option) => option.key),
    ).toEqual(['A', 'C']);
    expect(questions[0].assets).toHaveLength(1);
    expect(questions[0].assets[0].buffer.length).toBeGreaterThan(0);
  });
});
