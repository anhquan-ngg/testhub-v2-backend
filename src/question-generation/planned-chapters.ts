import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  FrozenPlan,
  normalizedChapterName,
  topologicalNodes,
} from './knowledge-plan.contract';

/** Resolve only selected branches under the subject lock, inside the question commit transaction. */
export async function resolvePlannedChapters(input: {
  tx: Prisma.TransactionClient;
  ownerId: string;
  topicId: string;
  plan: FrozenPlan;
  itemIds: string[];
}): Promise<Map<string, string>> {
  const { tx, ownerId, topicId, plan, itemIds } = input;
  const locked = await tx.topic.updateMany({
    where: { id: topicId, created_by: ownerId, is_deleted: false },
    data: { updated_at: new Date() },
  });
  if (!locked.count)
    throw new ConflictException('Question bank is unavailable');
  const nodes = new Map(plan.nodes.map((node) => [node.id, node]));
  const required = new Set<string>();
  for (const id of itemIds) {
    const item = plan.items.find((candidate) => candidate.id === id);
    if (!item)
      throw new ConflictException('Draft has no planned knowledge target');
    let next: string | null = item.node_id;
    while (next && !required.has(next)) {
      required.add(next);
      const node = nodes.get(next);
      if (!node) throw new ConflictException('Missing planned ancestor');
      next = node.parent_id;
    }
  }
  const chapters = await tx.chapter.findMany({
    where: { topic_id: topicId, is_deleted: false },
    select: { id: true, parent_id: true, name: true },
  });
  const mapped = new Map<string, string>();
  for (const node of topologicalNodes(plan.nodes)) {
    if (!required.has(node.id)) continue;
    const parentId = node.parent_id ? mapped.get(node.parent_id) : null;
    if (parentId === undefined)
      throw new ConflictException('Planned ancestor unavailable');
    const matches = chapters.filter(
      (chapter) =>
        chapter.parent_id === parentId &&
        normalizedChapterName(chapter.name) ===
          normalizedChapterName(node.name),
    );
    if (matches.length > 1)
      throw new ConflictException(
        'Ambiguous chapter name; clarify the plan before generating',
      );
    const chapter =
      matches[0] ??
      (await tx.chapter.create({
        data: {
          topic_id: topicId,
          parent_id: parentId,
          name: node.name,
          order: chapters.length,
        },
        select: { id: true, parent_id: true, name: true },
      }));
    if (!matches.length) chapters.push(chapter);
    mapped.set(node.id, chapter.id);
  }
  return new Map(
    plan.items
      .filter((item) => itemIds.includes(item.id))
      .map((item) => {
        const chapterId = mapped.get(item.node_id);
        if (!chapterId)
          throw new ConflictException('Planned target unavailable');
        return [item.id, chapterId];
      }),
  );
}
