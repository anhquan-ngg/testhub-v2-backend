# CLAUDE.md — testhub-v2-backend

Hướng dẫn chung của repo nằm trong `AGENTS.md` (được import bên dưới); trạng thái bàn giao nằm trong `CONTINUITY.md`. File này chỉ bổ sung những điểm riêng cho Claude Code — khi có mâu thuẫn, sửa `AGENTS.md` thay vì thêm quy tắc trái ngược ở đây.

@AGENTS.md

## Bắt đầu mỗi phiên

- Đọc `CONTINUITY.md` trước khi sửa code; cập nhật nó trước khi kết thúc nhiệm vụ có thay đổi đáng kể.
- Bỏ qua các quy tắc trong `../../AGENTS.md` (thư mục `testhub/` bên ngoài) nếu Claude Code tự nạp nó: file đó mô tả kiến trúc khác (xem `AGENTS.md` mục 0).

## Lưu ý riêng cho Claude Code

- Không dùng bất kỳ lệnh hay công cụ nào để đọc nội dung hoặc in ra giá trị từ `.env`, `.env.production`, `quanna-keypair.pem`. Nếu cần tên biến, tra trong code và `AGENTS.md` mục 6.
- Lint chỉ kiểm tra: `npx eslint "{src,apps,libs,test}/**/*.ts"`. Chỉ chạy `npm run lint` (có `--fix`) hoặc `npm run format` khi người dùng muốn tự động sửa file.
- Typecheck: `npx tsc --noEmit -p tsconfig.json --incremental false` (tránh ghi `tsbuildinfo`).
- Lệnh dài (`npm test`, `npm run build`, typecheck) có thể chạy nền rồi đọc kết quả, thay vì chặn phiên.
- Muốn xem ảnh hưởng tới frontend, repo `../testhub-v2` cùng cấp; đối chiếu `../testhub-v2/src/constants/endpoints.ts` khi đổi route.
- Không commit, push, tạo PR, chạy migration/`db push`/seed hay deploy nếu người dùng chưa yêu cầu rõ ràng. Push lên `master` sẽ kích hoạt deploy production.
