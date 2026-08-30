-- AlterTable: persist per-submission question order (stable across reloads, randomized per student)
ALTER TABLE "submission_questions" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: keep the current (created_at-based) display order for submissions that were already
-- IN_PROGRESS before this migration, so they don't end up with every row tied at order=0 (which would
-- reintroduce unstable ordering on reload for those in-flight submissions).
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY submission_id ORDER BY created_at ASC) - 1 AS rn
  FROM "submission_questions"
)
UPDATE "submission_questions" sq
SET "order" = ranked.rn
FROM ranked
WHERE sq.id = ranked.id;

-- Speed up ORDER BY "order" scoped to a submission
CREATE INDEX IF NOT EXISTS "submission_questions_submission_id_order_idx"
ON "submission_questions" ("submission_id", "order");
