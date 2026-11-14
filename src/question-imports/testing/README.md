# Isolated question-import regression tests

See the [Vietnamese validation report](IMPORT_VALIDATION_REPORT.md) for the A-F coverage, per-fixture accuracy, fixes, evidence and remaining limitations.

Run from the backend repository root in PowerShell:

```powershell
$env:TESTHUB_IMPORT_INTEGRATION = '1'
node node_modules\jest\bin\jest.js src\question-imports\question-import.integration.spec.ts src\question-imports\question-import.commit.spec.ts --runInBand
Remove-Item Env:\TESTHUB_IMPORT_INTEGRATION
```

Prerequisites: existing npm dependencies, Docker, and the local `postgres:17` image. The integration suite is skipped unless explicitly enabled. It never accepts a user database URL, loads `.env`, starts Redis, contacts S3, or imports AppModule.

Each run creates a uniquely named PostgreSQL container, binds its random host port to `127.0.0.1`, stores database data in a tmpfs mount (no persistent volume), and removes that exact container in teardown, including setup failure. The schema is generated offline from `prisma/schema.prisma` using the existing dotenv-free `src/auth/testing/prisma-fixture.config.ts` and applied only to the newly created database. No migration files or user database are changed.

## Coverage and boundaries

The tests use real Nest HTTP controllers, global production-equivalent ValidationPipe options, role guard, service/repository code, DOCX/XLSX parsers, Sharp image normalization, Prisma's serialized PostgreSQL adapter, foreign keys and transactions. Only authentication identity, object storage and queue delivery are substituted in the test application. Redis delivery/recovery, signed S3 authorization, real auth/session validation and browser rendering are not covered by this suite.

The official templates and independently authored `parsers/fixtures/import-expected.json` drive exact persisted text, option order/flags, essay answers, chapter paths, image count/order/bytes and HTTP read-back assertions. The fixture matrix includes mixed, single, blank-row, long-rich, duplicate-questions, multiple-images, unknown-answer, missing-answer-option, no-answer, invalid-type, incomplete-row, duplicate-field, missing-header, corrupt and empty files in both formats.

Additional cases cover explicit empty/invalid/missing selection, corrected rows, valid-only commit, cancellation without bank writes, SKIP duplicates, existing MANUAL-exam attachment, non-MANUAL rejection, owner/role enforcement, upload metadata/signature/size/type validation, concurrent commit/cancel fencing, and a real PostgreSQL constraint failure at the final commit write. The rollback cases check questions, new chapters, files and item/asset mappings, then retry successfully, including an object-cleanup outage. Failed object cleanup can leave an orphan object; it must not strand the import in COMMITTING or conceal the database failure.

## Browser forwarding harness

```powershell
node -r ts-node/register/transpile-only -r tsconfig-paths/register src\question-imports\testing\serve-import-fixture.ts
```

The command prints JSON containing `baseUrl` (a random loopback HTTP port), synthetic `userId`, `topicId`, `chapterId`, exact container name and `shutdownUrl`. Append a positional port (for example `52845`) to retain a browser build's API URL after a restart; the default remains a random port. Every restart creates a fresh disposable database and in-memory object store. This standalone runner does not reuse an integration-test database. No credential from the user's environment is needed.

Test-only CORS accepts HTTP origins with exactly `localhost` or `127.0.0.1`, with any browser-valid port, including isolated frontend preview servers. Credentials are allowed; external hosts and lookalike hostname suffixes are not. The API listener remains bound to `127.0.0.1`; production CORS is unchanged.

Available real API routes: `/question-imports`, `/topics`, `/chapters`, `/questions`, `/exams`. Presigned-like upload/view URLs point to the harness's local `/__objects/*` handlers. Queue processing is synchronous in this mode, so GET after complete already shows REVIEW_REQUIRED or FAILED. The create/complete/commit API response contract is unchanged. Default identity is the seeded lecturer; `x-test-actor` and `x-test-role` are test-only overrides. Exam runtime jobs are no-op test boundaries and this harness is not an exam-running environment.

Browser automation must forward **every** relevant API call to this printed base URL and abort unmatched live-backend traffic; never forward import writes to the normal backend. Authentication/login/proxy behavior must be handled separately by the browser harness. These synthetic-auth endpoints exist only in this test runner and must never be deployed.

Stop gracefully so the database is removed:

```powershell
Invoke-WebRequest -Method Post -Uri '<printed shutdownUrl>' -UseBasicParsing
```

SIGINT/SIGTERM also request cleanup. If the process is forcibly killed, remove only its printed uniquely named container, never a shared/container-name pattern. Do not stop unrelated services.

## Chromium browser regression

`browser-import.smoke.cjs` uses the already installed Puppeteer. Start a **fresh** harness (zero bank questions), then build/serve a separate frontend source snapshot with `NEXT_PUBLIC_API_URL` set to the printed harness URL and a synthetic `NEXT_JWT_ACCESS_SECRET`. Include the actual `postcss.config.js` so Tailwind styles are built. Never overwrite a live `.next` directory, copy `.env` files, or reuse production credentials.

```powershell
$env:IMPORT_TEST_FRONTEND = 'http://127.0.0.1:<isolated frontend port>'
$env:IMPORT_TEST_API = 'http://127.0.0.1:<printed API port>'
$env:IMPORT_TEST_SECRET = '<same synthetic build-only secret>'
node src\question-imports\testing\browser-import.smoke.cjs
```

The runner creates a separate Chromium profile and synthetic access token; only `/auth/me` is stubbed for frontend identity. Business requests use the real isolated API and PostgreSQL. It tests XLSX upload, review-fetch failure/retry, gap option keys, multiline edits, commit-response loss/recovery and persisted answers; DOCX upload/commit and SKIP; invalid-answer exclusion/cancel; VI/EN tooltips including disabled keyboard focus; widths 1440/1024/768/375. It closes its browser on success/failure. A rerun requires a fresh harness. Real authentication, S3 signatures, Redis and Socket.IO are not covered. The harness intentionally has no Socket.IO endpoint; its handshake warnings do not establish an application regression.

Verified: all three browser scenario groups passed, with zero uncaught page errors. Frontend and backend production builds passed in separate source snapshots; no live build outputs or shared runtime were restarted. Full frontend lint still reports 27 errors / 26 warnings outside this task; focused changed-code lint and full TypeScript checks pass.

## Verified results (2026-11-13)

- Baseline 17-case integration run: 15 passed; two failures demonstrated explicit `item_ids: []` importing all rows and cleanup failure leaving a rolled-back import COMMITTING.
- After fixes and fixture-matrix expansion: 48 integration tests plus 3 existing commit unit tests passed (51 total).
- Final `node node_modules\jest\bin\jest.js src\question-imports --runInBand --silent` with the integration flag enabled: 5 suites / 91 tests passed, including 31 parser tests (with the missing-code DOCX regression), 49 PostgreSQL integration tests and 11 existing unit tests. The standalone CommonJS browser runner passes JavaScript recommended lint with Node/browser globals; the repository's typed ESLint configuration does not include `.cjs` in its TypeScript project.
- Full backend TypeScript no-emit, scoped service/test/harness/DTO ESLint and Prettier checks passed; service lint baseline and current both have zero findings.
- Standalone runner smoke check passed real HTTP topics/chapters/questions reads and mixed XLSX create/upload/complete/review/commit/persisted bank read (3 questions). Its random smoke-test port was 59666; this is not a reusable fixed port. Graceful HTTP shutdown returned 202 and the process exited successfully.
