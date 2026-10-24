import { ConfigService } from '@nestjs/config';

/** Reads a positive JWT lifetime in seconds, matching cookie and token expiry. */
export function sessionDuration(
  config: ConfigService,
  key: string,
  fallback: string,
): number {
  const value = config.get<string | number>(key) ?? fallback;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
    return value;
  const match = /^(\d+)(s|m|h|d)$/.exec(String(value));
  if (!match)
    throw new Error(`${key} must be a positive duration with s/m/h/d suffix`);
  const units: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const seconds = Number(match[1]) * units[match[2]];
  if (!Number.isSafeInteger(seconds) || seconds <= 0)
    throw new Error(`${key} must be positive`);
  return seconds;
}
