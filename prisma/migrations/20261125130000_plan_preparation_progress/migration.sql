-- Additive, offline only. Down: drop knowledge_plan_request_keys, then the three
-- preparation columns after stopping the new workers; original plan keys remain.
ALTER TABLE "knowledge_plans"
  ADD COLUMN "preparation_started_at" TIMESTAMP(3),
  ADD COLUMN "source_progress_at" TIMESTAMP(3),
  ADD COLUMN "source_checkpoint" JSONB;
-- Never grant legacy plans a fresh window merely because this migration ran.
UPDATE "knowledge_plans" SET
  "preparation_started_at" = "created_at", "source_progress_at" = "created_at";
-- Seed observed high-water marks, not a fabricated progress timestamp.
UPDATE "knowledge_plans" AS p SET "source_checkpoint" = jsonb_build_object(
  'usable', v."status" = 'EXTRACTED' OR (v."status" = 'PARTIAL' AND v."partial_confirmed_at" IS NOT NULL),
  'index_id', p."source_index_id",
  'completed_chunks', COALESCE((SELECT i."completed_chunks" FROM "learning_document_indexes" i
    WHERE i."id" = p."source_index_id" AND i."version_id" = v."id"
      AND i."owner_id" = p."created_by" AND i."profile_id" = p."source_profile_id"), 0),
  'ready', COALESCE((SELECT i."status" = 'READY' FROM "learning_document_indexes" i
    WHERE i."id" = p."source_index_id" AND i."version_id" = v."id"
      AND i."owner_id" = p."created_by" AND i."profile_id" = p."source_profile_id"), false)
)
FROM "learning_document_versions" AS v
WHERE p."source_version_id" = v."id";
ALTER TABLE "knowledge_plans"
  ALTER COLUMN "preparation_started_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "preparation_started_at" SET NOT NULL,
  ALTER COLUMN "source_progress_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "source_progress_at" SET NOT NULL;

CREATE TABLE "knowledge_plan_request_keys" (
  "created_by" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "request_hash" CHAR(64) NOT NULL,
  "plan_id" UUID NOT NULL,
  CONSTRAINT "knowledge_plan_request_keys_pkey" PRIMARY KEY ("created_by", "key"),
  CONSTRAINT "knowledge_plan_request_keys_plan_id_fkey" FOREIGN KEY ("plan_id")
    REFERENCES "knowledge_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "knowledge_plan_request_keys_plan_id_idx" ON "knowledge_plan_request_keys"("plan_id");
INSERT INTO "knowledge_plan_request_keys" ("created_by", "key", "request_hash", "plan_id")
SELECT "created_by", "idempotency_key", "request_hash", "id" FROM "knowledge_plans";
