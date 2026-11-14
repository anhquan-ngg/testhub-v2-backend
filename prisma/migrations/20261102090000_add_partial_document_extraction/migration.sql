-- Down: ALTER TABLE "learning_document_versions" DROP COLUMN "partial_confirmed_at", DROP COLUMN "quality"; (the PARTIAL enum value cannot be dropped in place; map rows to OCR_REQUIRED first)
ALTER TYPE "LearningDocumentStatus" ADD VALUE IF NOT EXISTS 'PARTIAL';
ALTER TABLE "learning_document_versions" ADD COLUMN "quality" JSONB, ADD COLUMN "partial_confirmed_at" TIMESTAMP(3);
