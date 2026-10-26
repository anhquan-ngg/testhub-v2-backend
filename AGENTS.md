# AGENTS.md — testhub-v2-backend

## Background dev processes (2026-10-25)

- npm run dev:up/status/logs/down manage a private local PM2 daemon and one Nest watch compiler plus API/AI/document processes. See docs/development-processes.md.
- Use dev:* wrappers, not global PM2. State/logs are under ignored .tmp/pm2-dev; custom IPC sockets also isolate Windows instances. Production ecosystem.config.cjs stays separate.
- Restart apps only on a completed zero-error Nest build. Dev config disables output deletion and enables noEmitOnError; do not run another compiler against dist concurrently.
- dev:logs prefixes every stdout/stderr line as [process-name] - message. Closing logs leaves apps running. Graceful IPC shutdown forwards to Nest hooks and drains workers.
- npm run test:dev-runner uses real PM2/Nest with synthetic apps in an isolated temp project, never user DB/Redis/AI.


## Knowledge plans (2026-10-25)

- Lecturer generation starts with a subject-owned document, not a bank chapter.
- KnowledgePlan stores full-source outline, editable tree/objectives/page refs and topic x cognitive counts. Confirmed revisions freeze into batch snapshots.
- The AI worker prepares plans; retrieval is per cognitive cell. Only explicit approved question commit may resolve/create required chapter branches.
- Match normalized sibling names conservatively, reject ambiguous matches; batch then subject locks serialize planned commits. No fixed tree-depth limit.
- See docs/knowledge-plans.md for API, new migrations, deployment order, limits and tests. Historical migrations must remain unchanged.
- Question config row limit is now 20 (total questions still <=20). CONTINUITY.md is local and ignored/untracked.


## Question configs for AI generation (2026-10-23)

- Batch commands accept ordered question_configs (1-10 rows, total <=20,
  SINGLE_CHOICE|MULTIPLE_CHOICE x QuestionFormat). The legacy single-row
  question_type/question_format/count form is normalized to one row; both forms
  together are rejected. Shared zod contract: question-generation.contract.ts.
- Migration 20261023120000_add_generation_question_configs adds and backfills
  question_configs (JSONB, NOT NULL). Generated offline, not applied to user DB.
  Legacy columns keep the first row; requested_count is the total.
- Worker/recovery/clients validate drafts with matchesQuestionConfigs (count plus
  type/level per position). MULTIPLE_CHOICE drafts need 2-3 correct of 4, also on
  edit; approved commits write the draft's question_type to Question.

## File-based RAG question generation (2026-10-23)

- The batch API also accepts source.mode=document with immutable version_id and
  optional query, scoped to the lecturer and selected topic/chapter. The text API
  contract remains compatible. Read docs/rag-indexing.md section 4 for setup/demo.
- WAITING_SOURCE and preparation_stage track extraction/indexing without an LLM
  attempt. The AI worker pins one index/profile and promotes only READY sources.
  The separate document worker still owns extraction/index checkpoints. Preparation
  expires after 20 minutes; never retry ambiguous LLM calls automatically.
- Migration 20261023090000_add_document_question_generation adds source FKs and
  nullable item provenance. It was generated offline, not applied to user DB.
- DocumentGenerationService authorizes sources before/after internal generation.
  RagAccessModule shares authorization/index clients without S3 configuration.
  POST /internal/rag/generate returns rag-generation.v1, with checked evidence.
- Store provenance separately from editable bank-shaped data. Preserve evidence on
  edit and flag AI_SOURCE_RECHECK_AFTER_EDIT; a new revision still needs approval.
  Recovery must retain provenance without reissuing generation. Only the existing
  approved commit writes Question. Original evidence is not proof of correctness.

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

## Learning document ingestion (2026-10-21)

- `learning-documents/` owns separate LearningDocument/LearningDocumentVersion
  tables. FileType and import staging are not reused. Migration:
  `20261021090000_add_learning_documents`; do not apply to the user's DB automatically.
- `/learning-documents` is cookie/JWT + lecturer guarded and owner scoped.
  Complete freezes actual checked bytes before conditional UPLOADING→QUEUED;
  never process a mutable upload key. Require explicit consent and notes opt-in.
- `npm run start:document-worker` owns separate `ai-document-processing` jobs.
  Queued versions form a durable outbox. Fence claims/results by execution UUID,
  lease and current ownership. No paid calls occur in extraction.
- Only Python extracts PDF/PPTX; send bounded bytes, never an arbitrary URL.
  Preserve source hash and PAGE/SLIDE/NOTES. EXTRACTED/OCR_REQUIRED are not a RAG index.
- Block `learning-documents/` keys in legacy `/s3/*` routes and root listings;
  otherwise those endpoints bypass document ownership. Do not log source bodies.
- See `docs/learning-documents.md` for setup, limits, retention gaps and opt-in tests.

Hướng dẫn chung cho mọi AI agent (Claude Code, Codex, Cursor, Copilot…) làm việc trong repo này. Nội dung dựa trên code và cấu hình thực tế tại thời điểm viết; khi thấy tài liệu lệch với code, tin code và cập nhật lại file này.

## 0. Trước khi làm việc

1. Đọc [`CONTINUITY.md`](CONTINUITY.md) để nắm trạng thái hiện tại, việc dở dang và các vấn đề đã biết.
2. Chạy `git status` và `git branch --show-current`. Không ghi đè, reset hay stash thay đổi chưa commit của người dùng nếu chưa được đồng ý.
3. Sau mỗi nhiệm vụ có thay đổi đáng kể (tính năng, sửa lỗi, quyết định kiến trúc, phát hiện vấn đề mới), cập nhật `CONTINUITY.md`.

**Thứ tự ưu tiên khi hướng dẫn mâu thuẫn:** yêu cầu trực tiếp của người dùng → file này → `README.md`.
File `../../AGENTS.md` (thư mục `testhub/` bên ngoài repo) mô tả một kiến trúc monorepo khác (`apps/exam-core`, pnpm, FastAPI proctoring, `enhance()` của ZenStack, `/api/v1/`…) **không khớp** với repo này. Không áp dụng các lệnh và đường dẫn trong file đó cho repo này.

## 1. Vai trò và stack

REST API + realtime cho hệ thống thi trực tuyến TestHub (vai trò `ADMIN`, `LECTURER`, `STUDENT`). Frontend tương ứng là repo `testhub-v2` (cùng cấp, `../testhub-v2`).

| Thành phần | Thực tế trong code |
| --- | --- |
| Framework | NestJS 11 (`@nestjs/*`), TypeScript, Express |
| ORM / DB | Prisma 7 (`@prisma/client`, `@prisma/adapter-pg` + `pg` Pool), PostgreSQL |
| Hàng đợi | BullMQ (`@nestjs/bullmq`) trên Redis (`ioredis`) |
| Realtime | Socket.IO (`@nestjs/websockets`, `@nestjs/platform-socket.io`) và SSE (`@Sse`) |
| Auth | Passport: `jwt`, `jwt-refresh`, Google OAuth20, Microsoft (Outlook); bcrypt |
| Lưu trữ file | AWS SDK v3 S3 + presigned URL (`src/s3/s3.service.ts`) |
| Xử lý tài liệu | `mammoth`, `exceljs`, `jszip`, `cheerio`, `sharp` (import câu hỏi); `puppeteer` (in đề / PDF) |
| Validation | `class-validator` + `class-transformer`, global `ValidationPipe` |
| API docs | Swagger tại `/api-docs` (`src/main.ts`) |
| Package manager | npm (`package-lock.json`) |

Lưu ý: README nhắc tới ZenStack và tRPC, nhưng repo **không có** `schema.zmodel`, không có dependency ZenStack, và `@trpc/server` chỉ nằm trong devDependencies mà không được dùng trong `src/`. Nguồn sự thật cho schema là `prisma/schema.prisma`.

## 2. Cấu trúc thư mục quan trọng

```
src/
  main.ts                 # bootstrap: ValidationPipe, cookie-parser, CORS (FRONTEND_URL), Swagger /api-docs, PORT (mặc định 3001)
  app.module.ts           # đăng ký toàn bộ module
  type.d.ts               # mở rộng express Request.user
  auth/                   # login/signup/refresh/logout/me/change-password, Google & Outlook OAuth, guards, strategies
  common/                 # decorators (@Public, @Roles), RolesGuard, utils (office-file-signature)
  prisma/                 # PrismaService (global module); prisma-hooks.service.ts hiện không được đăng ký
  encryption/             # hash/so sánh refresh token (ENCRYPTION_SECRET)
  users/ topics/ chapters/ questions/ exams/ exam-registrations/ files/ s3/
  submission/             # làm bài, nộp bài, chấm điểm, PDF (pdf.controller.ts, exam-report.service.ts)
  exam-runtime/           # trạng thái phòng thi, ping, vi phạm, giám sát, SSE, BullMQ processor, gateway /exam-runtime
  notification/           # gateway Socket.IO /notifications + REST /notification/*
  question-imports/       # import câu hỏi từ .docx/.xlsx (parsers/, queue, processor)
  question-generation/    # batch/staging, worker FastAPI, review theo revision và approved commit
  exam-print/             # in đề thi bằng puppeteer
  middleware/             # crud.middleware.ts (hiện chỉ gọi next())
prisma/
  schema.prisma           # schema DB (nguồn sự thật)
  migrations/             # migration SQL đã có — không sửa migration cũ
prisma.config.ts          # Prisma config: schema, migrations path, DATABASE_URL
test/                     # e2e (jest-e2e.json, app.e2e-spec.ts)
docker-compose.yaml       # Postgres 17 (5432) + Redis 7 (6379) cho local
.github/workflows/deploy.yml  # CI/CD: push master → Prisma generate → test → build → deploy EC2
```

## 3. Lệnh thường dùng

Chạy tại thư mục gốc repo.

| Mục đích | Lệnh | Ghi chú |
| --- | --- | --- |
| Cài dependencies | `npm install` (CI dùng `npm ci`) | |
| Hạ tầng local | `docker compose up -d` | Postgres + Redis theo `docker-compose.yaml` |
| Sinh Prisma Client | `npx prisma generate` | Cần chạy sau `npm ci` và khi sửa `prisma/schema.prisma`; CI dùng URL PostgreSQL giả chỉ cho bước generate |
| Chạy dev | `npm run start:dev` | `nest start --watch`, cổng `PORT` hoặc 3001 |
| Debug | `npm run start:debug` | |
| Build | `npm run build` | `nest build` → `dist/` |
| Chạy bản build | `npm run start:prod` | `node dist/main` |
| Typecheck | `npx tsc --noEmit -p tsconfig.json --incremental false` | Không có script riêng |
| Lint (chỉ kiểm tra) | `npx eslint "{src,apps,libs,test}/**/*.ts"` | **`npm run lint` có `--fix` và sẽ sửa file** |
| Format | `npm run format` | Ghi đè file `src/**/*.ts`, `test/**/*.ts` |
| Unit test | `npm test` (hoặc `npx jest <pattern>`) | Jest, `rootDir: src`, file `*.spec.ts` |
| Coverage | `npm run test:cov` | |
| E2E | `npm run test:e2e` | Khởi động `AppModule` thật → cần DB/Redis/env |

Các lệnh tác động tới DB — **chỉ chạy khi người dùng yêu cầu rõ ràng**, và chỉ với DB local:

- `npx prisma migrate dev --name <ten>`: tạo và áp migration mới.
- `npm run db:sync` (`prisma db push`): đồng bộ schema trực tiếp, có thể làm mất dữ liệu.
- `npm run seed`: trỏ tới `prisma/seed.ts` nhưng file này **không tồn tại** trong repo.
- Không bao giờ chạy `prisma migrate deploy`, `prisma migrate reset` hay bất cứ lệnh nào nhắm vào DB production.

## 4. Quy ước code và cách thêm/sửa tính năng

**Pattern module** (xem `src/topics/` làm mẫu đơn giản, `src/chapters/` có kèm spec):

```
src/<feature>/
  <feature>.module.ts       # imports PrismaModule (và module khác nếu cần), providers: Service + Repository
  <feature>.controller.ts   # route, guard, Swagger; không chứa business logic
  <feature>.service.ts      # business logic, ném HttpException subclasses (NotFoundException, BadRequestException…)
  <feature>.repository.ts   # truy vấn Prisma qua PrismaService, select tường minh (`satisfies Prisma.XSelect`)
  dto/create-*.dto.ts, update-*.dto.ts, query-*.dto.ts   # class-validator + @ApiProperty
  entities/                 # (một số module) kiểu dữ liệu cho Swagger
```

- Đăng ký module mới trong `src/app.module.ts`.
- Bảo vệ route bằng `@UseGuards(JwtGuard)`; giới hạn vai trò bằng `@UseGuards(JwtGuard, RolesGuard)` + `@Roles(UserRole.X)` (`src/common/`). Không có guard toàn cục (`APP_GUARD`), nên route mới **mặc định là public** nếu quên guard.
- Lấy người dùng từ `req.user` (do `JwtStrategy.validate` trả về: `id`, `full_name`, `email`, `role`, `status`, `avatar_url`…). Kiểu khai báo ở `src/type.d.ts`.
- Phân quyền dữ liệu đang được làm thủ công trong controller/service/repository (ví dụ `isAdmin`, lọc `created_by`), không có lớp policy tự động.
- Swagger: dùng `@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiBearerAuth` như các controller hiện có.
- `ValidationPipe` toàn cục bật `whitelist` + `transform` + `enableImplicitConversion`: field không có decorator trong DTO sẽ bị loại bỏ.
- Danh sách phân trang trả về dạng phẳng `{ data, total, page, limit }` (ví dụ `src/topics/topics.repository.ts`). Frontend đang đọc đúng dạng này — không đổi sang dạng khác nếu không cập nhật frontend.
- Xóa mềm (`is_deleted`, `deleted_at`) được dùng cho topic/chapter/question.
- BullMQ: mỗi module có `*-queue.service.ts` (enqueue), `*.processor.ts` (worker) và `*.constants.ts` (tên queue/job, ngưỡng). Kết nối Redis cấu hình trong `src/exam-runtime/exam-runtime.module.ts` (`BullModule.forRootAsync`, `REDIS_URL`/`REDIS_PASSWORD`).
- Hằng số nghiệp vụ (timeout phiên thi, debounce vi phạm, giới hạn file import…) nằm trong `*.constants.ts`; sửa ở đó thay vì hardcode rải rác.
- Path alias `@/` → `src/` (tsconfig và Jest `moduleNameMapper`). Code hiện dùng lẫn `@/…` và đường dẫn tương đối; giữ theo phong cách của file đang sửa.
- Prettier: `singleQuote: true`, `trailingComma: "all"`. ESLint: `typescript-eslint` recommendedTypeChecked; `no-explicit-any` đang tắt.
- Comment và message lỗi trong code dùng lẫn tiếng Việt và tiếng Anh; theo phong cách của file đang sửa.
- Unit test đặt cạnh file nguồn (`*.spec.ts`), thường mock repository bằng object thủ công (xem `src/chapters/chapters.service.spec.ts`).

**Khi đổi schema DB:** sửa `prisma/schema.prisma` → `npx prisma generate` → đề xuất lệnh `npx prisma migrate dev --name <ten>` cho người dùng tự chạy (hoặc chạy khi được cho phép, chỉ trên DB local). Không chỉnh sửa migration đã tồn tại trong `prisma/migrations/`.

## 5. Tích hợp với frontend (`../testhub-v2`)

- **Base URL:** frontend gọi trực tiếp backend qua `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:3001`), không có tiền tố `/api` hay version. Không có package contract dùng chung; endpoint được khai báo thủ công ở `../testhub-v2/src/constants/endpoints.ts`. **Khi đổi/xóa route, kiểm tra và báo lại cho phía frontend.**
- **CORS:** `FRONTEND_URL` (có thể nhiều giá trị, phân tách bằng dấu phẩy), `credentials: true`. Cũng được dùng làm origin cho các gateway Socket.IO và đích redirect sau OAuth.
- **Xác thực bằng cookie httpOnly và AuthSession** (`src/auth/auth.controller.ts`, cập nhật 2026-10-25):
  - `access_token`: 15 phút, ký bằng `JWT_ACCESS_SECRET`, payload `{ sub, email, role }`.
  - `refresh_token`: mặc định 7 ngày tuyệt đối, ký bằng `JWT_REFRESH_SECRET`, `path: '/auth/refresh'`, hash lưu theo AuthSession. Access/refresh dùng sid và token_use riêng; TTL cookie đồng bộ JWT bằng sessionDuration. Account token columns giữ để tương thích, code mới không sử dụng.
  - `secure` phụ thuộc `NODE_ENV === 'production'`, SameSite=Lax. POST /auth/* bắt buộc Origin thuộc FRONTEND_URL. OAuth callback GET giữ nguyên.
  - STUDENT có một student_slot duy nhất. Login mới tạo PENDING, không thu hồi phiên đang thi. Xác nhận khi có IN_PROGRESS cần giảng viên phụ trách tất cả bài đang làm hoặc ADMIN duyệt; LECTURER/ADMIN được nhiều phiên. Logout chỉ thu hồi sid hiện tại. Confirmation replay trong 10 phút trả cùng phiên, không hồi sinh phiên đã thu hồi.
  - AuthSessionService khóa user khi chuyển phiên và thao tác bài thi; StudentSessionInterceptor áp cho submission/exam-runtime. Dùng PrismaService.current/inTransaction trong luồng này, queue/realtime qua afterCommit. Không dùng client gốc để thoát transaction đang khóa.
  - Frontend (`../testhub-v2/src/proxy.ts`) tự verify `access_token` bằng `NEXT_JWT_ACCESS_SECRET` để phân quyền route ⇒ giá trị đó phải trùng `JWT_ACCESS_SECRET`. Đổi thuật toán/payload JWT sẽ làm hỏng frontend.
  - Frontend tự gọi `POST /auth/refresh` khi gặp 401, lỗi tạm thời không logout. Proxy thiếu/hết hạn access chuyển qua trang recovery để trình duyệt refresh. Cookie phải cùng host frontend; khác host cần reverse proxy/BFF. Xem docs/auth-sessions.md về migration, kiểm tra và đăng nhập lại token cũ.
  - OAuth: `GET /auth/google`, `GET /auth/outlook` (+ `/callback`), redirect về `FRONTEND_URL`.
- **Socket.IO:**
  - Namespace `/notifications` (`src/notification/notification.gateway.ts`): xác thực JWT cookie và AuthSession, không tin danh tính query; room `user:{userId}` và `room:admin`. Thu hồi được kiểm tra định kỳ 5 giây. Sự kiện frontend đang dùng: `notification:unread`, `notification:new`, `notification:unread_count`, `notification:mark_read`, `notification:mark_all_read`, `dashboard:update`, `exam:registration_approved`, `exam:student_added`, `exam:registration_requested`.
  - Namespace `/exam-runtime` (`src/exam-runtime/exam-runtime.gateway.ts`): xác thực access JWT qua `handshake.auth.token` hoặc cookie `access_token`, kiểm tra `AuthSession` và kiểm tra thu hồi phiên định kỳ mỗi 5 giây; frontend hiện **không** kết nối namespace này.
- **SSE:** `GET /exam-runtime/exams/:examId/events` (sinh viên, chỉ nhận `STUDENT_EVENT_TYPES`) và `GET /exam-runtime/monitor/exams/:examId/events` (giám sát). Frontend dùng `EventSource` với `withCredentials`. Giữ nguyên whitelist loại sự kiện để không lộ dữ liệu của sinh viên khác.
- **Upload file:** `POST /files/upload-url` → client PUT trực tiếp lên presigned URL → `POST /files/:id/confirm`. Các route `/s3/*` cũ vẫn tồn tại và frontend vẫn dùng `GET /s3/view-file`.

## 6. Biến môi trường

Không có `.env.example` (README nhắc tới nhưng file không tồn tại). Biến được đọc trong code:

`PORT`, `NODE_ENV`, `FRONTEND_URL`, `DATABASE_URL`, `REDIS_URL`, `REDIS_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, `AUTH_REFRESH_GRACE_SECONDS` (mặc định 10, giới hạn 1..30), `ENCRYPTION_SECRET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET_NAME` (bắt buộc, `getOrThrow`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_CALLBACK_URL`. JWT_SECRET/JWT_EXPIRATION cũ không còn được đọc trong luồng xác thực.

Luồng thử nghiệm Gemini trực tiếp đã gỡ; Gemini thuộc `../testhub-ai-service`. Module generation có batch/staging, worker FastAPI, review/revision và commit đã duyệt. Xem `docs/ai-question-generation.md` và `.env.ai.example`.

Biến tích hợp mới: `AI_QUESTION_GENERATION_ENABLED` (mặc định false), `AI_SERVICE_BASE_URL`, `AI_SERVICE_INTERNAL_TOKEN`, `AI_SERVICE_TIMEOUT_MS` (mặc định 35000). Token trùng `INTERNAL_API_TOKEN` của Python; không đặt key Gemini ở backend/frontend. Cấu hình đọc một lần khi khởi tạo module; không retry HTTP ở NestJS vì Python đã retry SDK.

`docker-compose.yaml` còn dùng `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `REDIS_PASSWORD`. Khi thêm biến mới, ghi tên biến vào mục này (không ghi giá trị).

## 7. Kiểm tra cần chạy theo phạm vi thay đổi

| Phạm vi | Kiểm tra tối thiểu |
| --- | --- |
| Chỉ tài liệu | Không cần build/test; rà lại đường dẫn và lệnh được nhắc tới |
| Logic trong service/repository | `npx jest <đường-dẫn-hoặc-tên-module>` + typecheck |
| Controller/DTO/route | Typecheck + test liên quan; đối chiếu `../testhub-v2/src/constants/endpoints.ts` |
| `prisma/schema.prisma` | `npx prisma generate` + typecheck + `npm test`; không tự áp migration |
| Auth, cookie, CORS, gateway | Typecheck + test liên quan; kiểm tra tác động lên `../testhub-v2/src/proxy.ts` và `../testhub-v2/src/lib/api-client.ts` của frontend |
| Trước khi bàn giao thay đổi lớn | `npm run build` + `npm test` + lint không `--fix` |

Ghi kết quả thực tế (lệnh, pass/fail, số lỗi) vào `CONTINUITY.md`; không báo pass khi chưa chạy.

## 8. An toàn: secrets, dữ liệu, môi trường thật

- Repo có `.env`, `.env.production` và `quanna-keypair.pem` ở thư mục gốc (đều nằm trong `.gitignore`). **Không đọc nội dung, in ra, sao chép, commit, hay đưa giá trị vào tài liệu/log/tin nhắn.** Nếu cần biết tên biến, lấy từ code (mục 6).
- Không hardcode secret; luôn đọc qua `ConfigService`/`process.env`.
- Không log mật khẩu, token, cookie hay dữ liệu cá nhân.
- `data/` là dữ liệu MinIO local (gitignored) — không xóa/sửa.
- **Push lên nhánh `master` sẽ kích hoạt deploy lên AWS EC2** (`.github/workflows/deploy.yml`, có chạy `prisma migrate deploy` trên server). Không commit, push, merge vào `master`, chạy deploy, SSH tới server hay thao tác DB/S3 thật khi chưa được người dùng yêu cầu rõ ràng.
- Nhánh làm việc hiện tại là `dev`; không đổi nhánh, rebase hay force-push khi chưa được yêu cầu.
- Không cài/gỡ/nâng cấp dependency nếu nhiệm vụ không yêu cầu.

## 9. File generated / không sửa trực tiếp

- `dist/` — output build.
- `node_modules/` (kể cả Prisma Client sinh ra trong `node_modules/.prisma`).
- `generated/`, `src/generated/`, `prisma/generated/` — đường dẫn generated đã được gitignore (`nest-cli.json` copy `../generated/**` vào output nếu tồn tại).
- `prisma/migrations/*` đã tồn tại — không chỉnh sửa; tạo migration mới thay vì sửa cũ.
- `package-lock.json` — chỉ thay đổi thông qua `npm install`, không sửa tay.
- `src/question-imports/parsers/fixtures/*.docx|*.xlsx` — fixture test nhị phân, không sửa trừ khi cập nhật test tương ứng.

## 10. AI batches and dedicated worker (2026-10-19)

- `QuestionGenerationModule` serves cookie/JWT + lecturer-only batch POST (202),
  status GET and paginated item GET under `/question-generation-batches`.
- AI business persistence is separate: `QuestionGenerationBatch`,
  `QuestionGenerationItem`, `QuestionGenerationAttempt`, `QuestionGenerationOutbox`.
  Never reuse import tables. Only an explicit approved commit transaction may
  insert generated questions into `Question`.
- `npm run start:ai-worker` runs the built `dist/question-generation.worker.js` in
  its own Nest application context. API and worker share the existing DB/Redis/AI
  settings; the API does not register the AI processor. Apply the additive AI
  migration before enabling/starting the feature on a target database.
- Persist batch + outbox in one transaction. Require owner-scoped Idempotency-Key
  and a canonical request hash. Queue payloads contain only batch UUIDs.
- One claimed batch permits one FastAPI invocation. Python owns provider retries.
  Redis delivery and DB persistence retries must never reissue a paid AI call.
  Reconcile saved results; mark ambiguous interrupted attempts UNKNOWN.
- Only conditional state/execution-fenced writes may finish/fail a batch. Recheck
  active lecturer and owned topic/chapter before disclosure and draft persistence.
- Keep original/current draft JSON and revision separate. VALID is not approval.
  Edit/review requests require exact revision; edits invalidate approval. Commit
  accepts only APPROVED revisions, locks the batch first and stores bank rows,
  item mappings and QuestionGenerationReview audit together. Commit preserves
  approved revision so retries return the same bank mapping. COMPLETED batches
  are closed to editing; deleted bank mappings must never be recreated by retry.
  Retention/cost quotas remain later work.
- Read `docs/ai-question-generation.md` for migration/demo commands and opt-in
  `TESTHUB_AI_DATABASE_URL` / `TESTHUB_AI_REDIS_URL` tests. Use disposable loopback
  services, private test schemas/prefixes, no shared DB reset/Redis flush.
