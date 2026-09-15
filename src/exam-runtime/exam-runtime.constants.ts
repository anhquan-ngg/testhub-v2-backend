import { ExamViolationType } from '@prisma/client';

export const EXAM_RUNTIME_QUEUE = 'exam-runtime';

export const EXAM_ENTRY_WINDOW_MINUTES = 15;
// Detection ceiling = TIMEOUT + CLEANUP = 150s, tolerating 5 consecutive
// lost pings at the 20s client interval below before a student flips OFFLINE.
export const EXAM_SESSION_TIMEOUT_MS = 2 * 60 * 1000;
export const EXAM_SESSION_CLEANUP_MS = 30 * 1000;
// Display-only grey zone: a stale ping under this age still reads ONLINE,
// between this and EXAM_SESSION_TIMEOUT_MS reads UNSTABLE (never a violation).
export const EXAM_SESSION_WARN_MS = 45 * 1000;
export const EXAM_STARTING_SOON_MINUTES = 15;

/** Bounds for a lecturer's one-off "extend time" grant to a student whose
 * connection dropped and reconnected mid-exam. */
export const EXTEND_TIME_MIN_MINUTES = 1;
export const EXTEND_TIME_MAX_MINUTES = 120;

// Client-side ping cadence. Jitter avoids every student (who all clicked
// "start" at the same second) pinging in lockstep forever.
export const EXAM_PING_INTERVAL_MS = 20 * 1000;
export const EXAM_PING_JITTER_MS = 3 * 1000;

export const EXAM_RUNTIME_JOBS = {
  STARTING_SOON: 'exam-starting-soon',
  OPEN: 'exam-open',
  CLOSE: 'exam-close',
  AUTO_SUBMIT_SUBMISSION: 'auto-submit-submission',
  GRADE_SUBMISSION: 'grade-submission',
  CLEANUP_SESSIONS: 'cleanup-exam-sessions',
} as const;

export const EXAM_RUNTIME_EVENTS = {
  STATUS: 'EXAM_STATUS',
  OPEN: 'EXAM_OPEN',
  CLOSED: 'EXAM_CLOSED',
  ACTIVE_COUNT: 'EXAM_ACTIVE_COUNT',
  MONITOR_DELTA: 'EXAM_MONITOR_DELTA',
  MONITOR_VIOLATION: 'EXAM_MONITOR_VIOLATION',
  MONITOR_DEGRADED: 'EXAM_MONITOR_DEGRADED',
} as const;

/** Events a student's own SSE subscription may see. Deliberately excludes
 * every MONITOR_* type — those carry classmates' progress/violations. */
export const STUDENT_EVENT_TYPES: readonly string[] = [
  EXAM_RUNTIME_EVENTS.STATUS,
  EXAM_RUNTIME_EVENTS.OPEN,
  EXAM_RUNTIME_EVENTS.CLOSED,
  EXAM_RUNTIME_EVENTS.ACTIVE_COUNT,
];

/** Events the lecturer/admin monitor subscription may see. */
export const MONITOR_EVENT_TYPES: readonly string[] = [
  EXAM_RUNTIME_EVENTS.OPEN,
  EXAM_RUNTIME_EVENTS.CLOSED,
  EXAM_RUNTIME_EVENTS.ACTIVE_COUNT,
  EXAM_RUNTIME_EVENTS.MONITOR_DELTA,
  EXAM_RUNTIME_EVENTS.MONITOR_VIOLATION,
  EXAM_RUNTIME_EVENTS.MONITOR_DEGRADED,
];

export const MONITOR_TICK_MS = 3 * 1000;

/** Only these types may ever be self-reported by a student's browser.
 * CONNECTION_LOST is server-derived only (the one tamper-resistant signal). */
export const CLIENT_REPORTABLE_VIOLATION_TYPES: readonly ExamViolationType[] = [
  ExamViolationType.TAB_HIDDEN,
  ExamViolationType.WINDOW_BLUR,
  ExamViolationType.FULLSCREEN_EXIT,
  ExamViolationType.COPY,
  ExamViolationType.PASTE,
];

/** Per-type debounce window: one alt-tab fires both `blur` and
 * `visibilitychange`, so without this a single glance away logs 2+ rows. */
export const VIOLATION_DEBOUNCE_MS: Record<ExamViolationType, number> = {
  TAB_HIDDEN: 10_000,
  WINDOW_BLUR: 10_000,
  FULLSCREEN_EXIT: 5_000,
  COPY: 30_000,
  PASTE: 30_000,
  CONNECTION_LOST: 0,
};

/** Hard per-submission cap so a misbehaving/hostile client can't grow the
 * table without bound; past this the count itself becomes the signal. */
export const VIOLATION_MAX_PER_SUBMISSION = 200;
