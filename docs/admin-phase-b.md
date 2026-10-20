# MiniShop Admin — Giai đoạn B: Frontend

## Kết quả và phạm vi

Đã bổ sung giao diện Admin bằng React/CSS và SVG, không thêm dependency. Không sửa các trang Customer, Cart Context, Auth Context, dịch vụ api.js hiện có, proxy, Backend, migration hoặc .env trong giai đoạn này. Chưa triển khai Docker, tạo Admin thật hoặc thực hiện Giai đoạn C.

API production luôn gọi /api/admin với credentials: include. Không có dữ liệu mẫu hoặc fallback mock trong mã Frontend. Quyền ở giao diện chỉ hỗ trợ UX; Backend Giai đoạn A tiếp tục là nơi xác thực/phân quyền bắt buộc.

## File thay đổi

Sửa:
- frontend/src/App.jsx: lối vào Quản trị cửa hàng chỉ hiển thị với user.role=admin; layout riêng; gate truy cập trực tiếp; đăng nhập lại/đăng xuất; bookmark #admin và skip link #admin-main; hỗ trợ rời Admin bằng lịch sử hash.

Tạo mới:
- frontend/src/admin/Admin.jsx: layout, sidebar, breadcrumb, tài khoản, thông báo thành công và access gate.
- frontend/src/admin/Admin.css: style tách biệt theo prefix ad-, desktop/tablet/mobile, modal, table/card.
- frontend/src/admin/AdminDashboard.jsx: KPI, biểu đồ SVG có bảng số liệu thay thế, giá trị theo trạng thái, đơn gần đây, tồn kho thấp.
- frontend/src/admin/AdminProducts.jsx: tìm kiếm/lọc/sắp xếp/phân trang, thêm/sửa, xác nhận ẩn/hiện và cập nhật kho.
- frontend/src/admin/AdminOrders.jsx: tìm kiếm/lọc/phân trang, chi tiết và cập nhật trạng thái có xác nhận.
- frontend/src/admin/AdminCustomers.jsx: danh sách/tìm kiếm/phân trang, trạng thái và số đơn của Customer.
- frontend/src/admin/AdminUI.jsx: các thành phần tái sử dụng, native dialog, nút, bảng phân trang, loading/error/empty.
- frontend/src/admin/adminConstants.js: nhãn trạng thái.
- frontend/src/admin/adminApi.js: request API và validation dữ liệu/payload sản phẩm.
- frontend/src/admin/useAdminResource.js: read lifecycle, abort, chống hiển thị dữ liệu của request cũ, retry theo yêu cầu.
- frontend/tests/adminApi.test.mjs: 9 bài kiểm thử API client/payload.
- docs/admin-phase-b.md: tài liệu này.
- screenshots/admin-phase-b/dashboard-qa.png
- screenshots/admin-phase-b/products-mobile-qa.png

## Hành vi chính

Dashboard lấy số liệu từ Backend, không thêm phần trăm tăng trưởng hay doanh thu giả. Biểu đồ đếm số đơn theo ngày trên dữ liệu series; có bảng dữ liệu cho screen reader. Hiển thị giá trị đơn tách từng trạng thái, không gọi pending là doanh thu đã hoàn tất/thanh toán. Ngày biểu đồ theo múi giờ máy chủ như API Giai đoạn A.

Sản phẩm có ảnh/minh họa, giá, tồn kho thấp, trạng thái kinh doanh và nút Sửa/Ẩn/Hiện. Mở sửa lấy chi tiết mới từ API. Form kiểm tra tên, giá nguyên VND, tồn kho không âm, giới hạn độ dài và URL ảnh HTTP(S) không chứa credentials. Chỉ gửi trường đã thay đổi. Khi sửa kho gửi expectedStock; hiển thị xác nhận trước khi thay kho hoặc trạng thái sản phẩm. Lỗi 409 giữ form và yêu cầu tải dữ liệu mới; không tự ghi đè.

Đơn hàng có bộ lọc trạng thái, tìm theo mã/tên/điện thoại, xem thông tin khách đặt và sản phẩm. Tổng tiền/đơn giá lấy từ Backend. Các lựa chọn trạng thái lấy từ allowedTransitions, không tự mở rộng luồng nghiệp vụ. PATCH gửi status và expectedStatus. Hủy có xác nhận rõ về hoàn kho, trạng thái cuối và không hoàn tiền. Thành công chỉ thông báo sau phản hồi API; nếu Backend trả changed=false thì hiển thị đã được xử lý trước đó. Khi 409 phải tải lại đơn.

Khách hàng chỉ có chức năng xem/tìm kiếm/phân trang. Không có xóa tài khoản, đổi mật khẩu, cấp quyền Admin hay bootstrap Admin qua giao diện.

Mọi request đọc có loading skeleton, error/retry, empty và xử lý 401/403/404. Request ghi không tự retry; lỗi mạng/5xx hoặc phản hồi thiếu xác nhận cảnh báo kiểm tra dữ liệu trước khi gửi lại để tránh thao tác trùng. Không có xác nhận thành công giả khi lỗi API.

## Accessibility và responsive

- Semantic main/nav/header/table/caption/th scope=col/form/label/dl.
- aria-current cho mục sidebar, tên truy cập cho thao tác từng sản phẩm/đơn.
- Native dialog khóa tương tác nền, giữ focus trong modal, hỗ trợ Escape và trả focus về nút mở; không đóng khi đang ghi.
- Skip link hoạt động ở #admin-main mà không làm rời trang Admin; focus nội dung khi chuyển mục.
- Biểu đồ SVG có tên truy cập và số liệu dạng bảng.
- Tái sử dụng focus-visible và prefers-reduced-motion toàn cục hiện có.
- Desktop sidebar sticky; mobile chuyển nav thành 4 mục, bảng thành các hàng dạng card với nhãn dữ liệu. Không thay layout Customer.

## Kiểm thử đã chạy

- Frontend npm run lint: đạt, không có warning/error ở lần kiểm tra cuối.
- Frontend npm run build: đạt.
- node --test tests/accountApi.test.mjs tests/adminApi.test.mjs: 16/16 đạt (7 Customer + 9 Admin).
- Backend npm test: 49/49 đạt, không thay Backend trong Giai đoạn B.

Kiểm tra UI bằng bản build thật trên server QA riêng bind 127.0.0.1:5182. Server dùng Express/services Admin hiện có với repositories fixture trong bộ nhớ, không kết nối database thật; không thay proxy hoặc API production. Tên/số liệu trong ảnh là dữ liệu QA, không phải tài khoản/đơn hàng thật. Server QA được dừng sau kiểm thử.

Đã kiểm tra trên trình duyệt:
- Dashboard, biểu đồ, danh sách sản phẩm và khách hàng.
- Thêm sản phẩm; sửa kho qua xác nhận; ẩn sản phẩm qua xác nhận.
- Mở chi tiết đơn, xác nhận hủy, cập nhật thông báo và trạng thái cuối theo API QA. Bài Backend kiểm tra transaction hoàn kho; UI fixture không thay thế kiểm chứng transaction MySQL.
- Xung đột 409 giữ form và xuất hiện nút tải lại dữ liệu.
- API lỗi hiện Thử lại; phục hồi sau Thử lại khi API hoạt động trở lại.
- Server trả 403 khi phiên không còn quyền Admin; tải trực tiếp #admin khi là Customer bị chặn bởi access gate.
- Phân trang khách hàng từ 1 sang 2 giữ đúng dữ liệu trang; skip link không làm mất trang hiện tại.
- Escape đóng modal và trả focus đúng nút Thêm sản phẩm.
- Đo chiều rộng trang ở 320/375/768/1024/1440px; các màn hình đã kiểm tra không tràn ngang. Đã kiểm tra bảng sản phẩm/khách hàng ở 320px.

Giới hạn: chưa thao tác trên MySQL thật, chưa nghiệm thu toàn bộ với Admin thật, chưa kiểm thử mọi trường hợp screen reader/trình duyệt. Không tạo/xóa/cập nhật dữ liệu trên Ubuntu.

## Nghiệm thu sau khi Giai đoạn C được phê duyệt

1. Làm backup, áp dụng migration 002 đúng một lần trước Backend Admin; triển khai theo kế hoạch Giai đoạn A. Chưa làm ở giai đoạn này.
2. Tạo Admin đầu tiên qua CLI có kiểm soát, đăng nhập bằng luồng Authentication hiện có.
3. Mở MiniShop tại origin được cho phép, bấm tên tài khoản → Quản trị cửa hàng; hoặc /#admin sau đăng nhập.
4. Đối chiếu Dashboard với dữ liệu máy chủ; kiểm tra tìm/lọc/sắp xếp/phân trang từng danh sách.
5. Trên dữ liệu thử được chủ dự án cho phép, thêm/sửa/ẩn sản phẩm, kiểm tra Customer không đặt được sản phẩm ẩn nhưng lịch sử đơn vẫn giữ.
6. Thay kho trong hai phiên để kiểm tra 409; kiểm tra luồng pending→confirmed→shipping→completed và hủy/hoàn kho theo phương án B trên dữ liệu thử được phép.
7. Xác nhận Customer/Guest không lấy được Admin API; kiểm tra Guest Checkout và Customer Account cũ.

Dừng sau Giai đoạn B. Giai đoạn C cần phê duyệt riêng; không tự triển khai hoặc chạy migration.
