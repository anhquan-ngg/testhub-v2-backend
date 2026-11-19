export const AI_GENERATION_QUEUE = 'ai-question-generation';
export const AI_GENERATION_JOB = 'generate-text-questions';
export const AI_RECONCILE_INTERVAL_MS = 5_000;
export const AI_RECONCILE_PAGE_SIZE = 50;
export const AI_DISPATCH_RECHECK_MS = 60_000;
// Exceeds the maximum supported HTTP deadline (185s), including persistence.
export const AI_EXECUTION_LEASE_MS = 5 * 60_000;
export const AI_PERSISTENCE_ATTEMPTS = 3;
export const AI_WORKER_CONCURRENCY = 2;

function boundedInteger(name: string, fallback: number, max: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 && value <= max
    ? value
    : fallback;
}

/** Transient (retryable=true) AI failures are re-queued at most this many times. 0 disables. */
export const AI_MAX_GENERATION_RETRIES = boundedInteger(
  'AI_GENERATION_MAX_RETRIES',
  3,
  10,
);
export const AI_RETRY_BASE_DELAY_MS = 15_000;
export const AI_RETRY_MAX_DELAY_MS = 2 * 60_000;

/** Exponential backoff with +-20% jitter; `retryCount` is the number of retries already used. */
export function generationRetryDelayMs(
  retryCount: number,
  random: () => number = Math.random,
): number {
  const base = Math.min(
    AI_RETRY_MAX_DELAY_MS,
    AI_RETRY_BASE_DELAY_MS * 2 ** retryCount,
  );
  return Math.round(base * (0.8 + random() * 0.4));
}
