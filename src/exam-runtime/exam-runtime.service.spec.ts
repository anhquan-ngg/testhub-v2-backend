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
        },
        {
          id: 'q3',
          question_text: 'Question 3',
          options: 'options3',
          question_type: 'SINGLE_CHOICE',
          question_format: 'TEXT',
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
      });
      expect(secondCallArgs.where.id.in).toBeDefined();
      expect(secondCallArgs.where.id.in.length).toBe(2);
      // All selected IDs must be subset of mockQuestionIds
      const allowedIds = mockQuestionIds.map(q => q.id);
      secondCallArgs.where.id.in.forEach((id: string) => {
        expect(allowedIds).toContain(id);
      });

      expect(result).toEqual(mockQuestions);
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
