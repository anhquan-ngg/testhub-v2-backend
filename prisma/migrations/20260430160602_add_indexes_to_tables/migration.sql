-- CreateIndex
CREATE INDEX "chapters_topic_id_order_idx" ON "chapters"("topic_id", "order");

-- CreateIndex
CREATE INDEX "chapters_parent_id_idx" ON "chapters"("parent_id");

-- CreateIndex
CREATE INDEX "exam_registrations_exam_id_status_idx" ON "exam_registrations"("exam_id", "status");

-- CreateIndex
CREATE INDEX "exam_registrations_student_id_idx" ON "exam_registrations"("student_id");

-- CreateIndex
CREATE INDEX "exams_lecturer_id_idx" ON "exams"("lecturer_id");

-- CreateIndex
CREATE INDEX "exams_topic_id_idx" ON "exams"("topic_id");

-- CreateIndex
CREATE INDEX "files_entity_type_entity_id_idx" ON "files"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "files_uploaded_by_idx" ON "files"("uploaded_by");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_is_read_idx" ON "notifications"("recipient_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at" DESC);

-- CreateIndex
CREATE INDEX "questions_lecturer_id_idx" ON "questions"("lecturer_id");

-- CreateIndex
CREATE INDEX "questions_chapter_id_idx" ON "questions"("chapter_id");

-- CreateIndex
CREATE INDEX "questions_question_type_question_format_idx" ON "questions"("question_type", "question_format");

-- CreateIndex
CREATE INDEX "submissions_exam_id_idx" ON "submissions"("exam_id");

-- CreateIndex
CREATE INDEX "submissions_student_id_idx" ON "submissions"("student_id");

-- CreateIndex
CREATE INDEX "submissions_status_idx" ON "submissions"("status");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_deleted_idx" ON "users"("is_deleted");
