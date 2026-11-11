import { z } from 'zod';
import {
  matchChapterQuestions,
  type ChapterDistribution,
} from './chapter-question-selection';
import {
  createSeededRng,
  planQuota,
  planTypeQuota,
  verifyQuotaPlan,
  type QuotaPlanReason,
  type QuotaPlanStatus,
} from './quota-planner';
import {
  QUESTION_FORMAT_ORDER,
  type TypeDistributionItem,
} from './question-distribution';

/** Versioned, slim record of how one variant's quota was derived. */
export type DistributionDeltaSummary = {
  v: 1;
  seed: number;
  requested_delta: number;
  applied_d: number;
  status: QuotaPlanStatus;
  reason?: QuotaPlanReason | 'PLAN_VERIFICATION_FAILED';
  /** Group labels: `<question_type>/<question_format>` or a chapter id. */
  moves: Array<{ from: string; to: string }>;
};

export const distributionDeltaSummarySchema = z.object({
  v: z.literal(1),
  seed: z.number().int(),
  requested_delta: z.number().int().min(0).max(2),
  applied_d: z.number().int().min(0).max(2),
  status: z.enum(['disabled', 'applied', 'unchanged']),
  reason: z.string().optional(),
  moves: z.array(z.object({ from: z.string(), to: z.string() })),
});

/** Validates a stored/outgoing summary; returns null when it is malformed. */
export function parseDistributionDeltaSummary(
  value: unknown,
): DistributionDeltaSummary | null {
  const parsed = distributionDeltaSummarySchema.safeParse(value);
  return parsed.success ? (parsed.data as DistributionDeltaSummary) : null;
}

export type PlannedTypeVariant = {
  rows: TypeDistributionItem[];
  summary: DistributionDeltaSummary;
};

const labelOf = (row: TypeDistributionItem) =>
  `${row.question_type}/${row.question_format}`;

/**
 * Plans one BY_TYPE variant. Always returns a usable quota: the configured
 * baseline whenever delta is off, no variation is feasible, or the verifier
 * rejects the plan.
 */
export function planTypeVariant(input: {
  rows: readonly TypeDistributionItem[];
  delta: number;
  seed: number;
  capacity?: readonly number[];
}): PlannedTypeVariant {
  const { rows, delta, seed, capacity } = input;
  const baseline = rows.map((row) => ({ ...row }));
  const summary: DistributionDeltaSummary = {
    v: 1,
    seed,
    requested_delta: delta,
    applied_d: 0,
    status: 'disabled',
    moves: [],
  };
  if (delta <= 0 || rows.length === 0) return { rows: baseline, summary };

  const plan = planTypeQuota({
    rows,
    delta,
    rng: createSeededRng(seed),
    capacity,
  });
  const ranks = rows.map((row) =>
    QUESTION_FORMAT_ORDER.indexOf(row.question_format),
  );
  const violations = verifyQuotaPlan(
    {
      quantities: rows.map((row) => row.quantity),
      delta,
      capacity,
      ranks,
    },
    plan,
  );
  if (violations.length > 0) {
    return {
      rows: baseline,
      summary: {
        ...summary,
        status: 'unchanged',
        reason: 'PLAN_VERIFICATION_FAILED',
      },
    };
  }
  return {
    rows: plan.rows,
    summary: {
      ...summary,
      applied_d: plan.appliedDelta,
      status: plan.status,
      reason: plan.reason,
      moves: plan.moves.map((move) => ({
        from: labelOf(rows[move.from]),
        to: labelOf(rows[move.to]),
      })),
    },
  };
}

/** Marks a plan whose selection failed so the baseline had to be used. */
export function selectionFallbackSummary(
  summary: DistributionDeltaSummary,
): DistributionDeltaSummary {
  return {
    ...summary,
    applied_d: 0,
    status: 'unchanged',
    reason: 'SELECTION_INSUFFICIENT',
    moves: [],
  };
}

export type DeltaWarningCode =
  | 'BASELINE_INSUFFICIENT'
  | 'NO_FEASIBLE_VARIATION'
  | 'DELTA_ABOVE_MAX_FEASIBLE'
  | 'DELTA_HIGH_FOR_TOTAL';

export type DeltaFeasibility = {
  baseline_feasible: boolean;
  delta_requested: number;
  max_feasible_d: number;
  total_questions: number;
  warnings: Array<{ code: DeltaWarningCode; message: string }>;
};

const FEASIBILITY_SIMULATIONS = 8;
const DELTA_MIN_TOTAL_FOR_TWO = 40;

type FeasibilityInput = {
  total: number;
  delta: number;
  baselineFeasible: boolean;
  /** True when a seeded plan with the given budget produced a real variation. */
  canVary: (d: number, seed: number) => boolean;
  noVariationMessage: string;
};

function estimateDeltaFeasibility(input: FeasibilityInput): DeltaFeasibility {
  const { total, delta } = input;
  const result: DeltaFeasibility = {
    baseline_feasible: input.baselineFeasible,
    delta_requested: delta,
    max_feasible_d: 0,
    total_questions: total,
    warnings: [],
  };
  if (delta <= 0) return result;

  if (!result.baseline_feasible) {
    result.warnings.push({
      code: 'BASELINE_INSUFFICIENT',
      message: 'Not enough questions to satisfy the configured distribution.',
    });
    return result;
  }

  for (let d = 1; d <= delta; d++) {
    for (let seed = 1; seed <= FEASIBILITY_SIMULATIONS; seed++) {
      if (input.canVary(d, seed)) {
        result.max_feasible_d = d;
        break;
      }
    }
  }

  if (result.max_feasible_d === 0) {
    result.warnings.push({
      code: 'NO_FEASIBLE_VARIATION',
      message: input.noVariationMessage,
    });
  } else if (result.max_feasible_d < delta) {
    result.warnings.push({
      code: 'DELTA_ABOVE_MAX_FEASIBLE',
      message: `Only a delta of up to ${result.max_feasible_d} is achievable with the current question bank.`,
    });
  }
  if (delta >= 2 && total < DELTA_MIN_TOTAL_FOR_TWO) {
    result.warnings.push({
      code: 'DELTA_HIGH_FOR_TOTAL',
      message: `A delta of 2 shifts more than 5% of a ${total}-question exam; prefer delta 1.`,
    });
  }
  return result;
}

/**
 * Configuration-time estimate: simulates the planner with fixed seeds against
 * the available capacity. Only warns; saving is never blocked by the result.
 */
export function checkTypeDeltaFeasibility(input: {
  rows: readonly TypeDistributionItem[];
  delta: number;
  capacity: readonly number[];
}): DeltaFeasibility {
  const { rows, delta, capacity } = input;
  return estimateDeltaFeasibility({
    total: rows.reduce((sum, row) => sum + row.quantity, 0),
    delta,
    baselineFeasible: rows.every((row, i) => capacity[i] >= row.quantity),
    canVary: (d, seed) =>
      planTypeVariant({ rows, delta: d, seed, capacity }).summary.status ===
      'applied',
    noVariationMessage:
      'No adjacent cognitive levels can exchange questions; every variant will use the configured distribution.',
  });
}

const withQuantities = (
  rows: ChapterDistribution,
  quantities: readonly number[],
): ChapterDistribution =>
  rows.map((row, i) => ({ ...row, quantity: quantities[i] }));

export type PlannedChapterVariant = {
  rows: ChapterDistribution;
  summary: DistributionDeltaSummary;
};

/**
 * Plans one BY_CHAPTER variant. Questions may move between any configured
 * chapters; feasibility is decided by the same bipartite matching used at
 * selection time, so overlapping parent/child quotas never count a question
 * twice. `candidates` must be aligned with `rows` (see loadChapterCandidates).
 */
export function planChapterVariant(input: {
  rows: ChapterDistribution;
  delta: number;
  seed: number;
  candidates: string[][];
}): PlannedChapterVariant {
  const { rows, delta, seed, candidates } = input;
  const baseline = rows.map((row) => ({ ...row }));
  const summary: DistributionDeltaSummary = {
    v: 1,
    seed,
    requested_delta: delta,
    applied_d: 0,
    status: 'disabled',
    moves: [],
  };
  if (delta <= 0 || rows.length === 0) return { rows: baseline, summary };

  const quantities = rows.map((row) => row.quantity);
  const feasible = (next: readonly number[]) =>
    matchChapterQuestions(withQuantities(rows, next), candidates) !== null;
  const plan = planQuota({
    quantities,
    delta,
    rng: createSeededRng(seed),
    isFeasible: feasible,
  });
  const violations = verifyQuotaPlan({ quantities, delta }, plan);
  if (plan.status === 'applied' && !feasible(plan.quantities))
    violations.push('quota not satisfiable');
  if (violations.length > 0) {
    return {
      rows: baseline,
      summary: {
        ...summary,
        status: 'unchanged',
        reason: 'PLAN_VERIFICATION_FAILED',
      },
    };
  }
  return {
    rows: withQuantities(rows, plan.quantities),
    summary: {
      ...summary,
      applied_d: plan.appliedDelta,
      status: plan.status,
      reason: plan.reason,
      moves: plan.moves.map((move) => ({
        from: rows[move.from].chapter_id,
        to: rows[move.to].chapter_id,
      })),
    },
  };
}

/** BY_CHAPTER counterpart of `checkTypeDeltaFeasibility` (matching-based). */
export function checkChapterDeltaFeasibility(input: {
  rows: ChapterDistribution;
  delta: number;
  candidates: string[][];
}): DeltaFeasibility {
  const { rows, delta, candidates } = input;
  return estimateDeltaFeasibility({
    total: rows.reduce((sum, row) => sum + row.quantity, 0),
    delta,
    baselineFeasible: matchChapterQuestions(rows, candidates) !== null,
    canVary: (d, seed) =>
      planChapterVariant({ rows, delta: d, seed, candidates }).summary
        .status === 'applied',
    noVariationMessage:
      'No chapter can give up a question without breaking another quota; every variant will use the configured distribution.',
  });
}
