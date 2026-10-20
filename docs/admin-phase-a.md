# MiniShop Admin — Giai đoạn A: Backend

Chỉ triển khai mã nguồn cục bộ. Chưa xây dựng giao diện Admin (Giai đoạn B), chưa triển khai Ubuntu, chạy migration, tạo Admin hoặc thao tác database thật (Giai đoạn C). Không thay đổi Authentication hiện có, .env, dependencies hay Git/GitHub.

## Quy tắc đã chốt

State machine:

- pending → confirmed hoặc cancelled.
- confirmed → shipping hoặc cancelled.
- shipping → completed.
- completed/cancelled là trạng thái cuối, không cho chuyển ngược.
- Các trạng thái cũ ngoài danh sách (ví dụ processing nếu có trong dữ liệu thật) được hiển thị nguyên trạng, không tự ánh xạ/chuyển đổi.

Theo lựa chọn B của chủ dự án: hủy đơn pending/confirmed hoàn kho trong cùng transaction cập nhật trạng thái. Khóa đơn bằng SELECT FOR UPDATE, đọc items, gom số lượng theo sản phẩm, khóa sản phẩm theo id tăng dần (cùng thứ tự Checkout), cộng kho có kiểm tra giới hạn INT, rồi cập nhật trạng thái. Lỗi ở bất kỳ bước nào rollback cả kho lẫn trạng thái. Sản phẩm đã ẩn cũng được hoàn kho nhưng vẫn giữ ẩn. Không thực hiện hoàn tiền hoặc xác nhận thanh toán.

PATCH trạng thái yêu cầu expectedStatus để từ chối cập nhật từ màn hình đã cũ (409). Nếu trạng thái hiện tại đã trùng trạng thái đích, trả changed=false, restocked=false, không ghi hoặc hoàn kho lần nữa. Điều này cho phép retry sau lỗi mạng. Đơn đã cancelled từ trước phiên bản này cũng không bị tự động hoàn kho lại; không suy đoán lịch sử xử lý kho của dữ liệu cũ.

Sửa tồn kho tuyệt đối yêu cầu expectedStock bằng số tồn kho Admin đã đọc. Repository khóa sản phẩm rồi so sánh với kho hiện tại; nếu Checkout/hoàn kho đã thay đổi kho, trả 409 thay vì ghi đè. Lượng tồn kho chỉ nhận số nguyên 0..2147483647. Giá chỉ nhận VND nguyên 0..9999999999 để tương thích DECIMAL(12,2) và cách tính tiền hiện tại.

## API contract

Namespace /api/admin. Mọi route dùng createSessionGuard hiện có rồi requireAdmin. Guest/phiên sai/hết hạn: 401; Customer: 403; không tin role/user_id do client gửi. Kiểm tra quyền trước truy vấn quản trị. Mọi response Admin có Cache-Control: no-store. POST/PATCH qua Origin Guard hiện có, không nới allowlist.

Thành công: `{ success: true, data: ... }`. Lỗi: `{ success: false, message: ... }`; không trả SQL/stack. ID là số nguyên dương <=2147483647. Phân trang `page` mặc định 1, tối đa 10000; `limit` mặc định 20, tối đa 50. Danh sách trả `data.rows`, `data.pagination` (page, limit, total, totalPages). Trường lạ và giá trị lọc không hợp lệ trả 400.

| Method/endpoint | Request | data |
| --- | --- | --- |
| GET /dashboard | Không có bộ lọc | counts, lowStockThreshold, byStatus, series, seriesTimeBasis, recentOrders, lowStockProducts |
| GET /products | search, page, limit, status=all/active/inactive, sort=newest/name_asc/price_asc/price_desc/stock_asc, lowStock=true/false | rows, pagination |
| GET /products/:id | ID | product |
| POST /products | name, price, stock bắt buộc; description/image_url/is_active tùy chọn | product (HTTP 201) |
| PATCH /products/:id | Các trường sản phẩm thay đổi; nếu có stock phải kèm expectedStock | product |
| GET /orders | search, page, limit, status=all/pending/confirmed/shipping/completed/cancelled | rows, pagination |
| GET /orders/:id | ID | order gồm items, allowedTransitions |
| PATCH /orders/:id/status | status, expectedStatus | order, changed, restocked |
| GET /customers | search, page, limit | rows, pagination |

Trường sản phẩm: id, name, description, price, stock, image_url, is_active. name 1–150 ký tự; description null hoặc tối đa 10000 ký tự. image_url null hoặc URL HTTP(S) <=500 ký tự, không nhúng username/password; server không fetch ảnh. is_active nhận JSON boolean. Không có xóa cứng sản phẩm.

Đơn có id, user_id nullable, customer_name, customer_phone, total_amount, status, created_at. Items trả product_id, product_name, image_url, quantity, unit_price, line_total; tên/ảnh lấy từ catalog hiện tại, đơn giá/tổng tiền lấy từ dữ liệu đơn, không định giá lại đơn cũ. Tìm đơn theo mã, tên hoặc điện thoại.

Customer list chỉ lấy users.role='customer': id, full_name, email, created_at, is_active, order_count. Không trả password_hash, session token/token_hash, không có sửa quyền/reset mật khẩu/xóa tài khoản qua Admin API.

Search Admin coi %, _ và ! là ký tự literal, bind SQL parameters. Sort/column cập nhật chỉ lấy từ allowlist; không ghép trực tiếp input client vào SQL.

## Dashboard

counts gồm totalOrders, pendingOrders, activeProducts, lowStockProducts. Cảnh báo stock<=5, gồm cả hết hàng, chỉ tính sản phẩm đang kinh doanh. recentOrders và lowStockProducts tối đa 10 dòng.

byStatus nhóm số đơn và tổng giá trị đơn theo trạng thái. series nhóm theo ngày/trạng thái trong 30 ngày lịch gần nhất, dùng múi giờ session database (seriesTimeBasis='database-session'). Không có field doanh thu đã thanh toán, không gộp pending vào completed. Tổng tiền DECIMAL giữ chuỗi MySQL; không làm tròn hay chuyển sang số float để cộng phía ứng dụng.

## Migration 002 và ảnh hưởng API cũ

File mới database/migrations/002_product_visibility.sql thêm products.is_active BOOLEAN NOT NULL DEFAULT TRUE và index (is_active,id). Không sửa 001_auth.sql, không thay init.sql, không tự chạy migration.

Sau migration, sản phẩm cũ mặc định hoạt động. API sản phẩm công khai giữ contract nhưng lọc sản phẩm ẩn ở cả list/count/detail; detail sản phẩm ẩn trả 404. Checkout vẫn giữ transaction, khóa kho và tính giá phía server; thêm kiểm tra is_active dưới khóa, trả 409 nếu sản phẩm đã ngừng kinh doanh dù còn trong giỏ cũ. Customer Account vẫn JOIN sản phẩm ẩn để giữ lịch sử đơn. Không thay Cart Context/Frontend.

QUAN TRỌNG: bản Backend này yêu cầu migration 002 đã áp dụng. Không triển khai đè Backend trước migration; không dùng fallback giả is_active nếu schema thiếu.

Kế hoạch cho Giai đoạn C (chưa thực hiện):
1. Phê duyệt riêng; xác nhận schema thực tế và migration nào đã áp dụng, kiểm tra trạng thái đơn cũ. Không chạy lại migration theo suy đoán.
2. Sao lưu mã/image và database đầy đủ vào nơi hạn chế quyền, xác nhận phương án restore. Dừng các request ghi trong cửa sổ bảo trì.
3. Áp dụng 002 đúng một lần; kiểm tra cột/index và sản phẩm hiện có vẫn active. MySQL DDL tự commit, không dựa vào ROLLBACK để hoàn tác DDL.
4. Deploy Backend mới; kiểm tra public products, Guest Checkout, Customer Account và phân quyền Admin trên môi trường đã được cho phép.
5. Nếu lỗi, revert image/code Backend trước. Cột/index bổ sung có thể giữ nguyên khi rollback code. Chỉ bỏ cột hoặc restore database khi được phê duyệt; không tự xóa dữ liệu, không down -v.

## Admin đầu tiên

Công cụ tách biệt backend/src/cli/create-first-admin.js, không gắn route công khai và không chạy khi server khởi động. Nằm trong src nên được Dockerfile hiện có copy vào image mà không sửa Dockerfile.

Chỉ sau phê duyệt Giai đoạn C, quản trị viên chạy trực tiếp trong terminal tương tác của Backend container với cấu hình database hiện có. Công cụ hỏi tên/email, câu xác nhận CREATE FIRST ADMIN, mật khẩu và nhập lại mật khẩu (không echo). Không nhận mật khẩu qua argv, pipe hoặc seed cố định. Hash Argon2id dùng password.service hiện tại, tối thiểu 12 ký tự/tối đa 1024 byte. Không sửa .env hoặc in credentials.

Repository dùng named lock GET_LOCK trên cùng connection để serialize bootstrap, rồi transaction kiểm tra đã có bất kỳ Admin nào chưa. Nếu có thì từ chối tạo thêm. Email trùng trả lỗi, không tự nâng quyền Customer. Tạo user mới role admin, không cấp session tự động; Admin đăng nhập qua Authentication hiện có. finally giải phóng lock/connection, rollback khi lỗi. Không bao giờ tạo Admin mẫu trong migration.

## File thay đổi ở Giai đoạn A

Sửa:
- backend/src/app.js: đăng ký Admin namespace, inject repository để test.
- backend/src/repositories/product.repository.js: lọc sản phẩm đang kinh doanh ở API công khai.
- backend/src/repositories/order.repository.js: kiểm tra sản phẩm bị ẩn trong Checkout transaction.
- backend/test/account.test.js: fixture có is_active và regression sản phẩm ẩn.

Tạo mới:
- backend/src/middleware/requireAdmin.js
- backend/src/services/adminRules.js
- backend/src/services/admin.service.js
- backend/src/repositories/admin.repository.js
- backend/src/controllers/admin.controller.js
- backend/src/routes/admin.routes.js
- backend/src/repositories/bootstrap.repository.js
- backend/src/services/bootstrap.service.js
- backend/src/cli/create-first-admin.js
- backend/test/admin.test.js
- database/migrations/002_product_visibility.sql
- docs/admin-phase-a.md

## Kết quả kiểm thử

- `npm test` tại backend: 49/49 đạt (26 bài mới so với 23 bài trước Admin).
- Node syntax checks: 14 file đạt.
- `npm run lint` tại frontend: đạt. Backend không có script lint riêng; không thêm dependency hoặc đổi package.json để tạo script.
- `npm run build` tại frontend: đạt.
- `node --test tests/accountApi.test.mjs` tại frontend: 7/7 đạt.

Kiểm tra gồm HTTP integration Express cục bộ, session/role boundaries, Origin, validation, public API contract, isolation Customer Account, SQL parameters, stock conflict, các cạnh state machine, cancel lặp/đồng thời, rollback sau hoàn kho một phần, giới hạn tồn kho, sản phẩm ẩn, bootstrap lock/duplicate/approval/password hashing. Dùng repositories/connections giả lập trong test; không có fallback dữ liệu giả trong production API.

Giới hạn: chưa chạy migration trên MySQL thật, chưa kiểm thử SQL/locking InnoDB hoặc deadlock trên database thực; mutex test chỉ mô phỏng serialization. Chưa chạy CLI bằng TTY thật hoặc tạo Admin thật. Chưa test UI Admin vì thuộc Giai đoạn B. Cần nghiệm thu các phần này ở Giai đoạn C sau phê duyệt.

DỪNG sau Giai đoạn A, chờ phê duyệt trước khi làm giao diện Admin hoặc deploy.
