import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { QueryChapterDto } from './dto/query-chapter.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChaptersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly publicSelect = {
    id: true,
    name: true,
    order: true,
    topic_id: true,
    parent_id: true,
    created_at: true,
    updated_at: true,
  } satisfies Prisma.ChapterSelect;

  private readonly adminSelect = {
    ...this.publicSelect,
    is_deleted: true,
    deleted_at: true,
  } satisfies Prisma.ChapterSelect;

  async create(dto: CreateChapterDto) {
    return this.prisma.chapter.create({ data: dto });
  }

  async findMany(query: QueryChapterDto, isAdmin = false) {
    const { page = 1, limit = 10, topic_id, parent_id, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ChapterWhereInput = {
      is_deleted: false,
      ...(topic_id && { topic_id }),
      ...(parent_id !== undefined && { parent_id: parent_id ?? null }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.chapter.findMany({
        where,
        skip,
        take: limit,
        orderBy: { order: 'asc' },
        select: isAdmin ? this.adminSelect : this.publicSelect,
      }),
      this.prisma.chapter.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string, isAdmin = false) {
    const chapterSelect = isAdmin ? this.adminSelect : this.publicSelect;

    return this.prisma.chapter.findFirst({
      where: {
        id,
        is_deleted: false,
        topic: { is_deleted: false },
        OR: [{ parent_id: null }, { parent: { is: { is_deleted: false } } }],
      },
      select: {
        ...chapterSelect,
        children: {
          where: { is_deleted: false },
          orderBy: { order: 'asc' },
          select: chapterSelect,
        },
        topic: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            order: true,
            ...(isAdmin && {
              is_deleted: true,
              deleted_at: true,
            }),
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateChapterDto) {
    return this.prisma.chapter.update({ where: { id }, data: dto });
  }

  async softDelete(id: string) {
    return this.prisma.chapter.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date() },
    });
  }
}
