# Cây chương: Adjacency List + Recursive CTE

Chương tiếp tục lưu bằng `Chapter.parent_id`: `null` là gốc, UUID là chương cha.
Không có giới hạn số cấp trong nghiệp vụ. Các truy vấn cây ở PostgreSQL dùng
`WITH RECURSIVE`; frontend dựng đường dẫn bằng vòng lặp, tránh tràn call stack.
Schema đã có quan hệ cha/con và index cần thiết nên thay đổi này không cần migration.
Không sửa migration lịch sử hay chuyển đổi dữ liệu hiện có.

## Quy tắc cây

- Chương cha phải đang hoạt động, thuộc cùng môn học và có chuỗi tổ tiên tới gốc.
- Không được chuyển chương vào chính nó hoặc một hậu duệ của nó.
- Tạo, sửa, chuyển, xóa chương và commit chương từ import/AI được tuần tự hóa
  bằng khóa hàng môn học trong transaction. Khi liên quan hai môn, khóa theo thứ
  tự UUID để tránh đảo thứ tự khóa. Kiểm tra lại cây sau khi lấy khóa ngăn hai
  yêu cầu đồng thời `A → B` và `B → A` tạo vòng lặp.
- Không chuyển chương còn chương con đang hoạt động sang môn khác. Quy tắc này
  được giữ để tránh tạo liên kết cha/con khác môn.
- Xóa mềm chương bao gồm mọi hậu duệ và câu hỏi của nhánh, trong cùng transaction.
- Truy vấn cây hoạt động chỉ đi từ gốc còn hiệu lực, không xuyên qua chương đã
  xóa hoặc liên kết khác môn. `UNION` trên định danh hữu hạn bảo đảm truy vấn
  kết thúc khi gặp dữ liệu vòng lặp; dữ liệu hỏng không được tự động sửa.

## API cây

Các route tiếp tục nằm trực tiếp dưới base URL backend, dùng xác thực hiện có,
chỉ cho `LECTURER`/`ADMIN`. Giảng viên chỉ đọc cây của môn mình sở hữu.

| Route | Kết quả |
| --- | --- |
| `GET /chapters/:id/subtree?page=1&limit=100` | Chương được chọn và toàn bộ hậu duệ còn hiệu lực |
| `GET /chapters/:id/ancestors?page=1&limit=100` | Chương được chọn và chuỗi tổ tiên |

Trả `{data, total, page, limit}`; mỗi chương có `id`, `parent_id`, `topic_id`,
`name`, `order`, `created_at`, `updated_at`. Dữ liệu phẳng, sắp theo `order, id`;
client ghép cây/đường dẫn bằng `parent_id`, không suy luận quan hệ từ thứ tự trang.
`limit` tối đa 100, mặc định 10. Không giới hạn số cấp được truy vấn.
Chương không khả dụng hoặc ngoài quyền sở hữu trả 404; vai trò không hợp lệ trả
403; UUID/phân trang sai trả 400. Xem Swagger `/api-docs` của ứng dụng.

## Chọn câu hỏi theo chương

JSON `Exam.distribution` giữ nguyên cấu trúc cũ:

```json
[{"chapter_id":"00000000-0000-4000-8000-000000000001","quantity":3}]
```

Mỗi dòng `BY_CHAPTER` lấy ứng viên từ chính chương và **toàn bộ cây con**, thay
cho chỉ chương và con trực tiếp. Cho phép đồng thời chọn A và B nằm dưới A,
thậm chí lặp lại một chương, nhưng một câu hỏi chỉ xuất hiện một lần trong kết
quả chung của các dòng. Câu hỏi xóa mềm không được chọn.

Truy vấn CTE đọc tập ứng viên của tất cả dòng trong một SQL snapshot. Bộ phân
bổ dùng ghép cặp hai phía với đường tăng, thực hiện bằng vòng lặp. Ví dụ A có
`q1, q2`, B chỉ có `q1`, mỗi dòng yêu cầu một câu: kết quả là A nhận `q2`, B nhận
`q1`. Việc lấy ngẫu nhiên độc lập từng dòng có thể chọn trùng `q1`; cách lấy
tham lam rồi loại trùng có thể báo thiếu dù tồn tại cách phân bổ đủ.

Nếu không tồn tại cách đáp ứng đồng thời tất cả số lượng, API trả 400 với
`code: CHAPTER_DISTRIBUTION_INSUFFICIENT`. Kiểm tra khi tạo/sửa cấu hình đề và
kiểm tra lại khi chọn đề thi/in đề, vì ngân hàng có thể thay đổi sau khi lưu.
Cả runtime, dịch vụ in đề hiện tại và PDF cũ dùng chung bộ chọn này. Ngẫu nhiên
hóa tập ứng viên không cam kết phân phối xác suất đồng đều trên mọi bộ đề.

Giới hạn tài nguyên: 1–1.000 dòng; số lượng mỗi dòng là số nguyên dương; tổng
tối đa 10.000 câu. Đây là giới hạn kích thước cấu hình, không phải độ sâu cây.
JSON sai cấu trúc, UUID sai, số lượng dạng chuỗi/âm hoặc cấu hình rỗng bị từ chối.
Cấu hình cũ hợp lệ giữ nguyên UUID/số lượng và nhận ngữ nghĩa toàn bộ cây con.
Cấu hình cũ không hợp lệ cần giảng viên sửa trước khi lưu/chọn đề tiếp.
Danh sách câu đã được chốt trong phiên thi đang diễn ra không được viết lại.

## Frontend

Trang sửa đề cho phép tìm và chọn chương ở mọi cấp bằng đường dẫn. Mỗi trang
chọn hiển thị tối đa 50 mục; nhãn dài rút gọn còn 8 thành phần cuối và dấu `…`,
đường dẫn đầy đủ vẫn dùng cho tìm kiếm và thuộc tính `title`. Đây là giới hạn
hiển thị, không cắt cây dữ liệu. Import cũng dựng đường dẫn bằng vòng lặp.

## Kiểm chứng

Chạy tại backend:

```powershell
npx jest common/chapter-question-selection.spec.ts --runInBand
# Chỉ trỏ tới PostgreSQL loopback riêng cho test, tên database kết thúc bằng _test:
$env:TESTHUB_TREE_DATABASE_URL='postgresql://postgres:fixture-only@127.0.0.1:55444/chapter_tree_test'
npx jest chapters/chapter-tree.integration.spec.ts --runInBand
```

Integration tự tạo/xóa schema UUID riêng từ schema Prisma bằng config offline,
không đọc `.env`, không áp migration lên database ứng dụng. Kiểm tra cây 1.000
cấp, phân trang/quyền qua Nest HTTP, cấu hình đề, runtime/PDF, nhánh chồng lấn,
chuyển chương đồng thời, vòng lặp, chương xóa mềm và xóa cả nhánh. PDF chỉ giả
lập bước render Puppeteer; truy vấn/chọn câu chạy thật trên PostgreSQL.

Tại frontend: `node scripts/check-chapter-tree.cjs` kiểm tra đường dẫn cây 5.000
cấp, import, phát hiện vòng lặp và số mục render trong bộ chọn. Đây là kiểm tra
logic và server rendering, chưa phải kiểm thử thao tác người dùng trong browser.

Không có cấu trúc lưu trữ vô hạn về tài nguyên: cây rất lớn vẫn bị chi phối bởi
RAM, thời gian truy vấn và kích thước ngân hàng. Chưa benchmark tải lớn; CTE và
phân bổ hiện đọc tập ứng viên đầy đủ, còn UI sửa đề vẫn tải câu hỏi theo chương.

