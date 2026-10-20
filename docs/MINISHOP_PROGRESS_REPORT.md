# BÁO CÁO TIẾN ĐỘ THỰC TẾ DỰ ÁN MINISHOP

Ngày kiểm toán: **18/10/2026**. Phạm vi source: **D:\Ecommerce**. Đây là báo cáo kiểm toán, không phải biên bản nghiệm thu production.

> **Cập nhật sau kiểm toán, 18/10/2026:** người dùng đã triển khai Nginx/React production trên Ubuntu, cung cấp log Nginx healthy, API proxy 200/DB connected, security headers và phân tách mạng. Người dùng xác nhận Auth/Customer/Admin/Checkout và website sau phục hồi image hoạt động. Xem [biên bản Nginx](D:/Ecommerce/docs/nginx-deployment.md) để phân biệt output trực tiếp và xác nhận người dùng. Nội dung và phần trăm bên dưới giữ nguyên như ảnh chụp hiện trạng TRƯỚC triển khai Nginx; không sử dụng chúng làm tiến độ hiện tại. Chưa đánh giá lại toàn dự án hoặc xác nhận toàn bộ Admin transaction trên MySQL thật.

## 1. Tóm tắt tình trạng hiện tại

MiniShop đã có website Customer, Authentication, Customer Account, Backend Admin và Frontend Admin. **Giai đoạn B Admin đã được triển khai trong source**, không còn ở mức kế hoạch. Tuy nhiên, **chưa đủ bằng chứng để nghiệm thu Admin trên hệ thống thật**: lần bootstrap cuối người dùng cung cấp kết thúc bằng `Chua xac nhan bootstrap`; chưa có kết quả đăng nhập Admin thật và gọi API Admin thành công.

Kiểm tra lại trong lượt kiểm toán này: **Backend 49 PASS/0 FAIL; Frontend 16 PASS/0 FAIL; lint đạt; build production đạt**. Test Backend dùng Express trên loopback với repository/connection giả lập; test Frontend dùng fetch giả lập. Kết quả này không chứng minh transaction, khóa InnoDB hoặc toàn bộ UI hoạt động với MySQL thật.

Các yêu cầu môn học còn thiếu đáng kể trong repository: **Nginx reverse proxy, cấu hình HTTPS ở điểm truy cập website, Prometheus/Grafana/exporter, Loki/Promtail và minh chứng vận hành tổng thể**. Helmet ở Express đã có, nhưng không thay thế minh chứng website được phục vụ qua Nginx.

### Phương pháp và giới hạn bằng chứng

- Đọc source ứng dụng, middleware, controller, service, repository, SQL, Compose, Dockerfile, cấu hình frontend, test và tài liệu; rà soát cây file của dự án. Không đọc `.env`, nội dung database dump, khóa bí mật hoặc dependency vendored như mã ứng dụng.
- Chỉ chạy test cục bộ đã kiểm tra fixture, lint và build. Không SSH vào Ubuntu, không gọi API thật, không chạy Docker/migration/bootstrap hoặc truy vấn MySQL thật trong lượt này.
- Dùng log Ubuntu người dùng đã gửi trong cuộc trò chuyện làm **bằng chứng lịch sử**, không coi đó là kiểm tra trực tiếp ngày 18/10. Hiện trạng uptime, schema, tài khoản và dữ liệu trên Ubuntu **chưa được xác minh lại**.
- Không sửa source, `.env`, dependency hay Git. Build tạo lại `frontend/dist/` theo lệnh kiểm tra được yêu cầu; file báo cáo này là tài liệu được bổ sung.

Quy ước trạng thái dùng trong các bảng:

| Mã | Phân loại chính xác | Cách hiểu |
|---|---|---|
| TEST | **HOÀN THÀNH VÀ ĐÃ KIỂM THỬ** | Chỉ trong phạm vi kiểm tra được mô tả; không mặc nhiên là production. |
| CODE | **ĐÃ VIẾT CODE NHƯNG CHƯA KIỂM THỬ ĐẦY ĐỦ** | Có triển khai và có thể có test cục bộ, nhưng còn thiếu kiểm chứng quan trọng. |
| DOING | **ĐANG THỰC HIỆN** | Chuỗi triển khai/nghiệm thu đã bắt đầu nhưng chưa hoàn tất. |
| TODO | **CHƯA TRIỂN KHAI** | Không tìm thấy triển khai tương ứng trong source/config được kiểm tra. |
| UNKNOWN | **KHÔNG ĐỦ BẰNG CHỨNG ĐỂ XÁC NHẬN** | Không kết luận được trạng thái thực tế, đặc biệt trên Ubuntu. |

### Những gì log Ubuntu đã chứng minh

1. Đã từng có Backend chạy, MySQL healthy; `GET /api/health` trả **200**, `database: connected`; `GET /api/products` trả **200** với ba sản phẩm.
2. `GET /api/admin/dashboard` không có session trả **401** và `Cache-Control: no-store`. Đây là hành vi đúng cho Guest, không phải bằng chứng Admin đăng nhập thành công.
3. Người dùng cung cấp kết quả backup có checksum và thử restore MySQL cô lập: `RESTORE_OK`, `MIGRATION_002_ISOLATED_OK`, `ROW_COUNTS_UNCHANGED`, `EXISTING_PRODUCTS_ACTIVE`; số bản ghi khi đó là products 3, orders 3, order_items 5, users 1, sessions 1. Restore cô lập chứng minh bản backup tại thời điểm đó phục hồi được, không xác nhận dữ liệu hiện tại.
4. Sau bước triển khai, Backend mới chạy và API sản phẩm trả 200. Do repository mới truy vấn `is_active`, đây là bằng chứng gián tiếp mạnh rằng schema phục vụ Backend đã có cột migration 002. Chưa có truy vấn schema trực tiếp trong lượt kiểm toán này để xác nhận lại.
5. Bootstrap Admin cuối cùng bị từ chối do câu xác nhận không đúng `CREATE FIRST ADMIN`. Không có bằng chứng lần đó đã tạo Admin; cũng không suy đoán rằng sau đó người dùng chưa tạo ở nơi khác.

## 2. Kiến trúc dự án

### Kiến trúc thể hiện trong source

```text
Trình duyệt → React/Vite :5173 → proxy /api → Windows :3001
                                              ↓ SSH tunnel theo cấu hình đã trao đổi
                                      Ubuntu loopback :3001
                                              ↓
                                      Express container :3000
                                              ↓
                                      MySQL container :3306

phpMyAdmin → MySQL; cổng quản trị bind Ubuntu loopback :8081
```

Đây là luồng phát triển/kiểm thử đã được cấu hình, chưa phải kiến trúc production qua Nginx. Tình trạng tunnel đang hoạt động hay không chưa được kiểm tra trong lượt này.

| Thành phần | Triển khai và bằng chứng |
|---|---|
| Frontend | React 19; Vite 8; CSS; Context cho Auth/Cart; điều hướng bằng state và hash Admin, không dùng React Router. [App.jsx](D:/Ecommerce/frontend/src/App.jsx), [main.jsx](D:/Ecommerce/frontend/src/main.jsx), [package.json](D:/Ecommerce/frontend/package.json). |
| Kết nối phát triển | Proxy `/api` đến `http://127.0.0.1:3001`. [vite.config.js](D:/Ecommerce/frontend/vite.config.js). |
| Backend | Node.js/Express, tách route → controller → service → repository; `createApp` cho phép inject test dependencies. [app.js](D:/Ecommerce/backend/src/app.js), [server.js](D:/Ecommerce/backend/src/server.js). |
| Database | mysql2 pool; products/orders/order_items, bổ sung users/sessions, orders.user_id và products.is_active qua migration. [database.js](D:/Ecommerce/backend/src/config/database.js), [init.sql](D:/Ecommerce/database/init.sql), [001_auth.sql](D:/Ecommerce/database/migrations/001_auth.sql), [002_product_visibility.sql](D:/Ecommerce/database/migrations/002_product_visibility.sql). |
| Containers | Compose có **ba service** mysql 8.4, phpMyAdmin 5.2, backend; một mạng bridge và volume mysql_data. Backend image Node 24 Alpine, chạy USER node. [compose.yaml](D:/Ecommerce/compose.yaml), [Dockerfile](D:/Ecommerce/backend/Dockerfile). |
| Quan sát hệ thống | Có API health và MySQL healthcheck; chưa có hệ thống metrics/log tập trung trong config thực tế. [app.js](D:/Ecommerce/backend/src/app.js), [compose.yaml](D:/Ecommerce/compose.yaml). |

**Khoảng trống cài đặt mới:** Compose chỉ mount `database/init.sql`. File này chưa có users/sessions, orders.user_id hoặc products.is_active. Migration 001/002 không được tự chạy bởi Compose. Vì vậy `docker compose up` trên volume mới chưa đủ để tạo schema tương thích với toàn bộ Backend hiện tại; cần quy trình migration rõ ràng, có kiểm soát, không chạy lại tùy tiện.

## 3. Bảng tiến độ từng chức năng

### Customer

| Chức năng | Trạng thái | Thực tế và phần chưa xác minh | File bằng chứng |
|---|---|---|---|
| Danh sách sản phẩm | CODE | API lọc sản phẩm đang kinh doanh; UI có loading/error/empty. Có log thật trả ba sản phẩm, nhưng UI mới lấy trang mặc định của API. | [Home.jsx](D:/Ecommerce/frontend/src/pages/Home.jsx), [api.js](D:/Ecommerce/frontend/src/services/api.js), [product.repository.js](D:/Ecommerce/backend/src/repositories/product.repository.js). |
| Tìm kiếm/sắp xếp/phân trang catalog | CODE | Backend có; Home và getProducts chưa truyền các bộ lọc hoặc dùng pagination. Chưa có giao diện tương ứng để xem đầy đủ catalog lớn. | [product.service.js](D:/Ecommerce/backend/src/services/product.service.js), [product.repository.js](D:/Ecommerce/backend/src/repositories/product.repository.js), [Home.jsx](D:/Ecommerce/frontend/src/pages/Home.jsx). |
| Đăng ký/đăng nhập/đăng xuất | CODE | Có API và form, validation, Argon2id, giới hạn tần suất; test auth cục bộ đạt. Chưa có bộ nghiệm thu toàn luồng với bản Ubuntu hiện tại. | [auth.routes.js](D:/Ecommerce/backend/src/routes/auth.routes.js), [auth.service.js](D:/Ecommerce/backend/src/services/auth.service.js), [AuthPage.jsx](D:/Ecommerce/frontend/src/pages/AuthPage.jsx), [auth.test.js](D:/Ecommerce/backend/test/auth.test.js). |
| Quản lý session | CODE | Cookie HttpOnly/SameSite, Secure khi request HTTPS; token lưu dạng hash, kiểm tra hết hạn và tài khoản active; logout thu hồi. Còn thiếu kiểm tra HTTPS/reverse proxy thật và dọn session hết hạn định kỳ. | [sessionCookie.js](D:/Ecommerce/backend/src/middleware/sessionCookie.js), [auth.repository.js](D:/Ecommerce/backend/src/repositories/auth.repository.js), [AuthContext.jsx](D:/Ecommerce/frontend/src/context/AuthContext.jsx). |
| Hồ sơ cá nhân | CODE | GET/PATCH tên của chính tài khoản; email không cho sửa. Có test ownership/không nâng quyền; QA UI được tài liệu ghi nhận bằng fixture. | [account.routes.js](D:/Ecommerce/backend/src/routes/account.routes.js), [account.repository.js](D:/Ecommerce/backend/src/repositories/account.repository.js), [Account.jsx](D:/Ecommerce/frontend/src/pages/Account.jsx), [account.test.js](D:/Ecommerce/backend/test/account.test.js). |
| Lịch sử/chi tiết đơn | CODE | Phân trang, lọc chủ sở hữu; truy cập đơn người khác hoặc guest trả 404; giữ sản phẩm ẩn trong lịch sử. Chưa nghiệm thu MySQL/UI thật đầy đủ. | [account.service.js](D:/Ecommerce/backend/src/services/account.service.js), [account.repository.js](D:/Ecommerce/backend/src/repositories/account.repository.js), [AccountOrderCard.jsx](D:/Ecommerce/frontend/src/components/AccountOrderCard.jsx), [Account.jsx](D:/Ecommerce/frontend/src/pages/Account.jsx). |
| Giỏ hàng | CODE | Context/localStorage; thêm/xóa/đổi số lượng, tính tạm tính, giữ giỏ sau logout. Chưa có test tự động UI giỏ hàng hoặc kiểm thử nhiều trình duyệt. | [CartContext.jsx](D:/Ecommerce/frontend/src/context/CartContext.jsx), [Cart.jsx](D:/Ecommerce/frontend/src/pages/Cart.jsx), [ProductCard.jsx](D:/Ecommerce/frontend/src/components/ProductCard.jsx). |
| Checkout | CODE | Server xác định giá, khóa tồn kho, transaction, rollback; UI chỉ xóa giỏ khi API xác nhận. Connection test là giả lập, chưa xác minh cạnh tranh InnoDB thật. | [Checkout.jsx](D:/Ecommerce/frontend/src/pages/Checkout.jsx), [order.service.js](D:/Ecommerce/backend/src/services/order.service.js), [order.repository.js](D:/Ecommerce/backend/src/repositories/order.repository.js), [account.test.js](D:/Ecommerce/backend/test/account.test.js). |
| Liên kết đơn với tài khoản | CODE | user_id lấy từ session phía server, không tin body; đơn cũ/guest không tự gán theo email. Test chống giả danh đạt. | [order.controller.js](D:/Ecommerce/backend/src/controllers/order.controller.js), [accountSession.js](D:/Ecommerce/backend/src/middleware/accountSession.js), [001_auth.sql](D:/Ecommerce/database/migrations/001_auth.sql), [account.test.js](D:/Ecommerce/backend/test/account.test.js). |
| Guest Checkout | CODE | Không cookie thì được đặt đơn user_id NULL; cookie lỗi/hết hạn không tự hạ xuống Guest. Có test hồi quy; còn thiếu kiểm thử end-to-end thật có kiểm soát. | [order.routes.js](D:/Ecommerce/backend/src/routes/order.routes.js), [accountSession.js](D:/Ecommerce/backend/src/middleware/accountSession.js), [account.test.js](D:/Ecommerce/backend/test/account.test.js). |

Checkout hiện chỉ nhận tên, điện thoại, sản phẩm; chưa có cổng thanh toán, địa chỉ/vận chuyển hoặc hoàn tiền. Không coi các trạng thái đơn là bằng chứng đã thanh toán. Những phần này không tự động trở thành yêu cầu bắt buộc của môn học nếu chưa được giao.

### Admin

| Chức năng | Trạng thái | Thực tế và giới hạn | File bằng chứng |
|---|---|---|---|
| Authentication/RBAC | CODE | Dùng session chung, guard toàn namespace Admin; test 401/403/Admin đạt cục bộ. Live mới có bằng chứng Guest 401. | [admin.routes.js](D:/Ecommerce/backend/src/routes/admin.routes.js), [requireAdmin.js](D:/Ecommerce/backend/src/middleware/requireAdmin.js), [admin.test.js](D:/Ecommerce/backend/test/admin.test.js). |
| Chuẩn bị tạo Admin đầu tiên | CODE | Có CLI TTY, nhập ẩn, xác nhận, validation, hash, named lock/transaction. Chưa có bằng chứng CLI thành công trên Ubuntu. | [create-first-admin.js](D:/Ecommerce/backend/src/cli/create-first-admin.js), [bootstrap.service.js](D:/Ecommerce/backend/src/services/bootstrap.service.js), [bootstrap.repository.js](D:/Ecommerce/backend/src/repositories/bootstrap.repository.js). |
| Tài khoản Admin thật | UNKNOWN | Lần bootstrap cuối bị từ chối; chưa thể kết luận hiện tại đã có Admin hay chưa. | Cơ chế đối chiếu: [bootstrap.repository.js](D:/Ecommerce/backend/src/repositories/bootstrap.repository.js); bằng chứng runtime là log người dùng trong chat. |
| Admin API | CODE | Có chín endpoint; validation, phân trang và truy vấn tham số hóa. Cần kiểm tra SQL/runtime MySQL thực. | [admin.routes.js](D:/Ecommerce/backend/src/routes/admin.routes.js), [admin.controller.js](D:/Ecommerce/backend/src/controllers/admin.controller.js), [admin.service.js](D:/Ecommerce/backend/src/services/admin.service.js), [admin.repository.js](D:/Ecommerce/backend/src/repositories/admin.repository.js). |
| Dashboard | CODE | KPI, đơn theo ngày, giá trị theo trạng thái, đơn gần đây, tồn thấp; không gọi tổng giá trị là doanh thu đã thanh toán. Chưa đối chiếu số liệu thật. | [admin.repository.js](D:/Ecommerce/backend/src/repositories/admin.repository.js), [AdminDashboard.jsx](D:/Ecommerce/frontend/src/admin/AdminDashboard.jsx). |
| Sản phẩm/tồn kho | CODE | Tạo/sửa/ẩn, không xóa lịch sử; expectedStock chống ghi đè tồn kho cũ, 409 khi xung đột. Chưa nghiệm thu cạnh tranh MySQL thật. | [admin.service.js](D:/Ecommerce/backend/src/services/admin.service.js), [admin.repository.js](D:/Ecommerce/backend/src/repositories/admin.repository.js), [AdminProducts.jsx](D:/Ecommerce/frontend/src/admin/AdminProducts.jsx). |
| Đơn/trạng thái/hoàn kho | CODE | State machine, expectedStatus, transaction hoàn kho khi hủy hợp lệ, chống hoàn lặp trong test. Chưa chứng minh bằng transaction thật. | [adminRules.js](D:/Ecommerce/backend/src/services/adminRules.js), [admin.repository.js](D:/Ecommerce/backend/src/repositories/admin.repository.js), [AdminOrders.jsx](D:/Ecommerce/frontend/src/admin/AdminOrders.jsx). |
| Quản lý khách hàng | CODE | Danh sách, tìm kiếm, phân trang, số đơn; chỉ đọc. Không có khóa tài khoản/reset mật khẩu/nâng quyền qua Admin API. | [admin.repository.js](D:/Ecommerce/backend/src/repositories/admin.repository.js), [AdminCustomers.jsx](D:/Ecommerce/frontend/src/admin/AdminCustomers.jsx). |
| Giao diện Admin | CODE | Có shell, bốn mục chức năng, dialog, loading/error/empty, xử lý 401/403/409, responsive. QA cũ dùng fixture, chưa phải Admin/MySQL thật. | [Admin.jsx](D:/Ecommerce/frontend/src/admin/Admin.jsx), [Admin.css](D:/Ecommerce/frontend/src/admin/Admin.css), [admin-phase-b.md](D:/Ecommerce/docs/admin-phase-b.md). |
| Bộ test phân quyền cục bộ | TEST | Kiểm tra Guest 401, Customer 403, Admin được phép, Origin, input, SQL và rollback mô phỏng; toàn bộ Backend đạt 49 test. | [admin.test.js](D:/Ecommerce/backend/test/admin.test.js), [account.test.js](D:/Ecommerce/backend/test/account.test.js), [auth.test.js](D:/Ecommerce/backend/test/auth.test.js). |
| Giai đoạn C/nghiệm thu thật | DOING | Đã có backup, restore cô lập, Backend chạy lại; còn thiếu bootstrap thành công và kiểm thử Admin thật. | Kế hoạch: [admin-phase-a.md](D:/Ecommerce/docs/admin-phase-a.md), [admin-phase-b.md](D:/Ecommerce/docs/admin-phase-b.md); tiến triển thực tế bổ sung từ log chat. |

### Triển khai và quản trị

| Hạng mục | Trạng thái | Kết luận theo bằng chứng | File bằng chứng |
|---|---|---|---|
| Compose/MySQL | CODE | Config ba service, named volume, MySQL healthcheck, không publish MySQL; có log lịch sử Backend/MySQL chạy. Chưa xác minh runtime hôm nay/cài mới đầy đủ. | [compose.yaml](D:/Ecommerce/compose.yaml), [init.sql](D:/Ecommerce/database/init.sql). |
| phpMyAdmin | CODE | Có service, cổng loopback 8081 và ảnh theo tên; chưa đăng nhập/kiểm tra lại runtime. | [compose.yaml](D:/Ecommerce/compose.yaml), [thư mục ảnh](D:/Ecommerce/screenshots). |
| Nginx reverse proxy | TODO | Chưa thấy service/config Nginx trong repo; trên Ubuntu ngoài repo chưa xác minh. Vite proxy không phải Nginx. | Đối chiếu [compose.yaml](D:/Ecommerce/compose.yaml) và [README mục yêu cầu](D:/Ecommerce/README.md:33). |
| HTTPS | TODO | Chưa có TLS termination/certificate config trong repo; chưa xác minh Ubuntu bên ngoài repo. | [compose.yaml](D:/Ecommerce/compose.yaml), [Dockerfile](D:/Ecommerce/backend/Dockerfile). |
| Security headers API | CODE | Helmet và bỏ X-Powered-By; log curl lịch sử có CSP, nosniff, frame/referrer headers. HSTS tắt; chưa kiểm tra website qua điểm truy cập cuối. | [app.js](D:/Ecommerce/backend/src/app.js). |
| Prometheus/Grafana/exporters | TODO | Mới có thiết kế trong README; chưa có service, scrape config, datasource/dashboard provisioning. | [README.md](D:/Ecommerce/README.md:319), [compose.yaml](D:/Ecommerce/compose.yaml). |
| Loki/Promtail/LogQL | TODO | README có ví dụ, chưa có collector/Loki config, datasource hoặc kết quả truy vấn trong repo. | [README.md](D:/Ecommerce/README.md:339), [compose.yaml](D:/Ecommerce/compose.yaml). |
| Hardening ứng dụng/container | CODE | Non-root Backend, no-new-privileges, localhost ports, không publish DB, cookie/Origin/RBAC/rate limit. Chưa kiểm tra firewall/SSH/grants/giới hạn tài nguyên trên host. | [Dockerfile](D:/Ecommerce/backend/Dockerfile), [compose.yaml](D:/Ecommerce/compose.yaml), [auth.routes.js](D:/Ecommerce/backend/src/routes/auth.routes.js), [authOrigin.js](D:/Ecommerce/backend/src/middleware/authOrigin.js). |
| Logs/health/monitoring | CODE | API health kiểm tra DB, MySQL healthcheck, console error; chưa có backend container healthcheck, alert, structured access log hoặc log rotation trong Compose. | [app.js](D:/Ecommerce/backend/src/app.js), [compose.yaml](D:/Ecommerce/compose.yaml). |
| Backup/restore thực tế | UNKNOWN | Log lịch sử cho thấy backup checksum và restore cô lập đạt. Script/artefact trên Ubuntu chưa đọc lại, chưa xác nhận lịch backup hay khả năng phục hồi hiện tại. | Hướng dẫn trong [admin-phase-a.md](D:/Ecommerce/docs/admin-phase-a.md); kết quả restore do người dùng cung cấp trong chat. |
| README/tài liệu | CODE | Nhiều tài liệu hữu ích nhưng lệch mốc; báo cáo cũ còn nói auth/Admin chưa có, phase A/B còn ghi chưa triển khai. | [README.md](D:/Ecommerce/README.md), [báo cáo cũ](D:/Ecommerce/docs/bao-cao-hien-trang-du-an.md), [admin-phase-a.md](D:/Ecommerce/docs/admin-phase-a.md), [admin-phase-b.md](D:/Ecommerce/docs/admin-phase-b.md). |
| Git/minh chứng nộp bài | CODE | Có 6 commit local, nhưng nhiều source frontend/auth/Admin/migration/test/docs đang untracked. Chưa xác minh GitHub đã có bản hiện tại. | `.git` và `git status --short`, `git log -6`; [README kế hoạch Git](D:/Ecommerce/README.md:298). |

## 4. Báo cáo chi tiết Backend Admin

### 4.1. Giai đoạn A hoàn thành đến đâu?

**Đã hoàn thành phần triển khai mã và bộ kiểm thử cục bộ của phạm vi A**: namespace Admin, RBAC, thống kê, sản phẩm/tồn kho, đơn/trạng thái/hoàn kho, danh sách khách hàng, migration visibility và CLI bootstrap. Trạng thái nghiệp vụ tổng thể vẫn là CODE vì chưa kiểm chứng đủ với MySQL thật và Admin thật.

Các file lõi: [admin.routes.js](D:/Ecommerce/backend/src/routes/admin.routes.js), [admin.controller.js](D:/Ecommerce/backend/src/controllers/admin.controller.js), [admin.service.js](D:/Ecommerce/backend/src/services/admin.service.js), [admin.repository.js](D:/Ecommerce/backend/src/repositories/admin.repository.js), [adminRules.js](D:/Ecommerce/backend/src/services/adminRules.js).

### 4.2. Những Admin API đã xây dựng

Tất cả endpoint dưới đây bắt buộc có session Admin; danh sách hỗ trợ phân trang và tìm kiếm theo contract.

| Method | Endpoint | Hành vi |
|---|---|---|
| GET | `/api/admin/dashboard` | KPI, phân nhóm trạng thái, chuỗi ngày, đơn gần đây, sản phẩm tồn thấp. |
| GET | `/api/admin/products` | Danh sách; lọc trạng thái, tồn thấp, sắp xếp. |
| GET | `/api/admin/products/:id` | Chi tiết, gồm cả sản phẩm ẩn. |
| POST | `/api/admin/products` | Tạo sản phẩm, kiểm tra số nguyên VND/tồn kho/URL ảnh. |
| PATCH | `/api/admin/products/:id` | Cập nhật trường được phép; đổi stock cần expectedStock. |
| GET | `/api/admin/orders` | Danh sách, tìm kiếm, lọc trạng thái. |
| GET | `/api/admin/orders/:id` | Chi tiết và allowedTransitions. |
| PATCH | `/api/admin/orders/:id/status` | Đổi trạng thái với expectedStatus; hoàn kho khi hủy hợp lệ. |
| GET | `/api/admin/customers` | Danh sách Customer an toàn, số đơn, tìm kiếm/phân trang. |

Bằng chứng contract: [router](D:/Ecommerce/backend/src/routes/admin.routes.js), [controller](D:/Ecommerce/backend/src/controllers/admin.controller.js), [service](D:/Ecommerce/backend/src/services/admin.service.js). Không thấy DELETE sản phẩm, API tạo Admin qua HTTP, API sửa quyền hay API hoàn tiền; không mô tả chúng là đã có.

### 4.3. Middleware phân quyền ở đâu?

- [app.js](D:/Ecommerce/backend/src/app.js) mount router tại `/api/admin`.
- [admin.routes.js](D:/Ecommerce/backend/src/routes/admin.routes.js) đặt `Cache-Control: no-store`, sau đó `router.use(createSessionGuard(authService), requireAdmin)` **trước tất cả chín endpoint**.
- [accountSession.js](D:/Ecommerce/backend/src/middleware/accountSession.js) xác thực cookie và gán accountUser từ server; [requireAdmin.js](D:/Ecommerce/backend/src/middleware/requireAdmin.js) kiểm tra `role === 'admin'`, trả 403 nếu thiếu quyền.
- Các method ghi còn qua [authOrigin.js](D:/Ecommerce/backend/src/middleware/authOrigin.js). Role/user_id trong body không được dùng để cấp quyền. Guard ở UI chỉ là lớp trải nghiệm, không phải hàng rào bảo mật chính.

### 4.4. Đã test Guest 401, Customer 403, Admin thành công chưa?

**Đã test cục bộ** trong [admin.test.js](D:/Ecommerce/backend/test/admin.test.js:41): Guest/Customer bị chặn trên các route đọc/ghi, kể cả body giả quyền. Test Admin đọc dữ liệu và ghi sản phẩm, kiểm tra Origin và lỗi cũng đạt.

**Trên Ubuntu thật:** có log Guest gọi dashboard nhận 401; **chưa có bằng chứng Customer thật nhận 403 và Admin thật gọi API thành công**. Session/role trong fixture không thay cho đăng nhập thật và kiểm tra repository/session SQL.

### 4.5. Migration mới và tình trạng chạy

- [001_auth.sql](D:/Ecommerce/database/migrations/001_auth.sql): users, sessions, orders.user_id nullable và FK. Kết quả restore lịch sử có users/sessions hỗ trợ kết luận schema auth đã tồn tại tại thời điểm backup.
- [002_product_visibility.sql](D:/Ecommerce/database/migrations/002_product_visibility.sql): thêm products.is_active mặc định TRUE và index `(is_active, id)`; không xóa sản phẩm cũ.
- Migration 002 **đã được thử thành công trên bản restore cô lập theo log người dùng**. Log Backend sau triển khai và API mới trả 200 là bằng chứng gián tiếp mạnh về schema hoạt động, nhưng chưa thay thế kiểm tra cột/index/mốc migration trực tiếp hiện tại.
- Chưa có migration runner/version ledger trong source. Migration ALTER không được thiết kế để chạy lặp tùy ý. Lượt kiểm toán này không chạy SQL hay migration nào.

### 4.6. Cơ chế tạo Admin đầu tiên

Đã chuẩn bị đầy đủ trong [CLI](D:/Ecommerce/backend/src/cli/create-first-admin.js), [service](D:/Ecommerce/backend/src/services/bootstrap.service.js), [repository](D:/Ecommerce/backend/src/repositories/bootstrap.repository.js): yêu cầu TTY, không nhận mật khẩu qua argv/pipe; mật khẩu nhập ẩn tối thiểu 12 ký tự, khớp xác nhận; nhập đúng `CREATE FIRST ADMIN`; Argon2id; GET_LOCK cùng connection và transaction; từ chối khi đã có bất kỳ Admin nào; email trùng không nâng quyền Customer; giải phóng lock/connection; không tự tạo session.

Test validation/hash/duplicate/lock đạt nhưng CLI raw TTY và named lock MySQL thật chưa được kiểm chứng thành công trong bằng chứng hiện có. Lần người dùng gửi gần nhất nhập tên riêng ở prompt xác nhận nên bị dừng đúng quy tắc. Không cần chạy lại migration chỉ để sửa thao tác này.

### 4.7. Những gì còn thiếu trước nghiệm thu Admin

1. Xác nhận schema/version Backend hiện chạy và kết quả bootstrap trên Ubuntu, không hiển thị hash/token/mật khẩu.
2. Nghiệm thu thật Guest 401, Customer 403, Admin đọc/ghi thành công; Origin sai bị chặn và session logout/hết hạn bị từ chối.
3. Trên database thử nghiệm cô lập: kiểm tra SQL, transaction cạnh tranh checkout/sửa kho/hủy đơn, rollback và không hoàn kho hai lần. Mutex trong unit test không chứng minh khóa InnoDB.
4. Đối chiếu Dashboard với số đếm/tổng SQL độc lập, thống nhất múi giờ; test dữ liệu rỗng, lớn, sản phẩm ẩn và đơn trạng thái cũ.
5. Hoàn thành UI end-to-end, bằng chứng triển khai/rollback, bảo vệ cookie sau reverse proxy và tài liệu nghiệm thu.

State machine hiện tại: pending → confirmed hoặc cancelled; confirmed → shipping hoặc cancelled; shipping → completed; completed/cancelled kết thúc. [adminRules.js](D:/Ecommerce/backend/src/services/adminRules.js). Đây là trạng thái vận hành đơn, không chứng nhận giao hàng/thanh toán qua bên thứ ba.

## 5. Báo cáo chi tiết Frontend Admin

**Giai đoạn B đã bắt đầu và đã có đầy đủ các màn hình trong phạm vi thiết kế**, không chỉ có nút điều hướng.

| Phần | Đã có trong source | Bằng chứng |
|---|---|---|
| Entry/guard/shell | Menu Admin theo role, hash `#admin`, trạng thái kiểm tra phiên/lỗi/truy cập bị từ chối, sidebar và đăng xuất. | [App.jsx](D:/Ecommerce/frontend/src/App.jsx), [Admin.jsx](D:/Ecommerce/frontend/src/admin/Admin.jsx). |
| Dashboard | Bốn KPI, biểu đồ SVG, bảng thay thế biểu đồ, giá trị đơn theo trạng thái, đơn gần đây/tồn thấp. | [AdminDashboard.jsx](D:/Ecommerce/frontend/src/admin/AdminDashboard.jsx). |
| Sản phẩm | Bộ lọc, phân trang, dialog tạo/sửa/ẩn, chỉ gửi trường đổi, expectedStock khi đổi kho, xử lý xung đột. | [AdminProducts.jsx](D:/Ecommerce/frontend/src/admin/AdminProducts.jsx), [adminApi.js](D:/Ecommerce/frontend/src/admin/adminApi.js). |
| Đơn hàng | Danh sách/chi tiết, lựa chọn chuyển trạng thái server cho phép, xác nhận và expectedStatus. | [AdminOrders.jsx](D:/Ecommerce/frontend/src/admin/AdminOrders.jsx). |
| Khách hàng | Danh sách tìm kiếm/phân trang, số đơn; không có form nâng quyền. | [AdminCustomers.jsx](D:/Ecommerce/frontend/src/admin/AdminCustomers.jsx). |
| UX khi lỗi | Loading/error/empty; 401/403/404/409; AbortController cho đọc; mutation không chắc thành công được báo để tránh gửi lại mù. | [AdminUI.jsx](D:/Ecommerce/frontend/src/admin/AdminUI.jsx), [useAdminResource.js](D:/Ecommerce/frontend/src/admin/useAdminResource.js), [adminApi.js](D:/Ecommerce/frontend/src/admin/adminApi.js). |
| Responsive/accessibility | CSS responsive, semantic table/form/nav, focus, native dialog, biểu đồ có bảng dữ liệu. Chưa đủ cơ sở tuyên bố đạt WCAG hoặc mọi trình duyệt. | [Admin.css](D:/Ecommerce/frontend/src/admin/Admin.css), [AdminUI.jsx](D:/Ecommerce/frontend/src/admin/AdminUI.jsx), [admin-phase-b.md](D:/Ecommerce/docs/admin-phase-b.md). |

Tài liệu phase B ghi nhận QA bằng build thật với server fixture riêng trên loopback, đã dừng sau kiểm tra. Ảnh `dashboard-qa.png` và `products-mobile-qa.png` là minh họa QA, không chứng minh có Admin thật hay dữ liệu MySQL thật. Lượt này không chạy lại QA trình duyệt hoặc thao tác vào phiên đang mở của người dùng.

Thiếu trước nghiệm thu B: luồng đăng nhập Admin thật → đọc Dashboard → tạo/sửa/ẩn sản phẩm thử → đổi trạng thái đơn thử → đối chiếu dữ liệu → logout; test browser tự động cho luồng quan trọng; QA mobile/keyboard với Backend thật; kiểm tra lỗi mất tunnel/API/proxy không trả JSON. Không cần viết lại toàn bộ Admin UI để tiếp tục.

## 6. Kết quả kiểm thử

### Đã chạy an toàn trong lượt kiểm toán

| Thư mục | Lệnh | Kết quả thực tế |
|---|---|---|
| `D:\Ecommerce\backend` | `npm test` | **49 PASS, 0 FAIL, 0 skipped/cancelled/todo**, exit 0. |
| `D:\Ecommerce\frontend` | `node --test tests/accountApi.test.mjs tests/adminApi.test.mjs` | **16 PASS, 0 FAIL**, gồm 7 account API và 9 admin API/payload; exit 0. |
| `D:\Ecommerce\frontend` | `npm run lint` | **PASS**, exit 0, không xuất lỗi/cảnh báo. |
| `D:\Ecommerce\frontend` | `npm run build` | **PASS**, exit 0; Vite **8.3.4**, 48 module transformed. |

Tổng: **65 test PASS, 0 FAIL**. Build tạo CSS khoảng 48,53 kB và JS khoảng 304,11 kB (gzip khoảng 9,72/88,73 kB), không có cảnh báo build. Frontend chưa có npm script `test`, nên gọi Node test runner trực tiếp. Backend không có script lint/build riêng; không báo chúng là đã PASS.

Bằng chứng test: [auth.test.js](D:/Ecommerce/backend/test/auth.test.js), [account.test.js](D:/Ecommerce/backend/test/account.test.js), [admin.test.js](D:/Ecommerce/backend/test/admin.test.js), [accountApi.test.mjs](D:/Ecommerce/frontend/tests/accountApi.test.mjs), [adminApi.test.mjs](D:/Ecommerce/frontend/tests/adminApi.test.mjs). Cấu hình: [Backend package.json](D:/Ecommerce/backend/package.json), [Frontend package.json](D:/Ecommerce/frontend/package.json), [eslint.config.js](D:/Ecommerce/frontend/eslint.config.js).

### Mức độ bao phủ và những gì không chạy

- Backend HTTP test khởi chạy Express thật ở cổng loopback ngẫu nhiên, nhưng auth/user/order repositories hoặc connection DB được thay bằng fixture. Một test public product thay phương thức pool bằng mock. Có test Argon2id thật cục bộ; không có MySQL thật trong suite đã chạy.
- Có test ownership, chống giả role/user_id, cookie, session, Origin, rate limit, input, SQL parameters, state machine, stock conflict và rollback mô phỏng. Không suy ra tỷ lệ coverage từ số lượng test; chưa có báo cáo coverage.
- Frontend test kiểm tra API client/payload/error contract, không render toàn bộ React hay chạy browser end-to-end. Chưa có automated suite riêng cho Cart/Checkout/UI Admin.
- **Không chạy** [scripts/test-backend-auth.sh](D:/Ecommerce/scripts/test-backend-auth.sh), vì script đăng ký một Customer thật trên URL được đưa vào và không xóa tài khoản; trái giới hạn không thay đổi dữ liệu thật của đợt kiểm toán.
- Không chạy migration, CLI bootstrap, Docker Compose, npm install/audit fix, SSH, test tải hoặc bất kỳ kiểm thử nào vào Ubuntu/database thật. Không cài dependency.

## 7. Tiến độ phần trăm

Đây là **ước tính quản lý theo mức sẵn sàng**, không phải tỷ lệ dòng code, độ bao phủ test hoặc điểm môn học. Khoảng dao động phản ánh phần source đã có nhưng nghiệm thu thật còn thiếu. Căn cứ yêu cầu môn học lấy từ [README mục thang điểm](D:/Ecommerce/README.md:33), chưa có rubric chính thức khác được kiểm chứng trong lượt này.

| Phạm vi | Ước tính | Căn cứ |
|---|---|---|
| Chức năng Customer | **75–90%** | Auth/account/cart/checkout đã có, test service/API đạt; thiếu UI E2E thật, catalog UI đầy đủ và nghiệm thu hệ thống hiện chạy. Không tự tính payment gateway vào phạm vi đã giao. |
| Chức năng Admin, A+B và nghiệm thu C | **65–80%** | A/B có code và test, nhưng Admin thật/SQL runtime/stock cạnh tranh/Dashboard thật chưa nghiệm thu. Không chấm 100% vì có thư mục Admin. |
| Website thương mại điện tử, gồm Customer + Admin | **70–85%** | Ước lượng hai nhóm nghiệp vụ trên có trọng số tương đương; tính cả chất lượng nghiệm thu, không chỉ giao diện. |
| Triển khai và quản trị theo môn học | **25–40%** | Có nền Compose/MySQL/phpMyAdmin/Backend, headers và một số hardening; thiếu Nginx, metrics, logging, demo tổng thể, README đồng bộ và minh chứng. |
| Toàn dự án: nghiệp vụ + triển khai/quản trị | **Khoảng 50–65%** | Giả định tạm thời 50% trọng số cho website (đã gồm Customer/Admin), 50% cho triển khai/quản trị; làm tròn khoảng tổng hợp để tránh độ chính xác giả. |

Không lấy trung bình ba dòng website/triển khai/toàn dự án vì website đã bao gồm Customer và Admin. Nếu giảng viên chấm chủ yếu theo hạ tầng, mức sẵn sàng nộp bài sẽ gần nhóm **25–40%** hơn tiến độ UI. Những hạng mục chưa xem được trên Ubuntu không được tự cộng điểm chỉ vì có mô tả trong README.

## 8. Các vấn đề và rủi ro

| Ưu tiên | Vấn đề | Tác động và bằng chứng |
|---|---|---|
| Cao | Chưa xác nhận Admin thật và nghiệm thu C | Không thể tuyên bố quản trị đã sử dụng thành công. Lần bootstrap cuối sai câu xác nhận; cơ chế trong [bootstrap.service.js](D:/Ecommerce/backend/src/services/bootstrap.service.js). |
| Cao | Thiếu hạ tầng bắt buộc môn học | Compose chưa có Nginx, Prometheus/Grafana, Loki/collector; phần lớn các mốc môn học chưa có triển khai. [compose.yaml](D:/Ecommerce/compose.yaml), [README.md](D:/Ecommerce/README.md:33). |
| Cao | Schema cài mới chưa theo kịp Backend | Volume mới chỉ chạy init.sql, trong khi code cần auth và is_active. Chưa có ledger để chống chạy lặp migration. [compose.yaml](D:/Ecommerce/compose.yaml), [init.sql](D:/Ecommerce/database/init.sql), [migrations](D:/Ecommerce/database/migrations). |
| Cao | Test stock/hoàn kho mới mô phỏng connection | Chưa bắt được mọi lỗi SQL thực, deadlock/isolation hoặc race thật. [admin.test.js](D:/Ecommerce/backend/test/admin.test.js), [account.test.js](D:/Ecommerce/backend/test/account.test.js). |
| Cao | Nhiều source chưa được Git theo dõi | Có sáu commit local nhưng phần Auth/Admin/Frontend/migration/test còn untracked; checkout từ HEAD không tái tạo được workspace hiện tại. Chưa xác nhận bản GitHub mới nhất. Bằng chứng: git status/log đọc trong lượt này. |
| Vừa | Catalog UI chỉ đọc trang mặc định | getProducts bỏ pagination và không truyền query; Home chỉ hiện mảng trả về. Với hơn tám sản phẩm, người dùng có thể không thấy phần còn lại qua UI. [api.js](D:/Ecommerce/frontend/src/services/api.js), [Home.jsx](D:/Ecommerce/frontend/src/pages/Home.jsx), [product.service.js](D:/Ecommerce/backend/src/services/product.service.js). |
| Vừa | Thông báo lỗi JSON che nguyên nhân proxy | readApiResult parse JSON trước xử lý HTTP; response 502 rỗng/plain text có thể hiện “Máy chủ trả về dữ liệu không hợp lệ”. Đây là khả năng theo source, không khẳng định tunnel hiện hỏng. [api.js](D:/Ecommerce/frontend/src/services/api.js). |
| Vừa | HTTPS/trust proxy/cookie chưa nghiệm thu | Secure dựa req.secure; TRUST_PROXY có hỗ trợ trong app nhưng chưa được truyền qua Compose. Khi thêm TLS proxy phải cấu hình chính xác; không bật trust mọi nguồn tùy tiện. HSTS hiện tắt. [sessionCookie.js](D:/Ecommerce/backend/src/middleware/sessionCookie.js), [app.js](D:/Ecommerce/backend/src/app.js), [compose.yaml](D:/Ecommerce/compose.yaml). |
| Vừa | Logging/health/recovery chưa hoàn chỉnh | Console lỗi có thể chứa chi tiết nội bộ; chưa có structured log/redaction/rotation/alert hay backend healthcheck. Chưa có lịch backup và restore định kỳ trong repo. [app.js](D:/Ecommerce/backend/src/app.js), [compose.yaml](D:/Ecommerce/compose.yaml). |
| Vừa | Guest checkout chưa có rate limit riêng | Origin guard chỉ áp dụng checkout khi có session cookie, là hành vi chủ ý để giữ Guest. Endpoint Guest vẫn có thể bị tạo đơn rác; chưa có cơ chế chống lạm dụng riêng. [order.routes.js](D:/Ecommerce/backend/src/routes/order.routes.js), [order.service.js](D:/Ecommerce/backend/src/services/order.service.js). |
| Vừa | Giới hạn tài nguyên chưa được lập kế hoạch | Log host lịch sử cho thấy VM khoảng 1,9 GiB RAM; thêm toàn bộ observability có thể gây áp lực RAM. Compose hiện chưa đặt resource limits. Chưa đo host hiện tại. [compose.yaml](D:/Ecommerce/compose.yaml). |
| Vừa | Tài liệu và ảnh QA dễ bị hiểu nhầm | Báo cáo cũ nói chưa có auth/Admin, phase docs là ảnh chụp thời điểm trước deploy. Phải phân biệt fixture và dữ liệu thật. [báo cáo cũ](D:/Ecommerce/docs/bao-cao-hien-trang-du-an.md), [admin-phase-b.md](D:/Ecommerce/docs/admin-phase-b.md). |
| Thấp/vừa | Hạn chế dữ liệu lịch sử | Giá được snapshot trong order_items; tên/ảnh JOIN catalog hiện tại, không phải snapshot lịch sử. KPI theo ngày cần thống nhất timezone; chưa có payment ledger nên không suy ra doanh thu đã thu. [account.repository.js](D:/Ecommerce/backend/src/repositories/account.repository.js), [admin.repository.js](D:/Ecommerce/backend/src/repositories/admin.repository.js). |

Không có lỗ hổng khai thác thực tế nào được khẳng định chỉ dựa trên các rủi ro trên. Lượt này không kiểm tra bí mật, firewall, grants hoặc cấu hình ngoài repository để tránh kết luận không có bằng chứng.

## 9. Năm nhiệm vụ ưu tiên tiếp theo

Đây là đề xuất cho nhiệm vụ sau, **chưa thực hiện trong lượt kiểm toán này**.

| Thứ tự | Kết quả cần đạt | Có thể giao Antigravity viết code/tài liệu | Người dùng cần thực hiện trên Ubuntu |
|---|---|---|---|
| **1** | Chốt nghiệm thu C và đường triển khai tái lập an toàn | Soạn checklist/schema-version verification, test MySQL cô lập cho tồn kho/hoàn kho/rollback, tài liệu bootstrap và migration có kiểm soát; bổ sung E2E quan trọng. | Kiểm tra trạng thái/schema hiện có, giữ backup đã restore được; thực hiện bootstrap TTY đúng câu xác nhận nếu chưa có Admin; xác minh Guest 401/Customer 403/Admin thành công bằng tài khoản thử. Test ghi dữ liệu chỉ trên môi trường được cho phép. |
| **2** | Website chạy qua **Nginx** và đáp ứng HTTPS hoặc security headers theo đề | Chuẩn bị frontend production image/static hosting, nginx config, proxy /api, Compose/mạng, cookie/trust proxy phù hợp; README cài mới đúng migration. | Review và triển khai cấu hình, certificate nếu chọn HTTPS; kiểm tra cổng/firewall và curl headers ở URL cuối; nghiệm thu Customer/Admin qua Nginx. |
| **3** | **Prometheus + Grafana + exporters** có số liệu thật | Viết scrape config, provisioning datasource/dashboard cho container/web/MySQL; tài liệu account exporter tối thiểu quyền và giới hạn tài nguyên. | Xác nhận dung lượng/RAM, cấp credential riêng an toàn, triển khai stack và tạo tải nhẹ; chụp Targets UP và dashboard có dữ liệu. |
| **4** | **Loki + collector theo yêu cầu môn**, LogQL và hardening có minh chứng | Chuẩn bị log pipeline, labels, redaction/rotation, datasource, ba truy vấn LogQL; checklist non-root, network, quyền và resource limits. Đối chiếu lưu ý vòng đời collector trong README với giảng viên trước lựa chọn. | Chốt yêu cầu collector với giảng viên, triển khai trên VM; kiểm tra logs thực/không lộ secrets, biện pháp host firewall/SSH và quyền DB; thu minh chứng. |
| **5** | Bộ nộp bài tái lập được từ Git và tài liệu đúng thực tế | Cập nhật README/schema/API/ports/checklist, hoàn thiện catalog UI nếu đủ thời gian, cải thiện lỗi proxy; chuẩn bị nội dung báo cáo môn học ít nhất 10 trang và mục minh chứng. | Review source/config/ảnh trước khi commit/push được giao riêng; xác minh clone/build/deploy từ bản bàn giao, chụp demo tổng thể, kiểm tra backup/restore và nộp báo cáo. |

Ưu tiên 2–4 trực tiếp giải quyết các phần còn thiếu trong yêu cầu môn học, thay vì tiếp tục mở rộng tính năng thương mại ngoài phạm vi. Không giao Antigravity tự nhập credentials, thao tác database thật hay triển khai thiếu kiểm tra; việc viết cấu hình và việc áp dụng trên Ubuntu phải được phân biệt trong biên bản.

## 10. Danh sách ảnh minh chứng cần bổ sung

### Ảnh đã có trong workspace

Inventory hiện có **chín file PNG**: sáu ảnh ở gốc [screenshots](D:/Ecommerce/screenshots), một ảnh [Customer QA](D:/Ecommerce/screenshots/account-phase-b/overview-qa.png), hai ảnh [Admin Dashboard QA](D:/Ecommerce/screenshots/admin-phase-b/dashboard-qa.png) và [Admin mobile QA](D:/Ecommerce/screenshots/admin-phase-b/products-mobile-qa.png).

Sáu tên ở gốc: `backend-auth-docker-test.png`, `chungminh3containerdangchay.png`, `chungminhbackendketnoiDB.png`, `database-auth-migration.png`, `mysql-containers.png`, `phpmyadmin-database.png`. Lượt này kiểm kê đường dẫn, không dùng tên file để chứng nhận nội dung ảnh hoặc runtime hiện tại. Tài liệu QA xác định ba ảnh giao diện là fixture; phải ghi chú khi sử dụng.

### Bộ ảnh nên chụp mới

| Nhóm | Ảnh/kết quả cần thấy |
|---|---|
| Kiến trúc và triển khai | Sơ đồ thực tế Windows/Ubuntu/containers/mạng/cổng; Compose ps đầy đủ các service cần thiết; Docker networks/volumes phù hợp. |
| Website qua Nginx | URL cuối cùng, danh sách sản phẩm và trang đặt hàng; cấu hình proxy ở mức không chứa secret; response headers hoặc HTTPS/certificate theo cách được giảng viên chấp nhận. |
| Database/phpMyAdmin | Các bảng products/orders/order_items/users/sessions; cột orders.user_id và products.is_active/index; chỉ hiện mẫu đã che thông tin cá nhân, không hiện password_hash/token_hash. |
| Customer | Đăng nhập và profile; đơn của chính tài khoản; đơn mới được liên kết đúng; đơn Guest không xuất hiện trong tài khoản. Dùng dữ liệu thử có ghi nhãn. |
| Admin bootstrap | Thông báo tạo Admin thành công hoặc xác nhận đã có Admin theo quy trình; không chụp mật khẩu, hash hoặc email cá nhân nếu không cần. |
| Phân quyền | Guest 401, Customer 403 và Admin 200 cùng endpoint; Origin không được phép bị chặn; không để cookie/token trong ảnh request. |
| Admin nghiệp vụ | Dashboard với dữ liệu thật đã đối chiếu; tạo/sửa/ẩn sản phẩm; 409 khi stale stock/status; trạng thái đơn và tồn kho trước/sau hủy một lần trên môi trường thử. |
| Metrics | Prometheus Targets UP cho các job; Grafana có số liệu container CPU/RAM, Nginx HTTP và MySQL. |
| Logs | Loki datasource; Grafana Explore trả dữ liệu cho 2–3 truy vấn LogQL đúng labels; một ảnh lọc lỗi hoặc thống kê theo thời gian. |
| Hardening | Ít nhất 3–4 biện pháp có kết quả thực: non-root Backend, localhost quản trị/không publish DB, network isolation, security headers, firewall/quyền phù hợp. Không chỉ chụp checklist. |
| Backup/restore | Checksum đạt, restore cô lập và xác minh dữ liệu/migration; không chụp nội dung dump hoặc credentials. |
| Test và Git | Terminal 49 Backend + 16 Frontend test, lint/build; GitHub chứa đúng source/config đã bàn giao và commit có ý nghĩa cho các mốc triển khai; README khớp demo. |

Mỗi ảnh nên ghi thời điểm, môi trường, lệnh/luồng thực hiện và kết quả mong đợi. Ảnh QA fixture hỗ trợ minh họa giao diện; ảnh Ubuntu thật mới hỗ trợ xác nhận triển khai. Báo cáo Markdown này chưa tự thay thế báo cáo học phần tối thiểu 10 trang.

**Kết luận kiểm toán:** phần ứng dụng đã tiến khá xa, A/B Admin có mã và kiểm thử cục bộ; C còn cần nghiệm thu thật. Khoảng thiếu lớn nhất để hoàn thành môn học là reverse proxy, monitoring, logging và bằng chứng vận hành/tài liệu tái lập. Dừng ở báo cáo; không triển khai hoặc sửa lỗi trong lượt này.
