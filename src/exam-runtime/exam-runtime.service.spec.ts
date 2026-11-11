import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ExamRuntimeService } from './exam-runtime.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ExamRuntimeEventsService } from './exam-runtime-events.service';
import { ExamRuntimeQueueService } from './exam-runtime-queue.service';
import { ExamMonitorAggregator } from './exam-monitor-aggregator.service';
import { NotificationGateway } from '@/notification/notification.gateway';
import { ExamMode, Prisma, QuestionFormat, QuestionType } from '@prisma/client';
import { randomUUID } from 'node:crypto';

describe('ExamRuntimeService', () => {
  let service: ExamRuntimeService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      question: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
      $queryRaw: jest.fn((query: Prisma.Sql) =>
        Promise.resolve(query.values.map((id: unknown) => ({ id }))),
      ),
    };
    mockPrismaService.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) => callback(mockPrismaService),
    );

    Object.defineProperty(mockPrismaService, 'current', {
      configurable: true,
      get: () => mockPrismaService,
    });
    Object.defineProperty(mockPrismaService, 'inTransaction', {
      value: (callback: (tx: unknown) => unknown) =>
        (
          mockPrismaService as unknown as {
            $transaction: (cb: typeof callback) => unknown;
          }
        ).$transaction(callback),
    });
    Object.defineProperty(mockPrismaService, 'afterCommit', {
      value: (action: () => unknown) => action(),
    });
    const mockEventsService = {};
    const mockQueueService = {};
    const mockNotificationGateway = {};
    const mockMonitorAggregator = { markDirty: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamRuntimeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExamRuntimeEventsService, useValue: mockEventsService },
        { provide: ExamRuntimeQueueService, useValue: mockQueueService },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
        { provide: ExamMonitorAggregator, useValue: mockMonitorAggregator },
      ],
    }).compile();

    service = module.get<ExamRuntimeService>(ExamRuntimeService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('countTypeCapacity', () => {
    const rows = [
      {
        question_type: QuestionType.SINGLE_CHOICE,
        question_format: QuestionFormat.KNOWLEDGE,
        quantity: 3,
      },
      {
        question_type: QuestionType.SINGLE_CHOICE,
        question_format: QuestionFormat.UNDERSTANDING,
        quantity: 3,
      },
    ];

    it('queries the supplied transaction without using the root client', async () => {
      const rootQuery = jest.spyOn(prismaService, '$queryRaw');
      const query = jest.fn<Promise<unknown>, [TemplateStringsArray, string]>();
      query.mockResolvedValue([
        {
          question_type: 'SINGLE_CHOICE',
          question_format: 'KNOWLEDGE',
          total: 7,
        },
      ]);
      const db = { $queryRaw: query } as unknown as Prisma.TransactionClient;
      expect(await service.countTypeCapacity('topic-1', rows, db)).toEqual([
        7, 0,
      ]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(query.mock.calls[0][1]).toBe('topic-1');
      expect(rootQuery).not.toHaveBeenCalled();
    });

    it('defaults to the current client for print and configuration callers', async () => {
      const rootQuery = jest.spyOn(prismaService, '$queryRaw');
      const query = jest.fn<Promise<unknown>, [TemplateStringsArray, string]>();
      query.mockResolvedValue([
        {
          question_type: 'SINGLE_CHOICE',
          question_format: 'UNDERSTANDING',
          total: 9,
        },
      ]);
      const db = { $queryRaw: query } as unknown as Prisma.TransactionClient;
      jest.spyOn(prismaService, 'current', 'get').mockReturnValue(db);
      expect(await service.countTypeCapacity('topic-1', rows)).toEqual([0, 9]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(rootQuery).not.toHaveBeenCalled();
    });

    it('does not query for an empty distribution', async () => {
      const query = jest.spyOn(prismaService, '$queryRaw');
      expect(await service.countTypeCapacity('topic-1', [])).toEqual([]);
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('selectQuestions (ExamMode.RANDOM_N)', () => {
    it('should query matching question IDs, pick random ones, and query full question details', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const examData = {
        id: 'exam-id',
        topic_id: 'topic-id',
        mode: ExamMode.RANDOM_N,
        sample_size: 2,
        distribution: null,
      };

      const mockQuestionIds = [
        { id: 'q1' },
        { id: 'q2' },
        { id: 'q3' },
        { id: 'q4' },
      ];

      const mockQuestions = [
        {
          id: 'q1',
          question_text: 'Question 1',
          options: 'options1',
          question_type: 'SINGLE_CHOICE',
          question_format: 'TEXT',
          files: [],
        },
        {
          id: 'q2',
          question_text: 'Question 2',
          options: 'options3',
          question_type: 'SINGLE_CHOICE',
          question_format: 'TEXT',
          files: [],
        },
      ];

      // Mock first findMany call for question IDs
      const findManyMock = prismaService.question.findMany as jest.Mock;
      findManyMock
        .mockResolvedValueOnce(mockQuestionIds) // for IDs
        .mockResolvedValueOnce(mockQuestions); // for details

      const result = await (service as any).selectQuestions(examData);

      expect(findManyMock).toHaveBeenCalledTimes(2);

      // Verify first call filters by topic_id and is_deleted
      expect(findManyMock.mock.calls[0][0]).toEqual({
        where: {
          is_deleted: false,
          chapter: {
            topic_id: 'topic-id',
            is_deleted: false,
          },
        },
        select: {
          id: true,
        },
      });

      // Verify second call queries specific randomly chosen IDs
      const secondCallArgs = findManyMock.mock.calls[1][0];
      expect(secondCallArgs.select).toEqual({
        id: true,
        question_text: true,
        options: true,
        question_type: true,
        question_format: true,
        files: {
          orderBy: { order: 'asc' },
          select: {
            order: true,
            file: {
              select: { id: true, url: true, name: true, type: true },
            },
          },
        },
      });
      expect(secondCallArgs.where.id.in).toBeDefined();
      expect(secondCallArgs.where.id.in.length).toBe(2);
      // All selected IDs must be subset of mockQuestionIds
      const allowedIds = mockQuestionIds.map((q) => q.id);
      secondCallArgs.where.id.in.forEach((id: string) => {
        expect(allowedIds).toContain(id);
      });

      expect(result).toEqual([
        { ...mockQuestions[0], files: [] },
        { ...mockQuestions[1], files: [] },
      ]);
    });

    it('should throw BadRequestException when not enough question IDs exist', async () => {
      const examData = {
        id: 'exam-id',
        topic_id: 'topic-id',
        mode: ExamMode.RANDOM_N,
        sample_size: 2,
        distribution: null,
      };

      const findManyMock = prismaService.question.findMany as jest.Mock;
      findManyMock.mockResolvedValueOnce([]); // No IDs found

      await expect(
        (service as any).selectQuestions(examData),
      ).rejects.toThrow();

      expect(findManyMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('startExam question selection', () => {
    function setupSelection(mode: ExamMode, deleted = false, resume = false) {
      const id = randomUUID();
      const chapterId = randomUUID();
      const events: string[] = [];
      const question = {
        id,
        question_text: 'Fixture',
        options: null,
        question_type: QuestionType.SINGLE_CHOICE,
        question_format: QuestionFormat.KNOWLEDGE,
        files: [],
      };
      const exam = {
        id: randomUUID(),
        topic_id: randomUUID(),
        mode,
        sample_size: 1,
        duration: 30,
        exam_end_time: new Date(Date.now() + 3600000),
        distribution: JSON.stringify(
          mode === ExamMode.BY_CHAPTER
            ? [{ chapter_id: chapterId.toUpperCase(), quantity: 1 }]
            : [
                {
                  question_type: question.question_type,
                  question_format: question.question_format,
                  quantity: 1,
                },
              ],
        ),
      };
      const tx = {
        submission: {
          create: jest.fn().mockResolvedValue({ id: 'submission' }),
        },
        examQuestions: {
          findMany: jest.fn().mockResolvedValue([{ question_id: id }]),
        },
        question: {
          findMany: jest.fn((args: { select: { question_text?: boolean } }) => {
            if (!args.select.question_text) return Promise.resolve([{ id }]);
            events.push('hydrate');
            expect(events).toContain('lock');
            return Promise.resolve([question]);
          }),
        },
        $queryRaw: jest.fn((query: Prisma.Sql | TemplateStringsArray) => {
          if ('sql' in query && query.sql.includes('FOR SHARE')) {
            events.push('lock');
            expect(query.sql).toContain('is_deleted = false');
            expect(query.sql).toContain('ORDER BY id FOR SHARE');
            expect(query.values).toEqual([id]);
            return Promise.resolve(deleted ? [] : [{ id }]);
          }
          return Promise.resolve(
            mode === ExamMode.BY_CHAPTER
              ? [{ chapter_id: chapterId, question_id: id }]
              : [{ id }],
          );
        }),
        submissionQuestions: {
          count: jest.fn().mockResolvedValue(0),
          createMany: jest.fn(() => {
            events.push('persist');
            return Promise.resolve({ count: 1 });
          }),
        },
        examSession: { upsert: jest.fn().mockResolvedValue({}) },
      };
      const internals = service as unknown as {
        findExam: () => Promise<unknown>;
        assertCanAccessExam: () => Promise<void>;
        findInProgressSubmission: () => Promise<unknown>;
        assertRetakeAllowed: () => Promise<unknown>;
        assertWithinStartWindow: () => void;
        formatSubmissionExam: () => Promise<unknown>;
        touchSession: () => Promise<unknown>;
        queue: { scheduleAutoSubmit: () => Promise<void> };
      };
      jest.spyOn(internals, 'findExam').mockResolvedValue(exam);
      jest.spyOn(internals, 'assertCanAccessExam').mockResolvedValue(undefined);
      jest
        .spyOn(internals, 'findInProgressSubmission')
        .mockResolvedValue(resume ? { id: 'submission' } : null);
      jest.spyOn(internals, 'assertRetakeAllowed').mockResolvedValue(null);
      jest
        .spyOn(internals, 'assertWithinStartWindow')
        .mockImplementation(() => {});
      jest.spyOn(internals, 'formatSubmissionExam').mockResolvedValue({});
      jest.spyOn(internals, 'touchSession').mockResolvedValue({});
      jest.spyOn(service, 'emitActiveCount').mockResolvedValue(undefined);
      internals.queue.scheduleAutoSubmit = jest
        .fn()
        .mockResolvedValue(undefined);
      const root = prismaService as unknown as {
        $transaction: jest.Mock;
        $queryRaw: jest.Mock;
        question: { findMany: jest.Mock };
      };
      const transaction = root.$transaction;
      transaction.mockImplementation(
        async (action: (db: typeof tx) => Promise<unknown>) => {
          try {
            const result = await action(tx);
            events.push('commit');
            return result;
          } catch (error) {
            events.push('rollback');
            throw error;
          }
        },
      );
      return { id, exam, tx, events, transaction, root };
    }

    it.each([
      ExamMode.MANUAL,
      ExamMode.RANDOM_N,
      ExamMode.BY_TYPE,
      ExamMode.BY_CHAPTER,
    ])(
      '%s selects, locks, hydrates and persists on the same transaction',
      async (mode) => {
        const { id, exam, tx, events, transaction, root } =
          setupSelection(mode);
        await service.startExam(exam.id, 'student');
        expect(events).toEqual(['lock', 'hydrate', 'persist', 'commit']);
        expect(transaction).toHaveBeenCalledTimes(1);
        expect(root.question.findMany).not.toHaveBeenCalled();
        expect(root.$queryRaw).not.toHaveBeenCalled();
        expect(tx.submissionQuestions.createMany).toHaveBeenCalledWith({
          data: [{ submission_id: 'submission', question_id: id, order: 0 }],
          skipDuplicates: true,
        });
      },
    );

    it.each([
      ExamMode.MANUAL,
      ExamMode.RANDOM_N,
      ExamMode.BY_TYPE,
      ExamMode.BY_CHAPTER,
    ])(
      '%s refuses a question deleted before its lock is acquired',
      async (mode) => {
        const { exam, tx, events } = setupSelection(mode, true);
        await expect(service.startExam(exam.id, 'student')).rejects.toThrow(
          'Question bank changed',
        );
        expect(events).toEqual(['lock', 'rollback']);
        expect(tx.submissionQuestions.createMany).not.toHaveBeenCalled();
        expect(tx.examSession.upsert).not.toHaveBeenCalled();
      },
    );

    it('also uses a transaction when restoring a submission without question slots', async () => {
      const { exam, events, transaction } = setupSelection(
        ExamMode.BY_CHAPTER,
        false,
        true,
      );
      await service.startExam(exam.id, 'student');
      expect(events).toEqual(['lock', 'hydrate', 'persist', 'commit']);
      expect(transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('shuffleArray', () => {
    it('should return a permutation of the input without mutating it', () => {
      const input = [1, 2, 3, 4, 5];
      const original = [...input];

      const result = (service as any).shuffleArray(input);

      expect(input).toEqual(original);
      expect(result).toHaveLength(input.length);
      expect([...result].sort()).toEqual([...input].sort());
    });

    it('should return an empty array unchanged', () => {
      expect((service as any).shuffleArray([])).toEqual([]);
    });

    it('should return a single-element array unchanged', () => {
      expect((service as any).shuffleArray(['only'])).toEqual(['only']);
    });
  });

  describe('ensureSubmissionQuestions', () => {
    it('should shuffle selected questions and persist a sequential order when none exist yet', async () => {
      const mockCount = jest.fn().mockResolvedValue(0);
      const mockCreateMany = jest.fn().mockResolvedValue({ count: 3 });
      const mockDb: any = {
        submissionQuestions: {
          count: mockCount,
          createMany: mockCreateMany,
        },
      };

      const selectedQuestions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
      jest
        .spyOn(service as any, 'selectQuestions')
        .mockResolvedValue(selectedQuestions);

      await (service as any).ensureSubmissionQuestions(
        'submission-1',
        {
          id: 'exam-1',
          topic_id: 'topic-1',
          mode: ExamMode.MANUAL,
          sample_size: null,
          distribution: null,
        },
        mockDb,
      );

      expect(mockCreateMany).toHaveBeenCalledTimes(1);
      const { data } = mockCreateMany.mock.calls[0][0];
      expect(data).toHaveLength(3);
      data.forEach((row: any) => {
        expect(row.submission_id).toBe('submission-1');
      });
      expect(new Set(data.map((row: any) => row.order))).toEqual(
        new Set([0, 1, 2]),
      );
      expect(new Set(data.map((row: any) => row.question_id))).toEqual(
        new Set(['q1', 'q2', 'q3']),
      );
    });

    it('should not select or create questions when submission questions already exist', async () => {
      const mockCount = jest.fn().mockResolvedValue(3);
      const mockCreateMany = jest.fn();
      const mockDb: any = {
        submissionQuestions: {
          count: mockCount,
          createMany: mockCreateMany,
        },
      };
      const selectQuestionsSpy = jest.spyOn(service as any, 'selectQuestions');

      await (service as any).ensureSubmissionQuestions(
        'submission-1',
        {
          id: 'exam-1',
          topic_id: 'topic-1',
          mode: ExamMode.MANUAL,
          sample_size: null,
          distribution: null,
        },
        mockDb,
      );

      expect(selectQuestionsSpy).not.toHaveBeenCalled();
      expect(mockCreateMany).not.toHaveBeenCalled();
    });

    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment -- private service internals are exercised through `any` like the rest of this spec */
    describe('online distribution delta', () => {
      const typeExam = (overrides: Record<string, unknown> = {}) => ({
        id: 'exam-1',
        topic_id: 'topic-1',
        mode: ExamMode.BY_TYPE,
        sample_size: null,
        distribution: JSON.stringify([
          {
            question_type: 'SINGLE_CHOICE',
            question_format: 'KNOWLEDGE',
            quantity: 3,
          },
          {
            question_type: 'SINGLE_CHOICE',
            question_format: 'UNDERSTANDING',
            quantity: 3,
          },
        ]),
        distribution_delta: 1,
        distribution_delta_online: true,
        ...overrides,
      });
      const makeDb = (count = 0) => ({
        submissionQuestions: {
          count: jest.fn().mockResolvedValue(count),
          createMany: jest.fn().mockResolvedValue({ count: 6 }),
        },
        submission: { update: jest.fn().mockResolvedValue({}) },
      });
      const rows = Array.from({ length: 6 }, (_, i) => ({ id: `q${i}` }));

      it('plans a per-attempt quota and persists the slim metadata', async () => {
        const db = makeDb();
        const capacity = jest
          .spyOn(service, 'countTypeCapacity')
          .mockResolvedValue([20, 20]);
        const select = jest
          .spyOn(service as any, 'selectQuestions')
          .mockResolvedValue(rows);

        await (service as any).ensureSubmissionQuestions(
          'sub-1',
          typeExam(),
          db,
        );

        expect(capacity).toHaveBeenCalledWith(
          'topic-1',
          JSON.parse(typeExam().distribution),
          db,
        );
        const override = select.mock.calls[0][2] as { quantity: number }[];
        expect(override.reduce((sum, row) => sum + row.quantity, 0)).toBe(6);
        const update = db.submission.update.mock.calls[0][0];
        expect(update.where).toEqual({ id: 'sub-1' });
        expect(update.data.selection_metadata).toMatchObject({
          v: 1,
          requested_delta: 1,
          status: 'applied',
        });
        expect(db.submissionQuestions.createMany).toHaveBeenCalledTimes(1);
      });

      it('falls back to the baseline when the planned quota cannot be filled', async () => {
        const db = makeDb();
        jest
          .spyOn(service as any, 'countTypeCapacity')
          .mockResolvedValue([20, 20]);
        const select = jest
          .spyOn(service as any, 'selectQuestions')
          .mockRejectedValueOnce(new BadRequestException('not enough'))
          .mockResolvedValueOnce(rows);

        await (service as any).ensureSubmissionQuestions(
          'sub-1',
          typeExam(),
          db,
        );

        expect(select).toHaveBeenCalledTimes(2);
        expect(select.mock.calls[1][2]).toBeUndefined();
        expect(
          db.submission.update.mock.calls[0][0].data.selection_metadata,
        ).toMatchObject({
          status: 'unchanged',
          reason: 'SELECTION_INSUFFICIENT',
        });
      });

      it('propagates unexpected errors without querying the baseline', async () => {
        const db = makeDb();
        jest.spyOn(service, 'countTypeCapacity').mockResolvedValue([20, 20]);
        const failure = new Error('transaction aborted');
        const select = jest
          .spyOn(service as any, 'selectQuestions')
          .mockRejectedValueOnce(failure);

        await expect(
          (service as any).ensureSubmissionQuestions('sub-1', typeExam(), db),
        ).rejects.toBe(failure);

        expect(select).toHaveBeenCalledTimes(1);
        expect(db.submission.update).not.toHaveBeenCalled();
        expect(db.submissionQuestions.createMany).not.toHaveBeenCalled();
      });

      it('does not retry a failed unchanged quota', async () => {
        const db = makeDb();
        jest.spyOn(service, 'countTypeCapacity').mockResolvedValue([3, 3]);
        const failure = new BadRequestException('not enough');
        const select = jest
          .spyOn(service as any, 'selectQuestions')
          .mockRejectedValueOnce(failure);

        await expect(
          (service as any).ensureSubmissionQuestions('sub-1', typeExam(), db),
        ).rejects.toBe(failure);

        expect(select).toHaveBeenCalledTimes(1);
        expect(db.submission.update).not.toHaveBeenCalled();
        expect(db.submissionQuestions.createMany).not.toHaveBeenCalled();
      });

      it('does not plan or write metadata when online delta is off', async () => {
        const db = makeDb();
        const capacity = jest.spyOn(service as any, 'countTypeCapacity');
        const select = jest
          .spyOn(service as any, 'selectQuestions')
          .mockResolvedValue(rows);

        await (service as any).ensureSubmissionQuestions(
          'sub-1',
          typeExam({ distribution_delta_online: false }),
          db,
        );

        expect(capacity).not.toHaveBeenCalled();
        expect(select.mock.calls[0][2]).toBeUndefined();
        expect(db.submission.update).not.toHaveBeenCalled();
      });

      it('leaves slots and metadata untouched on resume', async () => {
        const db = makeDb(6);
        const select = jest.spyOn(service as any, 'selectQuestions');

        await (service as any).ensureSubmissionQuestions(
          'sub-1',
          typeExam(),
          db,
        );

        expect(select).not.toHaveBeenCalled();
        expect(db.submission.update).not.toHaveBeenCalled();
      });
    });
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
  });

  describe('formatSubmissionExam', () => {
    it('should expose submitted answer/options without leaking score or is_correct', async () => {
      (prismaService as any).submission = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'submission-1',
          exam: {
            id: 'exam-1',
            title: 'Sample Exam',
            duration: 30,
            exam_start_time: new Date(),
            exam_end_time: new Date(),
            practice: false,
            mode: ExamMode.MANUAL,
            is_public: false,
          },
          session: { entered_at: new Date(), last_ping: new Date() },
          questions: [
            {
              answer: 'my essay answer',
              options: null,
              score: 1,
              is_correct: true,
              question: {
                id: 'q1',
                question_text: 'Essay question',
                options: null,
                question_type: 'ESSAY',
                question_format: 'KNOWLEDGE',
                files: [],
              },
            },
            {
              answer: null,
              options: null,
              score: null,
              is_correct: false,
              question: {
                id: 'q2',
                question_text: 'Unanswered question',
                options: null,
                question_type: 'ESSAY',
                question_format: 'KNOWLEDGE',
                files: [],
              },
            },
          ],
        }),
      };

      const result = await (service as any).formatSubmissionExam(
        'submission-1',
      );

      expect(result.questions[0]).toMatchObject({
        id: 'q1',
        submitted_answer: 'my essay answer',
        answered: true,
      });
      expect(result.questions[0]).not.toHaveProperty('score');
      expect(result.questions[0]).not.toHaveProperty('is_correct');

      expect(result.questions[1]).toMatchObject({
        id: 'q2',
        submitted_answer: null,
        submitted_options: null,
        answered: false,
      });
    });
  });

  describe('completeSubmission', () => {
    let mockSubmissionFindFirst: jest.Mock;
    let mockSubmissionUpdate: jest.Mock;
    let mockExamSessionUpdateMany: jest.Mock;
    let mockQueueEnqueueGradeSubmission: jest.Mock;

    beforeEach(() => {
      mockSubmissionFindFirst = jest.fn();
      mockSubmissionUpdate = jest.fn();
      mockExamSessionUpdateMany = jest.fn();
      mockQueueEnqueueGradeSubmission = jest.fn();

      (prismaService as any).submission = {
        findFirst: mockSubmissionFindFirst,
        update: mockSubmissionUpdate,
      };
      (prismaService as any).examSession = {
        updateMany: mockExamSessionUpdateMany,
      };
      (service as any).queue = {
        enqueueGradeSubmission: mockQueueEnqueueGradeSubmission,
      };
      (service as any).emitActiveCount = jest.fn();
    });

    it('should complete submission without studentId when not provided', async () => {
      const submissionId = 'sub-1';
      mockSubmissionFindFirst.mockResolvedValue({
        id: submissionId,
        exam_id: 'exam-1',
        status: 'IN_PROGRESS',
        start_time: new Date(),
      });
      mockSubmissionUpdate.mockResolvedValue({});
      mockExamSessionUpdateMany.mockResolvedValue({});
      mockQueueEnqueueGradeSubmission.mockResolvedValue({});

      await service.completeSubmission(submissionId);

      expect(mockSubmissionFindFirst).toHaveBeenCalledWith({
        where: {
          id: submissionId,
          is_deleted: false,
        },
        select: {
          id: true,
          exam_id: true,
          status: true,
          start_time: true,
        },
      });
    });

    it('should complete submission with studentId when provided', async () => {
      const submissionId = 'sub-1';
      const studentId = 'student-123';
      mockSubmissionFindFirst.mockResolvedValue({
        id: submissionId,
        exam_id: 'exam-1',
        status: 'IN_PROGRESS',
        start_time: new Date(),
      });
      mockSubmissionUpdate.mockResolvedValue({});
      mockExamSessionUpdateMany.mockResolvedValue({});
      mockQueueEnqueueGradeSubmission.mockResolvedValue({});

      await service.completeSubmission(
        submissionId,
        new Date(),
        undefined,
        studentId,
      );

      expect(mockSubmissionFindFirst).toHaveBeenCalledWith({
        where: {
          id: submissionId,
          is_deleted: false,
          student_id: studentId,
        },
        select: {
          id: true,
          exam_id: true,
          status: true,
          start_time: true,
        },
      });
    });
  });

  describe('assertRetakeAllowed', () => {
    it('never blocks practice exams, regardless of prior completions', async () => {
      const mockSubmissionFindFirst = jest.fn();
      (prismaService as any).submission = {
        findFirst: mockSubmissionFindFirst,
      };

      const grant = await (service as any).assertRetakeAllowed(
        { id: 'exam-1', practice: true },
        'student-1',
      );

      expect(grant).toBeNull();
      expect(mockSubmissionFindFirst).not.toHaveBeenCalled();
    });

    it('allows an official exam with no prior COMPLETED submission', async () => {
      const mockSubmissionFindFirst = jest.fn().mockResolvedValue(null);
      (prismaService as any).submission = {
        findFirst: mockSubmissionFindFirst,
      };

      const grant = await (service as any).assertRetakeAllowed(
        { id: 'exam-1', practice: false },
        'student-1',
      );

      expect(grant).toBeNull();
    });

    it('blocks re-entry to an official exam once COMPLETED, with no retry grant', async () => {
      const mockSubmissionFindFirst = jest
        .fn()
        .mockResolvedValue({ id: 'prior-submission' });
      const mockRetryGrantFindFirst = jest.fn().mockResolvedValue(null);
      (prismaService as any).submission = {
        findFirst: mockSubmissionFindFirst,
      };
      (prismaService as any).examRetryGrant = {
        findFirst: mockRetryGrantFindFirst,
      };

      await expect(
        (service as any).assertRetakeAllowed(
          { id: 'exam-1', practice: false },
          'student-1',
        ),
      ).rejects.toThrow(
        'This exam has already been completed and cannot be retaken',
      );
    });

    it('lets a completed official exam be retaken when an unconsumed retry grant exists', async () => {
      const mockSubmissionFindFirst = jest
        .fn()
        .mockResolvedValue({ id: 'prior-submission' });
      const grantRow = { id: 'grant-1', consumed_at: null };
      const mockRetryGrantFindFirst = jest.fn().mockResolvedValue(grantRow);
      (prismaService as any).submission = {
        findFirst: mockSubmissionFindFirst,
      };
      (prismaService as any).examRetryGrant = {
        findFirst: mockRetryGrantFindFirst,
      };

      const grant = await (service as any).assertRetakeAllowed(
        { id: 'exam-1', practice: false },
        'student-1',
      );

      expect(grant).toBe(grantRow);
      expect(mockRetryGrantFindFirst).toHaveBeenCalledWith({
        where: {
          exam_id: 'exam-1',
          student_id: 'student-1',
          consumed_at: null,
        },
        orderBy: { created_at: 'desc' },
      });
    });
  });

  describe('extendTime', () => {
    it('rejects an extraMinutes value outside the allowed range', async () => {
      await expect(
        service.extendTime(
          'exam-1',
          'student-1',
          { id: 'lect-1', role: 'LECTURER' } as any,
          0,
        ),
      ).rejects.toThrow();
      await expect(
        service.extendTime(
          'exam-1',
          'student-1',
          { id: 'lect-1', role: 'LECTURER' } as any,
          999,
        ),
      ).rejects.toThrow();
    });

    it('rejects extending a practice exam', async () => {
      (prismaService as any).exam = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'exam-1',
          title: 'Practice run',
          lecturer_id: 'lect-1',
          practice: true,
        }),
      };

      await expect(
        service.extendTime(
          'exam-1',
          'student-1',
          { id: 'lect-1', role: 'LECTURER' } as any,
          15,
        ),
      ).rejects.toThrow('Practice exams cannot be extended');
    });

    it('pushes back auto_submit_at and reschedules the auto-submit job', async () => {
      const currentDeadline = new Date('2026-01-01T10:00:00.000Z');
      (prismaService as any).exam = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'exam-1',
          title: 'Official exam',
          lecturer_id: 'lect-1',
          practice: false,
        }),
      };
      const mockSubmissionFindFirst = jest.fn().mockResolvedValue({
        id: 'sub-1',
        auto_submit_at: currentDeadline,
      });
      const mockSubmissionUpdate = jest.fn().mockResolvedValue({});
      (prismaService as any).submission = {
        findFirst: mockSubmissionFindFirst,
        update: mockSubmissionUpdate,
      };
      const mockScheduleAutoSubmit = jest.fn().mockResolvedValue(undefined);
      (service as any).queue = { scheduleAutoSubmit: mockScheduleAutoSubmit };

      const result = await service.extendTime(
        'exam-1',
        'student-1',
        { id: 'lect-1', role: 'LECTURER' } as any,
        10,
      );

      const expectedDeadline = new Date(
        currentDeadline.getTime() + 10 * 60 * 1000,
      );
      expect(mockSubmissionUpdate).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { auto_submit_at: expectedDeadline },
      });
      expect(mockScheduleAutoSubmit).toHaveBeenCalledWith(
        'sub-1',
        expectedDeadline,
      );
      expect(result.data.submissionId).toBe('sub-1');
    });

    it('throws when the student has no in-progress attempt', async () => {
      (prismaService as any).exam = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'exam-1',
          title: 'Official exam',
          lecturer_id: 'lect-1',
          practice: false,
        }),
      };
      (prismaService as any).submission = {
        findFirst: jest.fn().mockResolvedValue(null),
      };

      await expect(
        service.extendTime(
          'exam-1',
          'student-1',
          { id: 'lect-1', role: 'LECTURER' } as any,
          10,
        ),
      ).rejects.toThrow('This student has no in-progress attempt to extend');
    });
  });

  describe('startExam with a retry grant', () => {
    it('bypasses assertWithinStartWindow and sets a fresh (non-past) auto_submit_at, since a grant only ever exists once the original entry window / exam_end_time has already passed', async () => {
      (prismaService as any).exam = {
        findFirst: jest.fn().mockResolvedValue({
          id: 'exam-1',
          practice: false,
          is_public: false,
          duration: 30,
          exam_start_time: new Date('2020-01-01T00:00:00.000Z'),
          exam_end_time: new Date('2020-01-01T01:00:00.000Z'),
        }),
      };
      (prismaService as any).examRegistration = {
        findFirst: jest.fn().mockResolvedValue({ id: 'reg-1' }),
      };
      (prismaService as any).submission = {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null) // findInProgressSubmission: none
          .mockResolvedValueOnce({ id: 'prior-sub' }), // assertRetakeAllowed: prior COMPLETED
      };
      (prismaService as any).examRetryGrant = {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'grant-1', consumed_at: null }),
      };

      const assertWithinStartWindowSpy = jest.spyOn(
        service as any,
        'assertWithinStartWindow',
      );
      jest
        .spyOn(service as any, 'ensureSubmissionQuestions')
        .mockResolvedValue(undefined);
      jest.spyOn(service as any, 'formatSubmissionExam').mockResolvedValue({});
      jest.spyOn(service, 'emitActiveCount').mockResolvedValue(undefined);

      const txSubmissionCreate = jest.fn().mockResolvedValue({ id: 'new-sub' });
      const txExamRetryGrantUpdate = jest.fn().mockResolvedValue({});
      (prismaService as any).$transaction = jest.fn(async (cb: any) =>
        cb({
          submission: { create: txSubmissionCreate },
          examSession: { upsert: jest.fn().mockResolvedValue({}) },
          examRetryGrant: { update: txExamRetryGrantUpdate },
        }),
      );
      (service as any).queue = {
        scheduleAutoSubmit: jest.fn().mockResolvedValue(undefined),
      };

      await service.startExam('exam-1', 'student-1');

      expect(assertWithinStartWindowSpy).not.toHaveBeenCalled();
      expect(txExamRetryGrantUpdate).toHaveBeenCalledWith({
        where: { id: 'grant-1' },
        data: { consumed_at: expect.any(Date) },
      });

      const autoSubmitAt: Date =
        txSubmissionCreate.mock.calls[0][0].data.auto_submit_at;
      expect(autoSubmitAt.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
