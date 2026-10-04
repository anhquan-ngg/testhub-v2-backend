# CONTINUITY.md — testhub-v2-backend

> Trạng thái và bàn giao giữa các phiên làm việc. Đọc trước khi làm việc; cập nhật sau mỗi nhiệm vụ có thay đổi đáng kể.

**Cập nhật lần cuối:** 2026-10-02 — tạo mới file (khảo sát codebase, chưa sửa source).

## Cách cập nhật file này

- Cập nhật ngày ở trên và các mục bị ảnh hưởng sau mỗi nhiệm vụ có thay đổi đáng kể (tính năng, sửa lỗi, đổi schema/contract, quyết định kiến trúc, phát hiện vấn đề mới).
- Chỉ ghi điều đã xác minh từ code, lệnh đã chạy, hoặc người dùng xác nhận; điều còn nghi ngờ đưa vào mục "Chưa xác minh".
- Ngắn gọn: xóa mục đã xong hoặc đã lỗi thời thay vì chồng thêm. Lịch sử chi tiết đã có trong git.
- Không ghi secrets, token, mật khẩu, dữ liệu cá nhân.

## Trạng thái hiện tại (xác minh từ codebase)

- Nhánh `dev`, đồng bộ với `origin/dev` khi khảo sát; working tree sạch trước khi thêm 3 file tài liệu này. Commit mới nhất: `0f87eba` (2026-09-29) — chapter update logic, giới hạn zip khi import.
- Module đăng ký trong `src/app.module.ts`: Encryption, Auth, Prisma, S3, Notification, ExamRuntime, Submission, Users, Topics, Chapters, Questions, Exams, ExamRegistrations, Files, QuestionImport, ExamPrint.
- `prisma/migrations/` có 16 migration; mới nhất `20260916000000_add_question_imports`. Chưa xác minh DB local/production đã áp đến migration nào.
- Tính năng gần đây theo git log: import câu hỏi từ .docx/.xlsx (`src/question-imports/`), giám sát phòng thi (`src/exam-runtime/exam-monitor-aggregator.service.ts`), thứ tự câu hỏi trong bài làm, in đề (`src/exam-print/`).

## Quyết định kiến trúc đã thể hiện trong code

- Prisma 7 dùng driver adapter `PrismaPg` + `pg.Pool` — `src/prisma/prisma.service.ts`; `PrismaModule` là `@Global()`.
- Phân lớp controller → service → repository; repository giữ truy vấn Prisma với `select` tường minh — ví dụ `src/topics/`.
- Xác thực bằng cookie httpOnly `access_token` (15 phút) + `refresh_token` (7 ngày, `path: /auth/refresh`), hash refresh token lưu ở `Account.refresh_token_hash` — `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`, `src/auth/strategies/`.
- Không có guard toàn cục; mỗi controller tự gắn `JwtGuard`/`RolesGuard` + `@Roles` — `src/common/`.
- Realtime phòng thi dùng SSE với whitelist loại sự kiện cho sinh viên (`STUDENT_EVENT_TYPES`) và giám sát (`MONITOR_EVENT_TYPES`) — `src/exam-runtime/exam-runtime.constants.ts`, `exam-runtime.controller.ts`. Sinh viên ping HTTP (`/exam-runtime/submissions/:id/ping`), vi phạm do client tự báo chỉ gồm các loại trong `CLIENT_REPORTABLE_VIOLATION_TYPES`; `CONNECTION_LOST` chỉ do server sinh.
- BullMQ hai queue: `exam-runtime` (mở/đóng thi, auto-submit, chấm điểm, dọn session) và `question-imports` (parse, dọn import hết hạn) — `*.constants.ts`, `*.processor.ts` tương ứng.
- Import câu hỏi: upload → job parse → review từng item → commit; TTL 24 giờ, giới hạn 20 MB, chống zip bomb, kiểm tra chữ ký file Office (`src/common/utils/office-file-signature.util.ts`).
- Upload file qua presigned S3 URL rồi xác nhận (`/files/upload-url` → PUT → `/files/:id/confirm`) — `src/files/`.
- Phân trang trả về `{ data, total, page, limit }`; xóa mềm (`is_deleted`) cho topic/chapter/question.
- Thông báo realtime qua Socket.IO namespace `/notifications`, room `user:{userId}` và `room:admin` — `src/notification/notification.gateway.ts`.

## Vấn đề / TODO đã xác minh

1. `npm test`: `src/app.controller.spec.ts` fail — `AppService` cần `PrismaService` nhưng test không cung cấp provider.
2. Gateway `/notifications` tin `userId`/`userRole` từ `handshake.query`, không verify JWT ⇒ client bất kỳ có thể nhận thông báo của người khác hoặc vào `room:admin` (`src/notification/notification.gateway.ts:33-52`). Vấn đề bảo mật, chưa sửa.
3. Gateway `/exam-runtime` verify token bằng `JwtService` mặc định (secret `JWT_SECRET` trong `src/auth/auth.module.ts`) trong khi access token được ký bằng `JWT_ACCESS_SECRET`; frontend hiện không dùng namespace này.
4. Frontend gọi `POST /model/File/updateMany` (`../testhub-v2/src/hooks/useFiles.ts`) nhưng backend không có route `/model/*`.
5. `npm run seed` trỏ tới `prisma/seed.ts` không tồn tại.
6. README hướng dẫn `cp .env.example .env` nhưng repo không có `.env.example`.
7. README và `.github/workflows/deploy.yml` nhắc tới ZenStack (`npx zenstack generate`, `schema.zmodel`, `node_modules/.zenstack`) nhưng repo không có `schema.zmodel` và không có dependency ZenStack.
8. `src/prisma/prisma-hooks.service.ts` không được đăng ký ở module nào (code chết); cập nhật dashboard thực tế được đẩy từ `src/notification/notification.controller.ts`.
9. `npm run lint` có `--fix`; bước lint trong CI đang bị comment.

## Chưa xác minh

- CI/CD `deploy.yml` có chạy thành công với các bước ZenStack hay không (chưa xem lịch sử GitHub Actions).
- `deploy.yml` fallback `pm2 start dist/src/main.js`, trong khi build local sinh `dist/main.js` (và `start:prod` dùng `dist/main`) — chưa rõ cấu trúc `dist/` trên server.
- `npm run test:e2e`: `test/jest-e2e.json` không có `moduleNameMapper` cho `@/` trong khi 21 file trong `src/` import `@/…` — có khả năng lỗi resolve module; chưa chạy.
- `.env.production` cục bộ dùng bộ tên biến khác code (`JWT_SECRET`, `S3_*` thay vì `JWT_ACCESS_SECRET`, `AWS_*`) — có thể lỗi thời; chưa rõ môi trường production thực sự cấu hình thế nào.
- Cookie không đặt `domain`: chưa xác minh frontend production (khác subdomain với API) có đọc được `access_token` trong `../testhub-v2/src/proxy.ts` hay không.

## Kết quả kiểm tra đã chạy (2026-10-02)

| Lệnh | Kết quả |
| --- | --- |
| `npx tsc --noEmit -p tsconfig.json --incremental false` | Pass, 0 lỗi |
| `npx jest` | 7/8 suite pass, 62/63 test pass; fail `src/app.controller.spec.ts` (vấn đề 1) |
| Lint, build, e2e | Chưa chạy |

## Công việc đang làm

Chưa có thông tin.

## Bước tiếp theo đề xuất

Chưa có thông tin về ưu tiên của người dùng. Các ứng viên dựa trên vấn đề đã xác minh: sửa `app.controller.spec.ts`; thêm xác thực JWT cho gateway `/notifications`; thống nhất secret cho gateway `/exam-runtime`; thêm `.env.example` chỉ chứa tên biến; đồng bộ README/CI với việc không còn ZenStack.

## Điểm cần làm rõ với người dùng

- ZenStack đã bị bỏ hẳn hay sẽ quay lại? (quyết định cách sửa README và `deploy.yml`)
- Route `/model/*` mà frontend còn gọi: nên thêm ở backend hay bỏ ở frontend?
- Quy trình deploy hiện tại có còn dùng `deploy.yml` (EC2 + PM2) không?
