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
import { PrismaClient } from '@prisma/client';

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
        ORDER BY RANDOM()
        LIMIT ${examData.sample_size}
      `;
    } else if (examData.mode === 'BY_TYPE') {
      questions = [];
      if (examData.distribution) {
        const parsedDistribution = JSON.parse(examData.distribution);
        for (const distribution of parsedDistribution) {
          console.log(distribution);
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
            WHERE question_type::text = ${distribution.question_type} 
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
}
