/*
  Warnings:

  - You are about to drop the column `lecturer_id` on the `questions` table. All the data in the column will be lost.
  - Existing topics are backfilled to an admin user, or the first user if no admin exists, before `created_by` is made required.

*/
-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_lecturer_id_fkey";

-- DropIndex
DROP INDEX "questions_lecturer_id_idx";

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "lecturer_id";

-- AlterTable
ALTER TABLE "topics" ADD COLUMN     "created_by" UUID;

UPDATE "topics"
SET "created_by" = COALESCE(
    (SELECT "id" FROM "users" WHERE "role" = 'ADMIN' ORDER BY "created_at" ASC LIMIT 1),
    (SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1)
)
WHERE "created_by" IS NULL;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "topics" WHERE "created_by" IS NULL) THEN
        RAISE EXCEPTION 'Cannot set topics.created_by to NOT NULL because no user exists for backfill';
    END IF;
END $$;

ALTER TABLE "topics" ALTER COLUMN "created_by" SET NOT NULL;

-- CreateIndex
CREATE INDEX "topics_created_by_idx" ON "topics"("created_by");

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
