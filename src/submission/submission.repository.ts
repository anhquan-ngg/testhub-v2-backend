import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { QuerySubmissionDto } from './dto/query-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';

@Injectable()
export class SubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    exam: {
      select: {
        id: true,
        title: true,
        topic: true,
        practice: true,
        mode: true,
        sample_size: true,
        distribution: true,
        lecturer_id: true,
        _count: {
          select: {
            questions: true,
          },
        },
      },
    },
    student: {
      select: {
        id: true,
        full_name: true,
        email: true,
      },
    },
    _count: {
      select: {
        questions: true,
      },
    },
  } satisfies Prisma.SubmissionInclude;

  async create(dto: CreateSubmissionDto) {
    return this.prisma.submission.create({
      data: this.toCreateData(dto),
      include: this.include,
    });
  }

  async findMany(query: QuerySubmissionDto) {
    const { page = 1, limit = 10, exam_id, student_id, status, rating } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SubmissionWhereInput = {
      is_deleted: false,
      ...(exam_id && { exam_id }),
      ...(student_id && { student_id }),
      ...(status && { status }),
      ...(rating && { rating }),
    };

    const [data, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: this.include,
      }),
      this.prisma.submission.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.submission.findFirst({
      where: { id, is_deleted: false },
      include: {
        ...this.include,
        questions: {
          where: { is_deleted: false },
          include: {
            question: true,
          },
          orderBy: { created_at: 'asc' },
        },
        session: true,
      },
    });
  }

  async update(id: string, dto: UpdateSubmissionDto) {
    return this.prisma.submission.update({
      where: { id },
      data: this.toUpdateData(dto),
      include: this.include,
    });
  }

  async softDelete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const deletedAt = new Date();

      const submission = await tx.submission.update({
        where: { id },
        data: { is_deleted: true, deleted_at: deletedAt },
      });

      await tx.submissionQuestions.updateMany({
        where: { submission_id: id, is_deleted: false },
        data: { is_deleted: true, deleted_at: deletedAt },
      });

      return submission;
    });
  }

  async findExamById(id: string) {
    return this.prisma.exam.findFirst({
      where: { id, is_deleted: false },
      select: { id: true },
    });
  }

  async findStudentById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  private toCreateData(dto: CreateSubmissionDto): Prisma.SubmissionCreateInput {
    return {
      exam: { connect: { id: dto.exam_id } },
      student: { connect: { id: dto.student_id } },
      ...(dto.total_score !== undefined && { total_score: dto.total_score }),
      ...(dto.rating && { rating: dto.rating }),
      ...(dto.start_time && { start_time: new Date(dto.start_time) }),
      ...(dto.end_time && { end_time: new Date(dto.end_time) }),
      ...(dto.status && { status: dto.status }),
    };
  }

  private toUpdateData(dto: UpdateSubmissionDto): Prisma.SubmissionUpdateInput {
    return {
      ...(dto.exam_id && { exam: { connect: { id: dto.exam_id } } }),
      ...(dto.student_id && { student: { connect: { id: dto.student_id } } }),
      ...(dto.total_score !== undefined && { total_score: dto.total_score }),
      ...(dto.rating && { rating: dto.rating }),
      ...(dto.start_time && { start_time: new Date(dto.start_time) }),
      ...(dto.end_time && { end_time: new Date(dto.end_time) }),
      ...(dto.status && { status: dto.status }),
    };
  }
}
