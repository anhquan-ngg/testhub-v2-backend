import { randomInt } from 'crypto';
import {
  QUESTION_FORMAT_ORDER,
  type TypeDistributionItem,
} from './question-distribution';

/** Max configurable delta (questions transferred between groups). */
export const MAX_DISTRIBUTION_DELTA = 2;

/** Upper bound for candidate quotas considered per plan. */
export const QUOTA_PLANNER_MAX_CANDIDATES = 64;

export type QuotaPlanStatus = 'disabled' | 'applied' | 'unchanged';

export type QuotaPlanReason =
  | 'NO_SAFE_TRANSFER'
  | 'NO_FEASIBLE_VARIATION_FOUND'
  | 'SEARCH_BUDGET_REACHED'
  | 'SELECTION_INSUFFICIENT';

export type QuotaMove = { from: number; to: number };

export type QuotaPlanInput = {
  /** Configured quota q_i per group (all >= 1). */
  quantities: readonly number[];
  /** Max transfer budget d (0..2). */
  delta: number;
  /** Random source in [0,1). Inject a seeded one for reproducibility. */
  rng: () => number;
  /** Available questions per group; candidates exceeding it are rejected. */
  capacity?: readonly number[];
  /** Whether one question may move from group `from` to group `to`. */
  canMove?: (from: number, to: number) => boolean;
  /**
   * Cognitive rank per group. When set, the net shift
   * S = sum(rank_i * (x_i - q_i)) must satisfy |S| <= 1.
   */
  ranks?: readonly number[];
  /** Extra feasibility oracle (e.g. a bipartite matching against the bank). */
  isFeasible?: (quantities: readonly number[]) => boolean;
};

export type QuotaPlan = {
  quantities: number[];
  appliedDelta: number;
  status: QuotaPlanStatus;
  reason?: QuotaPlanReason;
  moves: QuotaMove[];
};

/** Mulberry32 PRNG: small, deterministic, good enough for variant picking. */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random 32-bit seed to log alongside generated variants. */
export function generateSeed(): number {
  return randomInt(0, 2 ** 31);
}

/** D = 1/2 * sum|x_i - q_i|: the number of questions that changed group. */
export function transferDistance(
  base: readonly number[],
  next: readonly number[],
): number {
  let total = 0;
  for (let i = 0; i < base.length; i++) total += Math.abs(next[i] - base[i]);
  return total / 2;
}

function netShift(
  base: readonly number[],
  next: readonly number[],
  ranks: readonly number[],
): number {
  let shift = 0;
  for (let i = 0; i < base.length; i++) shift += ranks[i] * (next[i] - base[i]);
  return shift;
}

function acceptable(input: QuotaPlanInput, next: readonly number[]): boolean {
  const { quantities, delta, capacity, ranks } = input;
  const distance = transferDistance(quantities, next);
  if (distance < 1 || distance > delta) return false;
  for (let i = 0; i < next.length; i++) {
    if (next[i] < 1) return false;
    if (capacity && next[i] > capacity[i]) return false;
  }
  if (ranks && Math.abs(netShift(quantities, next, ranks)) > 1) return false;
  return true;
}

/**
 * Pure planner: picks a quota x with the same total as `quantities`, where at
 * most `delta` questions moved between groups. Every candidate is derived from
 * the configured quota (no drift). Falls back to the baseline with a reason.
 */
export function planQuota(input: QuotaPlanInput): QuotaPlan {
  const { quantities, delta, rng, canMove } = input;
  const baseline = [...quantities];
  if (!delta || delta <= 0)
    return {
      quantities: baseline,
      appliedDelta: 0,
      status: 'disabled',
      moves: [],
    };

  const pairs: QuotaMove[] = [];
  for (let from = 0; from < quantities.length; from++)
    for (let to = 0; to < quantities.length; to++)
      if (from !== to && (!canMove || canMove(from, to)))
        pairs.push({ from, to });

  const candidates = new Map<string, { quota: number[]; moves: QuotaMove[] }>();
  let anySafeTransfer = false;
  let budgetReached = false;
  const seen = new Set<string>();

  const expand = (quota: number[], moves: QuotaMove[]) => {
    for (const move of pairs) {
      if (quota[move.from] <= 1) continue;
      anySafeTransfer = true;
      const next = [...quota];
      next[move.from] -= 1;
      next[move.to] += 1;
      const key = next.join(',');
      const nextMoves = [...moves, move];
      if (acceptable(input, next) && !candidates.has(key))
        candidates.set(key, { quota: next, moves: nextMoves });
      if (nextMoves.length < Math.min(delta, MAX_DISTRIBUTION_DELTA)) {
        const visitKey = `${nextMoves.length}:${key}`;
        if (seen.has(visitKey)) continue;
        seen.add(visitKey);
        if (seen.size > 4096) {
          budgetReached = true;
          return;
        }
        expand(next, nextMoves);
      }
      if (budgetReached) return;
    }
  };
  expand(baseline, []);

  const list = [...candidates.values()];
  const unchanged = (reason: QuotaPlanReason): QuotaPlan => ({
    quantities: baseline,
    appliedDelta: 0,
    status: 'unchanged',
    reason,
    moves: [],
  });
  if (list.length === 0)
    return unchanged(
      budgetReached
        ? 'SEARCH_BUDGET_REACHED'
        : anySafeTransfer
          ? 'NO_FEASIBLE_VARIATION_FOUND'
          : 'NO_SAFE_TRANSFER',
    );

  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  // The oracle can be expensive, so it only runs on a bounded shuffled prefix.
  const chosen = input.isFeasible
    ? list
        .slice(0, QUOTA_PLANNER_MAX_CANDIDATES)
        .find((candidate) => input.isFeasible?.(candidate.quota))
    : list[0];
  if (!chosen) return unchanged('NO_FEASIBLE_VARIATION_FOUND');
  return {
    quantities: chosen.quota,
    appliedDelta: transferDistance(baseline, chosen.quota),
    status: 'applied',
    moves: chosen.moves,
  };
}

/**
 * Independent verification of a plan. Returns violation messages
 * (empty array means the plan is valid).
 */
export function verifyQuotaPlan(
  input: Pick<QuotaPlanInput, 'quantities' | 'delta' | 'ranks' | 'capacity'>,
  plan: Pick<QuotaPlan, 'quantities' | 'status'>,
): string[] {
  const errors: string[] = [];
  const { quantities, delta, ranks, capacity } = input;
  const sum = (values: readonly number[]) =>
    values.reduce((total, value) => total + value, 0);
  if (plan.quantities.length !== quantities.length)
    return ['group count changed'];
  if (sum(plan.quantities) !== sum(quantities)) errors.push('total changed');
  plan.quantities.forEach((value, i) => {
    if (!Number.isInteger(value) || value < 1)
      errors.push(`group ${i} below 1`);
    if (capacity && value > capacity[i])
      errors.push(`group ${i} over capacity`);
  });
  const distance = transferDistance(quantities, plan.quantities);
  if (distance > delta) errors.push('delta exceeded');
  if (plan.status === 'applied' && distance < 1) errors.push('no variation');
  if (ranks && Math.abs(netShift(quantities, plan.quantities, ranks)) > 1)
    errors.push('net cognitive shift exceeded');
  return errors;
}

export type TypeQuotaPlan = QuotaPlan & {
  /** Planned BY_TYPE quota rows, same order/length as the baseline. */
  rows: TypeDistributionItem[];
};

/**
 * BY_TYPE planner: groups are (question_type, question_format) rows. A question
 * may only move between adjacent cognitive levels of the same question type,
 * and the net cognitive shift stays within one level.
 */
export function planTypeQuota(input: {
  rows: readonly TypeDistributionItem[];
  delta: number;
  rng: () => number;
  capacity?: readonly number[];
}): TypeQuotaPlan {
  const { rows } = input;
  const rank = (row: TypeDistributionItem) =>
    QUESTION_FORMAT_ORDER.indexOf(row.question_format);
  const ranks = rows.map(rank);
  const plan = planQuota({
    quantities: rows.map((row) => row.quantity),
    delta: input.delta,
    rng: input.rng,
    capacity: input.capacity,
    ranks,
    canMove: (from, to) =>
      rows[from].question_type === rows[to].question_type &&
      Math.abs(ranks[from] - ranks[to]) === 1,
  });
  return {
    ...plan,
    rows: rows.map((row, i) => ({ ...row, quantity: plan.quantities[i] })),
  };
}
