import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AiQuestionClient } from './ai-question-client.service';
import { readContractFixture } from './fixtures/contract-fixture';

// Separate opt-in gate: standalone backend CI does not require Python/sibling repo.
const python = process.env.TESTHUB_AI_PYTHON;
const integration = python ? describe : describe.skip;

integration('NestJS -> FastAPI real HTTP contract (fake LLM)', () => {
  const fixture = readContractFixture();
  let child: ChildProcessWithoutNullStreams | undefined;
  let generateUrl: string;
  let startupError: Error | undefined;

  beforeAll(async () => {
    if (!python) throw new Error('TESTHUB_AI_PYTHON must point to Python 3.12');
    const aiRoot = resolve(process.cwd(), '../testhub-ai-service');
    const pythonFixture: unknown = JSON.parse(
      readFileSync(
        resolve(aiRoot, 'contracts/text-generation.v1.json'),
        'utf8',
      ),
    );
    expect(pythonFixture).toEqual(fixture);
    child = spawn(
      python,
      [
        '-u',
        '-c',
        "import runpy; runpy.run_path('tests/contract_http_server.py', run_name='__main__')",
      ],
      {
        cwd: aiRoot,
        env: { ...process.env, PYTHONUTF8: '1' },
        windowsHide: true,
      },
    );
    child.on('error', (error) => {
      startupError = error;
    });
    child.stderr.on('data', () => undefined);
    let output = '';
    const port = await new Promise<number>((resolvePort, reject) => {
      const timer = setTimeout(
        () => reject(new Error('FastAPI contract host did not start')),
        10_000,
      );
      child?.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child?.once('exit', () => {
        clearTimeout(timer);
        reject(new Error('FastAPI contract host exited before startup'));
      });
      child?.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString('utf8');
        if (!output.includes('\n')) return;
        try {
          const address: unknown = JSON.parse(output.split('\n')[0]);
          if (
            typeof address === 'object' &&
            address !== null &&
            'port' in address &&
            typeof address.port === 'number'
          ) {
            clearTimeout(timer);
            resolvePort(address.port);
          }
        } catch {
          /* wait for the complete readiness line */
        }
      });
    });
    generateUrl = `http://127.0.0.1:${port}/internal/generate`;
    // The socket is bound before uvicorn starts its lifespan.
    const health = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(10_000),
    });
    expect(health.status).toBe(200);
    await health.body?.cancel();
  }, 20_000);

  afterAll(async () => {
    if (!child || child.exitCode !== null || startupError) return;
    const processToStop = child;
    await new Promise<void>((resolveExit) => {
      processToStop.once('exit', () => resolveExit());
      processToStop.kill();
    });
  });

  it('accepts the exact request and real Pydantic-validated response', async () => {
    const client = new AiQuestionClient(
      {
        enabled: true,
        generateUrl,
        token: 'contract-only-internal-token-123456789',
        timeoutMs: 5_000,
      },
      fetch,
    );
    await expect(client.generate(fixture.internal_request)).resolves.toEqual(
      fixture.internal_response,
    );
  });

  it('maps actual FastAPI token rejection to a safe integration error', async () => {
    const client = new AiQuestionClient(
      {
        enabled: true,
        generateUrl,
        token: 'wrong-test-token',
        timeoutMs: 5_000,
      },
      fetch,
    );
    await expect(
      client.generate(fixture.internal_request),
    ).rejects.toMatchObject({ code: 'AI_SERVICE_AUTH_FAILED' });
  });
});
