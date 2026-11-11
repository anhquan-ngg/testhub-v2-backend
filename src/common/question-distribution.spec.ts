import { BadRequestException } from '@nestjs/common';
import {
  MAX_DISTRIBUTION_QUESTIONS,
  MAX_QUESTION_DISTRIBUTION_ROWS,
  MAX_QUESTIONS_PER_DISTRIBUTION_ROW,
} from './question-distribution.constants';
import {
  normalizeTypeDistribution,
  parseTypeDistribution,
  sumDistributionQuantity,
  type TypeDistributionItem,
} from './question-distribution';

describe('question-distribution', () => {
  const row = (
    question_type: string,
    question_format: string,
    quantity: number,
  ) =>
    ({
      question_type,
      question_format,
      quantity,
    }) as unknown as TypeDistributionItem;

  it('merges duplicate type/format rows preserving first-seen order', () => {
    const merged = normalizeTypeDistribution([
      row('SINGLE_CHOICE', 'KNOWLEDGE', 3),
      row('MULTIPLE_CHOICE', 'APPLYING', 2),
      row('SINGLE_CHOICE', 'KNOWLEDGE', 4),
    ]);
    expect(merged).toEqual([
      row('SINGLE_CHOICE', 'KNOWLEDGE', 7),
      row('MULTIPLE_CHOICE', 'APPLYING', 2),
    ]);
  });

  it('does not mutate the input rows', () => {
    const input = [row('ESSAY', 'ADVANCED', 1), row('ESSAY', 'ADVANCED', 1)];
    normalizeTypeDistribution(input);
    expect(input[0].quantity).toBe(1);
  });

  it('parses a JSON string and sums quantities', () => {
    const rows = parseTypeDistribution(
      JSON.stringify([
        row('SINGLE_CHOICE', 'KNOWLEDGE', 2),
        row('SINGLE_CHOICE', 'KNOWLEDGE', 3),
      ]),
    );
    expect(rows).toHaveLength(1);
    expect(sumDistributionQuantity(rows)).toBe(5);
  });

  it('accepts saved rows with extra keys and strips those keys', () => {
    const legacyRow = { ...row('ESSAY', 'KNOWLEDGE', 1), extra: true };
    for (const value of [[legacyRow], JSON.stringify([legacyRow])]) {
      expect(parseTypeDistribution(value)).toEqual([
        row('ESSAY', 'KNOWLEDGE', 1),
      ]);
    }
  });

  it.each([
    ['not json', '{oops'],
    ['not an array', '{}'],
    ['empty array', '[]'],
    ['unknown type', JSON.stringify([row('FOO', 'KNOWLEDGE', 1)])],
    ['unknown format', JSON.stringify([row('ESSAY', 'BAR', 1)])],
    ['zero quantity', JSON.stringify([row('ESSAY', 'KNOWLEDGE', 0)])],
    ['fractional quantity', JSON.stringify([row('ESSAY', 'KNOWLEDGE', 1.5)])],
    [
      'row quantity limit',
      [row('ESSAY', 'KNOWLEDGE', MAX_QUESTIONS_PER_DISTRIBUTION_ROW + 1)],
    ],
    [
      'row count limit',
      Array.from({ length: MAX_QUESTION_DISTRIBUTION_ROWS + 1 }, () =>
        row('ESSAY', 'KNOWLEDGE', 1),
      ),
    ],
    [
      'total quantity limit',
      [
        row('ESSAY', 'KNOWLEDGE', MAX_DISTRIBUTION_QUESTIONS),
        row('ESSAY', 'UNDERSTANDING', 1),
      ],
    ],
    ['missing type', [{ question_format: 'KNOWLEDGE', quantity: 1 }]],
    ['missing format', [{ question_type: 'ESSAY', quantity: 1 }]],
    [
      'missing quantity',
      [{ question_type: 'ESSAY', question_format: 'KNOWLEDGE' }],
    ],
  ])('rejects malformed input: %s', (_name, value) => {
    expect(() => parseTypeDistribution(value)).toThrow(BadRequestException);
  });
});
