import {
  checkChapterDeltaFeasibility,
  checkTypeDeltaFeasibility,
  planChapterVariant,
  parseDistributionDeltaSummary,
  planTypeVariant,
  selectionFallbackSummary,
} from './distribution-delta';
import type { TypeDistributionItem } from './question-distribution';

const rows: TypeDistributionItem[] = [
  { question_type: 'SINGLE_CHOICE', question_format: 'KNOWLEDGE', quantity: 5 },
  {
    question_type: 'SINGLE_CHOICE',
    question_format: 'UNDERSTANDING',
    quantity: 5,
  },
  { question_type: 'SINGLE_CHOICE', question_format: 'APPLYING', quantity: 5 },
];
const total = (items: TypeDistributionItem[]) =>
  items.reduce((sum, row) => sum + row.quantity, 0);

describe('parseDistributionDeltaSummary', () => {
  it('round-trips a planner summary', () => {
    const { summary } = planTypeVariant({
      rows,
      delta: 1,
      seed: 7,
      capacity: [20, 20, 20],
    });
    expect(parseDistributionDeltaSummary(summary)).toEqual(summary);
  });

  it('returns null for malformed or empty values', () => {
    expect(parseDistributionDeltaSummary(null)).toBeNull();
    expect(parseDistributionDeltaSummary({ v: 2 })).toBeNull();
    expect(parseDistributionDeltaSummary('x')).toBeNull();
  });
});

describe('planTypeVariant', () => {
  it('returns the baseline when delta is disabled', () => {
    const result = planTypeVariant({ rows, delta: 0, seed: 1 });
    expect(result.rows).toEqual(rows);
    expect(result.summary.status).toBe('disabled');
  });

  it('preserves the total and records moves for a positive delta', () => {
    const result = planTypeVariant({ rows, delta: 2, seed: 7 });
    expect(total(result.rows)).toBe(15);
    expect(result.summary.status).toBe('applied');
    expect(result.summary.applied_d).toBeGreaterThanOrEqual(1);
    expect(result.summary.moves.length).toBeGreaterThan(0);
  });

  it('is deterministic for a seed and does not mutate the input', () => {
    const a = planTypeVariant({ rows, delta: 1, seed: 42 });
    const b = planTypeVariant({ rows, delta: 1, seed: 42 });
    expect(a).toEqual(b);
    expect(rows.map((row) => row.quantity)).toEqual([5, 5, 5]);
  });

  it('keeps the baseline when capacity forbids any transfer', () => {
    const result = planTypeVariant({
      rows,
      delta: 2,
      seed: 3,
      capacity: [5, 5, 5],
    });
    expect(result.rows.map((row) => row.quantity)).toEqual([5, 5, 5]);
    expect(result.summary.status).toBe('unchanged');
    expect(result.summary.reason).toBeDefined();
  });

  it('marks selection fallbacks', () => {
    const planned = planTypeVariant({ rows, delta: 1, seed: 9 });
    const fallback = selectionFallbackSummary(planned.summary);
    expect(fallback.status).toBe('unchanged');
    expect(fallback.reason).toBe('SELECTION_INSUFFICIENT');
    expect(fallback.moves).toEqual([]);
  });
});

describe('checkTypeDeltaFeasibility', () => {
  it('flags an insufficient baseline', () => {
    const result = checkTypeDeltaFeasibility({
      rows,
      delta: 1,
      capacity: [5, 4, 5],
    });
    expect(result.baseline_feasible).toBe(false);
    expect(result.warnings[0].code).toBe('BASELINE_INSUFFICIENT');
  });

  it('reports no warnings when spare capacity exists and N is large', () => {
    const big = rows.map((row) => ({ ...row, quantity: 20 }));
    const result = checkTypeDeltaFeasibility({
      rows: big,
      delta: 2,
      capacity: [30, 30, 30],
    });
    expect(result.max_feasible_d).toBe(2);
    expect(result.warnings).toEqual([]);
  });

  it('warns when there is no spare capacity', () => {
    const result = checkTypeDeltaFeasibility({
      rows,
      delta: 1,
      capacity: [5, 5, 5],
    });
    expect(result.max_feasible_d).toBe(0);
    expect(result.warnings[0].code).toBe('NO_FEASIBLE_VARIATION');
  });

  it('warns about delta 2 on small exams', () => {
    const result = checkTypeDeltaFeasibility({
      rows,
      delta: 2,
      capacity: [9, 9, 9],
    });
    expect(result.warnings.map((w) => w.code)).toContain(
      'DELTA_HIGH_FOR_TOTAL',
    );
  });
});

describe('BY_CHAPTER delta planning', () => {
  const ids = [
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
  ];
  const chapterRows = ids.map((chapter_id) => ({ chapter_id, quantity: 5 }));
  const pool = (prefix: string, size: number) =>
    Array.from({ length: size }, (_, i) => `${prefix}${i}`);
  const sum = (items: { quantity: number }[]) =>
    items.reduce((s, r) => s + r.quantity, 0);

  it('moves questions between chapters while preserving the total', () => {
    const candidates = ids.map((_, i) => pool(`c${i}-`, 12));
    const result = planChapterVariant({
      rows: chapterRows,
      delta: 2,
      seed: 11,
      candidates,
    });
    expect(result.summary.status).toBe('applied');
    expect(sum(result.rows)).toBe(15);
    expect(result.rows.every((row) => row.quantity >= 1)).toBe(true);
    expect(chapterRows.map((row) => row.quantity)).toEqual([5, 5, 5]);
  });

  it('keeps the baseline when every chapter is exactly saturated', () => {
    const candidates = ids.map((_, i) => pool(`c${i}-`, 5));
    const result = planChapterVariant({
      rows: chapterRows,
      delta: 2,
      seed: 5,
      candidates,
    });
    expect(result.summary.status).toBe('unchanged');
    expect(result.rows.map((row) => row.quantity)).toEqual([5, 5, 5]);
  });

  it('never counts a shared question twice (overlapping subtrees)', () => {
    const shared = pool('s', 8);
    const result = planChapterVariant({
      rows: chapterRows.slice(0, 2),
      delta: 2,
      seed: 3,
      candidates: [shared, shared],
    });
    expect(sum(result.rows)).toBe(10);
  });

  it('reports feasibility for sufficient, saturated and short banks', () => {
    const rich = checkChapterDeltaFeasibility({
      rows: chapterRows,
      delta: 1,
      candidates: ids.map((_, i) => pool(`c${i}-`, 12)),
    });
    expect(rich.baseline_feasible).toBe(true);
    expect(rich.max_feasible_d).toBeGreaterThanOrEqual(1);

    const saturated = checkChapterDeltaFeasibility({
      rows: chapterRows,
      delta: 1,
      candidates: ids.map((_, i) => pool(`c${i}-`, 5)),
    });
    expect(saturated.warnings.map((w) => w.code)).toContain(
      'NO_FEASIBLE_VARIATION',
    );

    const short = checkChapterDeltaFeasibility({
      rows: chapterRows,
      delta: 1,
      candidates: [pool('a', 5), pool('b', 4), pool('c', 5)],
    });
    expect(short.baseline_feasible).toBe(false);
    expect(short.warnings[0].code).toBe('BASELINE_INSUFFICIENT');
  });
});
