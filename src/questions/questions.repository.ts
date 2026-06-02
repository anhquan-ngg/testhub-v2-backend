import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { FileStatus, Prisma } from '@prisma/client';

@Injectable()
export class QuestionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateQuestionDto) {
    const { file_ids: fileIds = [], ...questionData } = dto;

    const question = await this.prisma.$transaction(async (tx) => {
      const createdQuestion = await tx.question.create({
        data: questionData,
      });

      if (fileIds.length) {
        await tx.questionFiles.createMany({
          data: fileIds.map((file) => ({
            question_id: createdQuestion.id,
            file_id: file.id,
            order: file.order,
          })),
        });

        await tx.file.updateMany({
          where: {
            id: { in: fileIds.map((file) => file.id) },
            uploaded_by: userId,
            status: FileStatus.ACTIVE,
          },
          data: {
            entity_type: 'questions',
            entity_id: createdQuestion.id,
          },
        });
      }

      return createdQuestion;
    });

    return this.findById(question.id);
  }

  async findChapterById(id: string) {
    return this.prisma.chapter.findFirst({
      where: { id, is_deleted: false },
      select: { id: true },
    });
  }

  async findActiveFilesByIds(ids: string[], uploadedBy: string) {
    return this.prisma.file.findMany({
      where: {
        id: { in: ids },
        uploaded_by: uploadedBy,
        status: FileStatus.ACTIVE,
      },
      select: { id: true },
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
      ...(search && {
        question_text: { contains: search, mode: 'insensitive' },
      }),
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

  async update(userId: string, id: string, dto: UpdateQuestionDto) {
    const { file_ids: fileIds, ...questionData } = dto;

    const question = await this.prisma.$transaction(async (tx) => {
      const updatedQuestion = await tx.question.update({
        where: { id },
        data: questionData,
      });

      if (fileIds !== undefined) {
        const existingQuestionFiles = await tx.questionFiles.findMany({
          where: { question_id: id },
          select: { file_id: true },
        });
        const oldFileIds = existingQuestionFiles.map((file) => file.file_id);
        const newFileIds = fileIds.map((file) => file.id);
        const newFileIdSet = new Set(newFileIds);
        const oldFileIdsToDelete = oldFileIds.filter(
          (fileId) => !newFileIdSet.has(fileId),
        );

        if (oldFileIdsToDelete.length) {
          await tx.file.updateMany({
            where: {
              id: { in: oldFileIdsToDelete },
              uploaded_by: userId,
              status: { not: FileStatus.DELETED },
            },
            data: {
              status: FileStatus.DELETED,
            },
          });
        }

        await tx.questionFiles.deleteMany({
          where: { question_id: id },
        });

        if (fileIds.length) {
          await tx.questionFiles.createMany({
            data: fileIds.map((file) => ({
              question_id: id,
              file_id: file.id,
              order: file.order,
            })),
          });

          await tx.file.updateMany({
            where: {
              id: { in: newFileIds },
              uploaded_by: userId,
              status: FileStatus.ACTIVE,
            },
            data: {
              entity_type: 'questions',
              entity_id: id,
            },
          });
        }
      }

      return updatedQuestion;
    });

    return this.findById(question.id);
  }

  async softDelete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const deletedAt = new Date();
      const questionFiles = await tx.questionFiles.findMany({
        where: { question_id: id },
        select: { file_id: true },
      });
      const fileIds = questionFiles.map((item) => item.file_id);

      const question = await tx.question.update({
        where: { id },
        data: { is_deleted: true, deleted_at: deletedAt },
      });

      if (fileIds.length) {
        await tx.file.updateMany({
          where: {
            id: { in: fileIds },
            status: { not: FileStatus.DELETED },
          },
          data: {
            status: FileStatus.DELETED,
          },
        });
      }

      return question;
    });
  }
}
