# Báo cáo kiểm thử import Excel/Word

## A. Import Coverage

Đã kiểm tra parser, HTTP API/controller/service, PostgreSQL thật và giao diện production build trong môi trường dùng riêng cho kiểm thử. Không ghi vào dữ liệu người dùng hoặc khởi động lại stack đang dùng.

| Import type | Fixture cases | Passed | Failed | Not Tested / Not Supported |
| --- | ---: | ---: | ---: | --- |
| Excel Questions | 15 file mới | 15 | 0 | JWT/S3/Redis thật: Not Tested |
| Word Questions | 16 file mới | 16 | 0 | `missing-code.docx`: parser đã kiểm tra, API/browser riêng cho file này: Not Tested |
| Excel Exams | 0 | 0 | 0 | Not Supported: không có template/flow import định nghĩa đề thi |
| Word Exams | 0 | 0 | 0 | Not Supported: không có template/flow import định nghĩa đề thi |

Đây là số file trong ma trận fixture, không phải tổng số test tự động. File cố ý sai được tính Passed khi bị từ chối/giữ invalid đúng hợp đồng, không phải khi import thành công.

Tổng chạy cuối: **91/91 tests, 5 suites, 0 failed, 0 skipped**: 29 accuracy + 2 official-template parser tests, 49 PostgreSQL integration tests, 3 commit unit tests và 8 chapter-path tests. Browser có **3 nhóm kịch bản pass**, không cộng vào 91 tests. Hai template chính thức được kiểm tra bổ sung, không nằm trong 31 file mới.

Backend hỗ trợ `exam_id` để gắn câu hỏi vào **đề MANUAL đã tồn tại**; luồng này đã được kiểm thử integration qua exam service/repository và transaction thật. Đây không phải import metadata/cấu trúc một đề thi mới. Đề không phải MANUAL bị từ chối trước khi tạo staging import.

Điều kiện icon trước đó đã được đối chiếu trong phạm vi đã giao: các commit `609dd24`, `0745c64`, `59ceee7` và component liên quan. Không tuyên bố đã chuyển mọi button toàn ứng dụng thành icon. Import workspace tiếp tục dùng utility tooltip/icon hiện có, không sửa utility dùng chung.

## B. Extraction Accuracy

Nguồn kỳ vọng: [import-expected.json](../parsers/fixtures/import-expected.json), được viết độc lập với parser. [Builder](../parsers/fixtures/generate-import-fixtures.cjs) điền dữ liệu đó vào bản sao template chính thức, không lấy kết quả parser làm expected.

Trong bảng, mỗi tên `{xlsx,docx}` đại diện **hai file riêng**, có kết quả như nhau. “Khớp” so sánh sau chuẩn hóa được hỗ trợ: trim đầu/cuối, uppercase enum/key, rich text thành plain text; không được mất xuống dòng nội bộ, thứ tự option hay cờ đáp án. “Đáp án” đếm theo câu hỏi, gồm cả model answer của tự luận.

| File trong [fixtures](../parsers/fixtures/) | Đầu vào | Trích xuất | Câu khớp hoàn toàn đã xác minh | Đáp án khớp | Sai lệch / hành vi cuối | Kết quả |
| --- | ---: | ---: | --- | --- | --- | --- |
| `mixed.{xlsx,docx}` | 3 | 3 | 3/3 | 3/3 | Không lệch; Unicode, LaTeX, nhiều dòng, key A/C, ảnh | Pass |
| `single.{xlsx,docx}` | 1 | 1 | 1/1 | 1/1 | Không lệch | Pass |
| `long-rich.{xlsx,docx}` | 3 | 3 | 3/3 | 3/3 | Giữ đủ văn bản dài; bold/italic trở thành plain text theo hợp đồng | Pass |
| `blank-row.{xlsx,docx}` | 3 | 3 | 3/3 | 3/3 | Bỏ dòng/đoạn trống; Excel giữ source index 2,4,5 | Pass |
| `duplicate-questions.{xlsx,docx}` | 4 | 4 | 4/4 | 4/4 | Parser giữ câu lặp; commit SKIP lưu 3 câu duy nhất | Pass |
| `multiple-images.{xlsx,docx}` | 3 | 3 | 3/3 | 3/3 | Giữ 2 ảnh/câu đầu; fixture dùng hai bản ảnh giống nhau, chưa chứng minh thứ tự hai ảnh khác nội dung | Pass trong phạm vi này |
| `unknown-answer.{xlsx,docx}` | 3 | 3 | 2 câu hợp lệ/2; không chứng nhận exact-match câu lỗi | 2 câu hợp lệ/2 | `C,Z` bị đánh dấu lỗi, không âm thầm chấp nhận chỉ C | Pass |
| `missing-answer-option.{xlsx,docx}` | 3 | 3 | 2 câu hợp lệ/2; không chứng nhận exact-match câu lỗi | 2 câu hợp lệ/2 | `A,B` với B rỗng bị chặn, không âm thầm giữ chỉ A | Pass |
| `no-answer.{xlsx,docx}` | 3 | 3 | 3/3 theo dữ liệu malformed | 2 hợp lệ; câu đầu đúng là không có đáp án | Service đánh invalid câu đầu; không tạo đáp án thay thế | Pass |
| `invalid-type.{xlsx,docx}` | 3 | 3 | 3/3 theo dữ liệu malformed | 3/3 | Giữ TRUE_FALSE để service từ chối, không ép về loại hợp lệ | Pass |
| `incomplete-row.{xlsx,docx}` | 4 | 4 | 3 câu đầy đủ/3; record cuối kiểm tra các trường code/text/type | 3 hợp lệ; record thiếu không có đáp án | Record chỉ có code vẫn xuất hiện invalid; không mất hàng | Pass |
| `missing-header.{xlsx,docx}` | 3 | Không trả kết quả | N/A | N/A | Reject cả file; API FAILED, không ghi ngân hàng | Pass |
| `duplicate-field.{xlsx,docx}` | 3 | Không trả kết quả | N/A | N/A | Reject field/header nhập nhằng, không ghi đè dữ liệu | Pass |
| `missing-code.docx` | 3 | Không trả kết quả | N/A | N/A | Parser reject bảng câu hỏi thiếu code thay vì trả riêng 2 bảng còn lại | Pass parser; API riêng Not Tested |
| `empty.{xlsx,docx}` | 0 | 0 | N/A | N/A | Processing FAILED trước mọi bank write | Pass |
| `corrupt.{xlsx,docx}` | 0 hợp lệ | Không trả kết quả | N/A | N/A | Reject bytes không phải Office dù tên có đuôi hợp lệ | Pass |

Hai template cũ có 3 câu/file, trích xuất 3/file và pass các assertion sẵn có về loại câu, chapter, đáp án và ảnh. Không tuyên bố bộ assertion cũ so sánh toàn bộ mọi trường của template.

Với dữ liệu hợp lệ, integration so sánh persisted question text, options đúng thứ tự/cờ đúng, essay answer, chapter path, ảnh và HTTP read-back. Parser giữ bytes ảnh; service chủ động chuẩn hóa thành PNG giới hạn kích thước nên không yêu cầu bytes lưu trữ giống ảnh Office gốc.

## C. Bugs Found & Fixed

| Lỗi / nguyên nhân gốc | Sửa tại | Regression và retest |
| --- | --- | --- |
| Word ghép paragraph trong cell làm mất xuống dòng | [DOCX parser](../parsers/docx-question-import.parser.ts): tách và nối paragraph có newline | Mixed/long-rich so sánh exact text, option và essay; parser/API pass |
| Key đáp án không tồn tại/rỗng bị bỏ qua, còn lại đáp án hợp lệ nhưng sai ý người nhập | [import-options](../parsers/import-options.ts), hai parser và [types](../question-import.types.ts): ghi parserErrors blocking | unknown-answer/missing-answer-option, API từ chối chọn dòng lỗi; sửa review có chủ đích rồi lưu đúng: pass |
| Excel thiếu dữ liệu bị lọc mất; Word thiếu code bị coi là bảng hướng dẫn | [XLSX parser](../parsers/xlsx-question-import.parser.ts), DOCX parser: chỉ bỏ record hoàn toàn rỗng; nhận diện field câu hỏi khi thiếu code; vẫn bỏ bảng hướng dẫn chính thức | incomplete-row cả hai định dạng + missing-code Word + hai template gốc: pass |
| Header/field trùng có thể ghi đè giá trị âm thầm | Hai parser kiểm tra thiếu/trùng field trước khi ánh xạ | missing-header/duplicate-field bị reject, không ghi bank: pass |
| `item_ids: []` bị hiểu như không truyền lựa chọn và import tất cả | [DTO](../dto/commit-question-import.dto.ts), [service](../question-import.service.ts): reject explicit empty; giữ hành vi cũ khi omitted | Empty/invalid/missing selection, valid-only commit: pass |
| Rollback gặp lỗi dọn object làm import mắc COMMITTING và che lỗi DB ban đầu | Service phục hồi trạng thái retryable ngay cả khi cleanup thất bại, giữ lỗi gốc | Gây lỗi constraint PostgreSQL thật; kiểm tra rollback và retry với/không cleanup outage: pass |
| Review fetch lỗi trông như danh sách trống; có nguy cơ thao tác chồng hoặc retry commit khi response mất | Frontend `QuestionImportWorkspace.tsx`: trạng thái loading/error/retry, busyRef lock, đọc lại trạng thái sau response mơ hồ | Browser inject review503 rồi retry; mất response của commit đã thành công nhưng chỉ có 1 commit, DB không lặp: pass |
| Thêm option theo độ dài dễ trùng key khi có A/C; input một dòng gây khó sửa dữ liệu nhiều dòng | Workspace chọn key A–F chưa dùng, textarea, khóa fieldset khi lưu | Browser thêm B vào A/C, lưu/mở lại nhiều dòng, kiểm tra DB options: pass |
| Icon/selection thiếu thông tin truy cập nhất quán | Workspace dùng tooltip/aria hiện có và bản dịch VI/EN | VI tooltip, EN Edit/Delete, disabled keyboard focus, invalid row không chọn được, cancel không ghi DB: pass |

Nguồn regression: [accuracy spec](../parsers/question-import.accuracy.spec.ts), [integration spec](../question-import.integration.spec.ts), [browser smoke](browser-import.smoke.cjs).

## D. Modified Files

Backend production:
- `parsers/docx-question-import.parser.ts`, `parsers/xlsx-question-import.parser.ts`.
- Mới: `parsers/import-options.ts`.
- `question-import.types.ts`, `question-import.service.ts`, `dto/commit-question-import.dto.ts`.

Frontend production, trong repo `testhub-v2`:
- `src/components/question-import/QuestionImportWorkspace.tsx`.
- `src/messages/vi/shared/questionImport.json`, `src/messages/en/shared/questionImport.json` (6 label mới; 119 key hai locale tương ứng).
- `README.md`: hành vi import và phạm vi hỗ trợ. Giữ nguyên các thay đổi monitoring đã có trước nhiệm vụ này.

Tests/artifacts:
- Mới: `parsers/question-import.accuracy.spec.ts`, `question-import.integration.spec.ts`.
- Mới: `testing/import-api.harness.ts`, `testing/serve-import-fixture.ts`, `testing/browser-import.smoke.cjs` và tài liệu chạy test.
- Mới: 31 binary trong bảng B, `parsers/fixtures/import-expected.json`, `generate-import-fixtures.cjs`, fixture README.
- Cập nhật continuity nội bộ ở hai repo. Không thêm dependency, migration hoặc commit.

**Không đổi template chính thức.** Hash download từ ứng dụng đang chạy khớp frontend published assets và backend fixtures:
- XLSX SHA-256: `1DAF32B5EEB71CCADE66A2FFC6FE4135A034F276B6166EE7750F63AC4261C8CB`.
- DOCX SHA-256: `E85883868279A1EE228FB21D841D8EA556D1087E56474B052783F368ADB509DB`.

## E. Validation Results

Chạy từ backend:

```powershell
$env:TESTHUB_IMPORT_INTEGRATION = '1'
node node_modules\jest\bin\jest.js src\question-imports --runInBand --silent
```

Kết quả cuối: **91 passed, 5 suites passed**. Nếu không bật cờ integration, PostgreSQL suite bị skip; kết quả đó không thay cho lần chạy đầy đủ.

```powershell
node node_modules\typescript\bin\tsc --noEmit --incremental false
node --check src\question-imports\testing\browser-import.smoke.cjs
```

Typecheck cả hai repo pass. ESLint các TS source/test thay đổi pass. `.cjs` không thuộc TypeScript project nên runner được lint riêng bằng ESLint recommended JavaScript + Node/browser globals: pass. Prettier chạy cho runner và accuracy spec. `git diff --check` cả hai repo pass. Editor không báo lỗi import workspace.

Browser, sau khi chuẩn bị harness và frontend riêng như [README](README.md):

```powershell
$env:IMPORT_TEST_FRONTEND = 'http://127.0.0.1:<isolated frontend port>'
$env:IMPORT_TEST_API = 'http://127.0.0.1:<isolated API port>'
$env:IMPORT_TEST_SECRET = '<same synthetic build-only secret>'
node src\question-imports\testing\browser-import.smoke.cjs
```

Ba nhóm pass:
1. XLSX upload thật, review lỗi/retry, thêm option B, sửa multiline, khóa commit khi sửa, phục hồi lost-response, kiểm tra PostgreSQL.
2. DOCX upload/review/commit, SKIP câu trùng, tooltip tiếng Việt, không overflow ngang ở 1440/1024/768/375.
3. Word sai đáp án bị loại khỏi selection, tooltip EN/disabled keyboard focus, hủy không thêm câu.

Không có uncaught `pageerror`. Auth identity được thay bằng synthetic lecturer; business API/parsers/Prisma/PG thật. Storage và queue là adapter in-memory/synchronous. Socket.IO nằm ngoài harness, không lấy handshake warning của môi trường này làm lỗi sản phẩm. Browser tích hợp gặp lỗi transport CDP/forward PATCH nên chuyển sang Puppeteer đã cài sẵn để hoàn tất kiểm thử; không cài công cụ mới.

`npm run build` frontend và backend pass trong snapshot source riêng; frontend snapshot có PostCSS config thật. Không ghi đè `.next`/`dist` của dịch vụ đang chạy. Toàn bộ frontend ESLint: **27 errors / 26 warnings sẵn có ngoài import scope**, không tuyên bố full lint pass.

Cleanup: API shutdown trả 202, runner exit0; container có tên duy nhất đã biến mất; port52845/53845 không còn listener. Dừng frontend riêng, xóa snapshot sau khi unlink junction `node_modules`; dependency gốc còn nguyên. Chromium test đã đóng. Browser tích hợp cũ không còn truy cập được qua page ID nên không xác minh được reload cleanup cuối của tab đó. Không tắt dịch vụ chung hoặc máy tính.

## F. Remaining Issues

| Mục | Trạng thái / lý do | Ảnh hưởng |
| --- | --- | --- |
| Import định nghĩa đề thi Excel/Word | Not Supported: chưa có template/UI/contract | Không thể chứng nhận nhập metadata, sections, điểm hoặc cả đề mới |
| JWT/session thật, S3 presigned authorization, Redis worker/retry | Not Tested: cố ý không dùng credential hoặc shared infrastructure | Cần staging riêng để chứng nhận triển khai end-to-end đầy đủ |
| Office visual rendering và formula recalculation | Not Tested: không có Word/LibreOffice renderer; fixture không chứa công thức tính | Không chứng nhận fidelity khi mở bằng Office; không suy diễn hỗ trợ công thức |
| Thứ tự nhiều ảnh khác nội dung | Not Tested: fixture hai ảnh dùng bản sao giống nhau | Đã chứng minh số lượng/bytes/index, chưa phân biệt được hoán đổi hai ảnh khác nhau |
| Cleanup storage outage | Đã test rollback/retry; có thể còn orphan object khi storage cleanup thật thất bại | Cần vận hành cleanup/reconciliation riêng; không còn mắc COMMITTING vì lỗi này |
| Full frontend lint | 27 errors / 26 warnings ngoài thay đổi hiện tại | Full lint vẫn đỏ; giữ ngoài phạm vi, không sửa lan man |
| Full backend suite / load test / browser khác Chromium | Not Tested; chạy scope import và build/typecheck | Không suy rộng kết quả sang mọi module hoặc tải đồng thời lớn |

Không còn test thất bại trong phạm vi import đã chạy. Kết quả xác nhận các luồng và dữ liệu được kiểm thử, không phải chứng nhận mọi file Office tùy ý hay toàn bộ hạ tầng production.
