import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ExamsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(lecturerId: string, dto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        ...dto,
        lecturer_id: lecturerId,
        exam_start_time: new Date(dto.exam_start_time),
        exam_end_time: new Date(dto.exam_end_time),
      },
      include: { topic: true, lecturer: { select: { id: true, full_name: true, email: true } } },
    });
  }

  async findMany(query: QueryExamDto) {
    const { page = 1, limit = 10, topic_id, lecturer_id, mode, is_public, practice, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ExamWhereInput = {
      is_deleted: false,
      ...(topic_id && { topic_id }),
      ...(lecturer_id && { lecturer_id }),
      ...(mode && { mode }),
      ...(is_public !== undefined && { is_public }),
      ...(practice !== undefined && { practice }),
      ...(search && { title: { contains: search, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          topic: true,
          lecturer: { select: { id: true, full_name: true, email: true } },
          _count: { select: { questions: true, registrations: true, submissions: true } },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.exam.findFirst({
      where: { id, is_deleted: false },
      include: {
        topic: true,
        lecturer: { select: { id: true, full_name: true, email: true } },
        questions: {
          where: { is_deleted: false },
          include: { question: true },
        },
        _count: { select: { registrations: true, submissions: true } },
      },
    });
  }

  async update(id: string, dto: UpdateExamDto) {
    const data: Prisma.ExamUpdateInput = { ...dto };
    if (dto.exam_start_time) data.exam_start_time = new Date(dto.exam_start_time);
    if (dto.exam_end_time) data.exam_end_time = new Date(dto.exam_end_time);

    return this.prisma.exam.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.exam.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }

  // ── Question management ──────────────────────────────────────────────────────

  async addQuestion(examId: string, questionId: string) {
    return this.prisma.examQuestions.create({
      data: { exam_id: examId, question_id: questionId },
    });
  }

  async removeQuestion(examId: string, questionId: string) {
    return this.prisma.examQuestions.delete({
      where: { exam_id_question_id: { exam_id: examId, question_id: questionId } },
    });
  }

  async findExamQuestion(examId: string, questionId: string) {
    return this.prisma.examQuestions.findUnique({
      where: { exam_id_question_id: { exam_id: examId, question_id: questionId } },
    });
  }
}
