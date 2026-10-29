import { randomUUID } from 'node:crypto';
import {
  allocateChapterQuestions,
  parseChapterDistribution,
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
