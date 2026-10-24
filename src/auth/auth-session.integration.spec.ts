import { Test } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { Server as HttpServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthSessionService,
  SessionClaims,
  SessionTokens,
  LoginSessionResult,
} from './auth-session.service';
import { AuthModule } from './auth.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { SubmissionController } from '../submission/submission.controller';
import { SubmissionService } from '../submission/submission.service';
import { SubmissionRepository } from '../submission/submission.repository';
import { ExamRuntimeController } from '../exam-runtime/exam-runtime.controller';
import { ExamRuntimeService } from '../exam-runtime/exam-runtime.service';
import { ExamRuntimeEventsService } from '../exam-runtime/exam-runtime-events.service';
import { ExamRuntimeQueueService } from '../exam-runtime/exam-runtime-queue.service';
import { ExamMonitorAggregator } from '../exam-runtime/exam-monitor-aggregator.service';
import { NotificationGateway } from '../notification/notification.gateway';

const databaseUrl = process.env.AUTH_SESSION_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration(
  'Auth sessions with disposable PostgreSQL and real HTTP guards',
  () => {
    let prisma: PrismaService;
    let sessions: AuthSessionService;
    let jwt: JwtService;
    let app: INestApplication;
    let pool: Pool;
    const config = new ConfigService({
      JWT_ACCESS_SECRET: 'access-fixture-'.repeat(6),
      JWT_REFRESH_SECRET: 'refresh-fixture-'.repeat(6),
      ENCRYPTION_SECRET: 'encryption-fixture-'.repeat(4),
      JWT_ACCESS_EXPIRES: '15m',
      JWT_REFRESH_EXPIRES: '7d',
      NODE_ENV: 'test',
      FRONTEND_URL: 'http://localhost:3000',
      GOOGLE_CLIENT_ID: 'fixture-google',
      GOOGLE_CLIENT_SECRET: 'fixture-google-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3001/auth/google/callback',
      OUTLOOK_CLIENT_ID: 'fixture-outlook',
      OUTLOOK_CLIENT_SECRET: 'fixture-outlook-secret',
      OUTLOOK_CALLBACK_URL: 'http://localhost:3001/auth/outlook/callback',
    });

    beforeAll(async () => {
      // This suite exclusively owns the test container/database and never loads .env.
      if (
        !databaseUrl ||
        process.env.DATABASE_URL !== databaseUrl ||
        new URL(databaseUrl).hostname !== '127.0.0.1' ||
        new URL(databaseUrl).port !== '55440' ||
        new URL(databaseUrl).pathname !== '/testhub_auth_test'
      )
        throw new Error('Use only the dedicated auth test database');
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
          '--config',
          'src/auth/testing/prisma-fixture.config.ts',
        ],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      const existing = await pool.query<{ name: string | null }>(
        "SELECT to_regclass('public.auth_sessions') AS name",
      );
      if (!existing.rows[0].name) await pool.query(sql);
      // Constructor reads the fixture URL provided to this test process, never a project env file.
      prisma = new PrismaService();
      await prisma.$connect();
      const module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
          EncryptionModule,
          AuthModule,
        ],
        controllers: [SubmissionController, ExamRuntimeController],
        providers: [
          SubmissionService,
          SubmissionRepository,
          ExamRuntimeService,
          { provide: ExamRuntimeEventsService, useValue: { emit: jest.fn() } },
          {
            provide: ExamRuntimeQueueService,
            useValue: {
              scheduleExam: jest.fn(),
              scheduleAutoSubmit: jest.fn(),
              enqueueGradeSubmission: jest.fn(),
            },
          },
          {
            provide: ExamMonitorAggregator,
            useValue: { markDirty: jest.fn() },
          },
          { provide: NotificationGateway, useValue: {} },
        ],
      })
        .overrideProvider(PrismaService)
        .useValue(prisma)
        .overrideProvider(ConfigService)
        .useValue(config)
        .compile();
      sessions = module.get(AuthSessionService);
      jwt = module.get(JwtService);
      app = module.createNestApplication();
      app.use(cookieParser());
      app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      await app.init();
    }, 60000);

    beforeEach(async () => {
      await prisma.examSession.deleteMany();
      await prisma.user.deleteMany();
    });
    afterAll(async () => {
      await app?.close();
      await prisma?.onModuleDestroy();
      await pool?.end();
    });

    async function user(role: UserRole = 'STUDENT') {
      return prisma.user.create({
        data: {
          id: randomUUID(),
          full_name: 'Session fixture',
          email: `${randomUUID()}@example.test`,
          role,
          password: await bcrypt.hash('fixture-password', 4),
        },
      });
    }
    function tokens(result: LoginSessionResult): SessionTokens {
      if (!('tokens' in result)) throw new Error('Expected active session');
      return result.tokens;
    }
    function transfer(result: LoginSessionResult): string {
      if (!('transferToken' in result)) throw new Error('Expected transfer');
      return result.transferToken;
    }
    const claims = (token: string) => jwt.decode<SessionClaims>(token);
    async function attempt(studentId: string, lecturerId: string) {
      const topic = await prisma.current.topic.create({
        data: { name: 'Fixture topic', created_by: lecturerId },
      });
      const exam = await prisma.current.exam.create({
        data: {
          title: 'Fixture exam',
          topic_id: topic.id,
          lecturer_id: lecturerId,
          exam_start_time: new Date(Date.now() - 60000),
          exam_end_time: new Date(Date.now() + 3600000),
          duration: 60,
        },
      });
      return prisma.current.submission.create({
        data: {
          exam_id: exam.id,
          student_id: studentId,
          start_time: new Date(),
          auto_submit_at: new Date(Date.now() + 3600000),
        },
      });
    }

    it('keeps old student access until explicit confirmation, then revokes it immediately', async () => {
      const student = await user();
      const old = tokens(await sessions.login(student.id));
      const pending = transfer(await sessions.login(student.id));
      await expect(
        sessions.assertActive(claims(old.accessToken)),
      ).resolves.toBeDefined();
      const fresh = await sessions.completeTransfer(pending);
      await expect(
        sessions.assertActive(claims(old.accessToken)),
      ).rejects.toThrow();
      await expect(
        sessions.assertActive(claims(fresh.accessToken)),
      ).resolves.toBeDefined();
      expect(
        await prisma.authSession.count({ where: { student_slot: student.id } }),
      ).toBe(1);
    });

    it('supports independent lecturer/admin sessions and session-local logout', async () => {
      for (const role of ['LECTURER', 'ADMIN'] as const) {
        const staff = await user(role);
        const a = tokens(await sessions.login(staff.id));
        const b = tokens(await sessions.login(staff.id));
        await sessions.refresh(claims(a.refreshToken), a.refreshToken);
        await sessions.logout(staff.id, claims(a.accessToken).sid);
        await expect(
          sessions.assertActive(claims(a.accessToken)),
        ).rejects.toThrow();
        await expect(
          sessions.assertActive(claims(b.accessToken)),
        ).resolves.toBeDefined();
      }
    });

    it('resumes the same verified browser without creating a transfer', async () => {
      const student = await user();
      const a = tokens(await sessions.login(student.id));
      const b = tokens(
        await sessions.login(student.id, claims(a.accessToken).sid),
      );
      expect(claims(a.accessToken).sid).toBe(claims(b.accessToken).sid);
    });

    it('requires the responsible lecturer, preserves the attempt and denies student/foreign approval', async () => {
      const student = await user();
      const lecturer = await user('LECTURER');
      const foreign = await user('LECTURER');
      const old = tokens(await sessions.login(student.id));
      const submission = await attempt(student.id, lecturer.id);
      const pending = transfer(await sessions.login(student.id));
      const id = claims(pending).sid;
      await expect(sessions.completeTransfer(pending)).rejects.toThrow(
        'staff approval',
      );
      await expect(sessions.approveTransfer(id, student.id)).rejects.toThrow();
      await expect(sessions.approveTransfer(id, foreign.id)).rejects.toThrow();
      expect(
        await sessions.pendingTransfers(foreign.id, submission.exam_id),
      ).toEqual([]);
      await sessions.approveTransfer(id, lecturer.id);
      await expect(
        sessions.assertActive(claims(old.accessToken)),
      ).resolves.toBeDefined();
      await sessions.completeTransfer(pending);
      const after = await prisma.submission.findUniqueOrThrow({
        where: { id: submission.id },
      });
      expect(after).toEqual(submission);
    });

    it('rechecks exam start between login and self-confirmation', async () => {
      const student = await user();
      const lecturer = await user('LECTURER');
      const old = tokens(await sessions.login(student.id));
      const pending = transfer(await sessions.login(student.id));
      await sessions.runStudentMutation(
        student.id,
        claims(old.accessToken).sid,
        () => attempt(student.id, lecturer.id),
      );
      await expect(sessions.completeTransfer(pending)).rejects.toThrow(
        'staff approval',
      );
    });

    it('does not allow one lecturer to override another active exam', async () => {
      const student = await user();
      const a = await user('LECTURER');
      const b = await user('LECTURER');
      const admin = await user('ADMIN');
      await sessions.login(student.id);
      await attempt(student.id, a.id);
      await attempt(student.id, b.id);
      const pending = transfer(await sessions.login(student.id));
      await expect(
        sessions.approveTransfer(claims(pending).sid, a.id),
      ).rejects.toThrow();
      await sessions.approveTransfer(claims(pending).sid, admin.id);
      await expect(sessions.completeTransfer(pending)).resolves.toBeDefined();
    });

    it('serializes simultaneous logins and enforces the unique student slot', async () => {
      const student = await user();
      const results = await Promise.all([
        sessions.login(student.id),
        sessions.login(student.id),
        sessions.login(student.id),
      ]);
      expect(results.filter((result) => 'tokens' in result)).toHaveLength(1);
      expect(
        await prisma.authSession.count({ where: { student_slot: student.id } }),
      ).toBe(1);
    });

    it('replays concurrent confirmations into the same session without duplicate active slots', async () => {
      const student = await user();
      await sessions.login(student.id);
      const pending = transfer(await sessions.login(student.id));
      const results = await Promise.all([
        sessions.completeTransfer(pending),
        sessions.completeTransfer(pending),
      ]);
      expect(claims(results[0].accessToken).sid).toBe(
        claims(results[1].accessToken).sid,
      );
      expect(results[0].refreshToken).toBe(results[1].refreshToken);
      expect(
        await prisma.authSession.count({ where: { student_slot: student.id } }),
      ).toBe(1);
    });

    it('recovers a lost transfer response, but cannot revive a subsequently revoked session', async () => {
      const student = await user();
      await sessions.login(student.id);
      const pending = transfer(await sessions.login(student.id));
      const first = await sessions.completeTransfer(pending);
      const rotated = await sessions.refresh(
        claims(first.refreshToken),
        first.refreshToken,
      );
      expect((await sessions.transferStatus(pending)).status).toBe('APPROVED');
      const replay = await sessions.completeTransfer(pending);
      expect(replay.refreshToken).toBe(rotated.refreshToken);
      const replacement = transfer(await sessions.login(student.id));
      await sessions.completeTransfer(replacement);
      await expect(sessions.completeTransfer(pending)).rejects.toThrow();
    });

    it('returns the same successor for parallel refresh, then rejects old refresh outside grace', async () => {
      const student = await user();
      const a = tokens(await sessions.login(student.id));
      const [b, c] = await Promise.all([
        sessions.refresh(claims(a.refreshToken), a.refreshToken),
        sessions.refresh(claims(a.refreshToken), a.refreshToken),
      ]);
      expect(b.refreshToken).toBe(c.refreshToken);
      expect(b.refreshToken).not.toBe(a.refreshToken);
      await prisma.authSession.update({
        where: { id: claims(a.accessToken).sid },
        data: { previous_valid_until: new Date(0) },
      });
      await expect(
        sessions.refresh(claims(a.refreshToken), a.refreshToken),
      ).rejects.toThrow();
      await expect(
        sessions.refresh(claims(b.refreshToken), b.refreshToken),
      ).resolves.toBeDefined();
    });

    it('fences in-flight writes before transfer and rejects old writes afterwards', async () => {
      const student = await user();
      const old = tokens(await sessions.login(student.id));
      const pending = transfer(await sessions.login(student.id));
      let entered: () => void = () => {
        throw new Error('Signal not initialized');
      };
      let release: () => void = () => {
        throw new Error('Signal not initialized');
      };
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const unblock = new Promise<void>((resolve) => {
        release = resolve;
      });
      const writer = sessions.runStudentMutation(
        student.id,
        claims(old.accessToken).sid,
        async () => {
          entered();
          await unblock;
          await prisma.current.user.update({
            where: { id: student.id },
            data: { school: 'Saved before transfer' },
          });
        },
      );
      await started;
      const switching = sessions.completeTransfer(pending);
      release();
      await writer;
      await switching;
      await expect(
        sessions.runStudentMutation(
          student.id,
          claims(old.accessToken).sid,
          async () => {
            await prisma.current.user.update({
              where: { id: student.id },
              data: { school: 'Forbidden old write' },
            });
          },
        ),
      ).rejects.toThrow();
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: student.id } }))
          .school,
      ).toBe('Saved before transfer');
    });

    it('rolls back database changes and discards queue effects on failure', async () => {
      const student = await user();
      const a = tokens(await sessions.login(student.id));
      const effect = jest.fn();
      await expect(
        sessions.runStudentMutation(
          student.id,
          claims(a.accessToken).sid,
          async () => {
            await prisma.current.user.update({
              where: { id: student.id },
              data: { school: 'Rolled back' },
            });
            await prisma.afterCommit(effect);
            throw new Error('Rollback fixture');
          },
        ),
      ).rejects.toThrow('Rollback fixture');
      expect(effect).not.toHaveBeenCalled();
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: student.id } }))
          .school,
      ).toBeNull();
    });

    it('runs effects after the fenced transaction is visible to other connections', async () => {
      const student = await user();
      const a = tokens(await sessions.login(student.id));
      let observed: string | null = null;
      await sessions.runStudentMutation(
        student.id,
        claims(a.accessToken).sid,
        async () => {
          await prisma.current.user.update({
            where: { id: student.id },
            data: { school: 'Committed' },
          });
          await prisma.afterCommit(async () => {
            observed = (
              await prisma.user.findUniqueOrThrow({ where: { id: student.id } })
            ).school;
          });
          expect(observed).toBeNull();
        },
      );
      expect(observed).toBe('Committed');
    });

    it('rejects expired transfer requests and legacy/type-confused access tokens', async () => {
      const student = await user();
      await sessions.login(student.id);
      const pending = transfer(await sessions.login(student.id));
      await prisma.authSession.update({
        where: { id: claims(pending).sid },
        data: { expires_at: new Date(0) },
      });
      await expect(sessions.completeTransfer(pending)).rejects.toThrow();
      await expect(sessions.assertActive(claims(pending))).rejects.toThrow();
      await expect(
        sessions.assertActive({ sub: student.id } as SessionClaims),
      ).rejects.toThrow();
    });

    it('rejects cross-origin and missing-origin session changes', async () => {
      const student = await user();
      await request(app.getHttpServer() as HttpServer)
        .post('/auth/login')
        .send({ email: student.email, password: 'fixture-password' })
        .expect(403);
      await request(app.getHttpServer() as HttpServer)
        .post('/auth/login')
        .set('Origin', 'https://untrusted.example.test')
        .send({ email: student.email, password: 'fixture-password' })
        .expect(403);
      expect(await prisma.authSession.count()).toBe(0);
    });

    it('supports cookie login, transfer challenge, immediate revocation and configured cookie lifetime over HTTP', async () => {
      const student = await user();
      const a = request.agent(app.getHttpServer() as HttpServer);
      const b = request.agent(app.getHttpServer() as HttpServer);
      const login = await a
        .post('/auth/login')
        .set('Origin', 'http://localhost:3000')
        .send({ email: student.email, password: 'fixture-password' })
        .expect(200);
      expect(String(login.headers['set-cookie'])).toContain('Max-Age=900');
      expect(String(login.headers['set-cookie'])).toContain(
        'Path=/auth/refresh',
      );
      await a.get('/auth/me').expect(200);
      await b
        .post('/auth/login')
        .set('Origin', 'http://localhost:3000')
        .send({ email: student.email, password: 'fixture-password' })
        .expect(409)
        .expect(({ body }) => {
          const response = body as {
            code?: string;
            approvalRequired?: boolean;
            transferToken?: string;
          };
          expect(response.code).toBe('SESSION_TRANSFER_REQUIRED');
          expect(response.approvalRequired).toBe(false);
          expect(response.transferToken).toBeUndefined();
        });
      await b.get('/auth/session-transfer').expect(200);
      await a.get('/auth/me').expect(200);
      await b
        .post('/auth/session-transfer/complete')
        .set('Origin', 'http://localhost:3000')
        .expect(200);
      await a.get('/auth/me').expect(401);
      await b.get('/auth/me').expect(200);
      await a
        .post('/auth/refresh')
        .set('Origin', 'http://localhost:3000')
        .expect(401);
    });

    it('refreshes an OAuth-only user without creating a local account', async () => {
      const student = await user();
      await prisma.account.create({
        data: {
          user_id: student.id,
          provider: 'google',
          provider_id: randomUUID(),
        },
      });
      const active = tokens(await sessions.login(student.id));
      await request(app.getHttpServer() as HttpServer)
        .post('/auth/refresh')
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', 'refresh_token=' + active.refreshToken)
        .expect(200);
      expect(
        await prisma.account.count({
          where: { user_id: student.id, provider: 'local' },
        }),
      ).toBe(0);
    });

    it('fences actual exam start, heartbeat, answer save and submission endpoints across a device switch', async () => {
      const student = await user();
      const lecturer = await user('LECTURER');
      const old = tokens(await sessions.login(student.id));
      const examAttempt = await attempt(student.id, lecturer.id);
      const exam = await prisma.exam.update({
        where: { id: examAttempt.exam_id },
        data: { is_public: true },
      });
      const chapter = await prisma.chapter.create({
        data: { topic_id: exam.topic_id, name: 'Fixture chapter', order: 1 },
      });
      const question = await prisma.question.create({
        data: {
          chapter_id: chapter.id,
          question_text: 'Fixture question',
          question_type: 'ESSAY',
          question_format: 'KNOWLEDGE',
          correct_answer: 'Saved answer',
        },
      });
      await prisma.examQuestions.create({
        data: { exam_id: exam.id, question_id: question.id },
      });
      const oldBrowser = request.agent(app.getHttpServer() as HttpServer);
      const cookie = 'access_token=' + old.accessToken;
      await oldBrowser
        .post(`/submission/exams/${exam.id}/start`)
        .set('Cookie', cookie)
        .expect(200);
      await oldBrowser
        .get(`/submission/exams/${exam.id}/session`)
        .set('Cookie', cookie)
        .expect(200);
      await oldBrowser
        .post(`/exam-runtime/submissions/${examAttempt.id}/ping`)
        .set('Cookie', cookie)
        .expect(200);
      const answer = {
        submission_id: examAttempt.id,
        question_id: question.id,
        answer: 'Saved answer',
      };
      await oldBrowser
        .post('/submission/submit-by-question')
        .set('Cookie', cookie)
        .send(answer)
        .expect(200);
      const pending = transfer(await sessions.login(student.id));
      await sessions.approveTransfer(claims(pending).sid, lecturer.id);
      const fresh = await sessions.completeTransfer(pending);
      await oldBrowser
        .post('/submission/submit-by-question')
        .set('Cookie', cookie)
        .send({ ...answer, answer: 'Forbidden' })
        .expect(401);
      await oldBrowser
        .post(`/exam-runtime/submissions/${examAttempt.id}/ping`)
        .set('Cookie', cookie)
        .expect(401);
      const newCookie = 'access_token=' + fresh.accessToken;
      const read = await oldBrowser
        .get(`/submission/exams/${exam.id}/session`)
        .set('Cookie', newCookie)
        .expect(200);
      const session = read.body as {
        data: {
          submissionId: string;
          questions: Array<{ submitted_answer: string }>;
        };
      };
      expect(session.data.submissionId).toBe(examAttempt.id);
      expect(session.data.questions[0].submitted_answer).toBe('Saved answer');
      const after = await prisma.submission.findUniqueOrThrow({
        where: { id: examAttempt.id },
      });
      expect(after.auto_submit_at).toEqual(examAttempt.auto_submit_at);
      await oldBrowser
        .post('/submission/submit-exam')
        .set('Cookie', newCookie)
        .send({
          submission_id: examAttempt.id,
          start_time: examAttempt.start_time?.toISOString(),
          end_time: new Date().toISOString(),
          question_length: 1,
        })
        .expect(200);
      expect(
        (
          await prisma.submission.findUniqueOrThrow({
            where: { id: examAttempt.id },
          })
        ).status,
      ).toBe('COMPLETED');
    });

    it('serializes two actual HTTP exam starts into one attempt and rejects student identity spoofing', async () => {
      const student = await user();
      const lecturer = await user('LECTURER');
      const fixture = await attempt(student.id, lecturer.id);
      await prisma.submission.delete({ where: { id: fixture.id } });
      await prisma.exam.update({
        where: { id: fixture.exam_id },
        data: { is_public: true },
      });
      const exam = await prisma.exam.findUniqueOrThrow({
        where: { id: fixture.exam_id },
      });
      const chapter = await prisma.chapter.create({
        data: {
          topic_id: exam.topic_id,
          name: 'Start fixture chapter',
          order: 1,
        },
      });
      const question = await prisma.question.create({
        data: {
          chapter_id: chapter.id,
          question_text: 'Start fixture question',
          question_type: 'ESSAY',
          question_format: 'KNOWLEDGE',
          correct_answer: 'Fixture answer',
        },
      });
      await prisma.examQuestions.create({
        data: { exam_id: exam.id, question_id: question.id },
      });
      const active = tokens(await sessions.login(student.id));
      const http = () =>
        request(app.getHttpServer() as HttpServer)
          .post(`/submission/exams/${fixture.exam_id}/start`)
          .set('Cookie', 'access_token=' + active.accessToken);
      await Promise.all([http().expect(200), http().expect(200)]);
      expect(
        await prisma.submission.count({
          where: { exam_id: fixture.exam_id, student_id: student.id },
        }),
      ).toBe(1);
      await request(app.getHttpServer() as HttpServer)
        .post('/submission/start-exam')
        .set('Cookie', 'access_token=' + active.accessToken)
        .send({ examId: fixture.exam_id, studentId: lecturer.id })
        .expect(403);
    });
  },
);
