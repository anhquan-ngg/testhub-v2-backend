-- Additive, generated offline. No user database has been changed.
-- Down: export regrade history first, drop the two new tables, then drop
-- submissions.grading_revision. This discards drafts/audits, not published scores.
ALTER TABLE "submissions" ADD COLUMN "grading_revision" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "submission_regrade_drafts" (
  "submission_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL,
  "base_grade_revision" INTEGER NOT NULL,
  "published_revision" INTEGER,
  "scores" JSONB NOT NULL,
  "reason" VARCHAR(2000) NOT NULL,
  "grader_id" UUID NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "submission_regrade_drafts_pkey" PRIMARY KEY ("submission_id"),
  CONSTRAINT "submission_regrade_drafts_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "submission_regrade_publications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "submission_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL,
  "grader_id" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason" VARCHAR(2000) NOT NULL,
  "previous_total_score" DECIMAL(10,2),
  "total_score" DECIMAL(10,2) NOT NULL,
  "changes" JSONB NOT NULL,
  CONSTRAINT "submission_regrade_publications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "submission_regrade_publications_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "submission_regrade_publications_submission_id_revision_key" ON "submission_regrade_publications"("submission_id", "revision");
CREATE INDEX "submission_regrade_publications_submission_id_created_at_idx" ON "submission_regrade_publications"("submission_id", "created_at" DESC);
