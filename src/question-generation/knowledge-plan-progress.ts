import { z } from 'zod';

export const PLAN_SOURCE_IDLE_MS = 20 * 60_000;
export const PLAN_SOURCE_TOTAL_MS = 60 * 60_000;

const checkpointSchema = z.object({
  usable: z.boolean(),
  index_id: z.string().nullable(),
  completed_chunks: z.number().int().nonnegative(),
  ready: z.boolean(),
});
export type PlanSourceCheckpoint = z.infer<typeof checkpointSchema>;
export type PlanSourceState = {
  stage: 'EXTRACTING' | 'INDEXING' | 'READY';
  index: {
    id: string;
    profile_id: string;
    status: string;
    completed_chunks: number;
    chunk_count: number;
    error_code: string | null;
  } | null;
};
export type PlanSourceProgress = {
  stage: 'EXTRACTING' | 'INDEXING' | 'OUTLINING';
  completed_chunks: number;
  total_chunks: number;
  percent: number | null;
  index_status: string | null;
  error_code: string | null;
};

/** Compare durable high-water marks, never activity, retries or updated_at. */
export function observePlanSource(previous: unknown, state: PlanSourceState) {
  const parsed = checkpointSchema.safeParse(previous);
  const old = parsed.success ? parsed.data : null;
  const checkpoint: PlanSourceCheckpoint = {
    usable: state.stage !== 'EXTRACTING' || old?.usable === true,
    index_id: state.index?.id ?? old?.index_id ?? null,
    completed_chunks: Math.max(
      state.index?.completed_chunks ?? 0,
      old?.completed_chunks ?? 0,
    ),
    ready: state.index?.status === 'READY' || old?.ready === true,
  };
  const advanced =
    (checkpoint.usable && !old?.usable) ||
    (checkpoint.index_id !== null && !old?.index_id) ||
    checkpoint.completed_chunks > (old?.completed_chunks ?? 0) ||
    (checkpoint.ready && !old?.ready);
  return { checkpoint, advanced };
}

/** A hard cap wins over newly observed progress; legacy rows keep their age. */
export function planSourceTimeout(
  plan: {
    created_at: Date;
    preparation_started_at?: Date;
    source_progress_at?: Date;
  },
  now = Date.now(),
): 'PLAN_SOURCE_TIMEOUT' | 'PLAN_SOURCE_TOTAL_TIMEOUT' | null {
  const started = plan.preparation_started_at ?? plan.created_at;
  if (now - started.getTime() >= PLAN_SOURCE_TOTAL_MS)
    return 'PLAN_SOURCE_TOTAL_TIMEOUT';
  if (
    now - (plan.source_progress_at ?? started).getTime() >=
    PLAN_SOURCE_IDLE_MS
  )
    return 'PLAN_SOURCE_TIMEOUT';
  return null;
}

/** Public read-only counters describe the current authorized index, not its checkpoint. */
export function summarizePlanSource(
  state: PlanSourceState,
): PlanSourceProgress {
  const completed = Math.max(0, state.index?.completed_chunks ?? 0);
  const total = Math.max(0, state.index?.chunk_count ?? 0);
  return {
    stage: state.stage === 'READY' ? 'OUTLINING' : state.stage,
    completed_chunks: completed,
    total_chunks: total,
    percent:
      total > 0 ? Math.min(100, Math.floor((completed / total) * 100)) : null,
    index_status: state.index?.status ?? null,
    error_code: state.index?.error_code ?? null,
  };
}
