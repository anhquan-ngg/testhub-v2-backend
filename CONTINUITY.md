# CONTINUITY.md — testhub-v2-backend

> Trạng thái và bàn giao giữa các phiên làm việc. Đọc trước khi làm việc; cập nhật sau mỗi nhiệm vụ có thay đổi đáng kể.

**Cập nhật lần cuối:** 2026-10-19 — bổ sung chẩn đoán an toàn cho lỗi AI staging storage; chưa xác định nguyên nhân database runtime từ log cũ.

## Cách cập nhật file này

- Cập nhật ngày ở trên và các mục bị ảnh hưởng sau mỗi nhiệm vụ có thay đổi đáng kể (tính năng, sửa lỗi, đổi schema/contract, quyết định kiến trúc, phát hiện vấn đề mới).
- Chỉ ghi điều đã xác minh từ code, lệnh đã chạy, hoặc người dùng xác nhận; điều còn nghi ngờ đưa vào mục "Chưa xác minh".
- Ngắn gọn: xóa mục đã xong hoặc đã lỗi thời thay vì chồng thêm. Lịch sử chi tiết đã có trong git.
- Không ghi secrets, token, mật khẩu, dữ liệu cá nhân.

## Trạng thái hiện tại (xác minh từ codebase)

- Nhánh `dev`, đồng bộ với `origin/dev` khi khảo sát; working tree sạch trước khi thêm 3 file tài liệu này. Commit mới nhất: `0f87eba` (2026-09-29) — chapter update logic, giới hạn zip khi import.
- Module đăng ký trong `src/app.module.ts`: Encryption, Auth, Prisma, S3, Notification, ExamRuntime, Submission, Users, Topics, Chapters, Questions, Exams, ExamRegistrations, Files, QuestionImport, ExamPrint, QuestionGeneration.
- `prisma/migrations/` có 18 migration; mới nhất `20261019100000_add_ai_review_commit`. Hai migration AI chỉ được kiểm thử trên PostgreSQL tạm, chưa áp lên DB local/production hiện có.
- Tính năng gần đây theo git log: import câu hỏi từ .docx/.xlsx (`src/question-imports/`), giám sát phòng thi (`src/exam-runtime/exam-monitor-aggregator.service.ts`), thứ tự câu hỏi trong bài làm, in đề (`src/exam-print/`).

## Quyết định kiến trúc đã thể hiện trong code

- Prisma 7 dùng driver adapter `PrismaPg` + `pg.Pool` — `src/prisma/prisma.service.ts`; `PrismaModule` là `@Global()`.
- Phân lớp controller → service → repository; repository giữ truy vấn Prisma với `select` tường minh — ví dụ `src/topics/`.
- Xác thực bằng cookie httpOnly `access_token` (15 phút) + `refresh_token` (7 ngày, `path: /auth/refresh`), hash refresh token lưu ở `Account.refresh_token_hash` — `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`, `src/auth/strategies/`.
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

1. Gateway `/notifications` tin `userId`/`userRole` từ `handshake.query`, không verify JWT ⇒ client bất kỳ có thể nhận thông báo của người khác hoặc vào `room:admin` (`src/notification/notification.gateway.ts:33-52`). Vấn đề bảo mật, chưa sửa.
2. Gateway `/exam-runtime` verify token bằng `JwtService` mặc định (secret `JWT_SECRET` trong `src/auth/auth.module.ts`) trong khi access token được ký bằng `JWT_ACCESS_SECRET`; frontend hiện không dùng namespace này.
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

Ưu tiên AI tiếp theo: kiểm thử thao tác trình duyệt với session local, review/apply hai migration AI trên DB đích, đăng ký/giám sát worker khi triển khai; quyết định retention/quota/ngân sách. Sau đó mới mở rộng nguồn PDF/PPTX/RAG. Review/edit/approved commit và workspace đã có; chưa deploy production.

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
  thành công: 5 bảng nghiệp vụ AI, 4 enum AI. Chưa áp DB hiện có.
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

- Người dùng gặp log chỉ có event `ai_staging_storage_unavailable`. Chưa đủ
  bằng chứng để kết luận thiếu bảng/cột, mất kết nối hay stale Prisma Client.
  Không đọc `.env`, kết nối/áp migration DB hiện có hoặc gọi Gemini trong tác vụ.
- Người dùng sau đó xác nhận **chưa áp dụng hai migration AI** và yêu cầu hướng
  dẫn. Thiếu schema là nguyên nhân cần kiểm tra trước; hướng dẫn kiểm tra migrate
  status, áp migration bằng migrate dev trên đúng DB local, generate/build/restart.
  Chưa có kết quả migration/runtime sau khi người dùng thực hiện.
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
