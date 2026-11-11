-- Down: ALTER TABLE "submissions" DROP COLUMN "selection_metadata"; ALTER TABLE "exams" DROP COLUMN "distribution_delta_online";
ALTER TABLE "exams" ADD COLUMN "distribution_delta_online" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "submissions" ADD COLUMN "selection_metadata" JSONB;
