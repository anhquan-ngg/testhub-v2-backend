import { Logger } from '@nestjs/common';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse, Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { AiQuestionClient } from './ai-question-client.service';
import { AI_MAX_RESPONSE_BYTES } from './ai-service.config';
import { readContractFixture } from './fixtures/contract-fixture';

const fixture = readContractFixture();
const token = 'contract-only-internal-token-123456789';

describe('AiQuestionClient real HTTP boundary', () => {
  let handler: (req: IncomingMessage, res: ServerResponse) => void;
  let server: Server;
  let generateUrl: string;
  let requests: number;
  let warn: jest.SpyInstance;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  beforeEach(async () => {
    // New origin per test avoids reusing deliberately aborted transport sockets.
    server = createServer((req, res) => {
      res.setHeader('Connection', 'close');
      handler(req, res);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    generateUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/internal/generate`;
    requests = 0;
    warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    handler = (_req, res) => {
      requests += 1;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(fixture.internal_response));
    };
  });

  afterEach(async () => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
    warn.mockRestore();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  function client(timeoutMs = 2_000) {
    return new AiQuestionClient(
      { enabled: true, generateUrl, token, timeoutMs },
      fetch,
    );
  }

  it('sends only the internal contract and token over HTTP', async () => {
    let received: unknown;
    let headers: IncomingMessage['headers'] = {};
    handler = (req, res) => {
      requests += 1;
      headers = req.headers;
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        body += chunk;
      });
      req.on('end', () => {
        received = JSON.parse(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(fixture.internal_response));
      });
    };
    await expect(client().generate(fixture.internal_request)).resolves.toEqual(
      fixture.internal_response,
    );
    expect(received).toEqual(fixture.internal_request);
    expect(headers['x-internal-token']).toBe(token);
    expect(headers.cookie).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    expect(requests).toBe(1);
  });

  it.each([
    [401, 502, 'AI_SERVICE_AUTH_FAILED'],
    [403, 502, 'AI_SERVICE_AUTH_FAILED'],
    [422, 502, 'AI_SERVICE_CONTRACT_MISMATCH'],
    [429, 503, 'AI_SERVICE_UNAVAILABLE'],
    [502, 502, 'AI_PROVIDER_FAILED'],
    [503, 503, 'AI_SERVICE_UNAVAILABLE'],
    [504, 504, 'AI_SERVICE_TIMEOUT'],
    [500, 502, 'AI_SERVICE_FAILED'],
  ])(
    'maps upstream %s to %s without forwarding diagnostics or retrying',
    async (upstreamStatus, status, code) => {
      handler = (_req, res) => {
        requests += 1;
        res.writeHead(upstreamStatus, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: `private-prompt ${token}` }));
      };
      let caught: unknown;
      try {
        await client().generate(fixture.internal_request);
      } catch (error) {
        caught = error;
      }
      expect(caught).toMatchObject({ code });
      expect(
        (caught as { getResponse(): unknown }).getResponse(),
      ).toMatchObject({
        statusCode: status,
        details: { code },
      });
      expect(JSON.stringify(caught)).not.toContain(token);
      expect(JSON.stringify(warn.mock.calls)).not.toContain('private-prompt');
      expect(JSON.stringify(warn.mock.calls)).not.toContain(token);
      expect(requests).toBe(1);
    },
  );

  it.each([
    '{broken-json',
    '{}',
    JSON.stringify({ questions: [] }),
    JSON.stringify({
      questions: [
        {
          ...fixture.internal_response.questions[0],
          question_format: 'ADVANCED',
        },
      ],
    }),
    JSON.stringify({
      questions: [{ ...fixture.internal_response.questions[0], options: [] }],
    }),
    JSON.stringify({ ...fixture.internal_response, sensitive_extra: 'secret' }),
  ])('rejects invalid/mismatched JSON response #%#', async (body) => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    };
    await expect(
      client().generate(fixture.internal_request),
    ).rejects.toMatchObject({ code: 'AI_OUTPUT_INVALID' });
  });

  it('checks the response question count against the request', async () => {
    const [config] = fixture.internal_request.question_configs;
    await expect(
      client().generate({
        ...fixture.internal_request,
        question_configs: [{ ...config, count: 2 }],
      }),
    ).rejects.toMatchObject({ code: 'AI_OUTPUT_INVALID' });
  });

  it('checks every question type and level against its requested position', async () => {
    const [config] = fixture.internal_request.question_configs;
    for (const change of [
      { question_type: 'MULTIPLE_CHOICE' as const },
      { question_format: 'APPLYING' as const },
    ]) {
      await expect(
        client().generate({
          ...fixture.internal_request,
          question_configs: [{ ...config, ...change }],
        }),
      ).rejects.toMatchObject({ code: 'AI_OUTPUT_INVALID' });
    }
  });

  it('bounds time waiting for response headers', async () => {
    handler = () => {
      requests += 1;
    };
    await expect(
      client(50).generate(fixture.internal_request),
    ).rejects.toMatchObject({ code: 'AI_SERVICE_TIMEOUT' });
    expect(requests).toBe(1);
  });

  it('bounds the full body read even after headers have arrived', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write('{"questions":');
      timers.add(setTimeout(() => res.end('[]}'), 5_000));
    };
    await expect(
      client(50).generate(fixture.internal_request),
    ).rejects.toMatchObject({ code: 'AI_SERVICE_TIMEOUT' });
  });

  it.each([true, false])(
    'limits response bytes with declared size = %s',
    async (declared) => {
      handler = (_req, res) => {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          ...(declared
            ? { 'Content-Length': String(AI_MAX_RESPONSE_BYTES + 1) }
            : {}),
        });
        res.end('x'.repeat(AI_MAX_RESPONSE_BYTES + 1));
      };
      await expect(
        client().generate(fixture.internal_request),
      ).rejects.toMatchObject({ code: 'AI_OUTPUT_INVALID' });
    },
  );

  it('rejects non-JSON content and malformed UTF-8', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html>proxy error</html>');
    };
    await expect(
      client().generate(fixture.internal_request),
    ).rejects.toMatchObject({ code: 'AI_OUTPUT_INVALID' });
    handler = (_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(Buffer.from([0xc3, 0x28]));
    };
    await expect(
      client().generate(fixture.internal_request),
    ).rejects.toMatchObject({ code: 'AI_OUTPUT_INVALID' });
  });

  it('refuses redirects so the internal token cannot be forwarded', async () => {
    handler = (_req, res) => {
      requests += 1;
      res.writeHead(307, { Location: generateUrl });
      res.end();
    };
    await expect(
      client().generate(fixture.internal_request),
    ).rejects.toMatchObject({ code: 'AI_SERVICE_UNAVAILABLE' });
    expect(requests).toBe(1);
  });

  it('maps connection loss without leaking a raw cause', async () => {
    handler = (req) => {
      requests += 1;
      req.socket.destroy();
    };
    await expect(
      client().generate(fixture.internal_request),
    ).rejects.toMatchObject({ code: 'AI_SERVICE_UNAVAILABLE' });
    expect(requests).toBe(1);
  });

  it('rejects invalid internal requests and disabled integration before HTTP', async () => {
    await expect(
      client().generate({ ...fixture.internal_request, text: '' }),
    ).rejects.toMatchObject({ code: 'AI_REQUEST_INVALID' });
    await expect(
      new AiQuestionClient({ enabled: false }, fetch).generate(
        fixture.internal_request,
      ),
    ).rejects.toMatchObject({ code: 'AI_GENERATION_DISABLED' });
    expect(requests).toBe(0);
  });
});
