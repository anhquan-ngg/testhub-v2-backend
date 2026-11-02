import { Test } from '@nestjs/testing';
import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClient, ExamMode } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import type { Server } from 'node:http';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { ChaptersController } from './chapters.controller';
import { ChaptersService } from './chapters.service';
import { ChaptersRepository } from './chapters.repository';
import { descendantChapterIds, ancestorChapters } from '../common/chapter-tree';
import { selectChapterQuestionIds } from '../common/chapter-question-selection';
import { ExamRuntimeService } from '../exam-runtime/exam-runtime.service';
import { ExamRuntimeEventsService } from '../exam-runtime/exam-runtime-events.service';
import { ExamRuntimeQueueService } from '../exam-runtime/exam-runtime-queue.service';
import { ExamMonitorAggregator } from '../exam-runtime/exam-monitor-aggregator.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { ExamsController } from '../exams/exams.controller';
import { ExamsService } from '../exams/exams.service';
import { ExamsRepository } from '../exams/exams.repository';
import { PdfService } from '../submission/pdf.service';
import * as puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';

const url = process.env.TESTHUB_TREE_DATABASE_URL;
(url ? describe : describe.skip)(
  'Adjacency list / recursive CTE (real PostgreSQL and Nest HTTP)',
  () => {
    const schema = `tree_${randomUUID().replaceAll('-', '')}`;
    const owner = randomUUID(),
      foreign = randomUUID(),
      topic = randomUUID(),
      otherTopic = randomUUID();
    const nodes = Array.from({ length: 1000 }, () => randomUUID());
    let admin: Pool,
      pool: Pool,
      prisma: PrismaClient,
      app: INestApplication,
      chapters: ChaptersService,
      runtime: ExamRuntimeService;
    beforeAll(async () => {
      if (
        !url ||
        !['localhost', '127.0.0.1'].includes(new URL(url).hostname) ||
        !new URL(url).pathname.endsWith('_test')
      )
        throw new Error('Dedicated loopback *_test DB required');
      admin = new Pool({ connectionString: url });
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
          '--config',
          'src/auth/testing/prisma-fixture.config.ts',
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      const setup = await admin.connect();
      try {
        await setup.query(`CREATE SCHEMA "${schema}"`);
        await setup.query(`SET search_path TO "${schema}", public`);
        await setup.query(
          sql.replace('CREATE SCHEMA IF NOT EXISTS "public";', ''),
        );
      } finally {
        setup.release();
      }
      pool = new Pool({
        connectionString: url,
        options: `-c search_path=${schema},public`,
      });
      prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
      Object.defineProperty(prisma, 'current', { get: () => prisma });
      await prisma.user.createMany({
        data: [owner, foreign].map((id) => ({
          id,
          email: `${id}@example.invalid`,
          full_name: 'Fixture lecturer',
          role: 'LECTURER',
        })),
      });
      await prisma.topic.createMany({
        data: [
          { id: topic, created_by: owner, name: 'Deep tree' },
          { id: otherTopic, created_by: foreign, name: 'Foreign' },
        ],
      });
      await prisma.chapter.createMany({
        data: nodes.map((id, i) => ({
          id,
          name: `Chapter ${i}`,
          topic_id: topic,
          parent_id: i ? nodes[i - 1] : null,
          order: i,
        })),
      });
      await prisma.question.createMany({
        data: [0, 1, 3, 60, 999].map((i) => ({
          chapter_id: nodes[i],
          question_text: `Question ${i}`,
          question_type: 'SINGLE_CHOICE',
          question_format: 'KNOWLEDGE',
          options: '[]',
        })),
      });
      const module = await Test.createTestingModule({
        controllers: [ChaptersController, ExamsController],
        providers: [
          ChaptersService,
          ChaptersRepository,
          ExamRuntimeService,
          ExamsService,
          ExamsRepository,
          { provide: PrismaService, useValue: prisma },
          { provide: ExamRuntimeEventsService, useValue: {} },
          {
            provide: ExamRuntimeQueueService,
            useValue: { scheduleExam: jest.fn() },
          },
          { provide: ExamMonitorAggregator, useValue: {} },
          { provide: NotificationGateway, useValue: {} },
        ],
      })
        .overrideGuard(JwtGuard)
        .useValue({
          canActivate(context: ExecutionContext) {
            const req = context
              .switchToHttp()
              .getRequest<{ user: unknown; headers: Record<string, string> }>();
            req.user = {
              id: req.headers['x-actor'] ?? owner,
              role: req.headers['x-role'] ?? 'LECTURER',
            };
            return true;
          },
        })
        .compile();
      app = module.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ transform: true, whitelist: true }),
      );
      await app.init();
      chapters = module.get(ChaptersService);
      runtime = module.get(ExamRuntimeService);
    }, 60000);
    afterAll(async () => {
      await app?.close();
      await prisma?.$disconnect();
      await pool?.end();
      if (admin) {
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.end();
      }
    });
    it('walks 1000 levels both ways and exposes owner-scoped paginated flat endpoints', async () => {
      expect((await descendantChapterIds(prisma, topic, nodes[0])).length).toBe(
        1000,
      );
      expect((await ancestorChapters(prisma, topic, nodes[999])).length).toBe(
        1000,
      );
      const response = await request(app.getHttpServer() as Server)
        .get(`/chapters/${nodes[0]}/subtree?page=10&limit=100`)
        .expect(200);
      expect((response.body as { total: number }).total).toBe(1000);
      expect((response.body as { data: unknown[] }).data).toHaveLength(100);
      expect((response.body as { data: { id: string }[] }).data[99].id).toBe(
        nodes[999],
      );
      await request(app.getHttpServer() as Server)
        .get(`/chapters/${nodes[999]}/ancestors?limit=100`)
        .expect(200)
        .expect((result) =>
          expect((result.body as { total: number }).total).toBe(1000),
        );
      await request(app.getHttpServer() as Server)
        .get(`/chapters/${nodes[0]}/subtree`)
        .set('x-actor', foreign)
        .expect(404);
      await request(app.getHttpServer() as Server)
        .get(`/chapters/${nodes[0]}/subtree`)
        .set('x-role', 'STUDENT')
        .expect(403);
      await request(app.getHttpServer() as Server)
        .get(`/chapters/${nodes[0]}/subtree?limit=101`)
        .expect(400);
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().build(),
      );
      expect(document.paths['/chapters/{id}/subtree']).toBeDefined();
    });
    it('selects questions at any depth; overlapping quotas stay distinct and feasible allocations succeed', async () => {
      const rows = [
        { chapter_id: nodes[0], quantity: 4 },
        { chapter_id: nodes[999], quantity: 1 },
      ];
      const ids = await selectChapterQuestionIds(
        prisma,
        topic,
        JSON.stringify(rows),
      );
      expect(ids).toHaveLength(5);
      expect(new Set(ids).size).toBe(5);
      const selected = await runtime.selectQuestions({
        id: randomUUID(),
        topic_id: topic,
        mode: ExamMode.BY_CHAPTER,
        sample_size: null,
        distribution: JSON.stringify(rows),
      });
      expect(new Set(selected.map((q) => q.id)).size).toBe(5);
      expect(selected.every((q) => Array.isArray(q.files))).toBe(true);
      await expect(
        selectChapterQuestionIds(prisma, topic, [
          { chapter_id: nodes[0], quantity: 5 },
          { chapter_id: nodes[999], quantity: 1 },
        ]),
      ).rejects.toThrow('distinct');
      await expect(
        selectChapterQuestionIds(prisma, otherTopic, rows),
      ).rejects.toThrow();
    });

    it('validates ordered quotas at exam save over HTTP and legacy blank PDF reuses the same selection', async () => {
      const distribution = JSON.stringify([
        { chapter_id: nodes[0], quantity: 4 },
        { chapter_id: nodes[999], quantity: 1 },
      ]);
      const input = {
        topic_id: topic,
        title: 'Subtree exam',
        mode: 'BY_CHAPTER',
        distribution,
        exam_start_time: '2027-01-01T08:00:00.000Z',
        exam_end_time: '2027-01-01T10:00:00.000Z',
        duration: 60,
      };
      const created = await request(app.getHttpServer() as Server)
        .post('/exams')
        .send(input)
        .expect(201);
      const saved = created.body as { id: string; distribution: string };
      expect(saved.distribution).toBe(distribution);
      await request(app.getHttpServer() as Server)
        .patch(`/exams/${saved.id}`)
        .send({ title: 'Renamed subtree exam' })
        .expect(200);
      const before = await prisma.exam.count();
      const invalid = await request(app.getHttpServer() as Server)
        .post('/exams')
        .send({
          ...input,
          distribution: JSON.stringify([
            { chapter_id: nodes[0], quantity: 5 },
            { chapter_id: nodes[999], quantity: 1 },
          ]),
        })
        .expect(400);
      expect((invalid.body as { code: string }).code).toBe(
        'CHAPTER_DISTRIBUTION_INSUFFICIENT',
      );
      expect(await prisma.exam.count()).toBe(before);
      await request(app.getHttpServer() as Server)
        .patch(`/exams/${saved.id}`)
        .send({ distribution: '[{"chapter_id":"wrong","quantity":-1}]' })
        .expect(400);
      await request(app.getHttpServer() as Server)
        .post('/exams')
        .send({ ...input, topic_id: otherTopic })
        .expect(400);
      let rendered = '';
      const page = {
        setContent: jest.fn((html: string) => {
          rendered = html;
          return Promise.resolve();
        }),
        pdf: jest.fn().mockResolvedValue(Buffer.from('fixture-pdf')),
      } as unknown as Page;
      const browser = {
        newPage: jest.fn().mockResolvedValue(page),
        close: jest.fn().mockResolvedValue(undefined),
      } as unknown as Browser;
      const launch = jest.spyOn(puppeteer, 'launch').mockResolvedValue(browser);
      try {
        const result = await new PdfService(
          prisma as unknown as PrismaService,
        ).generateBlankExamPdf(saved.id);
        expect(result.toString()).toBe('fixture-pdf');
        for (const depth of [0, 1, 3, 60, 999])
          expect(
            rendered.split(`Question ${depth}</div>`).length - 1,
          ).toBeLessThanOrEqual(1);
        expect(rendered).toContain('Question 999');
        expect(rendered.match(/Question \d+/g) ?? []).toHaveLength(5);
      } finally {
        launch.mockRestore();
      }
    });
    it('rejects cross-topic parents and serializes concurrent opposite moves to avoid a cycle', async () => {
      const actor = { id: owner, isAdmin: false };
      const a = await chapters.create(
          { topic_id: topic, name: 'A', order: 1 },
          actor,
        ),
        b = await chapters.create(
          { topic_id: topic, name: 'B', order: 2 },
          actor,
        );
      const moves = await Promise.allSettled([
        chapters.update(a.id, { parent_id: b.id }, actor),
        chapters.update(b.id, { parent_id: a.id }, actor),
      ]);
      expect(
        moves.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        moves.filter((result) => result.status === 'rejected'),
      ).toHaveLength(1);
      const other = await prisma.chapter.create({
        data: { topic_id: otherTopic, name: 'Foreign', order: 0 },
      });
      await expect(
        chapters.create(
          {
            topic_id: topic,
            name: 'Wrong parent',
            parent_id: other.id,
            order: 0,
          },
          actor,
        ),
      ).rejects.toThrow();
      await expect(
        chapters.update(nodes[0], { parent_id: nodes[999] }, actor),
      ).rejects.toThrow();
    });
    it('terminates on corrupted cycles, excludes orphaned/deleted branches and never crosses subject boundaries', async () => {
      const a = randomUUID(),
        b = randomUUID(),
        cross = randomUUID();
      await prisma.chapter.createMany({
        data: [
          { id: a, parent_id: b, topic_id: topic, name: 'Cycle A', order: 0 },
          { id: b, parent_id: a, topic_id: topic, name: 'Cycle B', order: 0 },
          {
            id: cross,
            parent_id: nodes[999],
            topic_id: otherTopic,
            name: 'Cross topic corruption',
            order: 0,
          },
        ],
      });
      expect((await ancestorChapters(prisma, topic, a)).length).toBe(2);
      expect(await descendantChapterIds(prisma, topic, a)).toEqual([]);
      expect(
        await descendantChapterIds(prisma, topic, nodes[999]),
      ).not.toContain(cross);
      await prisma.chapter.update({
        where: { id: nodes[900] },
        data: { is_deleted: true },
      });
      expect(await descendantChapterIds(prisma, topic, nodes[0])).not.toContain(
        nodes[999],
      );
      await request(app.getHttpServer() as Server)
        .get(`/chapters/${nodes[999]}/ancestors`)
        .expect(404);
      const list = await request(app.getHttpServer() as Server)
        .get(`/chapters?topic_id=${topic}&page=10&limit=100`)
        .expect(200);
      expect(
        (list.body as { data: { id: string }[] }).data.some(
          (chapter: { id: string }) => chapter.id === nodes[999],
        ),
      ).toBe(false);
      await expect(
        chapters.create(
          {
            topic_id: topic,
            name: 'Under dead ancestor',
            parent_id: nodes[999],
            order: 0,
          },
          { id: owner, isAdmin: false },
        ),
      ).rejects.toThrow();
      await prisma.chapter.update({
        where: { id: nodes[900] },
        data: { is_deleted: false },
      });
    });
    it('soft deletes a deep subtree and its questions atomically', async () => {
      const result = await chapters.remove(nodes[1], {
        id: owner,
        isAdmin: false,
      });
      expect(result.chapters).toBe(999);
      expect(result.questions).toBe(4);
      expect(await descendantChapterIds(prisma, topic, nodes[0])).toEqual([
        nodes[0],
      ]);
      expect(
        await prisma.question.count({ where: { is_deleted: false } }),
      ).toBe(1);
    });
  },
);
