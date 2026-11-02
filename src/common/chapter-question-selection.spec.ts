import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import {
  MAX_DISTRIBUTION_QUESTIONS,
  MAX_QUESTION_DISTRIBUTION_ROWS,
  MAX_QUESTIONS_PER_DISTRIBUTION_ROW,
} from './question-distribution.constants';
import {
  allocateChapterQuestions,
  parseChapterDistribution,
  selectChapterQuestionIds,
} from './chapter-question-selection';

describe('Chapter distribution matching', () => {
  const row = (quantity = 1) => ({ chapter_id: randomUUID(), quantity });
  it('reassigns an earlier broad row rather than starving a later narrow row', () => {
    expect(
      allocateChapterQuestions(
        [row(), row()],
        [['narrow', 'broad'], ['narrow']],
      ),
    ).toEqual(['broad', 'narrow']);
  });
  it('supports repeated roots, quotas and augmenting paths across several rows', () => {
    const result = allocateChapterQuestions(
      [row(2), row(), row()],
      [['a', 'b', 'c', 'd'], ['a', 'b'], ['a']],
    );
    expect(result).toHaveLength(4);
    expect(new Set(result).size).toBe(4);
    expect(result[3]).toBe('a');
  });
  it('rejects an impossible global quota even when each row is individually sufficient', () => {
    expect(() =>
      allocateChapterQuestions(
        [row(2), row(2)],
        [
          ['a', 'b', 'c'],
          ['b', 'c'],
        ],
      ),
    ).toThrow('Not enough distinct');
  });
  it.each([
    null,
    '{',
    [],
    [{ chapter_id: randomUUID(), quantity: 0 }],
    [{ chapter_id: randomUUID(), quantity: '2' }],
    [{ chapter_id: 'wrong', quantity: 1 }],
  ])('rejects invalid distribution %j', (value) => {
    expect(() => parseChapterDistribution(value)).toThrow();
  });
  it('keeps persisted legacy JSON shape and ordered quotas', () => {
    const rows = [row(2), row(3)];
    expect(parseChapterDistribution(JSON.stringify(rows))).toEqual(rows);
  });
  it('preserves row-count, per-row and total-question limits', () => {
    expect(
      parseChapterDistribution([row(MAX_QUESTIONS_PER_DISTRIBUTION_ROW)]),
    ).toHaveLength(1);
    expect(() =>
      parseChapterDistribution([row(MAX_QUESTIONS_PER_DISTRIBUTION_ROW + 1)]),
    ).toThrow();
    expect(
      parseChapterDistribution(
        Array.from({ length: MAX_QUESTION_DISTRIBUTION_ROWS }, () => row()),
      ),
    ).toHaveLength(MAX_QUESTION_DISTRIBUTION_ROWS);
    expect(() =>
      parseChapterDistribution(
        Array.from({ length: MAX_QUESTION_DISTRIBUTION_ROWS + 1 }, () => row()),
      ),
    ).toThrow(
      `max ${MAX_QUESTION_DISTRIBUTION_ROWS} rows / ${MAX_DISTRIBUTION_QUESTIONS} questions`,
    );
    const half = Math.floor(MAX_DISTRIBUTION_QUESTIONS / 2);
    expect(
      parseChapterDistribution([
        row(half),
        row(MAX_DISTRIBUTION_QUESTIONS - half),
      ]),
    ).toHaveLength(2);
    expect(() =>
      parseChapterDistribution([
        row(half),
        row(MAX_DISTRIBUTION_QUESTIONS - half + 1),
      ]),
    ).toThrow();
  });
  it('shares candidates for repeated chapter UUIDs regardless of case', async () => {
    const chapter = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const $queryRaw = jest
      .fn<
        Promise<Array<{ chapter_id: string; question_id: string }>>,
        [Prisma.Sql]
      >()
      .mockResolvedValue([
        { chapter_id: chapter, question_id: 'first' },
        { chapter_id: chapter, question_id: 'second' },
      ]);
    const db = { $queryRaw } as unknown as Prisma.TransactionClient;
    const ids = await selectChapterQuestionIds(db, randomUUID(), [
      { chapter_id: chapter.toUpperCase(), quantity: 1 },
      { chapter_id: chapter, quantity: 1 },
    ]);
    expect(new Set(ids)).toEqual(new Set(['first', 'second']));
    const query = $queryRaw.mock.calls[0][0];
    expect(query.sql).toContain(
      "SELECT DISTINCT (item->>'chapter_id')::uuid chapter_id",
    );
    expect(query.sql).toContain('subtree(chapter_id,id)');
    expect(query.sql).not.toContain('row_index');
    expect($queryRaw).toHaveBeenCalledTimes(1);
  });
  it('keeps empty chapter candidates insufficient', async () => {
    const chapter = randomUUID();
    const db = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([{ chapter_id: chapter, question_id: null }]),
    } as unknown as Prisma.TransactionClient;
    await expect(
      selectChapterQuestionIds(db, randomUUID(), [
        { chapter_id: chapter, quantity: 1 },
      ]),
    ).rejects.toThrow('Not enough distinct');
  });
  it('agrees with exhaustive feasibility on all small overlapping candidate graphs', () => {
    const rows = [row(), row(), row()];
    const feasible = (
      pools: string[][],
      slot = 0,
      used = new Set<string>(),
    ): boolean =>
      slot === pools.length ||
      pools[slot].some(
        (id) =>
          !used.has(id) && feasible(pools, slot + 1, new Set([...used, id])),
      );
    for (let mask = 0; mask < 512; mask++) {
      const pools = rows.map((_, r) =>
        ['a', 'b', 'c'].filter((_, q) => mask & (1 << (r * 3 + q))),
      );
      if (feasible(pools)) {
        const result = allocateChapterQuestions(rows, pools);
        expect(new Set(result).size).toBe(3);
        result.forEach((id, i) => expect(pools[i]).toContain(id));
      } else expect(() => allocateChapterQuestions(rows, pools)).toThrow();
    }
  });
});
