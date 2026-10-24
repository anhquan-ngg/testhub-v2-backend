# CONTINUITY.md — testhub-v2-backend

## Local migration status (2026-10-25)

- The user's local database `testhub` (Docker `testhub_db`, localhost:5432)
  has applied `20261024090000_add_auth_sessions` and
  `20261025090000_reconcile_question_generation_source_indexes`.
  Prisma migrate dev reported database/schema in sync after the guarded repair.
- A full backup was saved under .tmp/migration-backups/ before repair. Existing
  migration files were unchanged; no reset, db push or production mutation ran.
- Procedure: docs/migration-repair-source-indexes.md. Future changes require new
  migrations. App/browser E2E and production migration state remain unverified.

## Authentication sessions (2026-10-25)

- Added AuthSession and additive migration 20261024090000_add_auth_sessions.
  Unique nullable student_slot enforces one active STUDENT browser session;
  LECTURER/ADMIN retain multiple. Old JWTs require login again (sid/token_use).
  Restart both apps and log in again after deploying session-aware code.
- Valid credentials create a PENDING transfer without revoking the old browser.
  Target browser confirms; while any IN_PROGRESS exam exists, responsible
  lecturer (all current exams) or ADMIN approval is mandatory. Recheck under a
  user-row lock. Ten-minute proof permits idempotent replay after lost response,
  but cannot revive a revoked session. Keep answers/attempt/deadline unchanged.
- JwtStrategy checks live session on every request. Refresh is provider-independent
  and rotates under lock with a 10-second bounded previous-token grace returning
  the exact successor. Logout revokes only current sid. Cookie TTL matches JWT,
  NODE_ENV fixes Secure, POST /auth/* requires an allowed Origin, responses no-store.
- StudentSessionInterceptor serializes submission/exam-runtime writes and the
  legacy mutating GET session with transfer using PrismaService.current and
  inTransaction; queues/realtime effects are deferred until commit. Runtime WS
  heartbeat also fences writes. SSE/socket revocation checks run every 5 seconds;
  notifications now authenticate cookie JWT rather than trusting query identity.
  Socket binding rejects connections closed during authentication before storing
  claims or registering a revocation timer.
- Added disposable PostgreSQL + real Nest/AuthModule/Passport HTTP integration
  coverage, including actual exam start/save/ping/submit, concurrent starts,
  confirmation replay, approval scope, refresh races, rollback and cookie Origin.
  Separate duration tests verify matching positive JWT/cookie lifetimes.
- Validation and operator instructions: docs/auth-sessions.md. Production and
  OAuth-provider/browser E2E remain unverified. Frontend host cookie
  topology remains a deployment prerequisite; no dependencies/env values changed.
- Final checks: full Jest 31 suites / 268 tests passed, 42 unrelated opt-in tests
  skipped; includes 19 auth PostgreSQL/HTTP cases and 13 duration cases. TypeScript,
  Nest build and lint on new/core auth files passed. Changed legacy backend files
  retain lint debt (comparison found no added diagnostics). Final migration was
  applied over HEAD's schema in an isolated PostgreSQL schema (17 new columns).
  Frontend TypeScript/scoped lint, navigation/client checks, 32 i18n pairs and
  production build passed. PostgreSQL test container is disposable and separate
  from the user's services.
- Socket review validation: 4 lifecycle tests and 13 duration tests passed;
  TypeScript and scoped ESLint passed. Tests use fake timers and isolated service
  doubles, without a database or live Socket.IO connection.

## User list ordering (2026-10-23)

- GET /users accepts optional sortOrder=asc|desc (default desc), validated and
  documented in QueryUserDto. UsersRepository orders by created_at then id using
  that direction before applying the existing page/limit.
- Validation: three DTO/repository regression tests and full Jest passed
  (236 passed, 42 opt-in integration tests skipped). TypeScript and scoped ESLint
  passed. No live database or authenticated HTTP verification was performed.

## RAG outbox and migration review (2026-10-23)

- RagRepository.due now restricts queued indexes to DocumentRepository.scope()
  (active lecturer/document/topic/chapter) and orders by next_dispatch_at before
  taking 25 rows. Revocation delivery remains independent of document access.
- Added source_version_id/source_index_id lookup indexes to QuestionGenerationBatch
  and the document-generation migration as requested; existing source FKs retain
  NO ACTION. No migration was applied to a runtime database.
- AI setup and P2021/P2022 guidance now list all six prerequisite migrations,
  including question_configs, and require API/worker DB/schema consistency.
  Extraction docs clarify NestJS business-table and Python rag-schema ownership.
- Validation: full Jest 233 passed / 42 opt-in tests skipped; TypeScript and
  Prisma generate passed. Offline generated SQL matches both new indexes and
  existing source FKs; all six documented migration paths exist. Scoped ESLint,
  formatting and diff checks passed after a test-only formatting correction.
  No live PostgreSQL/Redis/S3/provider verification was performed.

## Question configs for AI generation (2026-10-23)

- Contract, DTO, repository, worker/recovery, AI/RAG clients and response DTOs use
  question_configs; legacy single-row commands are still accepted.
- Migration 20261023120000_add_generation_question_configs adds, backfills and
  requires question_configs (NOT NULL).
- Validation: `npx prisma generate`, typecheck clean; full `npx jest`
  **232 passed, 42 skipped** (opt-in DB/Redis/FastAPI suites); eslint clean on
  changed files. Opt-in integration suites were not run.

## Review corrections (2026-10-23)

- RagDispatcher observes queue.client once without blocking reconciliation or shutdown on initial Redis readiness; rejected initialization is handled. GenerationDispatcher already used this pattern and required no change.
- Revocation errors no longer prevent indexing dispatch. Failed tombstones persist per-row exponential backoff (5 seconds to 5 minutes) using existing failure_count/next_dispatch_at; due revocations are ordered oldest first and acknowledged only after remote success.
- Source version/index relations use NO ACTION, allowing root cascades to complete within one statement while blocking direct referenced-source deletion. Opt-in PostgreSQL coverage checks both Topic/Chapter cascades and direct deletion rejection.
- Reviewed all assertOfficeZipLimits call sites: question-import.service already awaits it and sends checkedPackage to both parsers; parser fixture tests also await the checked archive. No ZIP code change was necessary.
- README and AI/document guides now reflect implemented embedding, retrieval and attached-file generation. Migration inventory verified from disk: 21 migration.sql files, latest 20261023090000_add_document_question_generation.
- Validation: 25 focused tests passed; full Jest 218 passed / 42 skipped (28 suites passed / 4 skipped, without opt-in HTTP/PostgreSQL/Redis settings). Prisma generate, offline schema SQL diff, TypeScript and Nest build passed. Scoped ESLint passed after correcting two test-only floating-promise warnings. No live DB/S3/Google calls or deployment.

### Verification for file generation (2026-10-23)

- Full Jest with TESTHUB_AI_PYTHON and local document transport simulation:
  **218 passed, 32 skipped; 28 suites passed, 2 skipped**. Real PostgreSQL/Redis
  suites were not run. The new opt-in SQL test defines source FK/recovery,
  evidence-preserving edit, explicit approval and bank commit checks.
- Nest-to-FastAPI HTTP exercised actual grounded routing/service/validation with
  synthetic repository/vectors/provider. Unit/controller tests checked consent,
  ownership/hierarchy, waiting without a paid attempt, evidence/hash rejection and
  no LLM retry after failed persistence. Existing text/parser/review tests pass.
- Prisma generate, offline migration diff, Nest build, TypeScript and scoped lint
  passed. No user DB migration, real S3 mutation or paid provider call was made.

## File-based RAG question generation (2026-10-23)

- The batch API also accepts source.mode=document with immutable version_id and
  optional query, scoped to the lecturer and selected topic/chapter. The text API
  contract remains compatible. Read docs/rag-indexing.md section 4 for setup/demo.
- WAITING_SOURCE and preparation_stage track extraction/indexing without an LLM
  attempt. The AI worker pins one index/profile and promotes only READY sources.
  The separate document worker still owns extraction/index checkpoints. Preparation
  expires after 20 minutes; never retry ambiguous LLM calls automatically.
- Migration 20261023090000_add_document_question_generation adds source FKs and
  nullable item provenance.
- DocumentGenerationService authorizes sources before/after internal generation.
  RagAccessModule shares authorization/index clients without S3 configuration.
  POST /internal/rag/generate returns rag-generation.v1, with checked evidence.
- Store provenance separately from editable bank-shaped data. Preserve evidence on
  edit and flag AI_SOURCE_RECHECK_AFTER_EDIT; a new revision still needs approval.
  Recovery must retain provenance without reissuing generation. Only the existing
  approved commit writes Question. Original evidence is not proof of correctness.

### Windows psql setup correction (2026-10-22)

- RAG setup now documents quoted forward-slash paths, SQL Shell working directory,
  clearing unfinished SQL with `\r`, and verifying bootstrap/role creation before
  `\password`. Unquoted Windows backslashes can truncate the include filename.
- Confirmed bootstrap file exists and checked psql syntax against official docs.
  Documentation only; no database command or migration was executed.

### Verified RAG checks (2026-10-21)

- Full Jest with TESTHUB_AI_PYTHON and TESTHUB_DOCUMENT_SIM_URL: **205 passed,
  31 skipped; 25 suites passed, 2 skipped**. Skips are real PostgreSQL/Redis suites.
- New tests cover whole-scope authorization, changed source hashes, current-profile
  readiness, post-I/O revocation, role guards, one-step checkpoints and bounded
  failures. Real Node -> FastAPI covers chunk prepare/index/retrieve/revoke with
  synthetic vectors/storage. Existing PDF/PPTX parser and text contract also pass.
- Prisma generate/offline migration diff and Nest production build passed.
  Scoped feature ESLint passed. No database migration, paid AI call, S3 mutation,
  deployment or commit performed. Real pgvector/DB/Redis/browser E2E not established.

## Current RAG implementation (2026-10-21)

- LearningDocumentIndex is a separate business model. Additive migration
  `20261021100000_add_document_indexes` was created offline; do not auto-apply.
- RagController/RagService own lecturer index start/retry/retrieve. Reject an entire
  foreign/revoked/not-READY version set before paid calls; recheck after I/O.
  Browser cannot choose owner/profile/index IDs. No bank write occurs in retrieval.
- `start:document-worker` also owns the separate ai-document-indexing queue.
  One bounded prepare/embed checkpoint per delivery, DB outbox, execution/lease
  fences and durable progress. SDK/HTTP retry nesting is prohibited. Preserve the
  Python invocation budget across explicit retries; exactly-once billing is not promised.
- Revoke business indexes in the same document transaction, then dispatch technical
  tombstones even for inaccessible documents. Do not promise physical deletion.
- AI_RAG_ENABLED defaults false and depends on existing AI integration config.
  Google key and dedicated rag database credentials stay only in Python.
- Follow docs/rag-indexing.md for operator-run local schema/account setup, contracts,
  limits, demo and isolated tests. Earlier extraction-only snapshots are historical.

> Trạng thái và bàn giao giữa các phiên làm việc. Đọc trước khi làm việc; cập nhật sau mỗi nhiệm vụ có thay đổi đáng kể.

**Cập nhật lần cuối:** 2026-10-25 — database local đã đồng bộ migration auth-session và source indexes; đã đối chiếu xác thực và vòng đời socket.

## Learning documents và extraction (2026-10-21)

- `src/learning-documents/`: API lecturer/owner-scoped tạo tài liệu và phiên bản,
  upload ký sẵn, complete/replay trả 202, metadata/polling, content phân trang,
  thu hồi quyền truy cập. Zod kiểm tra raw input, consent và loại/size file.
- Hai bảng LearningDocument/LearningDocumentVersion và migration cộng thêm
  `20261021090000_add_learning_documents` được tạo offline từ schema diff.
  Prisma generate đã chạy; không migrate/reset database hay dùng S3 thật.
- Complete đọc bytes thực có giới hạn, pin hash và bản nguồn cố định trước khi
  chuyển UPLOADING→QUEUED. QUEUED version là durable outbox; reconciliation/queue
  delivery không mất tác vụ khi Redis lỗi. Có claim/execution UUID/lease/retry tối đa 3.
- Worker riêng `npm run start:document-worker`, queue `ai-document-processing`,
  concurrency 1. NestJS gửi bytes qua internal HTTP, Python xử lý process con.
  Metadata gồm SHA-256 nguồn/artifact, contract và phiên bản parser thực tế.
- EXTRACTED khác OCR_REQUIRED và chưa phải RAG READY. Artifact text nằm trong S3
  private; business metadata trong PostgreSQL. Chưa có chunking/embedding/retrieval.
- Chặn namespace learning-documents/ tại mọi legacy /s3/* signing/upload/delete
  và lọc root listings, tránh bypass owner API. Không thay đổi phân quyền file cũ.
- Đọc `docs/learning-documents.md` cho migration/local/demo, contract, giới hạn và
  retention còn mở. `.env.ai.example` thêm DOCUMENT_SERVICE_TIMEOUT_MS=55000.
- Đã có unit/HTTP guard-validation-safe-error tests, Postman local simulation
  cho transport failure, HTTP thật Nest→FastAPI→PDF/PPTX parser và opt-in PostgreSQL
  tests. Docker daemon hiện chưa chạy nên bộ PostgreSQL/Redis opt-in chưa chạy
  trong phiên này; không coi mock/build là bằng chứng live S3 hoặc DB runtime.
- Kết quả cuối: **191 Jest pass, 30 skip; 23 suites pass, 2 skip**, gồm bật cả
  TESTHUB_AI_PYTHON và TESTHUB_DOCUMENT_SIM_URL. Hai suite skip là PostgreSQL/Redis
  vì chưa có test services. HTTP thật PDF/PPTX và fake-LLM contract đều pass.
  Một lượt trước có lỗi kết nối PDF ở test tạo fixture đồng bộ; đổi fixture sang
  execFile async rồi chạy lại toàn bộ thành công. Không thêm retry cho text LLM.
- Prisma generate, TypeScript, Nest build và ESLint phần mới/controller sửa pass.
  `s3.service.ts` có 8 lỗi lint tồn đọng: so với HEAD bằng ESLint lintText/lintFiles
  vẫn đúng 8 lỗi, không thêm message mới. Diff whitespace pass. Chưa build Docker
  hoặc chạy live browser/S3/user DB. Không sửa các file .env thật.

## Cách cập nhật file này

- Cập nhật ngày ở trên và các mục bị ảnh hưởng sau mỗi nhiệm vụ có thay đổi đáng kể (tính năng, sửa lỗi, đổi schema/contract, quyết định kiến trúc, phát hiện vấn đề mới).
- Chỉ ghi điều đã xác minh từ code, lệnh đã chạy, hoặc người dùng xác nhận; điều còn nghi ngờ đưa vào mục "Chưa xác minh".
- Ngắn gọn: xóa mục đã xong hoặc đã lỗi thời thay vì chồng thêm. Lịch sử chi tiết đã có trong git.
- Không ghi secrets, token, mật khẩu, dữ liệu cá nhân.

## Trạng thái hiện tại (xác minh từ codebase)

- Nhánh `dev`, đồng bộ với `origin/dev` khi khảo sát; working tree sạch trước khi thêm 3 file tài liệu này. Commit mới nhất: `0f87eba` (2026-09-29) — chapter update logic, giới hạn zip khi import.
- Module đăng ký trong `src/app.module.ts`: Encryption, Auth, Prisma, S3, Notification, ExamRuntime, Submission, Users, Topics, Chapters, Questions, Exams, ExamRegistrations, Files, QuestionImport, ExamPrint, QuestionGeneration.
- `prisma/migrations/` có 24 migration; mới nhất `20261025090000_reconcile_question_generation_source_indexes`. Database local đã được Prisma xác nhận đồng bộ sau khi áp migration auth-session và source indexes; trạng thái production chưa xác minh.
- Tính năng gần đây theo git log: import câu hỏi từ .docx/.xlsx (`src/question-imports/`), giám sát phòng thi (`src/exam-runtime/exam-monitor-aggregator.service.ts`), thứ tự câu hỏi trong bài làm, in đề (`src/exam-print/`).

## Quyết định kiến trúc đã thể hiện trong code

- Prisma 7 dùng driver adapter `PrismaPg` + `pg.Pool` — `src/prisma/prisma.service.ts`; `PrismaModule` là `@Global()`.
- Phân lớp controller → service → repository; repository giữ truy vấn Prisma với `select` tường minh — ví dụ `src/topics/`.
- Xác thực bằng cookie httpOnly access/refresh có sid, hash lưu theo AuthSession; STUDENT một phiên, staff nhiều phiên. Xem mục Authentication sessions và docs/auth-sessions.md; Account token columns chỉ giữ tương thích.
- Không có guard toàn cục; mỗi controller tự gắn `JwtGuard`/`RolesGuard` + `@Roles` — `src/common/`.
- Realtime phòng thi dùng SSE với whitelist loại sự kiện cho sinh viên (`STUDENT_EVENT_TYPES`) và giám sát (`MONITOR_EVENT_TYPES`) — `src/exam-runtime/exam-runtime.constants.ts`, `exam-runtime.controller.ts`. Sinh viên ping HTTP (`/exam-runtime/submissions/:id/ping`), vi phạm do client tự báo chỉ gồm các loại trong `CLIENT_REPORTABLE_VIOLATION_TYPES`; `CONNECTION_LOST` chỉ do server sinh.
- BullMQ hai queue: `exam-runtime` (mở/đóng thi, auto-submit, chấm điểm, dọn session) và `question-imports` (parse, dọn import hết hạn) — `*.constants.ts`, `*.processor.ts` tương ứng.
- Import câu hỏi: upload → job parse → review từng item → commit; TTL 24 giờ, giới hạn 20 MB, chống zip bomb, kiểm tra chữ ký file Office (`src/common/utils/office-file-signature.util.ts`).
- Đã gỡ prototype Gemini trực tiếp; `QuestionsModule` chỉ quản lý CRUD. Generation có batch POST 202, list/status/items GET, worker `start:ai-worker` gọi FastAPI/lưu staging. Review/edit dùng revision, chỉ explicit approved commit ghi `Question` bằng transaction có audit; frontend đã có workspace vi/en.
- `AiQuestionClient` gửi một HTTP invocation, deadline cả headers/body mặc định 35 giây, không theo redirect, response tối đa 1 MiB, lỗi/log chỉ có metadata an toàn. Python tiếp tục sở hữu Gemini/retry. Biến mới trong `AGENTS.md` và `.env.ai.example`; cấu hình đọc một lần, mặc định disabled. `toQuestionBankDraft` chỉ serialize options/correct_answer:null, không duyệt hoặc lưu câu.
- Fixture contract hai repo, type frontend và reserved batch/draft statuses đã thống nhất. Chi tiết input, lỗi 401/422/502/503/504, ownership, consent và các phần chưa triển khai ở `docs/ai-question-generation.md`.
- Upload file qua presigned S3 URL rồi xác nhận (`/files/upload-url` → PUT → `/files/:id/confirm`) — `src/files/`.
- Phân trang trả về `{ data, total, page, limit }`; xóa mềm (`is_deleted`) cho topic/chapter/question.
- Thông báo realtime qua Socket.IO namespace `/notifications`, room `user:{userId}` và `room:admin` — `src/notification/notification.gateway.ts`.
- `.github/workflows/deploy.yml` generate Prisma Client sau `npm ci` ở cả job test và build. URL PostgreSQL giả chỉ phục vụ `prisma generate`, không kết nối DB. Workflow không còn lệnh/artifact ZenStack; deploy EC2 vẫn generate client và chạy migration từ schema Prisma hiện có.

## Vấn đề / TODO đã xác minh

1. Gateway `/notifications` đã chuyển sang cookie JWT + AuthSession ngày 2026-10-25; không còn tin danh tính query.
2. Gateway `/exam-runtime` đã dùng JWT_ACCESS_SECRET/AuthSession và kiểm tra thu hồi ngày 2026-10-25; frontend hiện dùng REST ping thay namespace này.
3. Frontend gọi `POST /model/File/updateMany` (`../testhub-v2/src/hooks/useFiles.ts`) nhưng backend không có route `/model/*`.
4. `npm run seed` trỏ tới `prisma/seed.ts` không tồn tại.
5. README hướng dẫn `cp .env.example .env` nhưng repo không có `.env.example`.
6. README vẫn nhắc tới ZenStack và `schema.zmodel`, nhưng repo không có schema hay dependency ZenStack.
7. `src/prisma/prisma-hooks.service.ts` không được đăng ký ở module nào (code chết); cập nhật dashboard thực tế được đẩy từ `src/notification/notification.controller.ts`.
8. `npm run lint` có `--fix`; bước lint trong CI đang bị comment.

## Chưa xác minh

- Chưa xác minh toàn bộ workflow mới trên GitHub Actions/EC2; lần kiểm tra local dùng `node_modules` hiện có, không chạy `npm ci` sạch hoặc deploy.
- `npm run test:e2e`: `test/jest-e2e.json` không có `moduleNameMapper` cho `@/` trong khi 21 file trong `src/` import `@/…` — có khả năng lỗi resolve module; chưa chạy.
- `.env.production` cục bộ dùng bộ tên biến khác code (`JWT_SECRET`, `S3_*` thay vì `JWT_ACCESS_SECRET`, `AWS_*`) — có thể lỗi thời; chưa rõ môi trường production thực sự cấu hình thế nào.
- Cookie không đặt `domain`: chưa xác minh frontend production (khác subdomain với API) có đọc được `access_token` trong `../testhub-v2/src/proxy.ts` hay không.

## Kết quả kiểm tra đã chạy (2026-10-02)

| Lệnh | Kết quả |
| --- | --- |
| `npx tsc --noEmit -p tsconfig.json --incremental false` | Pass, 0 lỗi |
| `npx jest` | 7/8 suite pass, 62/63 test pass; fail `src/app.controller.spec.ts` (vấn đề 1) |
| Lint, build, e2e | Chưa chạy |

## Kết quả kiểm tra đã chạy (2026-10-05)

| Lệnh | Kết quả |
| --- | --- |
| `prisma generate` với URL PostgreSQL giả | Pass, sinh Prisma Client 7.8.0; không kết nối DB |
| Jest `--passWithNoTests --runInBand` trước khi sửa test AppController | 7/8 suite, 62/63 test pass; chỉ fail vì thiếu provider `PrismaService` |
| Jest `--passWithNoTests --runInBand` sau sửa test | Pass 8/8 suite, 63/63 test |
| `nest build`, TypeScript `--noEmit --incremental false`, ESLint `src/app.controller.spec.ts` | Pass cả ba |
| Parse YAML workflow, kiểm tra `dist/main.js`, `git diff --check` với CRLF hợp lệ | Pass |

## Công việc đang làm

Chưa có thông tin.

## Kiểm tra sau khi gỡ luồng thử nghiệm (2026-10-16)

- Node 22.22.0 trực tiếp: TypeScript `tsc --noEmit -p tsconfig.json --incremental false` pass; ESLint `src/questions/questions.module.ts` pass.
- Jest `--runInBand`: **8/8 suite, 63/63 test pass**.
- `git diff --check` pass; rà `src`, `test`, npm scripts và tài liệu backend không còn tham chiếu tới prototype/script/biến Gemini đã gỡ. Các liên kết trong tài liệu kiến trúc đã được cập nhật và kiểm tra tồn tại.
- Không gọi API Gemini hoặc thao tác DB; không sửa giá trị bí mật trong các file môi trường.

## Review fixes (2026-10-19)

- Xác minh cả sáu finding còn đúng. Workflow deploy kiểm tra tiến trình đã đăng ký: restart bằng `ecosystem.config.cjs` để cập nhật `pm_exec_path` sang `dist/main.js`; tiến trình chưa đăng ký vẫn dùng nhánh `pm2 start`. Đã giữ CRLF của workflow. Không chạy PM2 daemon hoặc deploy/SSH thật.
- `assertOfficeZipLimits` nay async, trả package STORE dựng lại chỉ từ byte đã kiểm tra. Inflate từng entry bằng `node:zlib` với `maxOutputLength` theo ngân sách tổng còn lại; không tin riêng kích thước central directory. Giữ giới hạn số entry/ZIP64, kiểm tra local headers và chỉ truyền buffer đã kiểm tra cho parser. Mẫu DOCX/XLSX kèm ảnh vẫn parse được.
- In đề: chưa có throttler/concurrency guard tại controller. Semaphore hiện giới hạn 2 request đang xử lý + 4 request chờ trên mỗi process, từ chối thêm bằng 503. Admission đặt sau kiểm tra quyền đề, trước chọn câu/hydrate/HTML/PDF/ZIP; request chờ chỉ giữ metadata đề. Slot được giải phóng khi lỗi.
- Commit import: hoàn tất transaction bằng `updateMany` có `id/status: COMMITTING`; count=0 ném ConflictException ngay trong transaction. Nhánh recovery cũng chỉ ghi khi vẫn COMMITTING. Cleanup sau thành công lấy toàn bộ asset `file_id:null` theo import (kể cả skipped/invalid/unselected), cùng ảnh tạm đã copy và file nguồn. Không khẳng định cleanup hết hạn sẽ quét COMPLETED; xóa S3 vẫn best-effort, object xóa lỗi cần lifecycle/reconciliation riêng.
- S3 lấy storage endpoint từ endpointProvider của SDK, dùng host/path đó cho `getStorageHost` và `createStorageUrl`; allowlist in PDF nhận đúng host của presigned URL với bucket chứa dấu chấm. Không có URL filter trong `getViewUrl` hiện tại; filter thực tế là `isAllowedPrintRequest` ở luồng in. Test dùng SDK signer thật và credential giả, không gọi AWS.
- Validation: 5 suite liên quan **20/20 test pass**; toàn backend **15 suite/142 test pass**, 1 suite/2 test Python integration tùy chọn skipped do không bật `TESTHUB_AI_PYTHON`. Test regression bao gồm metadata ZIP giả và tổng inflate, admission overflow/release, commit mất trạng thái và cleanup các asset bỏ qua. Lần sửa cuối cleanup/type test được chạy lại riêng: **3/3 commit test pass**.
- TypeScript `--noEmit --incremental false` và `nest build` pass. YAML workflow và hai nhánh PM2 được kiểm tra bằng bash stub; config resolve đúng `dist/main.js`. Không xác minh PM2/server production thực tế. Jest dùng `--cacheDirectory .tmp/jest-review` vì temp cache mặc định bị ENOENT trong môi trường này.
- ESLint các file sửa/thêm ngoài `s3.service.ts`: pass, 0 lỗi/cảnh báo. ESLint S3 so với HEAD: **8 lỗi tồn đọng, giảm từ 10**, không có diagnostic mới; không mở rộng sửa các đoạn S3 ngoài finding. Diff check với CRLF hợp lệ pass. Không cài dependency, chạy migration, gọi API AI hoặc sửa secret.

## Bước tiếp theo đề xuất

Ưu tiên AI tiếp theo: kiểm thử thao tác trình duyệt với session local, đăng ký/giám sát worker khi triển khai; quyết định retention/quota/ngân sách. Sau đó mới mở rộng nguồn PDF/PPTX/RAG. Review/edit/approved commit và workspace đã có; chưa deploy production.

Các ứng viên còn lại: thêm xác thực JWT cho gateway `/notifications`; thống nhất secret cho gateway `/exam-runtime`; thêm `.env.example` chỉ chứa tên biến; cập nhật README sau khi bỏ ZenStack.

## Kiểm tra tích hợp AI bước 1–2 (2026-10-16)

- Node 22.22.0: TypeScript `--noEmit --incremental false`, `nest build` và ESLint module mới + `src/app.module.ts`: pass, không lỗi/cảnh báo trên phạm vi đã sửa.
- Jest toàn backend có `TESTHUB_AI_PYTHON` trỏ Python 3.12: **13/13 suite, 132/132 test pass**. Gồm HTTP thật Node → FastAPI với provider giả; token sai; owner policy, role, consent; schema, mapping, disabled/config snapshot; HTTP timeout cả headers/body, giới hạn response, redirect, network, lỗi upstream và log không chứa dữ liệu nhạy cảm.
- Đã kiểm tra thật **Node client → FastAPI → Gemini**, dùng fixture văn bản công khai, cấu hình do Python nạp lúc chạy: pass, trả **1 câu SINGLE_CHOICE** hợp lệ. Không lưu DB, không thêm smoke command/prototype Gemini trở lại backend; không thay `.env` hoặc in key/token. Đây là một lượt kiểm tra tài khoản/model hiện tại, không phải benchmark chất lượng hay kiểm thử public batch API.
- AI service: **39/39 pytest pass**; frontend typecheck và ESLint `src/types/question-generation.ts` pass. Chưa chạy UI end-to-end vì UI/batch chưa thuộc bước này.
- Diff check pass với `core.whitespace=cr-at-eol` (README được lưu CRLF cả ở HEAD); link/JSON/code fence và evidence ID trong tài liệu kiến trúc hợp lệ, hai fixture contract giống nhau. Không chạy migration/deploy hoặc sửa dependency.

## AI bước 3–4: batch/staging và background worker (2026-10-19)

- Thêm migration `20261019090000_add_ai_generation_staging`: các bảng
  `question_generation_batches`, `question_generation_items`,
  `question_generation_attempts`, `question_generation_outbox`; không tái sử dụng
  bảng import. Batch lưu nguồn/config/consent và key/hash; item tách original/current
  JSON, revision, fingerprint; attempt giữ kết quả checkpoint và outcome.
- Ba API dùng JWT cookie/lecturer/owner: POST `/question-generation-batches` (202,
  bắt buộc `Idempotency-Key`), GET `/:id`, GET `/:id/items` phân trang. Cùng owner/key/
  request trả lại một batch; input khác cùng key trả 409. Validation giữ nguyên
  kiểu thô trước global implicit conversion; lỗi DB được bọc an toàn để tránh log
  source/result. Swagger có DTO vào/ra và khai báo cookie `access_token`.
- Transaction batch + outbox không chờ Redis/LLM. API không đăng ký AI processor.
  Worker riêng `dist/question-generation.worker.js` có queue AI, concurrency 2 mỗi
  process, stable job ID chỉ chứa batch UUID và attempts=1. Tái sử dụng cấu hình
  Redis qua helper chung; không đổi semantics queue thi hiện có.
- Reconcile 5 giây: khôi phục lease hết hạn, gửi outbox đến hạn, kiểm tra lại batch
  QUEUED đã dispatch sau 60 giây. Redis chưa ready không tạo thêm pending command;
  command timeout 10 giây, delivery backoff 5 giây–5 phút. DB claim/state/execution
  fencing chống nhiều worker gọi AI trùng. Lease 5 phút vượt HTTP max 185 giây.
- Một execution gọi FastAPI một lần; Python giữ tối đa 3 SDK attempt. DB persistence
  thử tối đa 3 lần; checkpoint hợp lệ được phục hồi thành items mà không gọi AI lại.
  Worker chết không có checkpoint: batch FAILED/AI_EXECUTION_INTERRUPTED, attempt
  UNKNOWN, không tự phát sinh lượt AI mới. `VALID` không phải giảng viên duyệt.
- Đã kiểm tra migration SQL từ schema cũ sang mới trên PostgreSQL 17 tạm. Không áp
  lên database local/production hiện có. Integration sử dụng schema/prefix UUID và
  API AI giả qua HTTP, không gọi Gemini. DB staging/source retention, quota/chi phí,
  UI, review/edit/revision conflict, approval/audit/commit và deploy worker còn lại.
- Validation: toàn backend **18 suite / 171 test pass**, gồm FastAPI thật với LLM
  giả và PostgreSQL/Redis thật tạm; TypeScript và `nest build` pass. Lint phạm vi AI/
  worker/helper/runtime pass; `main.ts` còn warning floating promise đã có từ trước.
  Hướng dẫn migration/chạy/demo/tests trong `docs/ai-question-generation.md`.

## AI review / approved commit và frontend (2026-10-19)

- Migration mới `20261019100000_add_ai_review_commit` thêm APPROVED/COMPLETED,
  metadata reviewed_by/reviewed_at/committed_at và `QuestionGenerationReview`
  (actor/action/revision/before-after data/status/question mapping). Không sửa
  migration đã có. Kiểm tra cả hai migration từ baseline trên PostgreSQL 17 tạm
  thành công: 5 bảng nghiệp vụ AI, 4 enum AI.
- API mới: GET batches (history), PATCH `/:id/items/:itemId`, POST
  `/:id/items/:itemId/review`, POST `/:id/commit`. JWT cookie/lecturer/owner,
  schema raw strict, revision bắt buộc. Sửa hủy duyệt, tăng revision; APPROVED
  tách VALID. Commit chỉ nhận lựa chọn id/revision đã duyệt, serialize options
  thành JSON string theo Question hiện có. Audit không được ghi vào log.
- Mọi mutation khóa batch trước, kiểm tra lại quyền/target/state, ghi atomic.
  Commit giữ revision đã duyệt; replay trả mapping cũ. Partial commit để REVIEW_REQUIRED;
  khi các item đều COMMITTED/REJECTED/SKIPPED thì chuyển COMPLETED và đóng chỉnh sửa.
  Mapping hard-deleted trả 409, không tái tạo; cross-batch semantic dedup chưa có.
- Integration: sửa/duyệt/reject/reapprove, rollback mixed selection/audit failure,
  concurrent approve/edit/commit/replay, foreign user, revoke ownership, strict
  input, JSON revalidation và deleted mapping. Toàn backend **19 suite/186 test
  pass**, gồm PostgreSQL/Redis thật và FastAPI provider giả. Không gọi Gemini.
- Frontend route `/[locale]/lecturer/questions/generate`: tạo lô, consent,
  polling/history/resume URL, controlled editor, explicit approve/reject, chọn
  câu approved, confirmation commit và bank IDs. API caller/types/constants vi/en
  đã nối. Build frontend và HTTP SSR vi/en pass; không có browser provider trong
  phiên nên chưa xác minh click-through/visual hoặc login thật end-to-end.
- Backend generate/validate, TypeScript/build và lint phạm vi thay đổi đã kiểm tra;
  frontend typecheck/lint feature/i18n/build pass. Xem integration guide để demo.
  Lint toàn frontend: 62 lỗi/37 cảnh báo tồn đọng ngoài phạm vi đã sửa; không báo
  toàn repo lint pass. Kiểm tra validation client trực tiếp bằng fixture cũng pass.

## Chẩn đoán AI staging storage (2026-10-19)

- `GenerationBatchService` ghi thêm operation cố định (authorize/create/get/list),
  error_type allowlist và mã Prisma Pxxxx khi có. Không log error.name/message/
  stack/meta, source, token hoặc connection string; HTTP vẫn sanitized 503.
- Regression: 10/10 orchestration tests pass, gồm P2021/P2022, P1001, validation,
  TypeError, exception name/code độc hại và metadata nhạy cảm. Typecheck/lint/build
  được kiểm tra cho phần thay đổi. Không coi mock diagnostics là xác minh DB thật.
- Bước runtime: rebuild/restart API đang chạy compiled code, tái hiện và lấy
  operation/prisma_code mới; kiểm tra migrate status trên DB local đúng cấu hình.
  Chỉ xử lý migration khi đã xác nhận nguyên nhân; không reset DB để chữa log chung.

## Điểm cần làm rõ với người dùng

- Route `/model/*` mà frontend còn gọi: nên thêm ở backend hay bỏ ở frontend?
- Quy trình deploy hiện tại có còn dùng `deploy.yml` (EC2 + PM2) không? Chưa chạy deploy để kiểm chứng.
