-- Additive migration. Apply before enabling the AI API/worker.
-- Manual down (destructive; export AI staging data first): stop AI workers,
-- DROP TABLE question_generation_outbox, question_generation_items,
-- question_generation_attempts, question_generation_batches;
-- DROP TYPE "QuestionGenerationAttemptStatus", "QuestionGenerationItemStatus",
-- "QuestionGenerationBatchStatus". No bank/import rows are changed by this migration.

-- CreateEnum
CREATE TYPE "QuestionGenerationBatchStatus" AS ENUM ('QUEUED', 'GENERATING', 'REVIEW_REQUIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "QuestionGenerationItemStatus" AS ENUM ('VALID', 'INVALID', 'REJECTED', 'COMMITTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "QuestionGenerationAttemptStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'UNKNOWN');

-- CreateTable
CREATE TABLE "question_generation_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "contract_version" TEXT NOT NULL DEFAULT 'text-generation.v1',
    "idempotency_key" VARCHAR(128) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "source_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "question_format" "QuestionFormat" NOT NULL,
    "requested_count" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'vi',
    "consented_at" TIMESTAMP(3) NOT NULL,
    "status" "QuestionGenerationBatchStatus" NOT NULL DEFAULT 'QUEUED',
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "execution_id" UUID,
    "lease_expires_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "question_generation_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_generation_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "batch_id" UUID NOT NULL,
    "source_index" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "original_data" JSONB NOT NULL,
    "data" JSONB NOT NULL,
    "errors" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "status" "QuestionGenerationItemStatus" NOT NULL DEFAULT 'VALID',
    "question_id" UUID,

    CONSTRAINT "question_generation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_generation_attempts" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" "QuestionGenerationAttemptStatus" NOT NULL DEFAULT 'RUNNING',
    "error_code" TEXT,
    "result" JSONB,

    CONSTRAINT "question_generation_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_generation_outbox" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batch_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatched_at" TIMESTAMP(3),
    "next_dispatch_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatch_count" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,

    CONSTRAINT "question_generation_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_generation_batches_created_by_created_at_idx" ON "question_generation_batches"("created_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "question_generation_batches_status_lease_expires_at_idx" ON "question_generation_batches"("status", "lease_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "question_generation_batches_created_by_idempotency_key_key" ON "question_generation_batches"("created_by", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "question_generation_items_question_id_key" ON "question_generation_items"("question_id");

-- CreateIndex
CREATE INDEX "question_generation_items_batch_id_status_idx" ON "question_generation_items"("batch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "question_generation_items_batch_id_source_index_key" ON "question_generation_items"("batch_id", "source_index");

-- CreateIndex
CREATE UNIQUE INDEX "question_generation_attempts_batch_id_key" ON "question_generation_attempts"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_generation_outbox_batch_id_key" ON "question_generation_outbox"("batch_id");

-- CreateIndex
CREATE INDEX "question_generation_outbox_next_dispatch_at_idx" ON "question_generation_outbox"("next_dispatch_at");

-- AddForeignKey
ALTER TABLE "question_generation_batches" ADD CONSTRAINT "question_generation_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_generation_batches" ADD CONSTRAINT "question_generation_batches_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_generation_batches" ADD CONSTRAINT "question_generation_batches_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_generation_items" ADD CONSTRAINT "question_generation_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "question_generation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_generation_items" ADD CONSTRAINT "question_generation_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_generation_attempts" ADD CONSTRAINT "question_generation_attempts_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "question_generation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_generation_outbox" ADD CONSTRAINT "question_generation_outbox_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "question_generation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
