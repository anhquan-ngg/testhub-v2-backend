-- Down: ALTER TABLE "exams" DROP CONSTRAINT "exams_distribution_delta_check", DROP COLUMN "distribution_delta";
ALTER TABLE "exams" ADD COLUMN "distribution_delta" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "exams" ADD CONSTRAINT "exams_distribution_delta_check" CHECK ("distribution_delta" BETWEEN 0 AND 2);

