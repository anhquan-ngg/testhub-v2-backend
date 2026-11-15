import { QUESTION_IMPORT_OPTION_KEYS } from '../question-import.constants';

/** Preserve invalid answer references as blocking review errors, never silently drop them. */
export function parseImportOptions(read: (field: string) => string) {
  const correctKeys = new Set(
    read('correct_keys')
      .toUpperCase()
      .split(/[\s,;]+/)
      .filter(Boolean),
  );
  const options = QUESTION_IMPORT_OPTION_KEYS.map((key) => ({
    key,
    text: read(`option_${key.toLowerCase()}`),
    isCorrect: correctKeys.has(key),
  })).filter((option) => option.text.length > 0);
  const invalidKeys = [...correctKeys].filter(
    (key) => !options.some((option) => option.key === key),
  );
  return {
    options,
    parserErrors: invalidKeys.length
      ? [
          `correct_keys references unknown or empty options: ${invalidKeys.join(', ')}`,
        ]
      : [],
  };
}
