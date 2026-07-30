import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ExamMode,
  NotificationType,
  RegistrationStatus,
  Prisma,
  SubmissionRating,
  SubmissionStatus,
} from '@prisma/client';
import {
  EXAM_ENTRY_WINDOW_MINUTES,
  EXAM_RUNTIME_EVENTS,
  EXAM_SESSION_TIMEOUT_MS,
} from './exam-runtime.constants';
import { ExamRuntimeEventsService } from './exam-runtime-events.service';
import { ExamRuntimeQueueService } from './exam-runtime-queue.service';
import { NotificationGateway } from '@/notification/notification.gateway';

type ExamDistributionItem = {
  question_type: string;
  question_format: string;
  quantity: number;
};

type ExamChapterDistributionItem = {
  chapter_id: string;
  quantity: number;
};

type ExamQuestionRow = {
  id: string;
  question_text: string;
  options: unknown;
  question_type: string;
  question_format: string;
};

@Injectable()
export class ExamRuntimeService implements OnModuleInit {
  private readonly logger = new Logger(ExamRuntimeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: ExamRuntimeEventsService,
    private readonly queue: ExamRuntimeQueueService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async onModuleInit() {
    try {
      const upcomingExams = await this.prisma.exam.findMany({
        where: {
          is_deleted: false,
          exam_end_time: { gt: new Date() },
        },
        select: {
          id: true,
          exam_start_time: true,
          exam_end_time: true,
        },
      });

      await Promise.all(
        upcomingExams.map((exam) => this.queue.scheduleExam(exam)),
      );
    } catch (error: any) {
      this.logger.warn(
        `Failed to bootstrap exam schedules: ${error?.message ?? error}`,
      );
    }
  }

  async getSession(examId: string, studentId: string) {
    const submission = await this.findInProgressSubmission(examId, studentId);
    const status = await this.getExamStatus(examId, studentId);
    if (!submission) {
      return {
        data: {
          ...status,
          hasActiveSubmission: false,
        },
      };
    }

    return {
      data: {
        ...status,
        hasActiveSubmission: true,
        ...(await this.ensureSessionQuestions(submission.id, examId)),
        ...(await this.formatSubmissionExam(submission.id)),
      },
    };
  }

  async getExamStatus(examId: string, studentId: string) {
    const exam = await this.findExam(examId);
    await this.assertCanAccessExam(exam, studentId);

    const activeSubmission = await this.findInProgressSubmission(
      examId,
      studentId,
    );
    const now = new Date();
    const startTime = new Date(exam.exam_start_time);
    const endTime = new Date(exam.exam_end_time);
    const entryDeadline = new Date(
      startTime.getTime() + EXAM_ENTRY_WINDOW_MINUTES * 60 * 1000,
    );
    const activeCount = await this.getActiveCount(examId);
    const isOpen = now >= startTime && now <= endTime;
    const canStart =
      !!activeSubmission ||
      (now >= startTime && now <= entryDeadline && now <= endTime);

    return {
      examId,
      serverTime: now.toISOString(),
      isOpen,
      canStart,
      reason: this.getStartBlockReason(now, startTime, entryDeadline, endTime),
      entryDeadline: entryDeadline.toISOString(),
      activeCount,
    };
  }

  async startExam(examId: string, studentId: string) {
    const exam = await this.findExam(examId);
    await this.assertCanAccessExam(exam, studentId);

    const existing = await this.findInProgressSubmission(examId, studentId);
    if (existing) {
      await this.ensureSubmissionQuestions(existing.id, exam);
      await this.touchSession(existing.id);
      return { data: await this.formatSubmissionExam(existing.id) };
    }

    this.assertWithinStartWindow(exam);
    const now = new Date();
    const autoSubmitAt = new Date(
      Math.min(
        now.getTime() + exam.duration * 60 * 1000,
        new Date(exam.exam_end_time).getTime(),
      ),
    );

    try {
      const submission = await this.prisma.$transaction(async (tx) => {
        const createdSubmission = await tx.submission.create({
          data: {
            exam_id: exam.id,
            student_id: studentId,
            start_time: now,
            status: SubmissionStatus.IN_PROGRESS,
          },
        });

        await this.ensureSubmissionQuestions(createdSubmission.id, exam, tx);

        await tx.examSession.upsert({
          where: { submission_id: createdSubmission.id },
          create: {
            submission_id: createdSubmission.id,
            entered_at: now,
            last_ping: now,
            is_active: true,
          },
          update: {
            last_ping: now,
            is_active: true,
          },
        });

        return createdSubmission;
      });

      await this.queue.scheduleAutoSubmit(submission.id, autoSubmitAt);
      await this.emitActiveCount(exam.id);

      return { data: await this.formatSubmissionExam(submission.id) };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const racedSubmission = await this.findInProgressSubmission(
          examId,
          studentId,
        );
        if (racedSubmission) {
          await this.ensureSubmissionQuestions(racedSubmission.id, exam);
          await this.touchSession(racedSubmission.id);
          return { data: await this.formatSubmissionExam(racedSubmission.id) };
        }
      }
      throw error;
    }
  }

  async heartbeat(submissionId: string, studentId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        student_id: studentId,
        status: SubmissionStatus.IN_PROGRESS,
        is_deleted: false,
      },
      select: {
        id: true,
        exam_id: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Active submission not found');
    }

    const session = await this.touchSession(submission.id);
    await this.emitActiveCount(submission.exam_id);

    return {
      ok: true,
      submissionId,
      lastPing: session.last_ping,
    };
  }

  async completeSubmission(
    submissionId: string,
    endTime = new Date(),
    startTime?: Date,
    studentId?: string,
  ) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        is_deleted: false,
        ...(studentId ? { student_id: studentId } : {}),
      },
      select: {
        id: true,
        exam_id: true,
        status: true,
        start_time: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.status !== SubmissionStatus.COMPLETED) {
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          status: SubmissionStatus.COMPLETED,
          end_time: endTime,
          ...(submission.start_time
            ? {}
            : { start_time: startTime ?? endTime }),
        },
      });
    }

    await this.prisma.examSession.updateMany({
      where: { submission_id: submissionId },
      data: { is_active: false, last_ping: endTime },
    });

    await this.queue.enqueueGradeSubmission(submissionId);
    await this.emitActiveCount(submission.exam_id);

    return { data: { submission_id: submissionId } };
  }

  async autoSubmitSubmission(submissionId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submissionId,
        status: SubmissionStatus.IN_PROGRESS,
        is_deleted: false,
      },
      select: { id: true },
    });

    if (!submission) {
      return;
    }

    await this.completeSubmission(submissionId, new Date());
  }

  async gradeSubmission(submissionId: string) {
    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId, is_deleted: false },
      include: {
        exam: { select: { title: true } },
        questions: { select: { score: true } },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const questionCount = submission.questions.length;
    const totalScore =
      questionCount > 0
        ? (submission.questions.reduce(
            (total, question) =>
              total + (question.score ? Number(question.score) : 0),
            0,
          ) *
            10) /
          questionCount
        : 0;
    const roundedScore = Math.round(totalScore * 100) / 100;
    const rating = this.getRating(roundedScore);

    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        total_score: roundedScore,
        rating,
      },
    });

    try {
      await this.notificationGateway.sendToUser(submission.student_id, {
        recipient_id: submission.student_id,
        type: NotificationType.SUCCESS,
        title: 'Bài thi đã được chấm',
        content: `Bài thi "${submission.exam.title}" đã có kết quả.`,
        target_id: submissionId,
        target_type: 'SUBMISSION',
        link: `/result/${submissionId}`,
      });
    } catch (notifyError: any) {
      this.logger.warn(
        `Failed to send grade notification for submission ${submissionId}: ${notifyError?.message ?? notifyError}`,
      );
    }
  }

  async notifyExamStartingSoon(examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, is_deleted: false },
      include: {
        registrations: {
          where: {
            is_deleted: false,
            status: RegistrationStatus.APPROVED,
          },
          select: { student_id: true },
        },
      },
    });

    if (!exam) {
      return;
    }

    await Promise.all(
      exam.registrations.map((registration) =>
        this.notificationGateway.sendToUser(registration.student_id, {
          recipient_id: registration.student_id,
          type: NotificationType.INFO,
          title: 'Bài thi sắp bắt đầu',
          content: `Bài thi "${exam.title}" sẽ bắt đầu sau 15 phút.`,
          target_id: exam.id,
          target_type: 'EXAM',
          link: `/exam/${exam.id}`,
        }),
      ),
    );
  }

  async emitExamOpen(examId: string) {
    const activeCount = await this.getActiveCount(examId);
    this.events.emit(examId, EXAM_RUNTIME_EVENTS.OPEN, { activeCount });
  }

  async emitExamClosed(examId: string) {
    const activeCount = await this.getActiveCount(examId);
    this.events.emit(examId, EXAM_RUNTIME_EVENTS.CLOSED, { activeCount });
  }

  async cleanupInactiveSessions() {
    const staleBefore = new Date(Date.now() - EXAM_SESSION_TIMEOUT_MS);
    const sessions = await this.prisma.examSession.findMany({
      where: {
        is_active: true,
        last_ping: { lt: staleBefore },
      },
      select: {
        submission: { select: { exam_id: true } },
      },
    });

    await this.prisma.examSession.updateMany({
      where: {
        is_active: true,
        last_ping: { lt: staleBefore },
      },
      data: { is_active: false },
    });

    const examIds = [...new Set(sessions.map((s) => s.submission.exam_id))];
    await Promise.all(examIds.map((examId) => this.emitActiveCount(examId)));
  }

  async emitActiveCount(examId: string) {
    const activeCount = await this.getActiveCount(examId);
    this.events.emit(examId, EXAM_RUNTIME_EVENTS.ACTIVE_COUNT, {
      activeCount,
    });
  }

  async getActiveCount(examId: string) {
    return this.prisma.examSession.count({
      where: {
        is_active: true,
        submission: {
          exam_id: examId,
          status: SubmissionStatus.IN_PROGRESS,
          is_deleted: false,
        },
      },
    });
  }

  private async findExam(examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        is_deleted: false,
      },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    return exam;
  }

  private async findInProgressSubmission(examId: string, studentId: string) {
    return this.prisma.submission.findFirst({
      where: {
        exam_id: examId,
        student_id: studentId,
        status: SubmissionStatus.IN_PROGRESS,
        is_deleted: false,
      },
      orderBy: { created_at: 'desc' },
      select: { id: true },
    });
  }

  private async assertCanAccessExam(
    exam: { id: string; practice: boolean; is_public: boolean },
    studentId: string,
  ) {
    if (exam.practice || exam.is_public) {
      return;
    }

    const registration = await this.prisma.examRegistration.findFirst({
      where: {
        exam_id: exam.id,
        student_id: studentId,
        is_deleted: false,
        status: RegistrationStatus.APPROVED,
      },
      select: { id: true },
    });

    if (!registration) {
      throw new ForbiddenException('Student is not approved for this exam');
    }
  }

  private assertWithinStartWindow(exam: {
    exam_start_time: Date;
    exam_end_time: Date;
  }) {
    const now = new Date();
    const startTime = new Date(exam.exam_start_time);
    const endTime = new Date(exam.exam_end_time);
    const entryDeadline = new Date(
      startTime.getTime() + EXAM_ENTRY_WINDOW_MINUTES * 60 * 1000,
    );

    if (now < startTime) {
      throw new BadRequestException('Exam has not started yet');
    }

    if (now > endTime) {
      throw new BadRequestException('Exam is closed');
    }

    if (now > entryDeadline) {
      throw new BadRequestException('Exam entry window is closed');
    }
  }

  private getStartBlockReason(
    now: Date,
    startTime: Date,
    entryDeadline: Date,
    endTime: Date,
  ) {
    if (now < startTime) return 'NOT_STARTED';
    if (now > endTime) return 'EXAM_CLOSED';
    if (now > entryDeadline) return 'ENTRY_WINDOW_CLOSED';
    return null;
  }

  private async touchSession(submissionId: string) {
    const now = new Date();
    return this.prisma.examSession.upsert({
      where: { submission_id: submissionId },
      create: {
        submission_id: submissionId,
        entered_at: now,
        last_ping: now,
        is_active: true,
      },
      update: {
        last_ping: now,
        is_active: true,
      },
    });
  }

  private async formatSubmissionExam(submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        exam: true,
        session: true,
        questions: {
          orderBy: { created_at: 'asc' },
          include: {
            question: {
              select: {
                id: true,
                question_text: true,
                options: true,
                question_type: true,
                question_format: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const exam = submission.exam;
    return {
      id: exam.id,
      title: exam.title,
      duration: exam.duration,
      exam_start_time: exam.exam_start_time,
      exam_end_time: exam.exam_end_time,
      practice: exam.practice,
      mode: exam.mode,
      is_public: exam.is_public,
      questions: submission.questions.map((item) => item.question),
      submissionId: submission.id,
      entered_at: submission.session?.entered_at ?? submission.start_time,
      last_ping: submission.session?.last_ping,
      time_limit_seconds: exam.duration * 60,
    };
  }

  private async selectQuestions(examData: {
    id: string;
    topic_id: string;
    mode: ExamMode;
    sample_size: number | null;
    distribution: string | null;
  }) {
    let questions: ExamQuestionRow[] = [];

    if (examData.mode === ExamMode.MANUAL) {
      const examQuestions = await this.prisma.examQuestions.findMany({
        where: {
          exam_id: examData.id,
          is_deleted: false,
          question: { is_deleted: false },
        },
        include: {
          question: {
            select: {
              id: true,
              question_text: true,
              options: true,
              question_type: true,
              question_format: true,
            },
          },
        },
      });
      questions = examQuestions.map((eq) => eq.question);
    } else if (examData.mode === ExamMode.RANDOM_N) {
      const questionIdsRows = await this.prisma.question.findMany({
        where: {
          is_deleted: false,
          chapter: {
            topic_id: examData.topic_id,
            is_deleted: false,
          },
        },
        select: {
          id: true,
        },
      });
      const questionIds = questionIdsRows.map((q) => q.id);

      const sampleSize = examData.sample_size
        ? Number(examData.sample_size)
        : questionIds.length;
      const shuffled = [...questionIds];
      const n = shuffled.length;
      const limit = Math.min(sampleSize, n);
      for (let i = 0; i < limit; i++) {
        const j = i + Math.floor(Math.random() * (n - i));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }
      const selectedIds = shuffled.slice(0, limit);

      if (selectedIds.length > 0) {
        const questionRows = await this.prisma.question.findMany({
          where: {
            id: { in: selectedIds },
          },
          select: {
            id: true,
            question_text: true,
            options: true,
            question_type: true,
            question_format: true,
          },
        });
        questions = questionRows as ExamQuestionRow[];
      }
      this.assertEnoughQuestions(
        questions.length,
        examData.sample_size,
        'RANDOM_N',
      );
    } else if (examData.mode === ExamMode.BY_TYPE) {
      let parsedDistribution: ExamDistributionItem[];
      try {
        parsedDistribution = examData.distribution
          ? (JSON.parse(examData.distribution) as ExamDistributionItem[])
          : [];
      } catch {
        throw new BadRequestException(
          'Exam distribution data is malformed (BY_TYPE)',
        );
      }
      const byTypeResults = await Promise.all(
        parsedDistribution.map((distribution) =>
          this.prisma.$queryRaw<ExamQuestionRow[]>`
            SELECT
              q.id,
              q.question_text,
              q.options,
              q.question_type,
              q.question_format
            FROM "questions" AS q
            INNER JOIN "chapters" AS c ON c.id = q.chapter_id
            WHERE c.topic_id = ${examData.topic_id}
              AND c.is_deleted = false
              AND q.is_deleted = false
              AND q.question_type::text = ${distribution.question_type}
              AND q.question_format::text = ${distribution.question_format}
            ORDER BY RANDOM()
            LIMIT ${distribution.quantity}
          `,
        ),
      );
      for (let i = 0; i < parsedDistribution.length; i++) {
        this.assertEnoughQuestions(
          byTypeResults[i].length,
          parsedDistribution[i].quantity,
          `BY_TYPE (${parsedDistribution[i].question_type}/${parsedDistribution[i].question_format})`,
        );
        questions.push(...byTypeResults[i]);
      }
    } else if (examData.mode === ExamMode.BY_CHAPTER) {
      let parsedDistribution: ExamChapterDistributionItem[];
      try {
        parsedDistribution = examData.distribution
          ? (JSON.parse(
              examData.distribution,
            ) as ExamChapterDistributionItem[])
          : [];
      } catch {
        throw new BadRequestException(
          'Exam distribution data is malformed (BY_CHAPTER)',
        );
      }
      const byChapterResults = await Promise.all(
        parsedDistribution.map((distribution) =>
          this.prisma.$queryRaw<ExamQuestionRow[]>`
            SELECT
              q.id,
              q.question_text,
              q.options,
              q.question_type,
              q.question_format
            FROM "questions" AS q
            INNER JOIN "chapters" AS c ON c.id = q.chapter_id
            WHERE c.topic_id = ${examData.topic_id}
              AND c.is_deleted = false
              AND q.is_deleted = false
              AND (
                q.chapter_id = ${distribution.chapter_id}
                OR c.parent_id = ${distribution.chapter_id}
              )
            ORDER BY RANDOM()
            LIMIT ${distribution.quantity}
          `,
        ),
      );
      for (let i = 0; i < parsedDistribution.length; i++) {
        this.assertEnoughQuestions(
          byChapterResults[i].length,
          parsedDistribution[i].quantity,
          `BY_CHAPTER (${parsedDistribution[i].chapter_id})`,
        );
        questions.push(...byChapterResults[i]);
      }
    }

    if (questions.length === 0) {
      throw new BadRequestException('No questions available for this exam');
    }

    return questions;
  }

  private async ensureSubmissionQuestions(
    submissionId: string,
    examData: {
      id: string;
      topic_id: string;
      mode: ExamMode;
      sample_size: number | null;
      distribution: string | null;
    },
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const existingCount = await db.submissionQuestions.count({
      where: { submission_id: submissionId },
    });

    if (existingCount > 0) {
      return;
    }

    const questions = await this.selectQuestions(examData);

    await db.submissionQuestions.createMany({
      data: questions.map((question) => ({
        submission_id: submissionId,
        question_id: question.id,
      })),
      skipDuplicates: true,
    });
  }

  private async ensureSessionQuestions(submissionId: string, examId: string) {
    const exam = await this.findExam(examId);
    await this.ensureSubmissionQuestions(submissionId, exam);
    return {};
  }

  private assertEnoughQuestions(
    found: number,
    required: number | null | undefined,
    context: string,
  ) {
    const requiredCount = Number(required ?? 0);

    if (requiredCount <= 0 || found >= requiredCount) {
      return;
    }

    throw new BadRequestException(
      `Not enough questions available for ${context}. Required: ${requiredCount}, Found: ${found}`,
    );
  }

  private getRating(score: number): SubmissionRating {
    if (score >= 9) return SubmissionRating.EXCELLENT;
    if (score >= 7) return SubmissionRating.GOOD;
    if (score >= 5) return SubmissionRating.AVERAGE;
    return SubmissionRating.POOR;
  }
}
