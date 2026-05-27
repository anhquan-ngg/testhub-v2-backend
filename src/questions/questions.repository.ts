import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuestionDto) {
    return this.prisma.question.create({
      data: dto,
    });
  }

  async findMany(query: QueryQuestionDto) {
    const {
      page = 1,
      limit = 10,
      chapter_id,
      question_type,
      question_format,
      search,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.QuestionWhereInput = {
      is_deleted: false,
      ...(chapter_id && { chapter_id }),
      ...(question_type && { question_type }),
      ...(question_format && { question_format }),
      ...(search && { question_text: { contains: search, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: { chapter: true },
      }),
      this.prisma.question.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    return this.prisma.question.findFirst({
      where: { id, is_deleted: false },
      include: {
        chapter: true,
        files: { include: { file: true }, orderBy: { order: 'asc' } },
      },
    });
  }

  async update(id: string, dto: UpdateQuestionDto) {
    return this.prisma.question.update({ where: { id }, data: dto });
  }

  async softDelete(id: string) {
    return this.prisma.question.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }
}
