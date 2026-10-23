import { ConfigService } from '@nestjs/config';

export const AI_SERVICE_OPTIONS = Symbol('AI_SERVICE_OPTIONS');
export const AI_HTTP_FETCH = Symbol('AI_HTTP_FETCH');
export const AI_MAX_RESPONSE_BYTES = 1_048_576;

export type AiServiceOptions =
  | Readonly<{ enabled: false }>
  | Readonly<{
      enabled: true;
      generateUrl: string;
      token: string;
      timeoutMs: number;
    }>;

/** Read once at startup; configuration failures name variables, never values. */
export function readAiServiceOptions(config: ConfigService): AiServiceOptions {
  const flag = config.get<string>('AI_QUESTION_GENERATION_ENABLED') ?? 'false';
  if (flag !== 'true' && flag !== 'false') {
    throw new Error('AI_QUESTION_GENERATION_ENABLED must be true or false');
  }
  if (flag === 'false') return Object.freeze({ enabled: false });

  let base: URL;
  try {
    base = new URL(config.get<string>('AI_SERVICE_BASE_URL') ?? '');
  } catch {
    throw new Error('AI_SERVICE_BASE_URL must be an HTTP(S) origin');
  }
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash ||
    base.pathname !== '/'
  ) {
    throw new Error('AI_SERVICE_BASE_URL must be an HTTP(S) origin');
  }
  const token = config.get<string>('AI_SERVICE_INTERNAL_TOKEN') ?? '';
  // HTTP headers are Latin-1. Require portable, visible ASCII for this client.
  if (!/^[\x21-\x7e]{32,256}$/.test(token)) {
    throw new Error(
      'AI_SERVICE_INTERNAL_TOKEN must contain 32-256 visible ASCII characters',
    );
  }
  const rawTimeout = config.get<string>('AI_SERVICE_TIMEOUT_MS') ?? '35000';
  const timeoutMs = Number(rawTimeout);
  if (!/^\d+$/.test(rawTimeout) || timeoutMs < 1 || timeoutMs > 185_000) {
    throw new Error('AI_SERVICE_TIMEOUT_MS must be between 1 and 185000');
  }
  return Object.freeze({
    enabled: true,
    generateUrl: new URL('/internal/generate', base).href,
    token,
    timeoutMs,
  });
}
