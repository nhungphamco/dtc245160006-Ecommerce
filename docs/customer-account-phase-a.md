# Customer Account — Giai đoạn A

Chỉ thay đổi Backend cục bộ. Chưa triển khai server, chạy migration hoặc kết nối database thật. Frontend tài khoản thuộc Giai đoạn B và cần được phê duyệt riêng.

## API

Tất cả `/api/account/*` yêu cầu cookie `minishop_session` hợp lệ và trả `Cache-Control: no-store`. Response thành công dùng `{ success: true, data: ... }`; lỗi dùng `{ success: false, message: ... }`.

| Method và endpoint | Dữ liệu |
| --- | --- |
| GET /api/account/profile | `data.user`: id, fullName, email, role, createdAt |
| PATCH /api/account/profile | Body chỉ `{ fullName }`; trả `data.user` đã cập nhật |
| GET /api/account/orders?page=1&pageSize=10 | `data.orders` và `data.pagination`: page, pageSize, total, totalPages |
| GET /api/account/orders/:id | `data.order`; trả 404 cho cả đơn không tồn tại và đơn không thuộc tài khoản |

`page` là số nguyên dương; `pageSize` từ 1 đến 50. Mặc định 10 đơn/trang, sắp xếp `created_at DESC, id DESC`. Đơn có id, customer_name, customer_phone, total_amount, status, created_at và items. Mỗi item có order_id, product_id, product_name, image_url, quantity, unit_price, line_total. Tổng chính thức và đơn giá lấy từ đơn/order_items trong database; tiền DECIMAL giữ dạng chuỗi như mysql2 hiện tại.

Tên/ảnh sản phẩm được JOIN từ catalog hiện tại vì schema chưa lưu snapshot tên/ảnh trong order_items. Không khẳng định đây là tên/ảnh lịch sử. Không tự tạo trạng thái vận chuyển/thanh toán hoặc số liệu chi tiêu.

PATCH chỉ nhận họ tên đã trim, từ 2–100 ký tự, không chứa ký tự điều khiển. Các trường khác (email, role, user_id...) bị từ chối với 400. Không có đổi mật khẩu/email. Quy tắc Origin tái sử dụng middleware hiện có và các cấu hình APP_ORIGIN/AUTH_ALLOWED_ORIGINS, không sửa cấu hình hay nới lỏng kiểm tra.

## Tạo đơn

POST /api/orders giữ request/response hiện có. Controller chỉ truyền userId từ session do server xác thực vào service và repository:

- Không có cookie phiên: Guest Checkout, lưu user_id = NULL.
- Cookie phiên hợp lệ: gắn user_id từ session, kiểm tra Origin trước khi tạo đơn.
- Cookie hiện diện nhưng rỗng/sai/hết hạn: 401, không tạo đơn guest. Người dùng phải đăng nhập lại hoặc đăng xuất trước khi tiếp tục.
- user_id/role do client gửi không quyết định tài khoản sở hữu.
- Không gắn lại đơn cũ hoặc guest orders theo tên/email/điện thoại.

SELECT FOR UPDATE, thứ tự khóa theo product id, tính giá phía server, kiểm tra số nguyên an toàn, trừ tồn kho có điều kiện, commit/rollback và release connection được giữ nguyên. Thay đổi SQL ghi đơn chỉ thêm user_id.

## Kiểm thử và giới hạn

Chạy `npm test` tại backend. HTTP integration chạy Express thực trên cổng loopback ngẫu nhiên với auth service thực và repository bộ nhớ; SQL/transaction được kiểm tra bằng connection giả lập. Không gửi request đến server Ubuntu hoặc database thật. Không chứng minh được tương thích runtime MySQL hay cạnh tranh transaction thực bằng các test giả lập này.

Chạy `npm run lint` và `npm run build` tại frontend để kiểm tra hồi quy; chưa chỉnh Frontend hay kiểm thử UX lỗi API của giao diện tài khoản ở Giai đoạn A. Không thêm dependency.

Chưa triển khai nên API mới chưa xuất hiện trên Backend đang chạy qua SSH Tunnel. Cần nghiệm thu server/database thực sau khi được phép; không chạy migration trong nhiệm vụ này.
