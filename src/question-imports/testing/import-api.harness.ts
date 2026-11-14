import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { AddressInfo, Server } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';
import * as express from 'express';
import type {
  Request,
  Response,
  RequestHandler,
} from 'express-serve-static-core';

const { raw } = express as unknown as {
  raw: (options: { type: () => boolean; limit: string }) => RequestHandler;
};
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { ChaptersController } from '../../chapters/chapters.controller';
import { ChaptersRepository } from '../../chapters/chapters.repository';
import { ChaptersService } from '../../chapters/chapters.service';
import { ExamRuntimeQueueService } from '../../exam-runtime/exam-runtime-queue.service';
import { ExamRuntimeService } from '../../exam-runtime/exam-runtime.service';
import { ExamsController } from '../../exams/exams.controller';
import { ExamsRepository } from '../../exams/exams.repository';
import { ExamsService } from '../../exams/exams.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SerializedPrismaPg } from '../../prisma/serialized-prisma-pg';
import { QuestionsController } from '../../questions/questions.controller';
import { QuestionsRepository } from '../../questions/questions.repository';
import { QuestionsService } from '../../questions/questions.service';
import { S3Service } from '../../s3/s3.service';
import { TopicsController } from '../../topics/topics.controller';
import { TopicsRepository } from '../../topics/topics.repository';
import { TopicsService } from '../../topics/topics.service';
import { DocxQuestionImportParser } from '../parsers/docx-question-import.parser';
import { XlsxQuestionImportParser } from '../parsers/xlsx-question-import.parser';
import { QuestionImportController } from '../question-import.controller';
import { QuestionImportQueueService } from '../question-import-queue.service';
import { QuestionImportService } from '../question-import.service';

const root = resolve(__dirname, '../../..');

/** Creates only a uniquely named, volume-free PostgreSQL container on loopback. */
export async function startImportDatabase() {
  const name = `testhub-import-${randomUUID()}`;
  const docker = (...args: string[]) =>
    execFileSync('docker', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  let pool: Pool | undefined;
  let prisma: PrismaClient | undefined;
  let started = false;
  async function close() {
    try {
      await prisma?.$disconnect();
      await pool?.end();
    } finally {
      if (started) {
        docker('rm', '--force', '--volumes', name);
        started = false;
      }
    }
  }
  try {
    docker(
      'run',
      '--detach',
      '--name',
      name,
      '--label',
      'testhub.disposable=question-import',
      '--publish',
      '127.0.0.1::5432',
      '--tmpfs',
      '/var/lib/postgresql/data:rw',
      '--env',
      'POSTGRES_USER=import_fixture',
      '--env',
      'POSTGRES_PASSWORD=synthetic_import_fixture',
      '--env',
      'POSTGRES_DB=import_test',
      'postgres:17',
    );
    started = true;
    const port = Number(docker('port', name, '5432/tcp').split(':').at(-1));
    if (!Number.isInteger(port) || port < 1)
      throw new Error('Missing isolated PostgreSQL port');
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        docker(
          'exec',
          name,
          'pg_isready',
          '-U',
          'import_fixture',
          '-d',
          'import_test',
        );
        ready = true;
        break;
      } catch {
        await delay(250);
      }
    }
    if (!ready) throw new Error('Disposable PostgreSQL did not become ready');
    pool = new Pool({
      host: '127.0.0.1',
      port,
      user: 'import_fixture',
      password: 'synthetic_import_fixture',
      database: 'import_test',
    });
    // This config has no dotenv import and uses an unreachable synthetic URL.
    const sql = execFileSync(
      process.execPath,
      [
        resolve(root, 'node_modules/prisma/build/index.js'),
        'migrate',
        'diff',
        '--from-empty',
        '--to-schema',
        resolve(root, 'prisma/schema.prisma'),
        '--script',
        '--config',
        resolve(root, 'src/auth/testing/prisma-fixture.config.ts'),
      ],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    await pool.query(sql);
    prisma = new PrismaClient({ adapter: new SerializedPrismaPg(pool) });
    Object.defineProperty(prisma, 'current', { get: () => prisma });
    await prisma.$connect();
    return { prisma, pool, name, close };
  } catch (error) {
    await close();
    throw error;
  }
}

/** In-memory object-store boundary with real local HTTP PUT/GET URLs. */
export class ImportMemoryStorage {
  readonly objects = new Map<string, Buffer>();
  readonly removed: string[] = [];
  readonly copies: Array<{ source: string; target: string }> = [];
  readonly tokens = new Map<string, string>();
  baseUrl = '';
  beforeCopy?: () => Promise<void>;
  failPermanentRemoval = false;

  private url(key: string) {
    const token = randomUUID();
    this.tokens.set(token, key);
    return `${this.baseUrl}/__objects/${token}`;
  }
  createUploadUrl(key: string) {
    return Promise.resolve({ url: this.url(key) });
  }
  getViewUrl(key: string) {
    return Promise.resolve({ url: this.url(key) });
  }
  createStorageUrl(key: string) {
    return this.url(key);
  }
  checkExists(key: string) {
    return Promise.resolve(this.objects.has(key));
  }
  getObjectBuffer(key: string, maxBytes: number) {
    const buffer = this.objects.get(key);
    if (!buffer) return Promise.reject(new Error('Object not found'));
    if (buffer.length > maxBytes)
      return Promise.reject(new Error('Object exceeds byte limit'));
    return Promise.resolve(Buffer.from(buffer));
  }
  putObject(key: string, buffer: Buffer) {
    this.objects.set(key, Buffer.from(buffer));
    return Promise.resolve();
  }
  async copyObject(source: string, target: string) {
    await this.beforeCopy?.();
    const buffer = this.objects.get(source);
    if (!buffer) throw new Error('Source object not found');
    this.objects.set(target, Buffer.from(buffer));
    this.copies.push({ source, target });
  }
  remove(key: string) {
    if (this.failPermanentRemoval && key.startsWith('questions/')) {
      return Promise.reject(new Error('Synthetic cleanup outage'));
    }
    this.objects.delete(key);
    this.removed.push(key);
    return Promise.resolve();
  }
}

/** Real controllers, DTO validation, parsers, services and repositories; fake auth/S3/queue only. */
export async function startImportApplication(
  prisma: PrismaClient,
  automaticQueue = false,
  shutdown?: () => Promise<void>,
  port = 0,
) {
  const owner = randomUUID();
  const foreign = randomUUID();
  await prisma.user.createMany({
    data: [owner, foreign].map((id) => ({
      id,
      email: `${id}@example.invalid`,
      full_name: 'Synthetic import lecturer',
      role: 'LECTURER',
    })),
  });
  const topic = await prisma.topic.create({
    data: { created_by: owner, name: 'Isolated import subject' },
  });
  const chapter = await prisma.chapter.create({
    data: { topic_id: topic.id, name: 'Existing default chapter', order: 0 },
  });
  const storage = new ImportMemoryStorage();
  const pending: string[] = [];
  const queue = {
    async enqueue(id: string) {
      pending.push(id);
      if (automaticQueue)
        await service.processImport(id).catch(() => undefined);
    },
  };
  const module = await Test.createTestingModule({
    controllers: [
      QuestionImportController,
      TopicsController,
      ChaptersController,
      QuestionsController,
      ExamsController,
    ],
    providers: [
      QuestionImportService,
      DocxQuestionImportParser,
      XlsxQuestionImportParser,
      TopicsService,
      TopicsRepository,
      ChaptersService,
      ChaptersRepository,
      QuestionsService,
      QuestionsRepository,
      ExamsService,
      ExamsRepository,
      { provide: PrismaService, useValue: prisma },
      { provide: S3Service, useValue: storage },
      { provide: QuestionImportQueueService, useValue: queue },
      {
        provide: ExamRuntimeQueueService,
        useValue: { scheduleExam: () => Promise.resolve() },
      },
      { provide: ExamRuntimeService, useValue: {} },
    ],
  })
    .overrideGuard(JwtGuard)
    .useValue({
      canActivate(context: ExecutionContext) {
        const req = context
          .switchToHttp()
          .getRequest<Request & { user: { id: string; role: string } }>();
        req.user = {
          id: String(req.headers['x-test-actor'] ?? owner),
          role: String(req.headers['x-test-role'] ?? 'LECTURER'),
        };
        return true;
      },
    })
    .compile();
  const service = module.get(QuestionImportService);
  const app = module.createNestApplication({ logger: false });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({
    origin: [/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/],
    credentials: true,
  });
  if (shutdown)
    app.use('/__fixture/shutdown', (req: Request, res: Response) => {
      if (req.method !== 'POST') {
        res.sendStatus(405);
        return;
      }
      res.sendStatus(202);
      void shutdown();
    });
  app.use(
    '/__objects',
    raw({ type: () => true, limit: '21mb' }),
    (req: Request, res: Response) => {
      const key = storage.tokens.get(req.path.slice(1));
      if (!key) {
        res.sendStatus(404);
        return;
      }
      if (req.method === 'PUT' && Buffer.isBuffer(req.body)) {
        storage.objects.set(key, Buffer.from(req.body));
        res.sendStatus(200);
        return;
      }
      const buffer = storage.objects.get(key);
      if (req.method === 'GET' && buffer) {
        res.type('png').send(buffer);
        return;
      }
      res.sendStatus(404);
    },
  );
  await app.listen(port, '127.0.0.1');
  const server = app.getHttpServer() as Server;
  storage.baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    app,
    service,
    storage,
    pending,
    owner,
    foreign,
    topic,
    chapter,
    baseUrl: storage.baseUrl,
    close: () => app.close(),
  };
}
