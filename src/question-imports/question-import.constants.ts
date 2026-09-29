export const QUESTION_IMPORT_QUEUE = 'question-imports';
export const QUESTION_IMPORT_PARSE_JOB = 'parse-question-import';
export const QUESTION_IMPORT_CLEANUP_JOB = 'cleanup-expired-question-imports';
export const QUESTION_IMPORT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
export const QUESTION_IMPORT_MAX_FILE_SIZE = 20 * 1024 * 1024;
export const QUESTION_IMPORT_TTL_HOURS = 24;
/**
 * A COMMITTING import untouched for this long is treated as interrupted (the
 * worker died mid-commit). Must comfortably exceed the 120 s transaction
 * timeout plus the time spent copying images to permanent storage.
 */
export const QUESTION_IMPORT_COMMIT_STALE_MS = 15 * 60 * 1000;
/** Zip-bomb guards for uploaded .docx/.xlsx packages (central directory). */
export const QUESTION_IMPORT_MAX_ZIP_ENTRIES = 10_000;
export const QUESTION_IMPORT_MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024;

export const QUESTION_IMPORT_MIME_TYPES = {
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

export const QUESTION_IMPORT_OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
