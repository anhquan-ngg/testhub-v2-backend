-- Exam proctoring: append-only violation log + tighter session-cleanup index.

-- CreateEnum
CREATE TYPE "ExamViolationType" AS ENUM ('TAB_HIDDEN', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'CONNECTION_LOST', 'COPY', 'PASTE');

-- CreateEnum
CREATE TYPE "ExamViolationSource" AS ENUM ('CLIENT', 'SERVER');

-- CreateTable
CREATE TABLE "exam_violations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submission_id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "type" "ExamViolationType" NOT NULL,
    "source" "ExamViolationSource" NOT NULL DEFAULT 'CLIENT',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_time" TIMESTAMP(3),
    "duration_ms" INTEGER,

    CONSTRAINT "exam_violations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_violations_exam_id_occurred_at_idx" ON "exam_violations"("exam_id", "occurred_at");

-- CreateIndex
CREATE INDEX "exam_violations_submission_id_type_occurred_at_idx" ON "exam_violations"("submission_id", "type", "occurred_at");

-- AddForeignKey
ALTER TABLE "exam_violations" ADD CONSTRAINT "exam_violations_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_violations" ADD CONSTRAINT "exam_violations_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_violations" ADD CONSTRAINT "exam_violations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropIndex (single-column is_active index, superseded by the composite below)
DROP INDEX IF EXISTS "exam_sessions_is_active_idx";

-- CreateIndex (serves the cleanup-job predicate: is_active = true AND last_ping < cutoff)
CREATE INDEX "exam_sessions_is_active_last_ping_idx" ON "exam_sessions"("is_active", "last_ping");
