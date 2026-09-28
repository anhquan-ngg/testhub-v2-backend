import { QuestionType } from '@prisma/client';
import type { PrintSourceQuestion } from './exam-print.types';
import {
  buildVariant,
  generateVariantCodes,
  parseOptions,
  shuffle,
} from './exam-print.variants';
import { escapeHtml, renderAnswerKeyHtml } from './exam-print.templates';

/** Deterministic PRNG (mulberry32) so shuffles are reproducible. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function choice(
  id: string,
  type: QuestionType,
  options: { text: string; isCorrect: boolean }[],
): PrintSourceQuestion {
  return {
    id,
    question_text: `Question ${id}`,
    question_type: type,
    options: JSON.stringify(options),
    correct_answer: null,
    image_urls: [],
    has_unprintable_media: false,
  };
}

const single = choice('q1', QuestionType.SINGLE_CHOICE, [
  { text: 'wrong 1', isCorrect: false },
  { text: 'right', isCorrect: true },
  { text: 'wrong 2', isCorrect: false },
  { text: 'wrong 3', isCorrect: false },
]);
const multiple = choice('q2', QuestionType.MULTIPLE_CHOICE, [
  { text: 'r1', isCorrect: true },
  { text: 'w1', isCorrect: false },
  { text: 'r2', isCorrect: true },
  { text: 'w2', isCorrect: false },
]);
const essay: PrintSourceQuestion = {
  id: 'q3',
  question_text: 'Explain',
  question_type: QuestionType.ESSAY,
  options: null,
  correct_answer: 'Sample answer',
  image_urls: [],
  has_unprintable_media: false,
};

describe('exam-print variants', () => {
  describe('generateVariantCodes', () => {
    it.each([2, 4, 8])('returns %i distinct sorted 3-digit codes', (count) => {
      const codes = generateVariantCodes(count, seeded(count));
      expect(codes).toHaveLength(count);
      expect(new Set(codes).size).toBe(count);
      codes.forEach((code) => expect(code).toMatch(/^[1-9]\d{2}$/));
      expect([...codes].sort()).toEqual(codes);
    });
  });

  describe('shuffle', () => {
    it('keeps every element and does not mutate the input', () => {
      const input = [1, 2, 3, 4, 5, 6];
      const result = shuffle(input, seeded(1));
      expect(input).toEqual([1, 2, 3, 4, 5, 6]);
      expect([...result].sort()).toEqual(input);
    });
  });

  describe('parseOptions', () => {
    it('treats only an explicit `true` as correct', () => {
      expect(
        parseOptions('[{"text":"a","isCorrect":true},{"text":"b"}]'),
      ).toEqual([
        { text: 'a', isCorrect: true },
        { text: 'b', isCorrect: false },
      ]);
    });

    it('returns an empty list for malformed data', () => {
      expect(parseOptions('not json')).toEqual([]);
      expect(parseOptions('{"text":"a"}')).toEqual([]);
      expect(parseOptions(null)).toEqual([]);
    });
  });

  describe('buildVariant', () => {
    it('numbers questions sequentially and keeps the full set', () => {
      const variant = buildVariant('101', [single, multiple, essay], seeded(7));
      expect(variant.code).toBe('101');
      expect(variant.questions.map((q) => q.number)).toEqual([1, 2, 3]);
      expect(variant.questions.map((q) => q.question_text).sort()).toEqual(
        ['Explain', 'Question q1', 'Question q2'].sort(),
      );
    });

    it('derives answer letters from the shuffled option order', () => {
      for (let seed = 0; seed < 25; seed++) {
        const variant = buildVariant('101', [single, multiple], seeded(seed));
        for (const q of variant.questions) {
          const correctTexts = q.correct_letters.map(
            (letter) => q.options[letter.charCodeAt(0) - 65],
          );
          if (q.question_type === QuestionType.SINGLE_CHOICE) {
            expect(correctTexts).toEqual(['right']);
          } else {
            expect(correctTexts.sort()).toEqual(['r1', 'r2']);
          }
        }
      }
    });

    it('actually varies question and option order across variants', () => {
      const orders = new Set<string>();
      for (let seed = 0; seed < 20; seed++) {
        const variant = buildVariant(
          '101',
          [single, multiple, essay],
          seeded(seed),
        );
        orders.add(
          variant.questions
            .map((q) => `${q.question_text}:${q.options.join('|')}`)
            .join('/'),
        );
      }
      expect(orders.size).toBeGreaterThan(1);
    });

    it('carries the sample answer for essays and no options', () => {
      const variant = buildVariant('101', [essay], seeded(1));
      expect(variant.questions[0]).toMatchObject({
        options: [],
        correct_letters: [],
        correct_answer: 'Sample answer',
      });
    });
  });
});

describe('exam-print templates', () => {
  it('escapes user content so it is never parsed as markup', () => {
    expect(escapeHtml('<script>alert("x")</script> & \'y\'')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;',
    );
  });

  it('lists every variant and every question in the answer key', () => {
    const variants = ['101', '205'].map((code, i) =>
      buildVariant(code, [single, multiple, essay], seeded(i)),
    );
    const html = renderAnswerKeyHtml(
      {
        title: 'Midterm',
        topic_name: 'Math',
        lecturer_name: 'Lecturer',
        school: null,
        duration: 60,
      },
      variants,
    );
    expect(html).toContain('Mã 101');
    expect(html).toContain('Mã 205');
    expect(html).toContain('<tr><th>3</th>');
    expect(html).not.toContain('<tr><th>4</th>');
    expect(html).toContain('Sample answer');
  });
});
