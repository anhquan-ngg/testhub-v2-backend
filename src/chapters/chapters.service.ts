import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChaptersRepository } from './chapters.repository';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { QueryChapterDto } from './dto/query-chapter.dto';

/** The caller of a chapter operation. Admins bypass topic ownership. */
export type ChapterActor = { id: string; isAdmin: boolean };

@Injectable()
export class ChaptersService {
  constructor(private readonly chaptersRepository: ChaptersRepository) {}

  async create(dto: CreateChapterDto, actor: ChapterActor) {
    await this.assertTopicWritable(dto.topic_id, actor);
    if (dto.parent_id) {
      await this.assertValidParent(dto.parent_id, dto.topic_id);
    }
    return this.chaptersRepository.create(dto, actor.isAdmin);
  }

  async findAll(query: QueryChapterDto, actor: ChapterActor) {
    return this.chaptersRepository.findMany(
      query,
      actor.isAdmin,
      this.ownerScope(actor),
    );
  }

  /**
   * Chapters outside the caller's topics are reported as not found rather
   * than forbidden, so ids of other lecturers' chapters cannot be probed.
   */
  async findOne(id: string, actor: ChapterActor) {
    const chapter = await this.chaptersRepository.findById(
      id,
      actor.isAdmin,
      this.ownerScope(actor),
    );
    if (!chapter) {
      throw new NotFoundException(`Chapter with id "${id}" not found`);
    }
    return chapter;
  }

  async update(id: string, dto: UpdateChapterDto, actor: ChapterActor) {
    const existing = await this.findOne(id, actor);
    const topicId = dto.topic_id ?? existing.topic_id;
    const topicChanged = topicId !== existing.topic_id;
    if (topicChanged) {
      await this.assertTopicWritable(topicId, actor);
      // Descendants keep their own topic_id, so moving a chapter that has
      // sub-chapters would split its tree across two topics.
      if (existing.children.length > 0) {
        throw new ConflictException(
          'A chapter with sub-chapters cannot be moved to another topic',
        );
      }
    }

    // `undefined` = not sent (keep), `null` = explicit "make it a root
    // chapter". A kept parent belongs to the old topic, so it cannot survive
    // a topic change and the chapter becomes a root chapter of the new topic.
    const parentId =
      dto.parent_id !== undefined
        ? dto.parent_id
        : topicChanged
          ? null
          : existing.parent_id;
    if (parentId) {
      await this.assertValidParent(parentId, topicId, id);
    }

    const { parent_id: requestedParentId, ...rest } = dto;
    void requestedParentId;
    return this.chaptersRepository.update(id, {
      ...rest,
      ...(parentId !== existing.parent_id && { parent_id: parentId }),
    });
  }

  async remove(id: string, actor: ChapterActor) {
    await this.findOne(id, actor);
    const result = await this.chaptersRepository.softDelete(id);
    return {
      message: 'Chapter, child chapters, and questions deleted successfully',
      chapters: result.chapters.count,
      questions: result.questions.count,
    };
  }

  private ownerScope(actor: ChapterActor): string | undefined {
    return actor.isAdmin ? undefined : actor.id;
  }

  private async assertTopicWritable(topicId: string, actor: ChapterActor) {
    const topic = await this.chaptersRepository.findTopic(topicId);
    if (!topic) {
      throw new NotFoundException(`Topic with id "${topicId}" not found`);
    }
    if (!actor.isAdmin && topic.created_by !== actor.id) {
      throw new ForbiddenException('Topic does not belong to the current user');
    }
  }

  /**
   * The parent must be a live chapter of the same topic, and — when moving
   * an existing chapter — must not be the chapter itself or one of its
   * descendants, which would detach that subtree into a cycle.
   */
  private async assertValidParent(
    parentId: string,
    topicId: string,
    chapterId?: string,
  ) {
    const parent = await this.chaptersRepository.findParentCandidate(parentId);
    if (!parent || parent.topic_id !== topicId) {
      throw new BadRequestException(
        'Parent chapter does not belong to the same topic',
      );
    }
    if (!chapterId) return;

    const visited = new Set<string>();
    let current: typeof parent | null = parent;
    while (current && !visited.has(current.id)) {
      if (current.id === chapterId) {
        throw new BadRequestException(
          'A chapter cannot be moved under itself or its own sub-chapter',
        );
      }
      visited.add(current.id);
      current = current.parent_id
        ? await this.chaptersRepository.findParentCandidate(current.parent_id)
        : null;
    }
  }
}
