-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "auto_submit_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "exam_retry_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exam_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "granted_by" UUID NOT NULL,
    "consumed_at" TIMESTAMP(3),

    CONSTRAINT "exam_retry_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exam_retry_grants_exam_id_student_id_consumed_at_idx" ON "exam_retry_grants"("exam_id", "student_id", "consumed_at");

-- AddForeignKey
ALTER TABLE "exam_retry_grants" ADD CONSTRAINT "exam_retry_grants_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_retry_grants" ADD CONSTRAINT "exam_retry_grants_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_retry_grants" ADD CONSTRAINT "exam_retry_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
