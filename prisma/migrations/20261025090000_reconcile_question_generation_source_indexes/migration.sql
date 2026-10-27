-- Additive repair for databases that applied the original document-generation migration.
-- IF NOT EXISTS also supports fresh databases replaying the later historical file.
-- No application rows or historical migration files are changed by this migration.
-- Down: retain any index that existed before this reconciliation (including indexes
-- from 20261023090000). Drop only indexes confirmed absent in the pre-run inventory
-- and created by this run. If that inventory is unavailable, leave both indexes intact.
CREATE INDEX IF NOT EXISTS "question_generation_batches_source_version_id_idx"
ON "question_generation_batches"("source_version_id");

CREATE INDEX IF NOT EXISTS "question_generation_batches_source_index_id_idx"
ON "question_generation_batches"("source_index_id");
