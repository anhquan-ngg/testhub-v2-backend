import { BadRequestException } from '@nestjs/common';
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

  it.each([
    ['not json', '{oops'],
    ['not an array', '{}'],
    ['empty array', '[]'],
    ['unknown type', JSON.stringify([row('FOO', 'KNOWLEDGE', 1)])],
    ['unknown format', JSON.stringify([row('ESSAY', 'BAR', 1)])],
    ['zero quantity', JSON.stringify([row('ESSAY', 'KNOWLEDGE', 0)])],
    ['fractional quantity', JSON.stringify([row('ESSAY', 'KNOWLEDGE', 1.5)])],
    [
      'extra property',
      JSON.stringify([{ ...row('ESSAY', 'KNOWLEDGE', 1), extra: true }]),
    ],
  ])('rejects malformed input: %s', (_name, value) => {
    expect(() => parseTypeDistribution(value)).toThrow(BadRequestException);
  });
});
