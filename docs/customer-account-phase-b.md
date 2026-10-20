# Customer Account — Giai đoạn B

## Phạm vi thay đổi

Chỉ bổ sung Frontend tài khoản; không sửa Backend trong giai đoạn này. Không sửa trang Home, Cart Context, Authentication Context, dịch vụ API cũ, Vite proxy, package.json hay .env. Không cài dependency, commit/push, chạy migration hoặc triển khai.

File chỉnh sửa:
- frontend/src/App.jsx: lối vào Tài khoản & đơn mua, hiển thị Account, điều hướng sau đăng xuất, đóng popover bằng Escape/khi rời focus.

File mới:
- frontend/src/pages/Account.jsx
- frontend/src/pages/Account.css
- frontend/src/services/accountApi.js
- frontend/src/context/useAccountResource.js
- frontend/src/components/AccountUI.jsx
- frontend/src/components/AccountOrderCard.jsx
- frontend/src/components/accountFormat.js
- frontend/tests/accountApi.test.mjs
- docs/customer-account-phase-b.md
- screenshots/account-phase-b/overview-qa.png (ảnh trên fixture QA riêng)

## Chức năng

Tổng quan có avatar chữ cái, tên/email, tổng đơn thực tế từ pagination.total, ngày tạo tài khoản, đơn gần nhất và lối tắt. Không hiển thị tổng tiền đã mua vì API chưa có aggregate toàn lịch sử. Không cộng tiền của một trang để giả làm tổng chi tiêu.

Hồ sơ cho sửa họ tên, email chỉ đọc, ngày tạo chỉ đọc. Kiểm tra 2–100 ký tự, trim, không nhận ký tự điều khiển. Nút lưu có trạng thái disabled/busy, thông báo lỗi/thành công. Sau khi lưu thành công, dùng refreshSession có sẵn để đồng bộ tên trên Header; không thay đổi cơ chế xác thực.

Lịch sử phân trang 5 đơn/trang, loading skeleton, lỗi/thử lại, chưa có đơn, thông báo phiên hết hạn và đăng nhập lại. Chi tiết lấy riêng API có phân quyền, hiển thị thông tin người đặt, sản phẩm/đơn giá/số lượng/thành tiền, tổng chính thức từ Backend. Quay lại giữ trang lịch sử trước đó. Không giả trạng thái giao hàng/thanh toán.

Request account gửi credentials: include; hủy request khi đổi trang để không hiện dữ liệu cũ. Không lưu hồ sơ/đơn hàng vào localStorage. Không gọi clearCart khi đăng nhập/đăng xuất; clearCart hiện có vẫn chỉ chạy sau tạo đơn thành công. Dữ liệu đơn lỗi/không đầy đủ bị báo lỗi, không thay bằng đơn mẫu.

Sidebar sticky trên desktop; mobile chuyển sang 3 nút điều hướng. SVG icon, semantic nav/main/form/list/dl, label cho input, aria-current, focus-visible, focus vào nội dung khi đổi mục/trang; kế thừa prefers-reduced-motion hiện có.

## Kiểm thử

- `node --test frontend/tests/accountApi.test.mjs`: 7/7 đạt. Kiểm tra cookie credentials, cancellation, PATCH chỉ fullName, lỗi 401/403/404/5xx, network/JSON lỗi, dữ liệu thiếu, phân trang và tổng chính thức.
- `npm run lint` tại frontend: đạt.
- `npm run build` tại frontend: đạt.
- `npm test` tại backend: 23/23 đạt khi kiểm tra hồi quy.

Kiểm tra UI trong trình duyệt bằng bản build thật trên server QA tạm chỉ bind 127.0.0.1:5181, với fixture tách biệt. Không nối database thật hoặc Backend Ubuntu. Server QA tạm không thuộc mã ứng dụng và được dừng sau kiểm thử.

Đã kiểm tra: menu tài khoản, tổng quan, lưu tên và Header cập nhật, email chỉ đọc, phân trang 1→2, chi tiết đơn, quay lại giữ trang 2, lỗi API và thử lại phục hồi, phiên hết hạn, chưa có đơn, đăng xuất về Home. Kiểm tra chiều rộng 1440/1024/768/375/320px; các màn hình đã kiểm tra không tràn ngang. Ảnh minh họa là dữ liệu QA, không phải đơn/tài khoản thật. Chưa kiểm chứng end-to-end với MySQL/Backend thật hoặc tạo đơn thật; không thực hiện việc này do giới hạn database/deploy.

## Nghiệm thu trên hệ thống thật

Các API Giai đoạn A chưa được tự động đưa lên Ubuntu. Nếu Backend đang chạy vẫn là bản cũ, màn hình tài khoản sẽ hiển thị lỗi API thực tế, không sinh dữ liệu thay thế. Cần triển khai Backend sau khi được chủ dự án cho phép trước khi nghiệm thu end-to-end.

1. Khởi chạy Frontend bằng `npm run dev` trong frontend, giữ SSH Tunnel hoạt động, dùng origin đã được Backend cho phép (ví dụ http://localhost:5173).
2. Đăng nhập, bấm tên tài khoản trên Header → Tài khoản & đơn mua.
3. Xem Tổng quan; vào Hồ sơ, sửa tên, lưu; kiểm tra tên trên Header và khi tải lại.
4. Vào Đơn mua, đổi trang, mở chi tiết, quay lại. Đối chiếu tổng tiền chính thức.
5. Với tài khoản chưa có đơn, xác nhận trạng thái rỗng. Đơn guest cũ không tự xuất hiện trong tài khoản.
6. Kiểm tra bằng bàn phím Tab/Enter/Escape và màn hình mobile.
7. Đăng xuất, kiểm tra giỏ hàng vẫn giữ nguyên. Việc tạo đơn thật chỉ thực hiện khi chủ dự án chủ động cho phép.
