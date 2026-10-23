import { ConfigService } from '@nestjs/config';
import { DocumentClient } from './document-client.service';

const baseUrl = process.env.TESTHUB_DOCUMENT_SIM_URL;
const integration = baseUrl ? describe : describe.skip;

// Opt-in: real production fetch/config/decoder against the repository's Postman
// simulation. No DB, S3, Gemini or real documents/credentials are involved.
integration(
  'DocumentClient production transport -> local Postman simulation',
  () => {
    function client(timeout = 2000) {
      if (
        !baseUrl ||
        !['127.0.0.1', 'localhost'].includes(new URL(baseUrl).hostname)
      )
        throw new Error('Use a loopback simulation');
      return new DocumentClient(
        new ConfigService({
          AI_QUESTION_GENERATION_ENABLED: 'true',
          AI_SERVICE_BASE_URL: baseUrl,
          AI_SERVICE_INTERNAL_TOKEN: 'simulation-token-not-secret-'.repeat(2),
          DOCUMENT_SERVICE_TIMEOUT_MS: String(timeout),
        }),
      );
    }
    it('validates the binary request and source manifest over real HTTP', async () => {
      const result = await client().extract(
        Buffer.from('%PDF-fixture'),
        'PDF',
        false,
      );
      expect(result.spans[0]).toEqual({
        kind: 'PAGE',
        position: 1,
        text: 'Stack uses LIFO.',
      });
    });
    it('maps capacity, proxy HTML and malformed JSON without leaking their bodies', async () => {
      for (const [marker, code, retryable] of [
        ['busy', 'DOCUMENT_SERVICE_BUSY', true],
        ['html', 'DOCUMENT_SERVICE_FAILED', false],
        ['invalid', 'DOCUMENT_OUTPUT_INVALID', false],
      ] as const)
        await expect(
          client().extract(Buffer.from(`%PDF-${marker}`), 'PDF', false),
        ).rejects.toMatchObject({ code, retryable });
    });
    it('enforces an overall HTTP deadline', async () => {
      await expect(
        client(150).extract(Buffer.from('%PDF-slow'), 'PDF', false),
      ).rejects.toMatchObject({ code: 'DOCUMENT_TIMEOUT', retryable: true });
    });
  },
);
