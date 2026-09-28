import { QuestionFormat, QuestionType } from '@prisma/client';

export type ImportOption = {
  key: string;
  text: string;
  isCorrect: boolean;
};

export type ParsedImportAsset = {
  name: string;
  mimeType: string;
  buffer: Buffer;
  order: number;
};

export type ParsedImportQuestion = {
  sourceIndex: number;
  sourceCode?: string;
  /** Chapter name or "Parent > Child" path typed by the lecturer. */
  chapterName?: string;
  /** Legacy templates carried a raw chapter UUID; still honoured. */
  chapterId?: string;
  questionText: string;
  questionType: string;
  questionFormat: string;
  options: ImportOption[];
  correctAnswer?: string;
  assets: ParsedImportAsset[];
  parserWarnings: string[];
};

export type ImportQuestionData = {
  questionText: string;
  questionType: QuestionType;
  questionFormat: QuestionFormat;
  options: ImportOption[];
  correctAnswer: string | null;
  /**
   * Set when the typed chapter path does not exist yet: the chapters are
   * created at commit time (never during review, so a cancelled import
   * leaves no stray chapters). Null once resolved to an existing chapter.
   */
  chapterPath?: string[] | null;
};
