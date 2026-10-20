# Báo cáo hiện trạng dự án MiniShop

**Ngày lập:** 17/10/2026
**Phạm vi:** Phân tích tĩnh mã nguồn và cấu hình có trong workspace
**Trạng thái:** Chỉ phân tích; chưa chỉnh sửa code, chưa chạy migration, chưa kết nối hoặc thay đổi database.

## 1. Tóm tắt

MiniShop hiện có giao diện React + Vite, API Node.js + Express, truy cập MySQL qua `mysql2`, cùng cấu hình Docker Compose cho MySQL, phpMyAdmin và backend. Các chức năng sản phẩm, giỏ hàng và tạo đơn hàng đã có trong mã nguồn.

Các chức năng Customer Authentication, session cookie, hồ sơ/lịch sử đơn hàng, phân quyền customer/admin và Admin Dashboard **chưa được triển khai trong source đã kiểm tra**. File `database/migrations/001_auth.sql` đã được tạo để bổ sung bảng users, sessions và liên kết orders với users, nhưng chưa xác minh migration đã chạy trên MySQL thực tế hay chưa. Không được xem sự tồn tại của file migration là bằng chứng schema production đã thay đổi.

## 2. Kiến trúc hiện tại

### Backend

Backend sử dụng Express và phân lớp theo hướng:

```text
routes → controllers → services → repositories → MySQL
```

- `backend/src/server.js`: khởi tạo Express, Helmet, giới hạn JSON, health endpoint và đăng ký route sản phẩm/đơn hàng.
- `backend/src/config/database.js`: tạo MySQL connection pool.
- `backend/src/routes/`, `controllers/`, `services/`, `repositories/`: xử lý API sản phẩm và đơn hàng.
- API sản phẩm hiện hỗ trợ đọc danh sách và chi tiết; chưa thấy API ghi dữ liệu sản phẩm.
- API đơn hàng hiện tạo đơn qua `POST /api/orders`; chưa thấy xác thực, lịch sử đơn hoặc endpoint quản trị đơn.
- Tạo đơn hàng đã dùng transaction, khóa sản phẩm bằng `FOR UPDATE`, kiểm tra tồn kho và trừ kho trong transaction.
- `backend/package.json` có script `start`; chưa thấy script test. Dependencies hiện có Express, Helmet và MySQL2.

### Frontend

- React + Vite; API client dùng đường dẫn cùng origin `/api` trong `frontend/src/services/api.js`.
- Điều hướng trang hiện được quản lý bằng state trong `frontend/src/App.jsx`; chưa thấy router riêng.
- Giỏ hàng được lưu trong `localStorage` qua `frontend/src/context/CartContext.jsx`.
- Checkout hiện nhận tên và số điện thoại; frontend gửi dữ liệu tạo đơn qua API.
- Chưa thấy trang hoặc trạng thái đăng nhập, đăng ký, hồ sơ, lịch sử đơn hay dashboard quản trị.
- `frontend/package.json` có script build và lint, chưa thấy script test.

### Docker Compose

`compose.yaml` khai báo:

- MySQL 8.4 với named volume `mysql_data`; không publish cổng MySQL ra host.
- phpMyAdmin bind vào loopback host.
- Backend bind vào loopback host và dùng chung `db_network` với MySQL.
- MySQL healthcheck và điều kiện backend chờ MySQL healthy.

Compose mount `database/init.sql` vào thư mục khởi tạo ban đầu của MySQL; không thấy cơ chế tự động chạy các file trong `database/migrations/`. README mô tả Nginx, monitoring và logging là thành phần dự kiến, nhưng không thấy cấu hình tương ứng trong workspace được kiểm tra. Đường đi frontend/API trong môi trường triển khai thực tế chưa được xác minh.

## 3. Database và migration auth

### Schema khởi tạo

`database/init.sql` định nghĩa các bảng `products`, `orders` và `order_items`. Đơn hàng hiện lưu tên khách hàng, số điện thoại, tổng tiền, trạng thái và thời gian tạo. Schema này chưa có bảng user/session và chưa có `orders.user_id`.

Init script của MySQL thông thường chỉ được thực thi khi khởi tạo data directory lần đầu. Thay đổi file này không đồng nghĩa với việc schema của volume đang có dữ liệu sẽ tự cập nhật.

### Migration `001_auth.sql`

Migration dự kiến:

- Tạo bảng `users` với email duy nhất, `password_hash`, role `customer/admin`, trạng thái hoạt động và thời điểm tạo.
- Tạo bảng `sessions` với `token_hash`, hạn dùng, khóa ngoại đến users và các index cần thiết.
- Thêm `orders.user_id` nullable cùng khóa ngoại `ON DELETE SET NULL`.

Đây là thay đổi bổ sung có thể giữ nguyên đơn cũ dưới dạng `user_id = NULL`. Đơn cũ sẽ không tự động được gắn vào tài khoản mới; không nên tự liên kết chỉ bằng số điện thoại nếu chưa xác minh danh tính.

Migration hiện không có `IF NOT EXISTS`. Nếu chỉ chạy được một phần, lần chạy lại có thể lỗi do đối tượng đã tồn tại. Trước khi áp dụng cần kiểm kê schema thực tế, backup đã kiểm chứng và có phương án xử lý migration dở dang. Chưa xác minh migration đã được áp dụng trong môi trường thực tế hay chưa.

## 4. Đánh giá khả năng mở rộng

| Hạng mục | Hiện trạng và đánh giá |
|---|---|
| Customer Register / Login / Logout | Chưa có API hoặc UI. Có thể bổ sung theo cấu trúc backend hiện tại. |
| Session bằng HttpOnly Cookie | Bảng `sessions` là nền tảng lưu session, nhưng chưa có logic phát hành, xác thực, hết hạn hoặc thu hồi session. |
| Customer Profile | Chưa có. Có thể xây dựng từ `users`, sau khi xác định trường hồ sơ được phép sửa. |
| Order History | Chưa có. Có thể truy vấn theo `orders.user_id`; mọi truy vấn phải lấy user từ session phía server. |
| RBAC customer/admin | Schema migration có role; chưa có middleware hoặc endpoint phân quyền. Kiểm soát ở frontend không thay thế kiểm soát backend. |
| Admin quản lý sản phẩm | Hiện chỉ có API đọc sản phẩm; cần endpoint ghi và kiểm tra quyền admin. |
| Admin quản lý đơn hàng | Chưa thấy API danh sách/cập nhật đơn; cần định nghĩa trạng thái và chuyển trạng thái hợp lệ. |

Không cần viết lại toàn bộ kiến trúc. Có thể mở rộng các lớp route/controller/service/repository hiện có và tích hợp dần vào frontend hiện tại.

## 5. Vấn đề và nguy cơ cần xử lý

1. **Không tin role từ client:** đăng ký công khai phải luôn gán `customer` ở server; không nhận role admin trong request đăng ký. Cần quy trình riêng, đáng tin cậy để tạo admin đầu tiên.
2. **Bảo vệ tài khoản:** cần hash mật khẩu bằng thuật toán chuyên dụng, chống brute force và tránh phản hồi login làm lộ tài khoản tồn tại hay không.
3. **Bảo vệ session cookie:** cần cân nhắc `HttpOnly`, `Secure` trong HTTPS, `SameSite`, thời hạn, thu hồi session và giới hạn `trust proxy` theo proxy thực sự tin cậy.
4. **CSRF:** cookie tự được trình duyệt gửi kèm request; `HttpOnly` không tự ngăn CSRF. Các endpoint thay đổi dữ liệu cần cơ chế kiểm tra nguồn gốc và/hoặc CSRF token phù hợp.
5. **Quyền sở hữu đơn:** API lịch sử phải lọc theo user xác thực phía server, không dùng `user_id` do client gửi. Không tự gắn đơn guest cũ vào user mới.
6. **Guest checkout:** cần quyết định có tiếp tục cho phép đặt hàng không đăng nhập hay không; backend hiện đang hỗ trợ luồng tạo đơn không có user.
7. **Tồn kho và transaction:** endpoint chỉnh tồn kho phải tương thích với transaction tạo đơn hiện tại, kiểm tra đầu vào và tránh tồn kho âm khi có request đồng thời.
8. **Xóa sản phẩm:** `order_items.product_id` tham chiếu `products` và không khai báo `ON DELETE`. Xóa cứng sản phẩm đã có đơn có thể không phù hợp; nên cân nhắc ẩn/ngừng bán để giữ lịch sử đơn.
9. **Trạng thái đơn hàng:** `orders.status` đang là `VARCHAR(30)`, chưa thấy quy tắc chuyển trạng thái. Cần thống nhất trước khi triển khai API quản trị.
10. **Điều hướng frontend:** điều hướng hiện dựa trên state, nên deep link, reload và nút back cho các trang mới cần được xem xét. Có thể mở rộng theo từng bước, không bắt buộc thay toàn bộ frontend.
11. **Triển khai cookie:** chưa xác minh TLS, reverse proxy và cách frontend được phục vụ. Những thông tin này ảnh hưởng cấu hình cookie `Secure`, CORS/origin và forwarded headers.

## 6. File dự kiến cần thêm hoặc chỉnh sửa

Danh sách dưới đây là dự kiến; cần điều chỉnh sau khi chốt API, chính sách nghiệp vụ và môi trường triển khai.

### Backend

**Có thể thêm:**

- Các route/controller/service/repository cho auth.
- Middleware xác thực session và kiểm tra role.
- Route/service/repository cho hồ sơ và lịch sử đơn nếu tách riêng.
- Test cho auth, session, phân quyền, quyền sở hữu đơn và API quản trị.

**Có thể chỉnh:**

- `backend/src/server.js`: đăng ký route và middleware.
- `backend/src/config/database.js`: chỉ khi cần cấu hình pool/timeout phù hợp.
- Các file route/controller/service/repository sản phẩm và đơn để bổ sung thao tác admin, liên kết user và truy vấn lịch sử.
- `backend/package.json` và lockfile nếu sau khi chốt thiết kế cần thêm dependency.

### Frontend

**Có thể thêm:** trang/component đăng ký, đăng nhập, hồ sơ/lịch sử đơn và dashboard quản trị.

**Có thể chỉnh:**

- `frontend/src/services/api.js`: thêm hàm gọi auth, profile, order history và admin API; cấu hình gửi cookie phù hợp.
- `frontend/src/App.jsx`: khôi phục trạng thái đăng nhập, điều hướng và hiển thị trang.
- `frontend/src/App.css` hoặc stylesheet liên quan nếu cần bổ sung UI; không đổi thiết kế nếu chưa được duyệt.
- `frontend/package.json` chỉ khi quyết định bổ sung router hoặc thư viện khác.

### Database, triển khai và tài liệu

- Giữ migration 001 nếu chưa áp dụng; nếu schema đã áp dụng thì thay đổi tiếp theo nên nằm trong migration mới thay vì sửa lịch sử migration.
- Có thể bổ sung migration tiếp theo sau khi kiểm kê schema thực tế.
- `compose.yaml` chỉ cần điều chỉnh nếu đã xác định cấu hình runtime/proxy cần thiết; không ghi bí mật trực tiếp vào file.
- `README.md` cần cập nhật quy trình migration, backup/restore, tạo admin và triển khai cookie/TLS sau khi tính năng được duyệt.

## 7. Lộ trình triển khai và kiểm thử đề xuất

| Giai đoạn | Phạm vi | Kiểm thử trước khi sang bước tiếp |
|---|---|---|
| 1. Kiểm kê và chốt chính sách | Xác minh schema/migration, backup-restore, TLS/proxy, email, tạo admin, guest checkout, liên kết đơn cũ. | Xác nhận bản backup có thể restore ở môi trường thử nghiệm; lập kế hoạch migration và phục hồi. |
| 2. Auth backend | Register/login/logout/me, hash mật khẩu, session cookie, CSRF và giới hạn login; role customer được gán ở server. | Register hợp lệ/trùng email; sai mật khẩu; cookie flags; session hết hạn/logout/revoke; CSRF; rate limit; user inactive. |
| 3. Frontend auth | Form đăng ký/đăng nhập, khôi phục session khi tải lại, đăng xuất và xử lý lỗi. | Đăng nhập/đăng xuất, reload, session hết hạn, gửi cookie đúng origin; kiểm tra giỏ guest không mất ngoài chính sách đã chốt. |
| 4. Order ownership và history | Gắn user xác thực vào đơn mới; giữ guest flow nếu được yêu cầu; API lịch sử theo user. | Customer A không đọc đơn B; không tin `user_id` từ request; guest checkout; đơn cũ vẫn tồn tại và không bị gắn nhầm. |
| 5. RBAC và admin API | Middleware quyền; API quản lý sản phẩm, tồn kho, đơn và chuyển trạng thái. | Guest/customer bị từ chối admin API; admin thao tác hợp lệ; input không hợp lệ bị chặn; cạnh tranh tồn kho không tạo số âm; kiểm tra hành vi xóa sản phẩm có lịch sử. |
| 6. Admin UI và tích hợp | Dashboard tiêu thụ API được bảo vệ; tích hợp điều hướng. | Luồng admin end-to-end; API từ chối khi session hết hạn/role không đủ; lint/build và test. |
| 7. Triển khai có kiểm soát | Chỉ áp dụng migration sau phê duyệt, backup/restore và kế hoạch phục hồi. | Kiểm tra schema sau migration, dữ liệu đơn cũ, health/API, cookie qua TLS và quyền truy cập sau triển khai. |

## 8. Thông tin chưa xác minh

- Migration 001 đã chạy trên MySQL thực tế hay chưa.
- Schema, collation, phiên bản migration và dữ liệu hiện tại của database production.
- TLS, domain, reverse proxy và cách frontend/API được phục vụ ở Ubuntu Server.
- Chính sách tạo admin đầu tiên, xác minh email và khôi phục mật khẩu.
- Có tiếp tục guest checkout hay không.
- Có cần xử lý liên kết đơn cũ vào tài khoản hay không; mặc định an toàn là không tự liên kết.
- Quy tắc trạng thái đơn hàng và hành vi xóa/ẩn sản phẩm.

Các điểm trên cần được xác minh trước khi thiết kế migration và cấu hình cookie production. Báo cáo này không khẳng định trạng thái triển khai thực tế ngoài những gì đọc được từ source/config trong workspace.
