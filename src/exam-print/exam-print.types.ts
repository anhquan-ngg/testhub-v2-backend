import type { QuestionType } from '@prisma/client';

/** Number of variants ("mã đề") a lecturer may request for one print run. */
export const PRINT_VARIANT_COUNTS = [2, 4, 8] as const;
export type PrintVariantCount = (typeof PRINT_VARIANT_COUNTS)[number];

/** A question as it goes into the print pipeline, before shuffling. */
export type PrintSourceQuestion = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  /** Raw JSON string from `questions.options`: `[{ text, isCorrect }]`. */
  options: string | null;
  /** Sample answer, only meaningful for ESSAY questions. */
  correct_answer: string | null;
  /** Image URLs already resolved to something a headless browser can load. */
  image_urls: string[];
  /** True when the question carries audio/video that cannot be printed. */
  has_unprintable_media: boolean;
};

/** One question inside one variant, options already in printed order. */
export type PrintedQuestion = {
  number: number;
  question_text: string;
  question_type: QuestionType;
  options: string[];
  /** Letters of the correct options in printed order, e.g. `['A', 'C']`. */
  correct_letters: string[];
  correct_answer: string | null;
  image_urls: string[];
  has_unprintable_media: boolean;
};

/** One printable exam variant ("mã đề"). */
export type ExamVariant = {
  code: string;
  questions: PrintedQuestion[];
};

/** Exam metadata shown on every printed page. */
export type PrintExamInfo = {
  title: string;
  topic_name: string;
  lecturer_name: string;
  school: string | null;
  duration: number;
};
