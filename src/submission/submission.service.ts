import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StartExamDto } from './dto/start-exam.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { SubmissionRating, SubmissionStatus } from '@prisma/client';
import { SubmitQuestionDto } from './dto/submit-question.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { QuerySubmissionDto } from './dto/query-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { SubmissionRepository } from './submission.repository';
import { ExamRuntimeService } from '@/exam-runtime/exam-runtime.service';
import { ExamMonitorAggregator } from '@/exam-runtime/exam-monitor-aggregator.service';

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
export class SubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissionRepository: SubmissionRepository,
    private readonly examRuntimeService: ExamRuntimeService,
    private readonly monitor: ExamMonitorAggregator,
  ) {}

  async create(dto: CreateSubmissionDto) {
    await this.validateExamAndStudent(dto.exam_id, dto.student_id);
    return this.submissionRepository.create(dto);
  }

  async findAll(query: QuerySubmissionDto) {
    return this.submissionRepository.findMany(query);
  }

  async findOne(id: string) {
    const submission = await this.submissionRepository.findById(id);
    if (!submission) {
      throw new NotFoundException(`Submission with id "${id}" not found`);
    }
    return submission;
  }

  async update(id: string, dto: UpdateSubmissionDto) {
    await this.findOne(id);

    if (dto.exam_id || dto.student_id) {
      await this.validateExamAndStudent(dto.exam_id, dto.student_id);
    }

    return this.submissionRepository.update(id, dto);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.submissionRepository.softDelete(id);
    return { message: 'Submission deleted successfully' };
  }

  async startExam(startExamDto: StartExamDto) {
    return this.examRuntimeService.startExam(
      startExamDto.examId,
      startExamDto.studentId,
    );
  }

  async startExamForUser(examId: string, studentId: string) {
    return this.examRuntimeService.startExam(examId, studentId);
  }

  async getExamSession(examId: string, studentId: string) {
    return this.examRuntimeService.getSession(examId, studentId);
  }

  async submitByQuestion(submitQuestionDto: SubmitQuestionDto, studentId: string) {
    // Ownership + status + not-deleted, all in one query. Previously this
    // looked the submission up by id alone: any authenticated user holding
    // a submission UUID could write answers into someone else's exam —
    // including a completed one, before grading ran. This is also the
    // endpoint that produces the "answered / total" count now shown live
    // on the lecturer's monitoring page, so it doubles as that feature's
    // integrity foundation.
    const submission = await this.prisma.submission.findFirst({
      where: {
        id: submitQuestionDto.submission_id,
        student_id: studentId,
        status: SubmissionStatus.IN_PROGRESS,
        is_deleted: false,
      },
      select: { id: true, exam_id: true },
    });

    if (!submission) {
      throw new NotFoundException('Active submission not found');
    }

    const question = await this.prisma.question.findUnique({
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
        const rawScore = correctMatches / totalCorrect;
        score = Math.max(0, Math.min(1, rawScore));
        is_correct = score === 1 && userSelectedTexts.size === totalCorrect;
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

    const submissionQuestion = await this.prisma.submissionQuestions.upsert({
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

    this.monitor.markDirty(submission.exam_id, submission.id);

    return {
      data: {
        submission_question_id: submissionQuestion.id,
      },
    };
  }

  async submitByExam(submitExamDto: SubmitExamDto, studentId?: string) {
    if (!submitExamDto.submission_id) {
      throw new BadRequestException('Submission id is required');
    }

    if (
      !submitExamDto.start_time ||
      isNaN(Date.parse(submitExamDto.start_time))
    ) {
      throw new BadRequestException('Invalid start_time');
    }

    if (!submitExamDto.end_time || isNaN(Date.parse(submitExamDto.end_time))) {
      throw new BadRequestException('Invalid end_time');
    }

    const startTime = new Date(submitExamDto.start_time);
    const endTime = new Date(submitExamDto.end_time);

    if (endTime.getTime() < startTime.getTime()) {
      throw new BadRequestException('end_time must be after start_time');
    }

    return this.examRuntimeService.completeSubmission(
      submitExamDto.submission_id,
      endTime,
      startTime,
      studentId,
    );
  }

  async getSubmissionOwner(submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: {
        id: submissionId,
      },
      select: {
        student_id: true,
      },
    });
    return submission?.student_id;
  }

  private async validateExamAndStudent(examId?: string, studentId?: string) {
    if (examId) {
      const exam = await this.submissionRepository.findExamById(examId);
      if (!exam) {
        throw new BadRequestException('Exam does not exist');
      }
    }

    if (studentId) {
      const student =
        await this.submissionRepository.findStudentById(studentId);
      if (!student) {
        throw new BadRequestException('Student does not exist');
      }
    }
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
}
