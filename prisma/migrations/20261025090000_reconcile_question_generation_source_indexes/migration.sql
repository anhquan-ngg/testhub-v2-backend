-- Additive repair for databases that applied the original document-generation migration.
-- IF NOT EXISTS also supports fresh databases replaying the later historical file.
-- No application rows or historical migration files are changed by this migration.
-- Down: DROP INDEX IF EXISTS "question_generation_batches_source_index_id_idx";
--       DROP INDEX IF EXISTS "question_generation_batches_source_version_id_idx";
CREATE INDEX IF NOT EXISTS "question_generation_batches_source_version_id_idx"
ON "question_generation_batches"("source_version_id");

CREATE INDEX IF NOT EXISTS "question_generation_batches_source_index_id_idx"
ON "question_generation_batches"("source_index_id");
