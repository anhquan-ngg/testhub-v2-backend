-- CreateEnum
CREATE TYPE "QuestionImportSourceType" AS ENUM ('DOCX', 'XLSX');

-- CreateEnum
CREATE TYPE "QuestionImportStatus" AS ENUM ('UPLOADING', 'QUEUED', 'PARSING', 'REVIEW_REQUIRED', 'COMMITTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuestionImportItemStatus" AS ENUM ('VALID', 'INVALID', 'COMMITTED', 'SKIPPED');

-- CreateTable
CREATE TABLE "question_imports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "default_chapter_id" UUID,
    "exam_id" UUID,
    "source_type" "QuestionImportSourceType" NOT NULL,
    "status" "QuestionImportStatus" NOT NULL DEFAULT 'UPLOADING',
    "source_name" TEXT NOT NULL,
    "source_mime_type" TEXT NOT NULL,
    "source_size" INTEGER NOT NULL,
    "source_s3_key" TEXT NOT NULL,
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "valid_items" INTEGER NOT NULL DEFAULT 0,
    "invalid_items" INTEGER NOT NULL DEFAULT 0,
    "committed_items" INTEGER NOT NULL DEFAULT 0,
    "skipped_items" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "committed_at" TIMESTAMP(3),
    CONSTRAINT "question_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_import_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "import_id" UUID NOT NULL,
    "source_index" INTEGER NOT NULL,
    "source_code" TEXT,
    "chapter_id" UUID,
    "data" JSONB NOT NULL,
    "errors" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "fingerprint" TEXT,
    "status" "QuestionImportItemStatus" NOT NULL,
    "question_id" UUID,
    CONSTRAINT "question_import_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_import_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "item_id" UUID NOT NULL,
    "temp_s3_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "file_id" UUID,
    CONSTRAINT "question_import_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "question_imports_created_by_created_at_idx" ON "question_imports"("created_by", "created_at" DESC);
CREATE INDEX "question_imports_status_expires_at_idx" ON "question_imports"("status", "expires_at");
CREATE UNIQUE INDEX "question_import_items_import_id_source_index_key" ON "question_import_items"("import_id", "source_index");
CREATE INDEX "question_import_items_import_id_status_idx" ON "question_import_items"("import_id", "status");
CREATE INDEX "question_import_items_fingerprint_idx" ON "question_import_items"("fingerprint");
CREATE INDEX "question_import_assets_item_id_order_idx" ON "question_import_assets"("item_id", "order");

ALTER TABLE "question_imports" ADD CONSTRAINT "question_imports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_imports" ADD CONSTRAINT "question_imports_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_imports" ADD CONSTRAINT "question_imports_default_chapter_id_fkey" FOREIGN KEY ("default_chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "question_imports" ADD CONSTRAINT "question_imports_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "question_import_items" ADD CONSTRAINT "question_import_items_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "question_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_import_items" ADD CONSTRAINT "question_import_items_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "question_import_items" ADD CONSTRAINT "question_import_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "question_import_assets" ADD CONSTRAINT "question_import_assets_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "question_import_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "question_import_assets" ADD CONSTRAINT "question_import_assets_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
