import { Prisma } from '@prisma/client';

/** Active rooted chapters of one subject. UNION on IDs terminates even with corrupt cycles. */
export function activeChapterTree(
  topicId?: string,
  ownerId?: string,
): Prisma.Sql {
  return Prisma.sql`active_chapters(id) AS (
    SELECT c.id FROM chapters c JOIN topics t ON t.id=c.topic_id
    WHERE c.parent_id IS NULL
      ${topicId ? Prisma.sql`AND c.topic_id=${topicId}::uuid` : Prisma.empty}
      ${ownerId ? Prisma.sql`AND t.created_by=${ownerId}::uuid` : Prisma.empty}
      AND c.is_deleted=false AND t.is_deleted=false
    UNION
    SELECT c.id FROM chapters c JOIN active_chapters p ON c.parent_id=p.id
    JOIN chapters previous ON previous.id=p.id
    WHERE c.topic_id=previous.topic_id AND c.is_deleted=false
  )`;
}

/** Read an active subtree without assuming a maximum depth or crossing subject boundaries. */
export async function descendantChapterIds(
  db: Prisma.TransactionClient,
  topicId: string,
  rootId: string,
): Promise<string[]> {
  const rows = await db.$queryRaw<
    { id: string }[]
  >(Prisma.sql`WITH RECURSIVE ${activeChapterTree(topicId)},
    subtree(id) AS (
      SELECT id FROM active_chapters WHERE id=${rootId}::uuid
      UNION
      SELECT c.id FROM chapters c JOIN subtree p ON c.parent_id=p.id
      JOIN active_chapters a ON a.id=c.id
    ) SELECT id FROM subtree`);
  return rows.map((row) => row.id);
}

/** Read a parent chain as flat rows; a UNION avoids infinite traversal of corrupt cycles. */
export async function ancestorChapters(
  db: Prisma.TransactionClient,
  topicId: string,
  id: string,
) {
  return db.$queryRaw<
    Array<{ id: string; parent_id: string | null; name: string }>
  >(Prisma.sql`WITH RECURSIVE chain AS (
    SELECT id,parent_id,name FROM chapters WHERE id=${id}::uuid AND topic_id=${topicId}::uuid AND is_deleted=false
    UNION
    SELECT c.id,c.parent_id,c.name FROM chapters c JOIN chain child ON child.parent_id=c.id
    WHERE c.topic_id=${topicId}::uuid AND c.is_deleted=false
  ) SELECT id,parent_id,name FROM chain`);
}

/** Serialize every structural mutation of these topics, using deterministic lock order. */
export async function lockChapterTopics(
  db: Prisma.TransactionClient,
  ids: string[],
): Promise<void> {
  for (const id of [...new Set(ids)].sort())
    await db.topic.updateMany({
      where: { id, is_deleted: false },
      data: { updated_at: new Date() },
    });
}
