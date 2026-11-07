-- Additive, generated offline. No user database has been changed.
-- Down: DROP INDEX "learning_document_versions_source_sha256_idx";
-- Dropping the index only slows duplicate detection and extraction reuse; no data is lost.
CREATE INDEX "learning_document_versions_source_sha256_idx" ON "learning_document_versions"("source_sha256");