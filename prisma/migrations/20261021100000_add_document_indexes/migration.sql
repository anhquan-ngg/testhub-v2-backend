-- Rollback before use: drop learning_document_indexes, then LearningDocumentIndexStatus.
-- CreateEnum
CREATE TYPE "LearningDocumentIndexStatus" AS ENUM ('QUEUED', 'INDEXING', 'READY', 'FAILED', 'REVOKED');

-- CreateTable
CREATE TABLE "learning_document_indexes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "profile_id" CHAR(64) NOT NULL,
    "profile" JSONB NOT NULL,
    "status" "LearningDocumentIndexStatus" NOT NULL DEFAULT 'QUEUED',
    "prepared" BOOLEAN NOT NULL DEFAULT false,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "completed_chunks" INTEGER NOT NULL DEFAULT 0,
    "step_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "error_code" TEXT,
    "execution_id" UUID,
    "lease_expires_at" TIMESTAMP(3),
    "next_dispatch_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatch_count" INTEGER NOT NULL DEFAULT 0,
    "remote_revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_document_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_document_indexes_status_next_dispatch_at_idx" ON "learning_document_indexes"("status", "next_dispatch_at");

-- CreateIndex
CREATE INDEX "learning_document_indexes_status_lease_expires_at_idx" ON "learning_document_indexes"("status", "lease_expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "learning_document_indexes_version_id_profile_id_key" ON "learning_document_indexes"("version_id", "profile_id");

-- AddForeignKey
ALTER TABLE "learning_document_indexes" ADD CONSTRAINT "learning_document_indexes_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "learning_document_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
