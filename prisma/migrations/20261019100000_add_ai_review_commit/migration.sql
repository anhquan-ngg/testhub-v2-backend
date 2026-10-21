-- Additive migration; apply after add_ai_generation_staging and before review APIs.
-- Manual down: stop writers, export audit data, DROP TABLE question_generation_reviews;
-- remove reviewed_by/reviewed_at/committed_at columns and DROP TYPE
-- "QuestionGenerationReviewAction". PostgreSQL cannot simply remove added enum
-- values: preserve them on rollback; reverting them requires a separately reviewed
-- type rebuild/data migration after resolving APPROVED/COMPLETED rows.

-- CreateEnum
CREATE TYPE "QuestionGenerationReviewAction" AS ENUM ('EDIT', 'APPROVE', 'REJECT', 'COMMIT');

-- AlterEnum
ALTER TYPE "QuestionGenerationBatchStatus" ADD VALUE 'COMPLETED';

-- AlterEnum
ALTER TYPE "QuestionGenerationItemStatus" ADD VALUE 'APPROVED';

-- AlterTable
ALTER TABLE "question_generation_items" ADD COLUMN     "committed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" UUID;

-- CreateTable
CREATE TABLE "question_generation_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batch_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" "QuestionGenerationReviewAction" NOT NULL,
    "revision" INTEGER NOT NULL,
    "before_status" "QuestionGenerationItemStatus" NOT NULL,
    "after_status" "QuestionGenerationItemStatus" NOT NULL,
    "before_data" JSONB NOT NULL,
    "after_data" JSONB NOT NULL,
    "question_id" UUID,

    CONSTRAINT "question_generation_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_generation_reviews_batch_id_created_at_idx" ON "question_generation_reviews"("batch_id", "created_at");

-- CreateIndex
CREATE INDEX "question_generation_reviews_item_id_revision_idx" ON "question_generation_reviews"("item_id", "revision");

-- AddForeignKey
ALTER TABLE "question_generation_reviews" ADD CONSTRAINT "question_generation_reviews_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "question_generation_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_generation_reviews" ADD CONSTRAINT "question_generation_reviews_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "question_generation_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_generation_reviews" ADD CONSTRAINT "question_generation_reviews_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
