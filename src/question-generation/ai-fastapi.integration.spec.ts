import { randomUUID } from 'node:crypto';
import { RagClient } from '../learning-documents/rag-client.service';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AiQuestionClient } from './ai-question-client.service';
import { readContractFixture } from './fixtures/contract-fixture';
import { DocumentClient } from '../learning-documents/document-client.service';
import { ConfigService } from '@nestjs/config';

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

  it.each(['PDF', 'PPTX'] as const)(
    'extracts actual %s through production DocumentClient and FastAPI parser',
    async (sourceType) => {
      if (!python) throw new Error('Python is required');
      const { stdout: bytes } = await promisify(execFile)(
        python,
        [
          '-c',
          `import sys; from tests.test_documents import pdf_bytes, pptx_bytes; sys.stdout.buffer.write(${sourceType === 'PDF' ? 'pdf_bytes' : 'pptx_bytes'}())`,
        ],
        {
          cwd: resolve(process.cwd(), '../testhub-ai-service'),
          env: { ...process.env, PYTHONUTF8: '1' },
          encoding: 'buffer',
          windowsHide: true,
          timeout: 10000,
        },
      );
      const client = new DocumentClient(
        new ConfigService({
          AI_QUESTION_GENERATION_ENABLED: 'true',
          AI_SERVICE_BASE_URL: new URL(generateUrl).origin,
          AI_SERVICE_INTERNAL_TOKEN: 'contract-only-internal-token-123456789',
          DOCUMENT_SERVICE_TIMEOUT_MS: '15000',
        }),
      );
      const result = await client.extract(
        bytes,
        sourceType,
        sourceType === 'PPTX',
      );
      expect(result.status).toBe('EXTRACTED');
      expect(result.unit_count).toBe(1);
      expect(result.spans[0].kind).toBe(
        sourceType === 'PDF' ? 'PAGE' : 'SLIDE',
      );
      if (sourceType === 'PPTX')
        expect(result.spans.some((span) => span.kind === 'NOTES')).toBe(true);
    },
    20000,
  );
  it('indexes, retrieves and revokes through real FastAPI RAG routes (synthetic vectors/storage)', async () => {
    const client = new RagClient(
      new ConfigService({
        AI_RAG_ENABLED: 'true',
        AI_QUESTION_GENERATION_ENABLED: 'true',
        AI_SERVICE_BASE_URL: new URL(generateUrl).origin,
        AI_SERVICE_INTERNAL_TOKEN: 'contract-only-internal-token-123456789',
      }),
    );
    const profile = await client.profile();
    const command = {
      index_id: randomUUID(),
      profile_id: profile.profile_id,
      scope: {
        owner_id: randomUUID(),
        topic_id: randomUUID(),
        chapter_id: randomUUID(),
        document_id: randomUUID(),
        version_id: randomUUID(),
      },
    };
    const extraction = {
      contract_version: 'document-extraction.v1' as const,
      source_type: 'PDF' as const,
      source_sha256: 'a'.repeat(64),
      parser_version: 'fixture/v1',
      include_notes: false,
      status: 'EXTRACTED' as const,
      unit_count: 1,
      spans: [
        {
          kind: 'PAGE' as const,
          position: 1,
          text: 'A stack uses the Last In First Out (LIFO) principle.',
        },
      ],
      warnings: [],
    };
    expect((await client.prepare(command, extraction)).completed_chunks).toBe(
      0,
    );
    expect((await client.step(command)).status).toBe('READY');
    expect((await client.step(command)).completed_chunks).toBe(1);
    const query = {
      owner_id: command.scope.owner_id,
      profile_id: profile.profile_id,
      index_ids: [command.index_id],
      query: 'LIFO',
      top_k: 6,
    };
    const result = await client.retrieve(query);
    expect(result.quality_status).toBe('UNASSESSED');
    expect(result.chunks[0].text).toBe(
      'A stack uses the Last In First Out (LIFO) principle.',
    );
    await expect(
      client.retrieve({ ...query, owner_id: randomUUID() }),
    ).rejects.toMatchObject({ code: 'RAG_SCOPE_UNAVAILABLE' });
    const generated = await client.generate({
      ...query,
      question_configs: [
        {
          question_type: 'SINGLE_CHOICE',
          question_format: 'KNOWLEDGE',
          count: 1,
        },
      ],
    });
    expect(generated.questions[0].citations[0].chunk.version_id).toBe(
      command.scope.version_id,
    );
    expect(generated.questions[0].citations[0].quote).toContain('LIFO');
    expect(generated.contract_version).toBe('rag-generation.v1');
    await client.revoke(command);
    await expect(client.retrieve(query)).rejects.toMatchObject({
      code: 'RAG_SCOPE_UNAVAILABLE',
    });
  }, 20000);
});
