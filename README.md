# TestHub V2 - Backend System

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
