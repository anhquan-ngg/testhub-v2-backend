-- Rollback: archive plans/batch snapshots first; drop new FKs/indexes, knowledge_plans and added columns.
-- Restore chapter_id NOT NULL only after all topic-owned documents/planned batches are archived or assigned a chapter.
-- This additive migration does not change existing rows or historical migrations.
-- AlterTable
ALTER TABLE "question_generation_batches" ADD COLUMN     "plan_id" UUID,
ADD COLUMN     "plan_snapshot" JSONB,
ALTER COLUMN "chapter_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "question_generation_items" ADD COLUMN     "plan_item_id" TEXT,
ADD COLUMN     "target_chapter_id" UUID;

-- AlterTable
ALTER TABLE "learning_documents" ALTER COLUMN "chapter_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "knowledge_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "source_version_id" UUID NOT NULL,
    "source_index_id" UUID,
    "source_profile_id" CHAR(64),
    "source_sha256" CHAR(64),
    "status" TEXT NOT NULL DEFAULT 'WAITING_SOURCE',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "question_configs" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "content_map" JSONB,
    "matrix" JSONB,
    "execution_id" UUID,
    "lease_expires_at" TIMESTAMP(3),
    "next_prepare_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error_code" TEXT,

    CONSTRAINT "knowledge_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_plans_created_by_created_at_idx" ON "knowledge_plans"("created_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "knowledge_plans_status_next_prepare_at_idx" ON "knowledge_plans"("status", "next_prepare_at");

-- CreateIndex
CREATE INDEX "knowledge_plans_source_version_id_idx" ON "knowledge_plans"("source_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_plans_created_by_idempotency_key_key" ON "knowledge_plans"("created_by", "idempotency_key");

-- CreateIndex
CREATE INDEX "question_generation_batches_plan_id_idx" ON "question_generation_batches"("plan_id");

-- CreateIndex
CREATE INDEX "question_generation_items_target_chapter_id_idx" ON "question_generation_items"("target_chapter_id");

-- AddForeignKey
ALTER TABLE "question_generation_batches" ADD CONSTRAINT "question_generation_batches_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "knowledge_plans"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_generation_items" ADD CONSTRAINT "question_generation_items_target_chapter_id_fkey" FOREIGN KEY ("target_chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_plans" ADD CONSTRAINT "knowledge_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_plans" ADD CONSTRAINT "knowledge_plans_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_plans" ADD CONSTRAINT "knowledge_plans_source_version_id_fkey" FOREIGN KEY ("source_version_id") REFERENCES "learning_document_versions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

