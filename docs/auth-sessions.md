# Authentication sessions

Policy: STUDENT has at most one ACTIVE browser session; LECTURER/ADMIN may
have several. Refresh renews the same session. Logout revokes only that session.
Every access JWT contains sid and token_use=access and is checked against the DB.
Legacy JWTs without sid require login again after deployment.

The lecturer approval panel is on each exam's monitoring page. Admins have the
same panel on their dashboard, across exams. After staff approval the student
explicitly confirms on the new browser. Login credentials alone never interrupt
an ongoing exam. A physical device cannot be reliably identified by a browser;
the restriction applies to browser sessions, not IP addresses or hardware IDs.

## Contract (Swagger controllers remain the executable source)

- POST /auth/login: 200 sets access/refresh cookies. If a student already has
  another session, or an IN_PROGRESS submission, returns 409 with code
  SESSION_TRANSFER_REQUIRED and sets an HttpOnly transfer_token cookie. The
  existing session is not changed. Only verified credentials can create requests.
- GET /auth/session-transfer: returns status, approvalRequired, expiresAt.
- POST /auth/session-transfer/complete: confirms switching outside an exam, or
  consumes lecturer/admin approval during an exam. Sets normal session cookies.
- GET /auth/session-transfers?examId=UUID: lecturer/admin list of pending requests;
  lecturers can only inspect students currently taking their own exam.
- POST /auth/session-transfers/:id/approve: ADMIN, or a lecturer responsible for
  ALL the student's IN_PROGRESS exams. Approval and completion recheck scope.
  Does not submit/restart/extend a submission. The target browser completes the
  switch; the old browser remains active until then.
- POST /auth/refresh: rotates within one session. Parallel refresh with the
  previous token has a bounded grace interval and receives the SAME successor.
- POST /auth/logout: revokes current sid; other staff sessions remain active.

Transfer requests expire in 10 minutes. A newer completed switch makes older
requests stale. Responses/cookies are no-store. Only terminal 401 ends login;
network/5xx refresh errors can be retried. Concurrent transfer completion is
idempotent within the original signed request's ten-minute lifetime: replay sets
cookies for the same active session, including after a lost response. A revoked
session cannot be revived with that proof.
POST /auth/* requires an Origin matching FRONTEND_URL (including manual API
clients); OAuth callback GETs are unchanged. This prevents cross-site forms from
confirming/approving a cookie-authenticated session transfer.
Students' exam mutations and session transitions serialize on the same user row;
exam mutations use the same transaction so revocation fences in-flight writes.

## Deployment

Apply the additive auth-session migration explicitly on the intended database,
generate Prisma Client, then deploy backend/frontend together. Existing sessions
must log in again; deploy outside active exams. No automatic DB migration/reset.
Keep legacy Account token columns for compatibility; new code does not use them.

Frontend requires auth cookies to belong to the frontend host (as with localhost
on different ports). For separate hosts, use same-origin reverse proxy/BFF first.
Do not widen cookie Domain to unrelated deployments. The public recovery page
calls /auth/me through the browser refresh client before returning to protected UI.

JWT_ACCESS_EXPIRES and JWT_REFRESH_EXPIRES default to 15m/7d, validated as positive
durations. Session expiry is absolute; refresh does not extend it indefinitely.
AUTH_REFRESH_GRACE_SECONDS defaults to 10, bounded 1..30. NODE_ENV controls Secure.
Never expose refresh/transfer tokens in JSON, URLs, browser storage or logs.

On the intended LOCAL database, the operator applies the pending migration with
`npx prisma migrate dev`, then runs `npx prisma generate` and restarts the API and
frontend. The migration directory is `20261024090000_add_auth_sessions`. Existing
unapplied migrations must also match the deployed application. Do not deploy in
the middle of an exam; legacy tokens cannot enforce the new session policy.

SSE/Socket.IO connections recheck session status every five seconds and terminate
after revocation; incoming exam mutations recheck immediately inside the fence.
Multiple tabs in one browser share a login session; this change does not impose
a separate single-tab examination policy.

## Verification scenarios

Student login conflict leaves old access valid; only confirmation switches it;
exam-in-progress requires scoped approval; foreign lecturer/student denied;
concurrent logins/confirmations preserve one student slot; expired/stale request
denied; old access rejected after switch; staff logins/refresh/logout isolated;
OAuth-only users refresh; parallel refresh returns one successor; replay outside
grace denied; transfer preserves submission ID, answers and auto_submit_at;
exam-start vs confirmation and answer-write vs switch serialize; transient refresh
failure does not redirect; recovery preserves locale/internal destination.

Backend checks: `npm test -- --runInBand` and TypeScript/build. The opt-in
`auth-session.integration.spec.ts` uses `AUTH_SESSION_TEST_DATABASE_URL` AND
`DATABASE_URL` pointing to a disposable PostgreSQL at 127.0.0.1:55440 with database
`testhub_auth_test`. It refuses other endpoints, never loads project .env files,
and deletes fixture users only in that dedicated database. Do not point it at an
existing database. Run it in a separately started disposable container.
Recorded verification on 2026-10-25: 268 passing backend tests, including 19
PostgreSQL/HTTP auth/exam cases and 13 duration cases; 42 unrelated opt-in tests
skipped. Migration applied over the existing schema in a private test schema.
No real OAuth account or authenticated browser click-through was used.
Frontend: `node scripts/check-session-navigation.cjs`,
`node scripts/check-session-client.cjs`, `node scripts/check-i18n.cjs`, typecheck
and production build. Client checks isolate routing/transport, not browser E2E.
