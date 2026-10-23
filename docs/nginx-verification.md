# Kiểm chứng Nginx reverse proxy

Nginx phục vụ React đã build và chuyển nguyên đường dẫn `/api` tới Backend.
Lab dùng HTTP nội bộ và security headers cơ bản; chưa triển khai HTTPS.

## Kiểm tra trên Ubuntu

```bash
sudo docker exec ecommerce-nginx-1 nginx -t
python3 scripts/check-nginx.py http://192.168.197.135
```

Chạy script tại thư mục dự án sau khi đã chuyển script mới sang Ubuntu.
Mong đợi `NGINX_CHECK_OK`: trang chủ và API health trả 200, database connected,
API không tồn tại trả JSON 404; cả ba phản hồi có đủ năm security headers.
Script không đăng nhập, không in nội dung phản hồi và không sửa dữ liệu.

Lưu ảnh output thật thành `screenshots/nginx-verification.png` khi đã chạy đạt.
Không sử dụng kết quả kiểm tra source để thay thế kiểm tra máy chủ.

## Phạm vi bảo vệ

- CSP, nosniff, frame deny, referrer policy và permissions policy do Nginx đặt.
- Cổng Backend chỉ công bố trên loopback; trình duyệt truy cập API qua Nginx.
- Access log dùng `$uri`, không ghi query string, body, cookie hay Authorization.
- `/healthz` chỉ kiểm tra Nginx; `/api/health` kiểm tra cả Backend và MySQL.
- HTTP LAN chưa bảo vệ dữ liệu trên đường truyền bằng TLS.

## Cấu hình đang sử dụng trên lab

Sau gộp Compose, lệnh quản lý cố định là:

```bash
sudo python3 /etc/minishop-compose/01a8b46/run.py ps
```

Thư mục này chứa cấu hình riêng của máy chủ, không đưa lên GitHub. Không chạy
lại bộ file source để thay image giao diện hoặc environment đang hoạt động.
Biên bản triển khai ban đầu nằm trong [nginx-deployment.md](nginx-deployment.md).
