-- Rollback (only before these records are used): drop learning_document_versions,
-- then learning_documents, then LearningDocumentStatus and LearningDocumentType.
-- This additive migration is generated offline; it has not been applied to a user DB.
-- CreateEnum
CREATE TYPE "LearningDocumentType" AS ENUM ('PDF', 'PPTX');

-- CreateEnum
CREATE TYPE "LearningDocumentStatus" AS ENUM ('UPLOADING', 'QUEUED', 'PROCESSING', 'EXTRACTED', 'OCR_REQUIRED', 'FAILED');

-- CreateTable
CREATE TABLE "learning_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID NOT NULL,
    "topic_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "next_version" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "learning_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_document_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "file_name" VARCHAR(200) NOT NULL,
    "source_type" "LearningDocumentType" NOT NULL,
    "mime_type" TEXT NOT NULL,
    "declared_size" INTEGER NOT NULL,
    "include_notes" BOOLEAN NOT NULL DEFAULT false,
    "consented_at" TIMESTAMP(3) NOT NULL,
    "upload_key" TEXT NOT NULL,
    "upload_expires_at" TIMESTAMP(3) NOT NULL,
    "source_key" TEXT,
    "source_sha256" CHAR(64),
    "artifact_key" TEXT,
    "artifact_sha256" CHAR(64),
    "parser_version" TEXT,
    "unit_count" INTEGER,
    "warnings" JSONB,
    "status" "LearningDocumentStatus" NOT NULL DEFAULT 'UPLOADING',
    "error_code" TEXT,
    "execution_id" UUID,
    "lease_expires_at" TIMESTAMP(3),
    "extraction_count" INTEGER NOT NULL DEFAULT 0,
    "next_dispatch_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatch_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "learning_document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_documents_created_by_created_at_idx" ON "learning_documents"("created_by", "created_at" DESC);

-- CreateIndex
CREATE INDEX "learning_documents_topic_id_chapter_id_idx" ON "learning_documents"("topic_id", "chapter_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_document_versions_upload_key_key" ON "learning_document_versions"("upload_key");

-- CreateIndex
CREATE UNIQUE INDEX "learning_document_versions_source_key_key" ON "learning_document_versions"("source_key");

-- CreateIndex
CREATE UNIQUE INDEX "learning_document_versions_artifact_key_key" ON "learning_document_versions"("artifact_key");

-- CreateIndex
CREATE INDEX "learning_document_versions_status_next_dispatch_at_idx" ON "learning_document_versions"("status", "next_dispatch_at");

-- CreateIndex
CREATE INDEX "learning_document_versions_status_lease_expires_at_idx" ON "learning_document_versions"("status", "lease_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "learning_document_versions_document_id_version_key" ON "learning_document_versions"("document_id", "version");

-- AddForeignKey
ALTER TABLE "learning_documents" ADD CONSTRAINT "learning_documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_documents" ADD CONSTRAINT "learning_documents_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_documents" ADD CONSTRAINT "learning_documents_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_document_versions" ADD CONSTRAINT "learning_document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "learning_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
