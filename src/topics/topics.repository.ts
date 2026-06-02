import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { QueryTopicDto } from './dto/query-topic.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TopicsRepository {
  private static readonly MAX_LIMIT = 100;

  constructor(private readonly prisma: PrismaService) {}

  private readonly publicSelect = {
    id: true,
    created_by: true,
    name: true,
    created_at: true,
    updated_at: true,
  } satisfies Prisma.TopicSelect;

  private readonly adminSelect = {
    ...this.publicSelect,
    is_deleted: true,
    deleted_at: true,
  } satisfies Prisma.TopicSelect;

  private readonly publicIncludeChapter = {
    chapters: {
      where: { is_deleted: false, parent_id: null },
      select: {
        id: true,
        name: true,
        order: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { order: 'asc' },
    },
  } satisfies Prisma.TopicInclude;

  private readonly adminIncludeChapter = {
    chapters: {
      where: { parent_id: null },
      select: {
        id: true,
        name: true,
        order: true,
        created_at: true,
        updated_at: true,
        is_deleted: true,
        deleted_at: true,
      },
      orderBy: { order: 'asc' },
    },
  } satisfies Prisma.TopicInclude;

  private readonly publicSelectWithChapter = {
    ...this.publicSelect,
    chapters: this.publicIncludeChapter.chapters,
  } satisfies Prisma.TopicSelect;

  private readonly adminSelectWithChapter = {
    ...this.adminSelect,
    chapters: this.adminIncludeChapter.chapters,
  } satisfies Prisma.TopicSelect;

  async create(createdBy: string, dto: CreateTopicDto) {
    return this.prisma.topic.create({
      data: { ...dto, created_by: createdBy },
    });
  }

  async findMany(query: QueryTopicDto, isAdmin = false) {
    const { search } = query;
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(query.limit) || 10, 1),
      TopicsRepository.MAX_LIMIT,
    );
    const skip = (page - 1) * limit;

    const where: Prisma.TopicWhereInput = {
      ...(!isAdmin && { is_deleted: false }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.topic.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: isAdmin ? this.adminSelect : this.publicSelect,
      }),
      this.prisma.topic.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string, isAdmin = false) {
    return this.prisma.topic.findFirst({
      where: { id, ...(!isAdmin && { is_deleted: false }) },
      select: isAdmin
        ? this.adminSelectWithChapter
        : this.publicSelectWithChapter,
    });
  }

  async findByIdIncludingDeleted(id: string) {
    return this.prisma.topic.findUnique({
      where: { id },
      select: this.adminSelectWithChapter,
    });
  }

  async update(id: string, dto: UpdateTopicDto) {
    return this.prisma.topic.updateMany({
      where: { id, is_deleted: false },
      data: dto,
    });
  }

  async softDelete(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const deletedAt = new Date();
      const topic = await tx.topic.updateMany({
        where: { id, is_deleted: false },
        data: { is_deleted: true, deleted_at: deletedAt },
      });

      if (topic.count === 0) {
        return {
          count: 0,
          chapters: { count: 0 },
          questions: { count: 0 },
        };
      }

      const chapterRows = await tx.$queryRaw<{ id: string }[]>`
        WITH RECURSIVE chapter_tree AS (
          SELECT c.id
          FROM "chapters" c
          WHERE c."topic_id" = CAST(${id} AS uuid)
            AND c."is_deleted" = false

          UNION

          SELECT child.id
          FROM "chapters" child
          INNER JOIN chapter_tree parent ON child."parent_id" = parent.id
          WHERE child."is_deleted" = false
        )
        SELECT id FROM chapter_tree
      `;
      const chapterIds = chapterRows.map((chapter) => chapter.id);

      const chapters = chapterIds.length
        ? await tx.chapter.updateMany({
            where: {
              id: { in: chapterIds },
              is_deleted: false,
            },
            data: { is_deleted: true, deleted_at: deletedAt },
          })
        : { count: 0 };

      const questions = chapterIds.length
        ? await tx.question.updateMany({
            where: {
              is_deleted: false,
              chapter_id: { in: chapterIds },
            },
            data: { is_deleted: true, deleted_at: deletedAt },
          })
        : { count: 0 };

      return {
        count: topic.count,
        chapters,
        questions,
      };
    });
  }
}
