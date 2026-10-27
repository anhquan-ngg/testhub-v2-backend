import { Injectable } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Read-only, owner-scoped target lookup; no bank writes occur in this module. */
@Injectable()
export class QuestionGenerationRepository {
  constructor(private readonly prisma: PrismaService) {}
  /** Authorize a topic-owned plan before any bank chapter exists. */
  findOwnedTopic(ownerId: string, topicId: string) {
    return this.prisma.topic.findFirst({
      where: {
        id: topicId,
        created_by: ownerId,
        is_deleted: false,
        creator: { role: 'LECTURER', status: 'ACTIVE' },
      },
      select: { id: true, name: true },
    });
  }

  /** Return an active chapter only inside its active lecturer-owned topic. */
  findOwnedTarget(input: {
    ownerId: string;
    topicId: string;
    chapterId: string;
  }) {
    const { ownerId, topicId, chapterId } = input;
    return this.prisma.chapter.findFirst({
      where: {
        id: chapterId,
        topic_id: topicId,
        is_deleted: false,
        topic: {
          id: topicId,
          created_by: ownerId,
          is_deleted: false,
          creator: { role: UserRole.LECTURER, status: UserStatus.ACTIVE },
        },
      },
      select: { id: true, topic: { select: { id: true, name: true } } },
    });
  }
}
