import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  activeChapterTree,
  ancestorChapters,
  descendantChapterIds,
  lockChapterTopics,
} from '../common/chapter-tree';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
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

  async create(dto: CreateChapterDto, isAdmin = false, ownerId?: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockChapterTopics(tx, [dto.topic_id]);
      await this.assertTopic(tx, dto.topic_id, ownerId);
      if (dto.parent_id)
        await this.assertParent(tx, dto.topic_id, dto.parent_id);
      return tx.chapter.create({
        data: dto,
        select: isAdmin ? this.adminSelect : this.publicSelect,
      });
    });
  }

  private async assertTopic(
    tx: Prisma.TransactionClient,
    id: string,
    ownerId?: string,
  ) {
    const topic = await tx.topic.findFirst({
      where: {
        id,
        is_deleted: false,
        ...(ownerId ? { created_by: ownerId } : {}),
      },
      select: { id: true },
    });
    if (!topic) throw new NotFoundException('Topic unavailable');
  }

  private async assertParent(
    tx: Prisma.TransactionClient,
    topicId: string,
    parentId: string,
    movedId?: string,
  ) {
    const chain = await ancestorChapters(tx, topicId, parentId);
    if (!chain.length || !chain.some((node) => node.parent_id === null))
      throw new BadRequestException(
        'Parent chapter is unavailable or has an invalid ancestor chain',
      );
    if (movedId && chain.some((node) => node.id === movedId))
      throw new BadRequestException(
        'A chapter cannot be moved under itself or its own sub-chapter',
      );
  }

  /** Batch-load the ancestor chain using a cycle-safe recursive CTE. */
  ancestorChain(topicId: string, id: string) {
    return ancestorChapters(this.prisma.current, topicId, id);
  }

  /** Reuse the active rooted subtree traversal for any depth. */
  descendants(topicId: string, id: string) {
    return descendantChapterIds(this.prisma.current, topicId, id);
  }

  /** Paginated flat tree projection; child loading never serializes recursive JSON. */
  async hierarchy(
    topicId: string,
    id: string,
    kind: 'ancestors' | 'subtree',
    page: number,
    limit: number,
  ) {
    const ids =
      kind === 'subtree'
        ? await this.descendants(topicId, id)
        : (await this.ancestorChain(topicId, id)).map((node) => node.id);
    const where = { id: { in: ids }, topic_id: topicId, is_deleted: false };
    const data = await this.prisma.chapter.findMany({
      where,
      select: this.publicSelect,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total: ids.length, page, limit };
  }

  /**
   * Topic filter applied to every read. `ownerId` is set for non-admins so
   * they only ever see chapters of topics they created.
   */
  private topicScope(ownerId?: string): Prisma.TopicWhereInput {
    return { is_deleted: false, ...(ownerId && { created_by: ownerId }) };
  }

  async findMany(query: QueryChapterDto, isAdmin = false, ownerId?: string) {
    const { page = 1, limit = 10, topic_id, parent_id, search } = query;
    const skip = (page - 1) * limit;
    const activeIds = !isAdmin
      ? (
          await this.prisma.$queryRaw<{ id: string }[]>(
            Prisma.sql`WITH RECURSIVE ${activeChapterTree(topic_id, ownerId)} SELECT id FROM active_chapters`,
          )
        ).map((row) => row.id)
      : null;

    const where: Prisma.ChapterWhereInput = {
      ...(!isAdmin && { is_deleted: false }),
      ...(activeIds ? { id: { in: activeIds } } : {}),
      ...(ownerId && { topic: this.topicScope(ownerId) }),
      ...(topic_id && { topic_id }),
      ...(parent_id !== undefined && { parent_id: parent_id ?? null }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.chapter.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        select: isAdmin ? this.adminSelect : this.publicSelect,
      }),
      this.prisma.chapter.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string, isAdmin = false, ownerId?: string) {
    const chapterSelect = isAdmin ? this.adminSelect : this.publicSelect;

    const chapter = await this.prisma.chapter.findFirst({
      where: {
        id,
        ...(!isAdmin && { is_deleted: false }),
        topic: this.topicScope(ownerId),
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
    if (chapter && !isAdmin) {
      const ancestors = await this.ancestorChain(chapter.topic_id, id);
      if (!ancestors.some((node) => node.parent_id === null)) return null;
    }
    return chapter;
  }

  async findTopic(topicId: string) {
    return this.prisma.topic.findFirst({
      where: { id: topicId, is_deleted: false },
      select: { id: true, created_by: true },
    });
  }

  async findParentCandidate(id: string) {
    return this.prisma.chapter.findFirst({
      where: { id, is_deleted: false },
      select: { id: true, topic_id: true, parent_id: true },
    });
  }

  async update(
    id: string,
    data: Prisma.ChapterUncheckedUpdateInput,
    ownerId?: string,
  ) {
    const before = await this.prisma.chapter.findUnique({
      where: { id },
      select: { topic_id: true },
    });
    if (!before) throw new NotFoundException('Chapter unavailable');
    return this.prisma.$transaction(async (tx) => {
      const nextTopic =
        typeof data.topic_id === 'string' ? data.topic_id : before.topic_id;
      await lockChapterTopics(tx, [before.topic_id, nextTopic]);
      const current = await tx.chapter.findFirst({
        where: { id, is_deleted: false },
        select: { topic_id: true, parent_id: true },
      });
      if (!current || current.topic_id !== before.topic_id)
        throw new ConflictException('Chapter changed; reload before moving it');
      await this.assertTopic(tx, current.topic_id, ownerId);
      await this.assertTopic(tx, nextTopic, ownerId);
      if (
        nextTopic !== current.topic_id &&
        (await tx.chapter.count({
          where: { parent_id: id, is_deleted: false },
        }))
      )
        throw new ConflictException(
          'A chapter with sub-chapters cannot be moved to another topic',
        );
      const parent =
        typeof data.parent_id === 'string'
          ? data.parent_id
          : data.parent_id === null
            ? null
            : current.parent_id;
      if (parent) await this.assertParent(tx, nextTopic, parent, id);
      return tx.chapter.update({ where: { id }, data });
    });
  }

  async softDelete(id: string, ownerId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.chapter.findUnique({
        where: { id },
        select: { topic_id: true },
      });
      if (!before) throw new NotFoundException('Chapter unavailable');
      await lockChapterTopics(tx, [before.topic_id]);
      await this.assertTopic(tx, before.topic_id, ownerId);
      const current = await tx.chapter.findUnique({
        where: { id },
        select: { topic_id: true },
      });
      if (current?.topic_id !== before.topic_id)
        throw new ConflictException('Chapter changed; reload');
      const deletedAt = new Date();
      const chapterIds = await descendantChapterIds(tx, before.topic_id, id);

      const chapters = await tx.chapter.updateMany({
        where: {
          id: { in: chapterIds },
          is_deleted: false,
        },
        data: { is_deleted: true, deleted_at: deletedAt },
      });

      const questions = await tx.question.updateMany({
        where: {
          chapter_id: { in: chapterIds },
          is_deleted: false,
        },
        data: { is_deleted: true, deleted_at: deletedAt },
      });

      return {
        chapters,
        questions,
      };
    });
  }
}
