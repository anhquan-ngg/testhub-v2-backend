export const QUESTION_IMPORT_QUEUE = 'question-imports';
export const QUESTION_IMPORT_PARSE_JOB = 'parse-question-import';
export const QUESTION_IMPORT_CLEANUP_JOB = 'cleanup-expired-question-imports';
export const QUESTION_IMPORT_CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
export const QUESTION_IMPORT_MAX_FILE_SIZE = 20 * 1024 * 1024;
export const QUESTION_IMPORT_TTL_HOURS = 24;

export const QUESTION_IMPORT_MIME_TYPES = {
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

export const QUESTION_IMPORT_OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
