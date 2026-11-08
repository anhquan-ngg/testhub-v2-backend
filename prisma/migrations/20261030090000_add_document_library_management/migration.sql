-- Additive, generated offline. No user database has been changed.
-- Down: DROP INDEX "learning_documents_created_by_title_idx";
--       DROP INDEX "learning_documents_created_by_archived_at_idx";
--       ALTER TABLE "learning_documents" DROP COLUMN "purged_at", DROP COLUMN "last_used_at", DROP COLUMN "archived_at";
-- Dropping the columns discards archive/last-used/purge bookkeeping only; documents and versions are untouched.
ALTER TABLE "learning_documents"
  ADD COLUMN "archived_at" TIMESTAMP(3),
  ADD COLUMN "last_used_at" TIMESTAMP(3),
  ADD COLUMN "purged_at" TIMESTAMP(3);

CREATE INDEX "learning_documents_created_by_archived_at_idx" ON "learning_documents"("created_by", "archived_at");
CREATE INDEX "learning_documents_created_by_title_idx" ON "learning_documents"("created_by", "title");