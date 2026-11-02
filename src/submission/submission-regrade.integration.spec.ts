import { Test } from '@nestjs/testing';
import {
  ConflictException,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { Pool } from 'pg';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { NotificationGateway } from '../notification/notification.gateway';
import { SubmissionRegradeController } from './submission-regrade.controller';
import { SubmissionRegradeService } from './submission-regrade.service';
import { SubmissionRepository } from './submission.repository';
import { SubmissionService } from './submission.service';
import { ExamRuntimeService } from '../exam-runtime/exam-runtime.service';
import { ExamRuntimeEventsService } from '../exam-runtime/exam-runtime-events.service';
import { ExamRuntimeQueueService } from '../exam-runtime/exam-runtime-queue.service';
import { ExamMonitorAggregator } from '../exam-runtime/exam-monitor-aggregator.service';

const url = process.env.TESTHUB_REGRADE_DATABASE_URL;
(url ? describe : describe.skip)(
  'Manual regrading (real PostgreSQL, migration, transactions and HTTP)',
  () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let pool: Pool;
    let grading: SubmissionRegradeService;
    let runtime: ExamRuntimeService;
    let legacy: SubmissionService;
    const emit = jest.fn();
    const owner = randomUUID(),
      stranger = randomUUID(),
      student = randomUUID();
    let fixture: Awaited<ReturnType<typeof attempt>>;

    beforeAll(async () => {
      if (
        !url ||
        process.env.DATABASE_URL !== url ||
        new URL(url).hostname !== '127.0.0.1' ||
        new URL(url).port !== '55441' ||
        new URL(url).pathname !== '/testhub_regrade_test'
      ) {
        throw new Error(
          'Only the dedicated disposable regrade fixture DB is allowed',
        );
      }
      pool = new Pool({ connectionString: url });
      // Refuse any pre-existing application data, rather than cleaning a shared DB.
      const tables = await pool.query<{ count: string }>(
        "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'",
      );
      if (Number(tables.rows[0].count))
        throw new Error('Fixture database must be empty');
      const temp = mkdtempSync(join(tmpdir(), 'testhub-regrade-'));
      try {
        const baseline = readFileSync('prisma/schema.prisma', 'utf8')
          .replace(/^\s*grading_revision\s+Int\s+@default\(0\).*$/m, '')
          .replace(/^\s*regradeDraft\s+SubmissionRegradeDraft\?.*$/m, '')
          .replace(
            /^\s*regradePublications\s+SubmissionRegradePublication\[\].*$/m,
            '',
          )
          .replace(/model SubmissionRegradeDraft \{[\s\S]*?\n\}/, '')
          .replace(/model SubmissionRegradePublication \{[\s\S]*?\n\}/, '');
        if (baseline.includes('SubmissionRegrade'))
          throw new Error('Baseline extraction failed');
        const schema = join(temp, 'baseline.prisma');
        writeFileSync(schema, baseline);
        const sql = execFileSync(
          process.execPath,
          [
            'node_modules/prisma/build/index.js',
            'migrate',
            'diff',
            '--from-empty',
            '--to-schema',
            schema,
            '--script',
            '--config',
            'src/auth/testing/prisma-fixture.config.ts',
          ],
          { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
        );
        await pool.query(sql);
        // Exercise the actual new migration, not merely a generated final schema.
        await pool.query(
          readFileSync(
            'prisma/migrations/20261029110000_add_submission_regrading/migration.sql',
            'utf8',
          ),
        );
      } finally {
        rmSync(temp, { recursive: true, force: true });
      }
      prisma = new PrismaService();
      await prisma.$connect();
      await prisma.user.createMany({
        data: [
          {
            id: owner,
            full_name: 'Owner fixture',
            email: `${owner}@example.invalid`,
            role: 'LECTURER',
          },
          {
            id: stranger,
            full_name: 'Other lecturer fixture',
            email: `${stranger}@example.invalid`,
            role: 'LECTURER',
          },
          {
            id: student,
            full_name: 'Student fixture',
            email: `${student}@example.invalid`,
            role: 'STUDENT',
          },
        ],
      });
      const module = await Test.createTestingModule({
        controllers: [SubmissionRegradeController],
        providers: [
          SubmissionRegradeService,
          SubmissionService,
          SubmissionRepository,
          ExamRuntimeService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: NotificationGateway,
            useValue: { emitSavedNotification: emit },
          },
          { provide: ExamRuntimeEventsService, useValue: {} },
          { provide: ExamRuntimeQueueService, useValue: {} },
          { provide: ExamMonitorAggregator, useValue: {} },
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
      grading = module.get(SubmissionRegradeService);
      runtime = module.get(ExamRuntimeService);
      legacy = module.get(SubmissionService);
      app = module.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({ transform: true, whitelist: true }),
      );
      await app.init();
    }, 60000);

    afterAll(async () => {
      await app?.close();
      await prisma?.onModuleDestroy();
      await pool?.end();
    });
    beforeEach(async () => {
      emit.mockReset();
      emit.mockResolvedValue(undefined);
      fixture = await attempt();
    });

    async function attempt() {
      const topic = await prisma.topic.create({
        data: { name: 'Grading fixture', created_by: owner },
      });
      const chapter = await prisma.chapter.create({
        data: { name: 'Questions', topic_id: topic.id, order: 0 },
      });
      const exam = await prisma.exam.create({
        data: {
          title: 'Fixture exam',
          lecturer_id: owner,
          topic_id: topic.id,
          exam_start_time: new Date(Date.now() - 60000),
          exam_end_time: new Date(),
          duration: 60,
        },
      });
      const questions = await Promise.all(
        (['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'ESSAY'] as const).map((type) =>
          prisma.question.create({
            data: {
              question_text: `Fixture ${type}`,
              question_type: type,
              question_format: 'KNOWLEDGE',
              chapter_id: chapter.id,
            },
          }),
        ),
      );
      return prisma.submission.create({
        data: {
          exam_id: exam.id,
          student_id: student,
          status: 'COMPLETED',
          total_score: 0,
          rating: 'POOR',
          questions: {
            create: questions.map((question, order) => ({
              question_id: question.id,
              order,
              score: 0,
              is_correct: false,
            })),
          },
        },
        include: { questions: { orderBy: { order: 'asc' } } },
      });
    }
    const endpoint = () => `/submission/${fixture.id}/regrade`;
    const http = () => request(app.getHttpServer() as Server);
    const draft = (
      values = [1, 0.5, 0.33],
      expected_revision = 0,
      expected_grade_revision = 0,
    ) => ({
      expected_revision,
      expected_grade_revision,
      reason: 'Manual fixture review',
      scores: fixture.questions.map((question, i) => ({
        submission_question_id: question.id,
        score: values[i],
      })),
    });

    it('restricts private workspace to the owning lecturer and completed active attempts', async () => {
      await http().get(endpoint()).set('x-actor', stranger).expect(404);
      await http()
        .get(endpoint())
        .set('x-role', 'STUDENT')
        .set('x-actor', student)
        .expect(403);
      await http().get(endpoint()).set('x-role', 'ADMIN').expect(403);
      await http()
        .put(`${endpoint()}/draft`)
        .set('x-actor', stranger)
        .send(draft())
        .expect(404);
      await http()
        .post(`${endpoint()}/publish`)
        .set('x-actor', stranger)
        .send({ revision: 1 })
        .expect(404);
      await prisma.submission.update({
        where: { id: fixture.id },
        data: { status: 'IN_PROGRESS' },
      });
      await http().put(`${endpoint()}/draft`).send(draft()).expect(400);
      await prisma.submission.update({
        where: { id: fixture.id },
        data: { is_deleted: true },
      });
      await http().get(endpoint()).expect(404);
    });

    it('saves all question types privately and fences concurrent drafts', async () => {
      const results = await Promise.all([
        http().put(`${endpoint()}/draft`).send(draft()),
        http().put(`${endpoint()}/draft`).send(draft()),
      ]);
      expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
      const workspace = await grading.getWorkspace(fixture.id, owner);
      expect(workspace.draft?.revision).toBe(1);
      expect(workspace.history).toHaveLength(0);
      expect(Number(workspace.submission.total_score)).toBe(0);
      expect(
        workspace.submission.questions.every((q) => Number(q.score) === 0),
      ).toBe(true);
      expect(
        await prisma.notification.count({ where: { target_id: fixture.id } }),
      ).toBe(0);
      expect(emit).not.toHaveBeenCalled();
      const publicDetail = await legacy.findOne(fixture.id);
      expect(publicDetail).not.toHaveProperty('regradeDraft');
      expect(publicDetail).not.toHaveProperty('regradePublications');
    });

    it.each([
      [
        'outside range',
        (body: ReturnType<typeof draft>) => {
          body.scores[0].score = 1.01;
        },
      ],
      [
        'third decimal',
        (body: ReturnType<typeof draft>) => {
          body.scores[0].score = 0.123;
        },
      ],
      [
        'string score',
        (body: ReturnType<typeof draft>) => {
          Object.assign(body.scores[0], { score: '0.5' });
        },
      ],
      [
        'duplicate',
        (body: ReturnType<typeof draft>) => {
          body.scores[1] = body.scores[0];
        },
      ],
      [
        'missing',
        (body: ReturnType<typeof draft>) => {
          body.scores.pop();
        },
      ],
      [
        'foreign question',
        (body: ReturnType<typeof draft>) => {
          body.scores[0].submission_question_id = randomUUID();
        },
      ],
      [
        'negative revision',
        (body: ReturnType<typeof draft>) => {
          body.expected_revision = -1;
        },
      ],
      [
        'long reason',
        (body: ReturnType<typeof draft>) => {
          body.reason = 'a'.repeat(2001);
        },
      ],
    ])('rejects invalid draft: %s', async (_label, mutate) => {
      const body = draft();
      mutate(body);
      await http().put(`${endpoint()}/draft`).send(body).expect(400);
      expect(
        await prisma.submissionRegradeDraft.findUnique({
          where: { submission_id: fixture.id },
        }),
      ).toBeNull();
    });

    it('atomically publishes, rounds only once, records history and notifies exactly once under concurrent retries', async () => {
      await grading.saveDraft(fixture.id, owner, draft());
      const results = await Promise.all([
        http().post(`${endpoint()}/publish`).send({ revision: 1 }),
        http().post(`${endpoint()}/publish`).send({ revision: 1 }),
      ]);
      expect(results.map((result) => result.status)).toEqual([201, 201]);
      const workspace = await grading.getWorkspace(fixture.id, owner);
      expect(Number(workspace.submission.total_score)).toBe(6.1);
      expect(workspace.submission.rating).toBe('AVERAGE');
      expect(workspace.submission.grading_revision).toBe(1);
      expect(
        workspace.submission.questions.map((q) => Number(q.score)),
      ).toEqual([1, 0.5, 0.33]);
      expect(workspace.submission.questions.map((q) => q.is_correct)).toEqual([
        true,
        false,
        false,
      ]);
      expect(workspace.draft?.published_revision).toBe(1);
      expect(workspace.history).toHaveLength(1);
      expect(workspace.history[0].grader_id).toBe(owner);
      expect(Number(workspace.history[0].previous_total_score)).toBe(0);
      const notifications = await prisma.notification.findMany({
        where: { target_id: fixture.id },
      });
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        recipient_id: student,
        target_type: 'SUBMISSION',
        link: `/result/${fixture.id}`,
      });
      expect(emit).toHaveBeenCalledTimes(1);
      await grading.saveDraft(fixture.id, owner, draft([0, 0, 0], 1, 1));
      await grading.publish(fixture.id, owner, { revision: 1 });
      expect(emit).toHaveBeenCalledTimes(1);
      const next = await grading.publish(fixture.id, owner, { revision: 2 });
      expect(Number(next.submission.total_score)).toBe(0);
      expect(next.history).toHaveLength(2);
    });

    it('rejects unsaved revisions, stale draft revisions and stale public-grade revisions', async () => {
      await http()
        .post(`${endpoint()}/publish`)
        .send({ revision: 1 })
        .expect(409);
      await grading.saveDraft(fixture.id, owner, draft());
      await http()
        .post(`${endpoint()}/publish`)
        .send({ revision: 2 })
        .expect(409);
      await runtime.gradeSubmission(fixture.id);
      await http()
        .post(`${endpoint()}/publish`)
        .send({ revision: 1 })
        .expect(409);
      await http()
        .put(`${endpoint()}/draft`)
        .send(draft([1, 1, 1], 1, 0))
        .expect(409);
      await grading.saveDraft(fixture.id, owner, draft([1, 1, 1], 1, 1));
      const result = await grading.publish(fixture.id, owner, { revision: 2 });
      expect(Number(result.submission.total_score)).toBe(10);
    });

    it('rolls grades, audit and published marker back if durable notification persistence fails', async () => {
      await grading.saveDraft(fixture.id, owner, draft());
      // An isolated per-submission fixture trigger fails only the final durable write.
      await pool.query(
        `CREATE FUNCTION reject_${fixture.id.replaceAll('-', '')}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.target_id = '${fixture.id}' THEN RAISE EXCEPTION 'fixture notification failure'; END IF; RETURN NEW; END $$`,
      );
      const trigger = `reject_${fixture.id.replaceAll('-', '')}`;
      await pool.query(
        `CREATE TRIGGER ${trigger} BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION ${trigger}()`,
      );
      try {
        await expect(
          grading.publish(fixture.id, owner, { revision: 1 }),
        ).rejects.toThrow();
      } finally {
        await pool.query(
          `DROP TRIGGER ${trigger} ON notifications; DROP FUNCTION ${trigger}()`,
        );
      }
      const result = await grading.getWorkspace(fixture.id, owner);
      expect(Number(result.submission.total_score)).toBe(0);
      expect(result.submission.grading_revision).toBe(0);
      expect(
        result.submission.questions.every((q) => Number(q.score) === 0),
      ).toBe(true);
      expect(result.history).toHaveLength(0);
      expect(result.draft?.published_revision).toBeNull();
      expect(emit).not.toHaveBeenCalled();
    });

    it('retains committed notification for offline retrieval if Socket.IO emission fails', async () => {
      await grading.saveDraft(fixture.id, owner, draft());
      emit.mockRejectedValueOnce(new Error('Fixture disconnected socket'));
      const result = await grading.publish(fixture.id, owner, { revision: 1 });
      expect(Number(result.submission.total_score)).toBe(6.1);
      expect(
        await prisma.notification.count({
          where: {
            target_id: fixture.id,
            recipient_id: student,
            is_read: false,
          },
        }),
      ).toBe(1);
      await grading.publish(fixture.id, owner, { revision: 1 });
      expect(emit).toHaveBeenCalledTimes(1);
    });

    it('protects manual grades against delayed/retried automatic grading and legacy PATCH', async () => {
      await grading.saveDraft(fixture.id, owner, draft([1, 1, 1]));
      await grading.publish(fixture.id, owner, { revision: 1 });
      await runtime.gradeSubmission(fixture.id);
      await runtime.gradeSubmission(fixture.id);
      await expect(
        legacy.update(fixture.id, { total_score: 2 }),
      ).rejects.toThrow('regrading');
      const result = await grading.getWorkspace(fixture.id, owner);
      expect(Number(result.submission.total_score)).toBe(10);
      expect(result.submission.grading_revision).toBe(1);
      expect(
        await prisma.notification.count({ where: { target_id: fixture.id } }),
      ).toBe(1);
    });

    it('emits only after grades and durable notification are visible outside the transaction', async () => {
      await grading.saveDraft(fixture.id, owner, draft());
      let observedCommittedState = false;
      emit.mockImplementationOnce(async () => {
        const committed = await prisma.submission.findUniqueOrThrow({
          where: { id: fixture.id },
        });
        expect(Number(committed.total_score)).toBe(6.1);
        expect(committed.grading_revision).toBe(1);
        expect(
          await prisma.notification.count({ where: { target_id: fixture.id } }),
        ).toBe(1);
        observedCommittedState = true;
      });
      await grading.publish(fixture.id, owner, { revision: 1 });
      expect(emit).toHaveBeenCalledTimes(1);
      expect(observedCommittedState).toBe(true);
    });

    it('rejects late answer writes and all legacy mutations of a manually graded attempt', async () => {
      await grading.saveDraft(fixture.id, owner, draft([1, 1, 1]));
      await grading.publish(fixture.id, owner, { revision: 1 });
      await expect(
        legacy.submitByQuestion(
          {
            submission_id: fixture.id,
            question_id: fixture.questions[2].question_id,
            answer: 'Late answer must not overwrite the published score',
          },
          student,
        ),
      ).rejects.toThrow('Active submission not found');
      await expect(legacy.update(fixture.id, {})).rejects.toThrow('regrading');
      const question = await prisma.submissionQuestions.findUniqueOrThrow({
        where: { id: fixture.questions[2].id },
      });
      expect(Number(question.score)).toBe(1);
      expect(question.answer).toBeNull();
      await prisma.submission.update({
        where: { id: fixture.id },
        data: { status: 'IN_PROGRESS' },
      });
      await expect(
        legacy.update(fixture.id, { total_score: 2 }),
      ).rejects.toThrow('regrading');
    });

    it('serializes a competing automatic grade and manual publication without overwriting either', async () => {
      await grading.saveDraft(fixture.id, owner, draft());
      const [automatic, manual] = await Promise.allSettled([
        runtime.gradeSubmission(fixture.id),
        grading.publish(fixture.id, owner, { revision: 1 }),
      ]);
      expect(automatic.status).toBe('fulfilled');
      const result = await grading.getWorkspace(fixture.id, owner);
      expect(result.submission.grading_revision).toBe(1);
      expect(
        await prisma.notification.count({ where: { target_id: fixture.id } }),
      ).toBe(1);
      if (manual.status === 'fulfilled') {
        expect(Number(result.submission.total_score)).toBe(6.1);
        expect(result.history).toHaveLength(1);
      } else {
        expect(manual.reason).toBeInstanceOf(ConflictException);
        expect(Number(result.submission.total_score)).toBe(0);
        expect(result.history).toHaveLength(0);
      }
    });

    it('excludes deleted question slots from grading denominator and required score set', async () => {
      await prisma.submissionQuestions.update({
        where: { id: fixture.questions[2].id },
        data: { is_deleted: true },
      });
      const body = draft([1, 0.5, 0]);
      body.scores.pop();
      await grading.saveDraft(fixture.id, owner, body);
      const result = await grading.publish(fixture.id, owner, { revision: 1 });
      expect(Number(result.submission.total_score)).toBe(7.5);
      expect(result.submission.rating).toBe('GOOD');
    });
  },
);
