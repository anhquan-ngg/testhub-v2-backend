-- Rollback before use: ALTER TABLE "question_generation_batches" DROP COLUMN "question_configs"; the legacy question_type/question_format/requested_count columns remain populated.
-- AlterTable
ALTER TABLE "question_generation_batches" ADD COLUMN     "question_configs" JSONB;

-- Backfill existing single-row batches from the legacy columns.
UPDATE "question_generation_batches"
SET "question_configs" = jsonb_build_array(jsonb_build_object(
  'question_type', "question_type"::text,
  'question_format', "question_format"::text,
  'count', "requested_count"
));

ALTER TABLE "question_generation_batches" ALTER COLUMN "question_configs" SET NOT NULL;
