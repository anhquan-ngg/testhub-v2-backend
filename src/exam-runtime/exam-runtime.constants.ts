export const EXAM_RUNTIME_QUEUE = 'exam-runtime';

export const EXAM_ENTRY_WINDOW_MINUTES = 15;
export const EXAM_SESSION_TIMEOUT_MS = 2 * 60 * 1000;
export const EXAM_SESSION_CLEANUP_MS = 60 * 1000;
export const EXAM_STARTING_SOON_MINUTES = 15;

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
} as const;
