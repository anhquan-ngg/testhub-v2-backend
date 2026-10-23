-- Rollback before use: drop the added source/provenance columns and FKs; enum removal requires type recreation. Do not drop existing batches.
-- AlterEnum
ALTER TYPE "QuestionGenerationBatchStatus" ADD VALUE 'WAITING_SOURCE';

-- AlterTable
ALTER TABLE "question_generation_batches" ADD COLUMN     "preparation_stage" TEXT,
ADD COLUMN     "source_index_id" UUID,
ADD COLUMN     "source_mode" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN     "source_profile_id" CHAR(64),
ADD COLUMN     "source_query" TEXT,
ADD COLUMN     "source_version_id" UUID;

-- AlterTable
ALTER TABLE "question_generation_items" ADD COLUMN     "provenance" JSONB;

-- AddForeignKey
ALTER TABLE "question_generation_batches" ADD CONSTRAINT "question_generation_batches_source_version_id_fkey" FOREIGN KEY ("source_version_id") REFERENCES "learning_document_versions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_generation_batches" ADD CONSTRAINT "question_generation_batches_source_index_id_fkey" FOREIGN KEY ("source_index_id") REFERENCES "learning_document_indexes"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
