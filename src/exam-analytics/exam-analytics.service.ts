import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  computeExamAnalytics,
  type ItemResponseInput,
  type QuestionMetaInput,
} from './exam-analytics.calc';
import type { ExamAnalyticsDto } from './dto/exam-analytics.dto';

type Requester = { id: string; role: UserRole };

const isAnswered = (answer: string | null): boolean => {
  if (answer === null) return false;
  const trimmed = answer.trim();
  return trimmed !== '' && trimmed !== '[]';
};

@Injectable()
export class ExamAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns question difficulty/discrimination and exam score statistics
   * computed from the completed submissions of an exam.
   */
  async getExamAnalytics(
    examId: string,
    requester: Requester,
  ): Promise<ExamAnalyticsDto> {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, is_deleted: false },
      select: { id: true, title: true, lecturer_id: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    if (requester.role === UserRole.LECTURER) {
      if (exam.lecturer_id !== requester.id) {
        throw new ForbiddenException(
          'You can only view analytics of your own exams',
        );
      }
    } else if (requester.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only admins and lecturers can view exam analytics',
      );
    }

    const submissions = await this.prisma.submission.findMany({
      where: { exam_id: examId, status: 'COMPLETED', is_deleted: false },
      select: {
        id: true,
        total_score: true,
        questions: {
          where: { is_deleted: false },
          select: {
            question_id: true,
            answer: true,
            score: true,
            is_correct: true,
          },
        },
      },
    });

    const examQuestions = await this.prisma.examQuestions.findMany({
      where: { exam_id: examId, is_deleted: false },
      select: { question_id: true },
    });

    const questionIds = new Set<string>(
      examQuestions.map((row) => row.question_id),
    );
    const responses: ItemResponseInput[] = [];
    for (const submission of submissions) {
      for (const item of submission.questions) {
        questionIds.add(item.question_id);
        responses.push({
          submissionId: submission.id,
          questionId: item.question_id,
          score: Math.min(Math.max(Number(item.score ?? 0), 0), 1),
          isCorrect: item.is_correct,
          answered: isAnswered(item.answer),
        });
      }
    }

    const questionRows = await this.prisma.question.findMany({
      where: { id: { in: [...questionIds] } },
      select: {
        id: true,
        question_text: true,
        question_type: true,
        question_format: true,
        chapter: { select: { name: true } },
      },
    });
    const questions: QuestionMetaInput[] = questionRows.map((row) => ({
      questionId: row.id,
      questionText: row.question_text,
      questionType: row.question_type,
      questionFormat: row.question_format,
      chapterName: row.chapter?.name ?? null,
    }));

    const result = computeExamAnalytics({
      attempts: submissions.map((submission) => ({
        submissionId: submission.id,
        totalScore: Number(submission.total_score ?? 0),
      })),
      responses,
      questions,
    });

    return {
      examId: exam.id,
      examTitle: exam.title,
      summary: result.summary,
      questions: result.questions,
    };
  }
}
