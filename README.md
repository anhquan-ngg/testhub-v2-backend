# TestHub V2 - Backend System

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


## Authentication sessions

Students have one active browser session. A device switch requires explicit
confirmation and responsible-lecturer/admin approval while an exam is in progress.
Lecturers/admins retain independent sessions across devices. Apply the additive
`20261024090000_add_auth_sessions` migration explicitly and restart both apps;
existing tokens require login again. See [auth session setup and contract](docs/auth-sessions.md).

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

## Tài liệu học tập — PDF/PPTX và trích xuất nền

Module `src/learning-documents/` có metadata/phiên bản riêng, presigned upload,
xác nhận bytes nguồn, polling, xem text theo trang/slide và thu hồi quyền truy cập.
Cần migration `20261021090000_add_learning_documents`, AI service cập nhật và
tiến trình riêng `npm run start:document-worker` sau khi build.
Xem [hướng dẫn chạy, API và demo](docs/learning-documents.md).
Embedding, retrieval và sinh câu hỏi từ file đều đã có; xem [hướng dẫn RAG](docs/rag-indexing.md).

## AI question generation — batches and background worker

Module `src/question-generation/` kiểm tra quyền sở hữu môn/chương, contract
`text-generation.v1` và gọi FastAPI qua HTTP nội bộ. Cấu hình theo
[hướng dẫn tích hợp](docs/ai-question-generation.md) và `.env.ai.example`.
Đã có API tạo lô `POST /question-generation-batches` trả `202`, API đọc trạng thái/
bản nháp, các bảng AI staging/audit riêng và worker BullMQ chạy độc lập. Có API
sửa/duyệt theo revision và commit câu đã duyệt vào ngân hàng bằng transaction,
chống lưu trùng khi gửi lại. Áp dụng hai migration AI local theo hướng dẫn,
chạy API, FastAPI, Redis, sau đó `npm run build` và `npm run start:ai-worker` ở terminal
riêng. Frontend: mở ngân hàng câu hỏi → **Sinh câu hỏi bằng AI**, hoặc
`/{locale}/lecturer/questions/generate`, tạo lô, sửa/duyệt, chọn câu và xác nhận lưu.

<p align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## 📝 Giới thiệu về hệ thống

**TestHub V2** là một nền tảng quản lý và thực hiện các bài thi trực tuyến mạnh mẽ, được thiết kế để phục vụ nhu cầu kiểm tra đánh giá của giảng viên và sinh viên. Hệ thống cung cấp giải pháp toàn diện từ khâu ngân hàng câu hỏi, tạo đề thi thông minh cho đến chấm điểm và thống kê kết quả tự động.

Mục tiêu của TestHub là mang lại trải nghiệm thi cử công bằng, minh bạch và hiệu quả nhất thông qua các công nghệ xử lý hiện đại và kiến trúc hệ thống tối ưu.

---

## 🚀 Công nghệ sử dụng

Hệ thống được xây dựng dựa trên các công nghệ hiện đại, đảm bảo tính bảo mật, hiệu suất cao và khả năng mở rộng:

### ⚙️ Backend Core

- **Framework**: [NestJS](https://nestjs.com/) (Node.js framework tiến bộ) - Cung cấp kiến trúc module và khả năng bảo trì tốt.
- **Language**: TypeScript - Đảm bảo an toàn kiểu dữ liệu (Type-safe).
- **Architecture**: REST API tích hợp tRPC cho các tác vụ cần tốc độ cao.

### 🔐 Security & Authorization

- **ZenStack**: Lớp bảo mật dựa trên Model, giúp quản lý phân quyền (Access Control Policy) ngay từ tầng Schema.
- **Passport.js & JWT**: Cơ chế xác thực mạnh mẽ, hỗ trợ đăng nhập qua Google OAuth.
- **Auth Provider**: Hỗ trợ Login truyền thống và Google Login.

### 💾 Database & Storage

- **ORM**: [Prisma](https://www.prisma.io/) - Truy vấn dữ liệu mạnh mẽ và đồng bộ schema.
- **Database**: PostgreSQL (Chạy trên **AWS RDS** cho môi trường Production).
- **File Storage**:
  - **AWS S3**: Lưu trữ tài nguyên (ảnh câu hỏi, avatar) trên môi trường Production.
  - **MinIO**: Giải pháp lưu trữ tương thích S3 chạy local để phục vụ quá trình phát triển (Dev).

### 🌐 Infrastructure & DevOps

- **Hosting**: AWS EC2 Instances.
- **Reverse Proxy**: Nginx (Cấu hình SSL Let's Encrypt).
- **Process Manager**: PM2 - Đảm bảo ứng dụng chạy 24/7 và tự động restart.
- **CI/CD**: **GitHub Actions** - Tự động hóa quy trình Kiểm thử (Test), Xây dựng (Build) và Triển khai (Deploy) mỗi khi có code mới lên nhánh `master`.

---

## ✨ Các tính năng chính

- [x] **Quản lý người dùng**: Phân quyền Giảng viên (Lecturer), Sinh viên (Student) và Admin.
- [x] **Ngân hàng câu hỏi**: Hỗ trợ nhiều loại câu hỏi (Trắc nghiệm, Chọn nhiều đáp án, Tự luận).
- [x] **Tạo đề thi**: Hỗ trợ tạo đề thủ công (Manual) hoặc tự động lựa chọn câu hỏi theo tỉ lệ (Random).
- [x] **Thực hiện bài thi**: Ghi lại quá trình làm bài, tính toán thời gian thực.
- [x] **Chấm điểm tự động**: Trả kết quả ngay lập tức cho các câu hỏi trắc nghiệm.
- [x] **Thống kê & Đánh giá**: Xếp loại kết quả làm bài của sinh viên.

---

## 🛠 Cài đặt & Chạy ứng dụng

### Yêu cầu hệ thống

- Node.js (v20+)
- PostgreSQL hoặc Docker để chạy cơ sở dữ liệu.

### Các bước cài đặt

1. **Clone repository**:

```bash
git clone https://github.com/anhquan-ngg/testhub-v2-backend.git
cd testhub-v2-backend
```

2. **Cài đặt thư viện**:

```bash
npm install
```

3. **Cấu hình biến môi trường**:
   Tạo file `.env` từ file mẫu và điền các thông tin (DATABASE_URL, JWT_SECRET, AWS_S3_KEYS...):

```bash
cp .env.example .env
```

4. **Khởi tạo Database & Schema**:

```bash
npx zenstack generate
npx prisma db push
```

5. **Chạy ứng dụng**:

```bash
# Chế độ phát triển
npm run start:dev

# Chế độ Production
npm run build
npm run start:prod
```

---

## 📖 API Documentation

Hệ thống tích hợp sẵn Swagger UI để việc tích hợp Frontend trở nên dễ dàng:

- **Local**: `http://localhost:3001/api-docs`
- **Production**: `https://api.testhub.quanna.io.vn/api-docs`

---

## 📝 License

Distributed under the UNLICENSED License. See `LICENSE` for more information.

---

**Author**: [Anh Quân](https://github.com/anhquan-ngg)
