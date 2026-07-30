-- Resolve existing duplicate non-deleted IN_PROGRESS submissions per (exam_id, student_id),
-- retaining the newest record (by created_at, id) and soft-deleting older duplicates.
WITH ranked_submissions AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY exam_id, student_id
           ORDER BY created_at DESC, id DESC
         ) AS rn
  FROM "submissions"
  WHERE "is_deleted" = false AND "status" = 'IN_PROGRESS'
)
UPDATE "submissions"
SET "is_deleted" = true,
    "deleted_at" = NOW()
WHERE id IN (
  SELECT id FROM ranked_submissions WHERE rn > 1
);

-- Create partial unique index to prevent future duplicate active submissions per student and exam
CREATE UNIQUE INDEX IF NOT EXISTS "submissions_active_exam_student_unique"
ON "submissions" ("exam_id", "student_id")
WHERE "is_deleted" = false AND "status" = 'IN_PROGRESS';
