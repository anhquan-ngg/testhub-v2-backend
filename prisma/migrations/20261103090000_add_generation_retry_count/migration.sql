-- Down: ALTER TABLE "question_generation_batches" DROP COLUMN "generation_retry_count";
ALTER TABLE "question_generation_batches" ADD COLUMN "generation_retry_count" INTEGER NOT NULL DEFAULT 0;
