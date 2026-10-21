import { ConfigService } from '@nestjs/config';
import { readAiServiceOptions } from './ai-service.config';

const token = 'contract-only-internal-token-123456789';
const enabled = {
  AI_QUESTION_GENERATION_ENABLED: 'true',
  AI_SERVICE_BASE_URL: 'http://127.0.0.1:8000',
  AI_SERVICE_INTERNAL_TOKEN: token,
};

describe('AI service configuration', () => {
  it('defaults to disabled without requiring credentials', () => {
    expect(readAiServiceOptions(new ConfigService({}))).toEqual({
      enabled: false,
    });
  });

  it('snapshots the private URL, token and 35-second deadline', () => {
    const config = new ConfigService(enabled);
    const result = readAiServiceOptions(config);
    config.set('AI_SERVICE_BASE_URL', 'https://changed.invalid');
    expect(result).toEqual({
      enabled: true,
      generateUrl: 'http://127.0.0.1:8000/internal/generate',
      token,
      timeoutMs: 35_000,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ['AI_QUESTION_GENERATION_ENABLED', 'yes'],
    ['AI_SERVICE_BASE_URL', 'not-a-url'],
    ['AI_SERVICE_BASE_URL', 'file:///tmp/example'],
    ['AI_SERVICE_BASE_URL', 'http://user:secret@localhost'],
    ['AI_SERVICE_BASE_URL', 'http://localhost/redirect?token=secret'],
    ['AI_SERVICE_BASE_URL', 'http://localhost/#secret'],
    ['AI_SERVICE_INTERNAL_TOKEN', 'short'],
    ['AI_SERVICE_INTERNAL_TOKEN', 'é'.repeat(32)],
    ['AI_SERVICE_INTERNAL_TOKEN', `${token}\r\nInjected: true`],
    ['AI_SERVICE_TIMEOUT_MS', '0'],
    ['AI_SERVICE_TIMEOUT_MS', 'Infinity'],
    ['AI_SERVICE_TIMEOUT_MS', '35000.5'],
    ['AI_SERVICE_TIMEOUT_MS', '185001'],
  ])('rejects invalid %s without disclosing its value', (key, value) => {
    let error: unknown;
    try {
      readAiServiceOptions(new ConfigService({ ...enabled, [key]: value }));
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(key);
    if (key === 'AI_SERVICE_INTERNAL_TOKEN' || key === 'AI_SERVICE_BASE_URL') {
      expect((error as Error).message).not.toContain(value);
    }
  });
});
