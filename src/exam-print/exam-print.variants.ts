import { QuestionType } from '@prisma/client';
import type {
  ExamVariant,
  PrintedQuestion,
  PrintSourceQuestion,
} from './exam-print.types';

/** Returns a value in [0, 1); injectable so tests can be deterministic. */
export type RandomFn = () => number;

type StoredOption = { text?: unknown; isCorrect?: unknown };

/** Fisher–Yates shuffle returning a new array; never mutates `items`. */
export function shuffle<T>(
  items: readonly T[],
  random: RandomFn = Math.random,
): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generates `count` distinct three-digit variant codes (101–999), sorted
 * ascending. Random rather than sequential so candidates sitting next to
 * each other cannot infer a neighbour's variant from their own code.
 */
export function generateVariantCodes(
  count: number,
  random: RandomFn = Math.random,
): string[] {
  const codes = new Set<number>();
  while (codes.size < count) {
    codes.add(101 + Math.floor(random() * 899));
  }
  return [...codes].sort((a, b) => a - b).map(String);
}

/** Converts a zero-based option index to its printed letter (0 → A). */
export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Parses the stored options JSON. Malformed data yields an empty list rather
 * than failing the whole print run; such a question then prints without
 * choices and the answer key shows it has no correct option.
 */
export function parseOptions(
  raw: string | null,
): { text: string; isCorrect: boolean }[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return (parsed as StoredOption[]).map((opt) => ({
    text:
      typeof opt?.text === 'string' || typeof opt?.text === 'number'
        ? String(opt.text)
        : '',
    isCorrect: opt?.isCorrect === true,
  }));
}

/**
 * Builds one variant: shuffles question order and, for choice questions,
 * option order, then derives the correct letters from the shuffled order.
 */
export function buildVariant(
  code: string,
  questions: readonly PrintSourceQuestion[],
  random: RandomFn = Math.random,
): ExamVariant {
  const printed: PrintedQuestion[] = shuffle(questions, random).map(
    (question, index) => {
      const isChoice = question.question_type !== QuestionType.ESSAY;
      const options = isChoice
        ? shuffle(parseOptions(question.options), random)
        : [];
      return {
        number: index + 1,
        question_text: question.question_text,
        question_type: question.question_type,
        options: options.map((opt) => opt.text),
        correct_letters: options.flatMap((opt, i) =>
          opt.isCorrect ? [optionLetter(i)] : [],
        ),
        correct_answer: isChoice ? null : question.correct_answer,
        image_urls: question.image_urls,
        has_unprintable_media: question.has_unprintable_media,
      };
    },
  );
  return { code, questions: printed };
}
