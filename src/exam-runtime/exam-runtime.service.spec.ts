import { Test, TestingModule } from '@nestjs/testing';
import { ExamRuntimeService } from './exam-runtime.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ExamRuntimeEventsService } from './exam-runtime-events.service';
import { ExamRuntimeQueueService } from './exam-runtime-queue.service';
import { NotificationGateway } from '@/notification/notification.gateway';
import { ExamMode } from '@prisma/client';

describe('ExamRuntimeService', () => {
  let service: ExamRuntimeService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      question: {
        findMany: jest.fn(),
      },
    };

    const mockEventsService = {};
    const mockQueueService = {};
    const mockNotificationGateway = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamRuntimeService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ExamRuntimeEventsService, useValue: mockEventsService },
        { provide: ExamRuntimeQueueService, useValue: mockQueueService },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
      ],
    }).compile();

    service = module.get<ExamRuntimeService>(ExamRuntimeService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('selectQuestions (ExamMode.RANDOM_N)', () => {
    it('should query matching question IDs, pick random ones, and query full question details', async () => {
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
          id: 'q3',
          question_text: 'Question 3',
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

      await service.completeSubmission(submissionId, new Date(), undefined, studentId);

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
});
