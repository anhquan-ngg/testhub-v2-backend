-- Down: DROP TABLE auth_sessions; legacy Account columns are retained. Re-login is required.
-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "student_slot" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "refresh_token_hash" TEXT NOT NULL,
    "transfer_token_hash" TEXT,
    "refresh_jti" UUID NOT NULL,
    "refresh_issued_at" INTEGER NOT NULL,
    "previous_refresh_hash" TEXT,
    "previous_valid_until" TIMESTAMP(3),
    "previous_session_id" UUID,
    "approval_required" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_student_slot_key" ON "auth_sessions"("student_slot");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_status_expires_at_idx" ON "auth_sessions"("user_id", "status", "expires_at");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

