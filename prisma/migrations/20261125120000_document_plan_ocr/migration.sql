-- Additive only. Down: DROP INDEX learning_document_versions_plan_ocr_unique;
-- then ALTER TABLE learning_document_versions DROP COLUMN ocr_request (loses recovery audit).
ALTER TABLE "learning_document_versions" ADD COLUMN "ocr_request" JSONB;

-- The owner/plan admission locks serialize quotas and revisions. This index also
-- protects idempotency if another writer does not use the admission transaction.
CREATE UNIQUE INDEX "learning_document_versions_plan_ocr_unique"
ON "learning_document_versions" (("ocr_request"->>'origin_plan_id'), ("ocr_request"->>'origin_revision'), (COALESCE("ocr_request"->>'retry_of_version_id', '')))
WHERE "ocr_request" IS NOT NULL;
