import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  SubmissionRating,
  SubmissionStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationGateway } from '@/notification/notification.gateway';
import {
  PublishRegradeDto,
  RegradeQuestionDto,
  SaveRegradeDraftDto,
} from './dto/regrade-submission.dto';

const workspaceInclude = {
  exam: { include: { topic: true, _count: { select: { questions: true } } } },
  student: { select: { id: true, full_name: true, email: true } },
  questions: {
    where: { is_deleted: false },
    orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
    include: {
      question: {
        include: {
          files: { include: { file: true }, orderBy: { order: 'asc' } },
        },
      },
    },
  },
  regradeDraft: true,
  regradePublications: {
    orderBy: [{ created_at: 'desc' }, { revision: 'desc' }],
  },
} satisfies Prisma.SubmissionInclude;

type WorkspaceRow = Prisma.SubmissionGetPayload<{
  include: typeof workspaceInclude;
}>;

@Injectable()
export class SubmissionRegradeService {
  private readonly logger = new Logger(SubmissionRegradeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationGateway,
  ) {}

  /** Returns private draft and publication history only to the exam's lecturer. */
  async getWorkspace(id: string, lecturerId: string) {
    return this.toWorkspace(
      await this.load(this.prisma.current, id, lecturerId),
    );
  }

  /** Saves a complete, revision-checked draft without changing published grades. */
  async saveDraft(id: string, lecturerId: string, dto: SaveRegradeDraftDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, id, lecturerId);
      const row = await this.load(tx, id, lecturerId);
      if (
        (row.regradeDraft?.revision ?? 0) !== dto.expected_revision ||
        row.grading_revision !== dto.expected_grade_revision
      ) {
        throw new ConflictException('REGRADING_STALE_REVISION');
      }
      const scores = this.validateScores(row, dto.scores);
      const data = {
        revision: dto.expected_revision + 1,
        base_grade_revision: row.grading_revision,
        scores,
        reason: dto.reason.trim(),
        grader_id: lecturerId,
      };
      await tx.submissionRegradeDraft.upsert({
        where: { submission_id: id },
        create: { submission_id: id, ...data },
        update: data,
      });
      return this.toWorkspace(await this.load(tx, id, lecturerId));
    });
  }

  /** Atomically publishes a saved draft, audit and one durable student notification. */
  async publish(id: string, lecturerId: string, dto: PublishRegradeDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lock(tx, id, lecturerId);
      const row = await this.load(tx, id, lecturerId);
      // A response lost after commit can safely be retried, even after a newer draft.
      if (
        row.regradePublications.some((entry) => entry.revision === dto.revision)
      ) {
        return { workspace: this.toWorkspace(row), notification: null };
      }
      const draft = row.regradeDraft;
      if (
        !draft ||
        draft.revision !== dto.revision ||
        draft.base_grade_revision !== row.grading_revision
      ) {
        throw new ConflictException('REGRADING_STALE_REVISION');
      }
      const scores = this.validateScores(row, this.readScores(draft.scores));
      const total =
        Math.round(
          (scores.reduce((sum, item) => sum + Math.round(item.score * 100), 0) *
            10) /
            scores.length,
        ) / 100;
      const changes = scores.map((item) => {
        const previous = row.questions.find(
          (question) => question.id === item.submission_question_id,
        );
        return {
          ...item,
          previous_score:
            previous?.score === null ? null : Number(previous?.score),
          previous_is_correct: previous?.is_correct ?? false,
        };
      });
      for (const item of scores) {
        await tx.submissionQuestions.update({
          where: { id: item.submission_question_id },
          data: { score: item.score, is_correct: item.score === 1 },
        });
      }
      await tx.submission.update({
        where: { id },
        data: {
          total_score: total,
          rating: this.rating(total),
          grading_revision: { increment: 1 },
        },
      });
      await tx.submissionRegradePublication.create({
        data: {
          submission_id: id,
          revision: draft.revision,
          grader_id: lecturerId,
          reason: draft.reason,
          previous_total_score: row.total_score,
          total_score: total,
          changes,
        },
      });
      await tx.submissionRegradeDraft.update({
        where: { submission_id: id },
        data: { published_revision: draft.revision },
      });
      const notification = await tx.notification.create({
        data: {
          recipient_id: row.student_id,
          sender_id: lecturerId,
          type: NotificationType.SUCCESS,
          title: 'Kết quả chấm lại đã được công bố',
          content: `Giảng viên đã công bố kết quả chấm lại bài thi "${row.exam.title}".`,
          target_id: id,
          target_type: 'SUBMISSION',
          link: `/result/${id}`,
        },
      });
      return {
        workspace: this.toWorkspace(await this.load(tx, id, lecturerId)),
        notification,
      };
    });
    if (result.notification) {
      try {
        await this.notifications.emitSavedNotification(result.notification);
      } catch {
        // DB notification remains available on reconnect/REST; never report a committed grade as failed.
        this.logger.warn({
          event: 'regrade_realtime_delivery_failed',
          submission_id: id,
        });
      }
    }
    return result.workspace;
  }

  private async lock(
    tx: Prisma.TransactionClient,
    id: string,
    lecturerId: string,
  ) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT s.id FROM submissions s JOIN exams e ON e.id = s.exam_id
      WHERE s.id = ${id}::uuid AND e.lecturer_id = ${lecturerId}::uuid
        AND s.is_deleted = false AND e.is_deleted = false
      FOR UPDATE OF s, e
    `;
    if (!rows.length) throw new NotFoundException('Submission not found');
  }

  private async load(
    tx: Prisma.TransactionClient,
    id: string,
    lecturerId: string,
  ) {
    const row = await tx.submission.findFirst({
      where: {
        id,
        is_deleted: false,
        exam: { lecturer_id: lecturerId, is_deleted: false },
      },
      include: workspaceInclude,
    });
    if (!row) throw new NotFoundException('Submission not found');
    if (row.status !== SubmissionStatus.COMPLETED) {
      throw new BadRequestException('REGRADING_REQUIRES_COMPLETED_SUBMISSION');
    }
    if (!row.questions.length)
      throw new BadRequestException('REGRADING_NO_QUESTIONS');
    return row;
  }

  private validateScores(row: WorkspaceRow, scores: RegradeQuestionDto[]) {
    const expected = new Set(row.questions.map((question) => question.id));
    if (
      scores.length !== expected.size ||
      scores.some(
        (item) =>
          !expected.delete(item.submission_question_id) ||
          !Number.isFinite(item.score) ||
          item.score < 0 ||
          item.score > 1 ||
          Math.abs(item.score * 100 - Math.round(item.score * 100)) > 1e-8,
      ) ||
      expected.size
    ) {
      throw new BadRequestException('REGRADING_INVALID_QUESTION_SCORES');
    }
    return scores.map((item) => ({
      submission_question_id: item.submission_question_id,
      score: item.score,
    }));
  }

  private readScores(value: Prisma.JsonValue): RegradeQuestionDto[] {
    if (!Array.isArray(value))
      throw new BadRequestException('REGRADING_INVALID_DRAFT');
    return value.map((item) => {
      if (
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item) ||
        typeof item.submission_question_id !== 'string' ||
        typeof item.score !== 'number'
      ) {
        throw new BadRequestException('REGRADING_INVALID_DRAFT');
      }
      return {
        submission_question_id: item.submission_question_id,
        score: item.score,
      };
    });
  }

  private toWorkspace(row: WorkspaceRow) {
    const { regradeDraft, regradePublications, ...submission } = row;
    return { submission, draft: regradeDraft, history: regradePublications };
  }

  private rating(score: number): SubmissionRating {
    if (score >= 9) return SubmissionRating.EXCELLENT;
    if (score >= 7) return SubmissionRating.GOOD;
    if (score >= 5) return SubmissionRating.AVERAGE;
    return SubmissionRating.POOR;
  }
}
