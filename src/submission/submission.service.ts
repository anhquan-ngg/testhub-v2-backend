import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StartExamDto } from './dto/start-exam.dto';
import {
  INTERNAL_PRISMA_CLIENT,
  POLICY_AWARE_PRISMA_CLIENT,
} from '@/prisma/prisma.module';
import {
  PrismaClient,
  Rating,
  SubmissionStatus,
} from '../../generated/prisma-client';
import { SubmitQuestionDto } from './dto/submit-question.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

type EnhancedPrismaClient = Omit<
  PrismaClient,
  '$use' | '$on' | '$connect' | '$disconnect' | '$transaction' | '$extends'
>;

@Injectable()
export class SubmissionService {
  constructor(
    @Inject(INTERNAL_PRISMA_CLIENT)
    private readonly internalPrisma: EnhancedPrismaClient,

    // 2. Inject POLICY_AWARE_PRISMA_CLIENT
    // Client này là REQUEST-SCOPED, sẽ có context của user hiện tại.
    // NestJS sẽ tự động cung cấp instance đúng cho mỗi request.
    @Inject(POLICY_AWARE_PRISMA_CLIENT)
    private readonly policyAwarePrisma: EnhancedPrismaClient,
  ) {}

  async startExam(startExamDto: StartExamDto) {
    const submission = await this.internalPrisma.submission.create({
      data: {
        exam_id: startExamDto.examId,
        student_id: startExamDto.studentId,
      },
    });

    const examData = await this.policyAwarePrisma.exam.findUnique({
      where: {
        id: startExamDto.examId,
      },
    });

    if (!examData) {
      throw new NotFoundException('Exam not found');
    }

    if (examData.status !== 'ACTIVE') {
      throw new BadRequestException('Exam is not active');
    }

    let questions;
    if (examData.mode === 'MANUAL') {
      const examQuestions = await this.policyAwarePrisma.examQuestions.findMany(
        {
          where: {
            exam_id: startExamDto.examId,
          },
          select: {
            question: {
              select: {
                id: true,
                question_text: true,
                image_url: true,
                options: true,
                question_type: true,
              },
            },
          },
        },
      );
      questions = examQuestions.map((eq) => eq.question);
    } else if (examData.mode === 'RANDOM_N') {
      // Use raw SQL for random ordering since Prisma doesn't support it directly
      questions = await this.internalPrisma.$queryRaw`
        SELECT id, question_text, image_url, options, question_type
        FROM "questions"
        WHERE topic = ${examData.topic}
        ORDER BY RANDOM()
        LIMIT ${examData.sample_size}
      `;
    } else if (examData.mode === 'BY_TYPE') {
      questions = [];
      if (examData.distribution) {
        const parsedDistribution = JSON.parse(examData.distribution);
        for (const distribution of parsedDistribution) {
          const questionsData = await this.internalPrisma.$queryRaw<
            Array<{
              id: number;
              question_text: string;
              image_url: string | null;
              options: any;
              question_type: string;
            }>
          >`
            SELECT id, question_text, image_url, options, question_type
            FROM "questions"
            WHERE topic = ${examData.topic}
              AND question_type::text = ${distribution.question_type} 
              AND question_format::text = ${distribution.question_format}
            ORDER BY RANDOM()
            LIMIT ${distribution.quantity}
          `;

          questions.push(...questionsData);
        }
      }
    }

    return {
      data: {
        ...examData,
        questions: questions,
        submissionId: submission.id,
      },
    };
  }

  async submitByQuestion(submitQuestionDto: SubmitQuestionDto) {
    const submission = await this.policyAwarePrisma.submission.findUnique({
      where: {
        id: submitQuestionDto.submission_id,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    const question = await this.policyAwarePrisma.question.findUnique({
      where: {
        id: submitQuestionDto.question_id,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    let is_correct = false;
    let score = 0;

    if (question.question_type === 'SINGLE_CHOICE' && question.options) {
      if (!submitQuestionDto.options) {
        throw new BadRequestException('Options is required');
      }
      const parsedQuestionsOption = JSON.parse(question.options);
      const parsedOptions = JSON.parse(submitQuestionDto.options);

      const chosenOption = parsedOptions.find(
        (option: { text: string; isCorrect: boolean }) => option.isCorrect,
      );

      if (chosenOption) {
        is_correct = parsedQuestionsOption.find(
          (option: { text: string; isCorrect: boolean }) =>
            option.text === chosenOption.text,
        )?.isCorrect;
        score = is_correct ? 1 : 0;
      }
    } else if (
      question.question_type === 'MULTIPLE_CHOICE' &&
      question.options
    ) {
      if (!submitQuestionDto.options) {
        throw new BadRequestException('Options is required');
      }

      // Options of question
      const parsedQuestionOptions = JSON.parse(question.options);

      // Correct answers
      const correctAnswers = parsedQuestionOptions.filter(
        (opt: { text: string; isCorrect?: boolean }) => opt.isCorrect !== false,
      );

      // User selected answers
      const parsedUserOptions = JSON.parse(submitQuestionDto.options);

      // User selected texts
      const userSelectedTexts = new Set(
        parsedUserOptions
          .filter((opt: { isCorrect: boolean }) => opt.isCorrect)
          .map((opt: { text: string }) => opt.text),
      );

      let correctMatches = 0;

      // Count correct matches
      userSelectedTexts.forEach((userOpt) => {
        if (
          correctAnswers.find((opt: { text: string }) => opt.text === userOpt)
        ) {
          correctMatches++;
        } else {
          correctMatches--;
        }
      });

      const totalCorrect = correctAnswers.length;

      if (totalCorrect > 0) {
        score = correctMatches / totalCorrect;
        is_correct = correctMatches === totalCorrect;
      } else {
        score = 0;
        is_correct = false;
      }
    } else if (question.question_type === 'ESSAY' && question.correct_answer) {
      if (!submitQuestionDto.answer) {
        throw new BadRequestException('Answer is required');
      }
      is_correct = submitQuestionDto.answer === question.correct_answer;
      score = is_correct ? 1 : 0;
    }

    const submissionQuestion =
      await this.policyAwarePrisma.submissionQuestions.upsert({
        where: {
          submission_id_question_id: {
            submission_id: submitQuestionDto.submission_id,
            question_id: submitQuestionDto.question_id,
          },
        },
        update: {
          answer: submitQuestionDto.answer,
          options: submitQuestionDto.options,
          score: Math.round(score * 100) / 100,
          is_correct,
        },
        create: {
          submission_id: submitQuestionDto.submission_id,
          question_id: submitQuestionDto.question_id,
          answer: submitQuestionDto.answer,
          options: submitQuestionDto.options,
          score: Math.round(score * 100) / 100,
          is_correct,
        },
      });

    return {
      data: {
        submission_question_id: submissionQuestion.id,
      },
    };
  }

  async submitByExam(submitExamDto: SubmitExamDto) {
    if (!submitExamDto.submission_id) {
      throw new BadRequestException('Submission id is required');
    }

    const submittedQuestions =
      await this.policyAwarePrisma.submissionQuestions.findMany({
        where: {
          submission_id: submitExamDto.submission_id,
        },
      });

    const totalScore =
      (submittedQuestions.reduce(
        (total: number, question) =>
          total + (question.score ? Number(question.score) : 0),
        0,
      ) *
        10) /
      submitExamDto.question_length;

    let rating: Rating;

    if (totalScore >= 9) rating = 'EXCELLENT';
    else if (totalScore >= 7) rating = 'GOOD';
    else if (totalScore >= 5) rating = 'AVERAGE';
    else rating = 'POOR';

    const submission = await this.policyAwarePrisma.submission.update({
      where: {
        id: submitExamDto.submission_id,
      },
      data: {
        total_score: totalScore,
        rating,
        start_time: new Date(submitExamDto.start_time),
        end_time: new Date(submitExamDto.end_time),
        status: SubmissionStatus.COMPLETED,
      },
    });

    return {
      data: {
        submission_id: submission.id,
      },
    };
  }
  async getSubmissionOwner(submissionId: string) {
    const submission = await this.internalPrisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      select: {
        student_id: true,
      },
    });
    return submission?.student_id;
  }
}
