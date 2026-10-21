import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Prisma, PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { Queue, Worker } from 'bullmq';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import type { Server as HttpServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionGenerationModule } from './question-generation.module';
import { AI_SERVICE_OPTIONS } from './ai-service.config';
import type { AiServiceOptions } from './ai-service.config';
import { GenerationBatchRepository } from './generation-batch.repository';
import { GenerationBatchService } from './generation-batch.service';
import { GenerationExecutionService } from './generation-execution.service';
import { GenerationDispatcher } from './generation-dispatcher.service';
import { GenerationProcessor } from './generation.processor';
import { QuestionGenerationService } from './question-generation.service';
import { readContractFixture } from './fixtures/contract-fixture';
import { AI_GENERATION_QUEUE } from './question-generation.constants';
import type { GenerationActor } from './question-generation.service';
import { QuestionGenerationWorkerModule } from './question-generation.worker.module';
import { ConfigService } from '@nestjs/config';

const databaseUrl = process.env.TESTHUB_AI_DATABASE_URL;
const redisUrl = process.env.TESTHUB_AI_REDIS_URL;
const integration = databaseUrl && redisUrl ? describe : describe.skip;

// Opt-in only. Each run owns a new PostgreSQL schema and a new Redis key prefix.
// Never truncate a shared table or flush Redis. No Gemini call or real user token.
integration(
  'AI batches: HTTP -> PostgreSQL outbox -> BullMQ -> HTTP AI -> drafts',
  () => {
    const fixture = readContractFixture();
    const schema = `ai_test_${randomUUID().replaceAll('-', '')}`;
    const actor = { id: randomUUID(), role: UserRole.LECTURER };
    const foreign = { id: randomUUID(), role: UserRole.LECTURER };
    let pool: Pool;
    let prisma: PrismaClient;
    let app: INestApplication;
    let http: HttpServer;
    let server: Server;
    let queue: Queue;
    let worker: Worker;
    let execution: GenerationExecutionService;
    let repository: GenerationBatchRepository;
    let batches: GenerationBatchService;
    let dispatcher: GenerationDispatcher;
    let upstreamStatus = 200;
    let upstreamInvalid = false;
    let calls = 0;
    let timeoutMs = 2_000;
    let upstreamDelay = 0;
    let options: Extract<AiServiceOptions, { enabled: true }>;
    const command = {
      ...fixture.command,
      topic_id: randomUUID(),
      chapter_id: randomUUID(),
    };

    beforeAll(async () => {
      if (!databaseUrl || !redisUrl)
        throw new Error('Both integration URLs are required');
      for (const value of [databaseUrl, redisUrl]) {
        if (
          !['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname)
        ) {
          throw new Error('Integration services must be on loopback');
        }
      }
      if (!new URL(databaseUrl).pathname.endsWith('_test'))
        throw new Error('Use a dedicated database ending in _test');
      pool = new Pool({ connectionString: databaseUrl });
      const sql = execFileSync(
        process.execPath,
        [
          'node_modules/prisma/build/index.js',
          'migrate',
          'diff',
          '--from-empty',
          '--to-schema',
          'prisma/schema.prisma',
          '--script',
        ],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: { ...process.env, DATABASE_URL: databaseUrl },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      const connection = await pool.connect();
      try {
        // schema is an internally generated UUID identifier, never user input.
        await connection.query(`CREATE SCHEMA "${schema}"`);
        await connection.query(`SET search_path TO "${schema}"`);
        await connection.query(
          sql.replace('CREATE SCHEMA IF NOT EXISTS "public";', ''),
        );
      } finally {
        connection.release();
      }
      prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
      await prisma.$connect();
      await prisma.user.createMany({
        data: [actor, foreign].map((user) => ({
          ...user,
          full_name: 'AI Integration',
          email: `${user.id}@example.invalid`,
        })),
      });
      await prisma.topic.create({
        data: {
          id: command.topic_id,
          created_by: actor.id,
          name: fixture.internal_request.topic ?? 'Topic',
        },
      });
      await prisma.chapter.create({
        data: {
          id: command.chapter_id,
          topic_id: command.topic_id,
          name: 'Chapter',
          order: 1,
        },
      });
      server = createServer((req, res) => {
        calls++;
        expect(req.url).toBe('/internal/generate');
        expect(req.headers['x-internal-token']).toBe(
          'integration-only-token-123456789012345',
        );
        req.resume();
        req.on('end', () => {
          const respond = () => {
            res.writeHead(upstreamStatus, {
              'Content-Type': 'application/json',
              Connection: 'close',
            });
            res.end(
              JSON.stringify(
                upstreamInvalid ? { questions: [] } : fixture.internal_response,
              ),
            );
          };
          if (upstreamDelay) setTimeout(respond, upstreamDelay);
          else respond();
        });
      });
      await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve),
      );
      options = {
        enabled: true,
        generateUrl: `http://127.0.0.1:${(server.address() as AddressInfo).port}/internal/generate`,
        token: 'integration-only-token-123456789012345',
        get timeoutMs() {
          return timeoutMs;
        },
      };
      const module = await Test.createTestingModule({
        imports: [QuestionGenerationModule],
      })
        .overrideProvider(PrismaService)
        .useValue(prisma)
        .overrideProvider(AI_SERVICE_OPTIONS)
        .useValue(options)
        .overrideGuard(JwtGuard)
        .useValue({
          canActivate(context: ExecutionContext) {
            const req = context.switchToHttp().getRequest<{
              headers: Record<string, string>;
              user: GenerationActor;
            }>();
            req.user =
              req.headers['x-test-actor'] === 'foreign'
                ? foreign
                : req.headers['x-test-actor'] === 'student'
                  ? { ...actor, role: UserRole.STUDENT }
                  : actor;
            return true;
          },
        })
        .compile();
      app = module.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          transform: true,
          whitelist: true,
          transformOptions: { enableImplicitConversion: true },
        }),
      );
      await app.init();
      http = app.getHttpServer() as HttpServer;
      repository = module.get(GenerationBatchRepository);
      batches = module.get(GenerationBatchService);
      execution = new GenerationExecutionService(
        repository,
        module.get(QuestionGenerationService),
      );
      const processor = new GenerationProcessor(execution, options);
      const parsedRedis = new URL(redisUrl);
      const connectionOptions = {
        host: parsedRedis.hostname,
        port: Number(parsedRedis.port || 6379),
        maxRetriesPerRequest: null,
      };
      const prefix = schema;
      queue = new Queue(AI_GENERATION_QUEUE, {
        connection: connectionOptions,
        prefix,
      });
      worker = new Worker(
        AI_GENERATION_QUEUE,
        (job) => processor.process(job),
        {
          connection: connectionOptions,
          prefix,
          concurrency: 2,
        },
      );
      await worker.waitUntilReady();
      dispatcher = new GenerationDispatcher(
        repository,
        execution,
        queue,
        options,
      );
    }, 30_000);

    afterAll(async () => {
      await dispatcher?.onModuleDestroy();
      await worker?.close();
      if (queue) {
        await queue.obliterate({ force: true });
        await queue.close();
      }
      await app?.close();
      if (server) {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
      await prisma?.$disconnect();
      if (pool) {
        await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await pool.end();
      }
    });

    beforeEach(() => {
      calls = 0;
      upstreamStatus = 200;
      upstreamInvalid = false;
      upstreamDelay = 0;
      timeoutMs = 2_000;
    });

    async function create() {
      return batches.create(actor, command, randomUUID());
    }
    async function waitFor(id: string, status: string) {
      for (let i = 0; i < 150; i++) {
        const batch = await repository.findOwned(actor.id, id);
        if (batch?.status === status) return batch;
        await delay(20);
      }
      throw new Error(`Batch did not reach ${status}`);
    }

    it('returns 202 before dispatch, then polls real persisted drafts with no Question write', async () => {
      const response = await request(http)
        .post('/question-generation-batches')
        .set('Idempotency-Key', randomUUID())
        .send(command)
        .expect(202);
      const body = response.body as { batch_id: string; status: string };
      expect(body.status).toBe('QUEUED');
      expect(calls).toBe(0);
      expect(
        await prisma.questionGenerationOutbox.count({
          where: { batch_id: body.batch_id },
        }),
      ).toBe(1);
      await dispatcher.tick();
      await waitFor(body.batch_id, 'REVIEW_REQUIRED');
      const items = await request(http)
        .get(`/question-generation-batches/${body.batch_id}/items`)
        .expect(200);
      expect(items.body).toMatchObject({
        total: 1,
        page: 1,
        limit: 20,
        data: [
          {
            status: 'VALID',
            revision: 1,
            data: fixture.internal_response.questions[0],
          },
        ],
      });
      expect(await prisma.question.count()).toBe(0);
      expect(await prisma.questionImport.count()).toBe(0);
      expect(calls).toBe(1);
      const poll = await request(http)
        .get(`/question-generation-batches/${body.batch_id}`)
        .expect(200);
      expect(poll.body).not.toHaveProperty('source_text');
      expect(poll.body).not.toHaveProperty('execution_id');
    });

    it('normalizes source whitespace before length validation and idempotency hashing', async () => {
      const key = randomUUID();
      const text = 'a'.repeat(20_000);
      const first = await request(http)
        .post('/question-generation-batches')
        .set('Idempotency-Key', key)
        .send({ ...command, source: { mode: 'text', text: `  ${text}  ` } })
        .expect(202);
      const second = await request(http)
        .post('/question-generation-batches')
        .set('Idempotency-Key', key)
        .send({ ...command, source: { mode: 'text', text } })
        .expect(202);
      const accepted = first.body as { batch_id: string };
      expect(second.body).toMatchObject({ batch_id: accepted.batch_id });
      expect(
        await prisma.questionGenerationBatch.findUnique({
          where: { id: accepted.batch_id },
          select: { source_text: true },
        }),
      ).toEqual({ source_text: text });
      await execution.process(accepted.batch_id);
      expect(calls).toBe(1);
    });

    it('keeps one batch/outbox under concurrent identical keys and conflicts for changed input', async () => {
      const key = randomUUID();
      const results = await Promise.all(
        Array.from({ length: 6 }, () => batches.create(actor, command, key)),
      );
      expect(new Set(results.map((value) => value.batch_id)).size).toBe(1);
      expect(
        await prisma.questionGenerationOutbox.count({
          where: { batch_id: results[0].batch_id },
        }),
      ).toBe(1);
      await expect(
        batches.create(actor, { ...command, count: 2 }, key),
      ).rejects.toMatchObject({ status: 409 });
      await execution.process(results[0].batch_id);
      await expect(batches.create(actor, command, key)).resolves.toMatchObject({
        batch_id: results[0].batch_id,
        status: 'REVIEW_REQUIRED',
      });
      expect(calls).toBe(1);
    });

    it.each([
      { count: '1' },
      { external_processing_consent: 'true' },
      { forged: true },
    ])(
      'rejects raw invalid types/unknown fields despite the global pipe: %j',
      async (change) => {
        await request(http)
          .post('/question-generation-batches')
          .set('Idempotency-Key', randomUUID())
          .send({ ...command, ...change })
          .expect(400);
        expect(calls).toBe(0);
      },
    );

    it('requires lecturer role, consent/key and hides foreign batch/items', async () => {
      await request(http)
        .post('/question-generation-batches')
        .set('x-test-actor', 'student')
        .send(command)
        .expect(403);
      await request(http)
        .post('/question-generation-batches')
        .send(command)
        .expect(400);
      await request(http)
        .post('/question-generation-batches')
        .set('Idempotency-Key', randomUUID())
        .send({ ...command, external_processing_consent: false })
        .expect(400);
      const batch = await create();
      for (const path of ['', '/items'])
        await request(http)
          .get(`/question-generation-batches/${batch.batch_id}${path}`)
          .set('x-test-actor', 'foreign')
          .expect(404);
      await request(http)
        .post('/question-generation-batches')
        .set('x-test-actor', 'foreign')
        .set('Idempotency-Key', randomUUID())
        .send(command)
        .expect(404);
      await execution.process(batch.batch_id);
    });

    it('duplicate deliveries claim once and never call the provider twice', async () => {
      const batch = await create();
      await Promise.all(
        Array.from({ length: 5 }, () => execution.process(batch.batch_id)),
      );
      await execution.process(batch.batch_id);
      expect(calls).toBe(1);
      expect(
        await prisma.questionGenerationItem.count({
          where: { batch_id: batch.batch_id },
        }),
      ).toBe(1);
      expect(
        await prisma.questionGenerationAttempt.count({
          where: { batch_id: batch.batch_id },
        }),
      ).toBe(1);
    });

    it.each([429, 503, 504])(
      'persists upstream %s as a safe failure with one HTTP invocation',
      async (status) => {
        upstreamStatus = status;
        const batch = await create();
        await execution.process(batch.batch_id);
        expect(
          await repository.findOwned(actor.id, batch.batch_id),
        ).toMatchObject({
          status: 'FAILED',
          error_code:
            status === 504 ? 'AI_SERVICE_TIMEOUT' : 'AI_SERVICE_UNAVAILABLE',
        });
        expect(calls).toBe(1);
        expect(
          await prisma.questionGenerationItem.count({
            where: { batch_id: batch.batch_id },
          }),
        ).toBe(0);
      },
    );

    it('rejects malformed AI output and enforces the overall HTTP deadline', async () => {
      upstreamInvalid = true;
      const invalid = await create();
      await execution.process(invalid.batch_id);
      expect(
        await repository.findOwned(actor.id, invalid.batch_id),
      ).toMatchObject({ status: 'FAILED', error_code: 'AI_OUTPUT_INVALID' });
      upstreamInvalid = false;
      upstreamDelay = 200;
      timeoutMs = 30;
      const slow = await create();
      await execution.process(slow.batch_id);
      expect(await repository.findOwned(actor.id, slow.batch_id)).toMatchObject(
        { status: 'FAILED', error_code: 'AI_SERVICE_TIMEOUT' },
      );
      await delay(220);
    });

    it('recovers a durably saved result after worker death without another HTTP invocation', async () => {
      const batch = await create();
      const executionId = await repository.claim(batch.batch_id);
      if (!executionId) throw new Error('Claim required');
      await repository.saveResult(
        batch.batch_id,
        executionId,
        fixture.internal_response.questions,
      );
      await prisma.questionGenerationBatch.update({
        where: { id: batch.batch_id },
        data: { lease_expires_at: new Date(0) },
      });
      await Promise.all([
        execution.recover(batch.batch_id),
        execution.recover(batch.batch_id),
      ]);
      expect(
        await repository.findOwned(actor.id, batch.batch_id),
      ).toMatchObject({ status: 'REVIEW_REQUIRED' });
      expect(
        await prisma.questionGenerationItem.count({
          where: { batch_id: batch.batch_id },
        }),
      ).toBe(1);
      expect(calls).toBe(0);
    });

    it('marks an interrupted ambiguous invocation UNKNOWN without automatically reissuing it', async () => {
      const batch = await create();
      await repository.claim(batch.batch_id);
      await prisma.questionGenerationBatch.update({
        where: { id: batch.batch_id },
        data: { lease_expires_at: new Date(0) },
      });
      await execution.recover(batch.batch_id);
      await execution.process(batch.batch_id);
      expect(
        await repository.findOwned(actor.id, batch.batch_id),
      ).toMatchObject({
        status: 'FAILED',
        error_code: 'AI_EXECUTION_INTERRUPTED',
      });
      expect(
        await prisma.questionGenerationAttempt.findUnique({
          where: { batch_id: batch.batch_id },
        }),
      ).toMatchObject({ status: 'UNKNOWN' });
      expect(calls).toBe(0);
    });

    it('rolls back the state/items together if item insertion fails, then replays the saved result', async () => {
      const batch = await create();
      const executionId = await repository.claim(batch.batch_id);
      if (!executionId) throw new Error('Claim required');
      await repository.saveResult(
        batch.batch_id,
        executionId,
        fixture.internal_response.questions,
      );
      const constraint = `reject_${randomUUID().replaceAll('-', '')}`;
      await pool.query(
        `ALTER TABLE "${schema}".question_generation_items ADD CONSTRAINT "${constraint}" CHECK (source_index < 0) NOT VALID`,
      );
      try {
        await expect(
          repository.finish(
            batch.batch_id,
            executionId,
            actor.id,
            fixture.internal_response.questions,
          ),
        ).rejects.toBeDefined();
      } finally {
        await pool.query(
          `ALTER TABLE "${schema}".question_generation_items DROP CONSTRAINT "${constraint}"`,
        );
      }
      expect(
        await repository.findOwned(actor.id, batch.batch_id),
      ).toMatchObject({ status: 'GENERATING', total_items: 0 });
      await prisma.questionGenerationBatch.update({
        where: { id: batch.batch_id },
        data: { lease_expires_at: new Date(0) },
      });
      await execution.recover(batch.batch_id);
      expect(
        await repository.findOwned(actor.id, batch.batch_id),
      ).toMatchObject({ status: 'REVIEW_REQUIRED', total_items: 1 });
      expect(calls).toBe(0);
    });

    it('checks current active status before disclosing source text', async () => {
      const batch = await create();
      await prisma.user.update({
        where: { id: actor.id },
        data: { status: UserStatus.INACTIVE },
      });
      try {
        await execution.process(batch.batch_id);
        expect(calls).toBe(0);
      } finally {
        await prisma.user.update({
          where: { id: actor.id },
          data: { status: UserStatus.ACTIVE },
        });
      }
      expect(
        await repository.findOwned(actor.id, batch.batch_id),
      ).toMatchObject({ status: 'FAILED' });
    });

    it('rejects completion after chapter moves, and fences late failures after success', async () => {
      const batch = await create();
      const executionId = await repository.claim(batch.batch_id);
      if (!executionId) throw new Error('Claim required');
      const other = await prisma.topic.create({
        data: { created_by: actor.id, name: 'Other' },
      });
      await prisma.chapter.update({
        where: { id: command.chapter_id },
        data: { topic_id: other.id },
      });
      try {
        expect(await repository.findOwned(actor.id, batch.batch_id)).toBeNull();
        await expect(
          repository.finish(
            batch.batch_id,
            executionId,
            actor.id,
            fixture.internal_response.questions,
          ),
        ).rejects.toMatchObject({ status: 409 });
      } finally {
        await prisma.chapter.update({
          where: { id: command.chapter_id },
          data: { topic_id: command.topic_id },
        });
      }
      await repository.finish(
        batch.batch_id,
        executionId,
        actor.id,
        fixture.internal_response.questions,
      );
      await repository.fail(batch.batch_id, executionId, 'LATE_FAILURE');
      expect(
        await repository.findOwned(actor.id, batch.batch_id),
      ).toMatchObject({ status: 'REVIEW_REQUIRED', error_code: null });
    });

    it('recreates a lost Redis job from the persisted outbox', async () => {
      await queue.pause();
      const batch = await create();
      try {
        await dispatcher.tick();
        const job = await queue.getJob(`generate-${batch.batch_id}`);
        expect(job).toBeDefined();
        await job?.remove();
        await prisma.questionGenerationOutbox.update({
          where: { batch_id: batch.batch_id },
          data: { next_dispatch_at: new Date(0) },
        });
        await dispatcher.tick();
      } finally {
        await queue.resume();
      }
      await waitFor(batch.batch_id, 'REVIEW_REQUIRED');
      expect(calls).toBe(1);
    });

    it('boots the dedicated Nest worker module and processes the outbox', async () => {
      const batch = await create();
      const context = await Test.createTestingModule({
        imports: [QuestionGenerationWorkerModule],
      })
        .overrideProvider(PrismaService)
        .useValue(prisma)
        .overrideProvider(AI_SERVICE_OPTIONS)
        .useValue(options)
        .overrideProvider(ConfigService)
        .useValue(
          new ConfigService({ REDIS_URL: redisUrl, REDIS_PASSWORD: '' }),
        )
        .compile();
      try {
        await context.init();
        await context.get(GenerationProcessor).worker.waitUntilReady();
        await context.get(GenerationDispatcher).tick();
        await waitFor(batch.batch_id, 'REVIEW_REQUIRED');
        expect(calls).toBe(1);
      } finally {
        await context
          .get<GenerationProcessor>(GenerationProcessor)
          .worker.close();
        await context.close();
      }
    });

    async function reviewBatch(count = 1) {
      const batch = await batches.create(
        actor,
        { ...command, count },
        randomUUID(),
      );
      const executionId = await repository.claim(batch.batch_id);
      if (!executionId) throw new Error('Claim required');
      const questions = Array.from({ length: count }, (_, index) => ({
        ...fixture.internal_response.questions[0],
        question_text: `${fixture.internal_response.questions[0].question_text} (${index + 1})`,
      }));
      await repository.saveResult(batch.batch_id, executionId, questions);
      await repository.finish(batch.batch_id, executionId, actor.id, questions);
      const items = await prisma.questionGenerationItem.findMany({
        where: { batch_id: batch.batch_id },
        orderBy: { source_index: 'asc' },
      });
      return { id: batch.batch_id, items };
    }
    async function approve(id: string, item: { id: string; revision: number }) {
      const response = await request(http)
        .post(`/question-generation-batches/${id}/items/${item.id}/review`)
        .send({ revision: item.revision, decision: 'APPROVE' })
        .expect(200);
      const result = response.body as { id: string; revision: number };
      return { id: result.id, revision: result.revision };
    }

    it('edits, invalidates approval, rejects, approves and commits exact revisions with audit and replay', async () => {
      const { id, items } = await reviewBatch(2);
      const path = `/question-generation-batches/${id}`;
      const edited = {
        ...fixture.internal_response.questions[0],
        question_text: 'Edited binary search question?',
      };
      await request(http)
        .patch(`${path}/items/${items[0].id}`)
        .send({ revision: 1, data: edited })
        .expect(200)
        .expect(({ body }: { body: unknown }) =>
          expect(body).toMatchObject({ revision: 2, status: 'VALID' }),
        );
      const approved = await approve(id, { id: items[0].id, revision: 2 });
      await request(http)
        .patch(`${path}/items/${items[0].id}`)
        .send({
          revision: approved.revision,
          data: { ...edited, question_text: 'Edited again?' },
        })
        .expect(200);
      await request(http)
        .post(`${path}/commit`)
        .send({ items: [{ id: items[0].id, revision: 4 }] })
        .expect(409);
      await request(http)
        .post(`${path}/items/${items[0].id}/review`)
        .send({ revision: 3, decision: 'APPROVE' })
        .expect(409);
      await request(http)
        .post(`${path}/items/${items[1].id}/review`)
        .send({ revision: 1, decision: 'REJECT' })
        .expect(200);
      const final = await approve(id, { id: items[0].id, revision: 4 });
      const body = { items: [{ id: final.id, revision: final.revision }] };
      const responses = await Promise.all(
        Array.from({ length: 4 }, () =>
          request(http).post(`${path}/commit`).send(body).expect(200),
        ),
      );
      const result = responses[0].body as {
        questions: { question_id: string }[];
      };
      responses.forEach((response) =>
        expect(response.body).toEqual(responses[0].body),
      );
      expect(responses[0].body).toMatchObject({ status: 'COMPLETED' });
      const bank = await prisma.question.findUniqueOrThrow({
        where: { id: result.questions[0].question_id },
      });
      expect(bank).toMatchObject({
        chapter_id: command.chapter_id,
        question_text: 'Edited again?',
        correct_answer: null,
        question_type: 'SINGLE_CHOICE',
      });
      expect(JSON.parse(bank.options ?? 'null')).toEqual(edited.options);
      const item = await prisma.questionGenerationItem.findUniqueOrThrow({
        where: { id: items[0].id },
      });
      expect(item).toMatchObject({
        status: 'COMMITTED',
        revision: 5,
        original_data: items[0].original_data,
        reviewed_by: actor.id,
      });
      const audits = await prisma.questionGenerationReview.findMany({
        where: { item_id: item.id },
        orderBy: { created_at: 'asc' },
      });
      expect(audits.map((event) => event.action)).toEqual([
        'EDIT',
        'APPROVE',
        'EDIT',
        'APPROVE',
        'COMMIT',
      ]);
      expect(audits.every((event) => event.actor_id === actor.id)).toBe(true);
      await request(http)
        .patch(`${path}/items/${item.id}`)
        .send({ revision: 5, data: edited })
        .expect(409);
      expect(calls).toBe(0);
    });

    it('hides foreign review resources and never accepts client-forged owner/status or string revisions', async () => {
      const { id, items } = await reviewBatch();
      const path = `/question-generation-batches/${id}`;
      const payload = {
        revision: 1,
        data: fixture.internal_response.questions[0],
      };
      await request(http)
        .patch(`${path}/items/${items[0].id}`)
        .set('x-test-actor', 'foreign')
        .send(payload)
        .expect(404);
      await request(http)
        .post(`${path}/items/${items[0].id}/review`)
        .set('x-test-actor', 'foreign')
        .send({ revision: 1, decision: 'APPROVE' })
        .expect(404);
      await request(http)
        .post(`${path}/commit`)
        .set('x-test-actor', 'foreign')
        .send({ items: [{ id: items[0].id, revision: 1 }] })
        .expect(404);
      await request(http)
        .patch(`${path}/items/${items[0].id}`)
        .set('x-test-actor', 'student')
        .send(payload)
        .expect(403);
      for (const change of [
        { revision: '1' },
        { reviewed_by: actor.id },
        { status: 'APPROVED' },
        { data: { ...fixture.internal_response.questions[0], extra: true } },
      ]) {
        await request(http)
          .patch(`${path}/items/${items[0].id}`)
          .send({ ...payload, ...change })
          .expect(400);
      }
      await request(http)
        .post(`${path}/items/${items[0].id}/review`)
        .send({ revision: '1', decision: 'APPROVE' })
        .expect(400);
      await request(http)
        .post(`${path}/commit`)
        .send({
          items: [
            { id: items[0].id, revision: 1 },
            { id: items[0].id, revision: 1 },
          ],
        })
        .expect(400);
      const foreignList = await request(http)
        .get('/question-generation-batches')
        .set('x-test-actor', 'foreign')
        .expect(200);
      expect(foreignList.body).toMatchObject({ data: [], total: 0 });
      expect(
        await prisma.questionGenerationReview.count({
          where: { batch_id: id },
        }),
      ).toBe(0);
    });

    it('serializes concurrent approvals and an edit racing with commit', async () => {
      const { id, items } = await reviewBatch();
      const path = `/question-generation-batches/${id}`;
      const reviews = await Promise.all(
        [1, 2].map(() =>
          request(http)
            .post(`${path}/items/${items[0].id}/review`)
            .send({ revision: 1, decision: 'APPROVE' }),
        ),
      );
      expect(reviews.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      const before = await prisma.question.count();
      const race = await Promise.all([
        request(http)
          .patch(`${path}/items/${items[0].id}`)
          .send({ revision: 2, data: fixture.internal_response.questions[0] }),
        request(http)
          .post(`${path}/commit`)
          .send({ items: [{ id: items[0].id, revision: 2 }] }),
      ]);
      expect(race.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      const item = await prisma.questionGenerationItem.findUniqueOrThrow({
        where: { id: items[0].id },
      });
      expect(await prisma.question.count()).toBe(
        before + (item.status === 'COMMITTED' ? 1 : 0),
      );
      if (item.status === 'VALID')
        expect(item).toMatchObject({
          revision: 3,
          reviewed_by: null,
          reviewed_at: null,
        });
    });

    it('rolls back all bank writes when a mixed selection includes an unapproved item', async () => {
      const { id, items } = await reviewBatch(2);
      const approved = await approve(id, items[0]);
      const before = await prisma.question.count();
      await request(http)
        .post(`/question-generation-batches/${id}/commit`)
        .send({ items: [approved, { id: items[1].id, revision: 1 }] })
        .expect(409);
      expect(await prisma.question.count()).toBe(before);
      expect(
        await prisma.questionGenerationItem.findUnique({
          where: { id: approved.id },
        }),
      ).toMatchObject({ status: 'APPROVED', question_id: null });
      expect(
        await prisma.questionGenerationReview.count({
          where: { batch_id: id, action: 'COMMIT' },
        }),
      ).toBe(0);
      await request(http)
        .post(`/question-generation-batches/${id}/commit`)
        .send({ items: [approved] })
        .expect(200)
        .expect(({ body }: { body: unknown }) =>
          expect(body).toMatchObject({ status: 'REVIEW_REQUIRED' }),
        );
    });

    it('rolls back bank/mapping/state on audit failure and safely retries the same commit', async () => {
      const { id, items } = await reviewBatch();
      const approved = await approve(id, items[0]);
      const before = await prisma.question.count();
      const constraint = `reject_commit_${randomUUID().replaceAll('-', '')}`;
      await pool.query(
        `ALTER TABLE "${schema}".question_generation_reviews ADD CONSTRAINT "${constraint}" CHECK (action::text <> 'COMMIT') NOT VALID`,
      );
      try {
        await request(http)
          .post(`/question-generation-batches/${id}/commit`)
          .send({ items: [approved] })
          .expect(503);
      } finally {
        await pool.query(
          `ALTER TABLE "${schema}".question_generation_reviews DROP CONSTRAINT "${constraint}"`,
        );
      }
      expect(await prisma.question.count()).toBe(before);
      expect(
        await prisma.questionGenerationItem.findUnique({
          where: { id: approved.id },
        }),
      ).toMatchObject({ status: 'APPROVED', question_id: null });
      await request(http)
        .post(`/question-generation-batches/${id}/commit`)
        .send({ items: [approved] })
        .expect(200);
      expect(await prisma.question.count()).toBe(before + 1);
    });

    it('rechecks target ownership and approved JSON at commit, and handles deleted mappings without recreation', async () => {
      const { id, items } = await reviewBatch();
      const approved = await approve(id, items[0]);
      await prisma.topic.update({
        where: { id: command.topic_id },
        data: { created_by: foreign.id },
      });
      try {
        await request(http)
          .post(`/question-generation-batches/${id}/commit`)
          .send({ items: [approved] })
          .expect(404);
      } finally {
        await prisma.topic.update({
          where: { id: command.topic_id },
          data: { created_by: actor.id },
        });
      }
      await prisma.questionGenerationItem.update({
        where: { id: approved.id },
        data: { data: {} },
      });
      await request(http)
        .post(`/question-generation-batches/${id}/commit`)
        .send({ items: [approved] })
        .expect(409);
      await prisma.questionGenerationItem.update({
        where: { id: approved.id },
        data: { data: items[0].data as Prisma.InputJsonValue },
      });
      const response = await request(http)
        .post(`/question-generation-batches/${id}/commit`)
        .send({ items: [approved] })
        .expect(200);
      const result = response.body as { questions: { question_id: string }[] };
      await prisma.question.delete({
        where: { id: result.questions[0].question_id },
      });
      const before = await prisma.question.count();
      await request(http)
        .post(`/question-generation-batches/${id}/commit`)
        .send({ items: [approved] })
        .expect(409);
      expect(await prisma.question.count()).toBe(before);
    });

    it('exports batch/review/commit operations and schemas in Swagger', () => {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().build(),
      );
      expect(
        document.paths['/question-generation-batches'].post?.responses,
      ).toHaveProperty('202');
      expect(
        document.paths['/question-generation-batches/{id}'].get,
      ).toBeDefined();
      expect(
        document.paths['/question-generation-batches/{id}/items'].get,
      ).toBeDefined();
      expect(document.components?.schemas).toHaveProperty(
        'CreateGenerationBatchDto',
      );
      expect(
        document.paths['/question-generation-batches/{id}/items/{itemId}']
          .patch,
      ).toBeDefined();
      expect(
        document.paths[
          '/question-generation-batches/{id}/items/{itemId}/review'
        ].post,
      ).toBeDefined();
      expect(
        document.paths['/question-generation-batches/{id}/commit'].post
          ?.responses,
      ).toHaveProperty('200');
    });
  },
);
