import {
  createSeededRng,
  planQuota,
  planTypeQuota,
  transferDistance,
  verifyQuotaPlan,
} from './quota-planner';
import type { TypeDistributionItem } from './question-distribution';

const row = (
  question_type: TypeDistributionItem['question_type'],
  question_format: TypeDistributionItem['question_format'],
  quantity: number,
): TypeDistributionItem => ({ question_type, question_format, quantity });

describe('planQuota', () => {
  it('is disabled when delta is 0', () => {
    const plan = planQuota({
      quantities: [5, 5],
      delta: 0,
      rng: createSeededRng(1),
    });
    expect(plan).toMatchObject({
      status: 'disabled',
      quantities: [5, 5],
      appliedDelta: 0,
    });
  });

  it('keeps total, minimum 1 per group and delta budget across seeds', () => {
    const base = [4, 3, 2];
    for (let seed = 0; seed < 200; seed++) {
      const input = { quantities: base, delta: 2, rng: createSeededRng(seed) };
      const plan = planQuota(input);
      expect(plan.status).toBe('applied');
      expect(plan.quantities.reduce((a, b) => a + b, 0)).toBe(9);
      expect(Math.min(...plan.quantities)).toBeGreaterThanOrEqual(1);
      expect(transferDistance(base, plan.quantities)).toBeGreaterThanOrEqual(1);
      expect(transferDistance(base, plan.quantities)).toBeLessThanOrEqual(2);
      expect(verifyQuotaPlan({ quantities: base, delta: 2 }, plan)).toEqual([]);
    }
    expect(base).toEqual([4, 3, 2]);
  });

  it('is deterministic for a fixed seed', () => {
    const run = () =>
      planQuota({ quantities: [4, 3, 2], delta: 2, rng: createSeededRng(42) });
    expect(run()).toEqual(run());
  });

  it('with delta 1 never exceeds one transferred question', () => {
    for (let seed = 0; seed < 50; seed++) {
      const plan = planQuota({
        quantities: [3, 3],
        delta: 1,
        rng: createSeededRng(seed),
      });
      expect(plan.appliedDelta).toBe(1);
    }
  });

  it('falls back to the baseline when every group has a single question', () => {
    const plan = planQuota({
      quantities: [1, 1, 1],
      delta: 2,
      rng: createSeededRng(1),
    });
    expect(plan).toMatchObject({
      status: 'unchanged',
      reason: 'NO_SAFE_TRANSFER',
      quantities: [1, 1, 1],
    });
  });

  it('respects capacity and reports NO_FEASIBLE_VARIATION_FOUND', () => {
    const plan = planQuota({
      quantities: [2, 2],
      delta: 1,
      rng: createSeededRng(1),
      capacity: [2, 2],
    });
    expect(plan).toMatchObject({
      status: 'unchanged',
      reason: 'NO_FEASIBLE_VARIATION_FOUND',
      quantities: [2, 2],
    });
  });

  it('only moves where canMove allows', () => {
    for (let seed = 0; seed < 30; seed++) {
      const plan = planQuota({
        quantities: [3, 3, 3],
        delta: 2,
        rng: createSeededRng(seed),
        canMove: (from, to) => from !== 2 && to !== 2,
      });
      expect(plan.quantities[2]).toBe(3);
    }
  });
});

describe('verifyQuotaPlan', () => {
  it('flags broken plans', () => {
    const input = { quantities: [3, 3], delta: 1 };
    expect(
      verifyQuotaPlan(input, { quantities: [3, 4], status: 'applied' }),
    ).toContain('total changed');
    expect(
      verifyQuotaPlan(input, { quantities: [0, 6], status: 'applied' }),
    ).toEqual(expect.arrayContaining(['group 0 below 1', 'delta exceeded']));
    expect(
      verifyQuotaPlan(
        { ...input, capacity: [3, 3] },
        { quantities: [2, 4], status: 'applied' },
      ),
    ).toContain('group 1 over capacity');
    expect(
      verifyQuotaPlan(input, { quantities: [3, 3], status: 'applied' }),
    ).toContain('no variation');
  });
});

describe('planTypeQuota', () => {
  const rows = [
    row('SINGLE_CHOICE', 'KNOWLEDGE', 4),
    row('SINGLE_CHOICE', 'UNDERSTANDING', 4),
    row('SINGLE_CHOICE', 'APPLYING', 3),
    row('MULTIPLE_CHOICE', 'KNOWLEDGE', 2),
    row('MULTIPLE_CHOICE', 'ADVANCED', 2),
  ];
  const ranks = [0, 1, 2, 0, 3];

  it('moves only between adjacent levels of the same type, |S| <= 1', () => {
    for (let seed = 0; seed < 300; seed++) {
      const plan = planTypeQuota({
        rows,
        delta: 2,
        rng: createSeededRng(seed),
      });
      expect(plan.status).toBe('applied');
      const typeTotals = (items: readonly TypeDistributionItem[]) =>
        items.reduce<Record<string, number>>((acc, item) => {
          acc[item.question_type] =
            (acc[item.question_type] ?? 0) + item.quantity;
          return acc;
        }, {});
      expect(typeTotals(plan.rows)).toEqual(typeTotals(rows));
      // The MULTIPLE_CHOICE rows are not adjacent, so they never change.
      expect(plan.rows[3].quantity).toBe(2);
      expect(plan.rows[4].quantity).toBe(2);
      const shift = plan.rows.reduce(
        (acc, item, i) => acc + ranks[i] * (item.quantity - rows[i].quantity),
        0,
      );
      expect(Math.abs(shift)).toBeLessThanOrEqual(1);
      expect(plan.appliedDelta).toBeLessThanOrEqual(2);
    }
    expect(rows[0].quantity).toBe(4);
  });

  it('never applies two same-direction moves', () => {
    const chain = [
      row('SINGLE_CHOICE', 'KNOWLEDGE', 3),
      row('SINGLE_CHOICE', 'UNDERSTANDING', 3),
      row('SINGLE_CHOICE', 'APPLYING', 3),
    ];
    const seen = new Set<string>();
    for (let seed = 0; seed < 300; seed++) {
      const plan = planTypeQuota({
        rows: chain,
        delta: 2,
        rng: createSeededRng(seed),
      });
      seen.add(plan.quantities.join(','));
      const shift = plan.quantities.reduce((acc, q, i) => acc + i * (q - 3), 0);
      expect(Math.abs(shift)).toBeLessThanOrEqual(1);
    }
    expect(seen.has('2,3,4')).toBe(false);
    expect(seen.has('4,3,2')).toBe(false);
    expect(seen.size).toBeGreaterThan(1);
  });

  it('falls back when no adjacent configured pair exists', () => {
    const plan = planTypeQuota({
      rows: [
        row('SINGLE_CHOICE', 'KNOWLEDGE', 3),
        row('SINGLE_CHOICE', 'ADVANCED', 3),
      ],
      delta: 2,
      rng: createSeededRng(1),
    });
    expect(plan.status).toBe('unchanged');
    expect(plan.reason).toBe('NO_SAFE_TRANSFER');
    expect(plan.rows.map((item) => item.quantity)).toEqual([3, 3]);
  });
});

describe('planQuota isFeasible oracle', () => {
  it('only accepts candidates the oracle approves', () => {
    const plan = planQuota({
      quantities: [5, 5, 5],
      delta: 1,
      rng: createSeededRng(4),
      isFeasible: (q) => q[0] <= 5,
    });
    expect(plan.status).toBe('applied');
    expect(plan.quantities[0]).toBeLessThanOrEqual(5);
    expect(plan.quantities.reduce((s, n) => s + n, 0)).toBe(15);
  });

  it('falls back when the oracle rejects every candidate', () => {
    const plan = planQuota({
      quantities: [5, 5, 5],
      delta: 2,
      rng: createSeededRng(4),
      isFeasible: () => false,
    });
    expect(plan.status).toBe('unchanged');
    expect(plan.reason).toBe('NO_FEASIBLE_VARIATION_FOUND');
    expect(plan.quantities).toEqual([5, 5, 5]);
  });
});
