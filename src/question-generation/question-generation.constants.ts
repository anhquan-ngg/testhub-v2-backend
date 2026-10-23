export const AI_GENERATION_QUEUE = 'ai-question-generation';
export const AI_GENERATION_JOB = 'generate-text-questions';
export const AI_RECONCILE_INTERVAL_MS = 5_000;
export const AI_RECONCILE_PAGE_SIZE = 50;
export const AI_DISPATCH_RECHECK_MS = 60_000;
// Exceeds the maximum supported HTTP deadline (185s), including persistence.
export const AI_EXECUTION_LEASE_MS = 5 * 60_000;
export const AI_PERSISTENCE_ATTEMPTS = 3;
export const AI_WORKER_CONCURRENCY = 2;
