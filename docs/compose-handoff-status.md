# Đối chiếu cấu hình bàn giao C10

Nguồn riêng tư: C:/Users/nhungpham/MiniShopPrivateBackups/compose-review-20261021-044005.

Đã bổ sung 8 overlay thiếu, parse YAML thành công cả 15 file. Sáu file có sẵn khớp nội dung sau chuẩn hóa newline. Giữ compose.yaml Windows: APP_ORIGIN/AUTH_ALLOWED_ORIGINS là biến env; bản Ubuntu hard-code localhost cho base, overlay Nginx đặt LAN. SMTP host/user/from-address được thay bằng biến env, giá trị mẫu không có chứng thực thật. Không thay runtime Ubuntu.

## Bind files còn thiếu trên Windows

- `./logging/config.alloy`
- `./logging/loki.yaml`
- `./nginx/nginx.monitoring.conf`

Chưa validate merged config đầy đủ hoặc cài mới. Cần lấy file thiếu vào staging riêng tư, rà secrets và diff trước bổ sung; không copy .env hoặc secret SMTP.

## Bổ sung bind files

Đã rà và bổ sung logging/config.alloy, logging/loki.yaml, nginx/nginx.monitoring.conf từ staging riêng tư; checksum từng bản copy khớp. Không thấy chứng thực literal trong ba file này. Cả 15 Compose file parse YAML thành công; không còn source volume tương đối bị thiếu. Loki cấu hình retention 24h, auth_enabled false (giữ giới hạn truy cập loopback/network). Chưa kiểm merged config/cài mới hoặc hiệu lực retention bằng runtime mới. Secrets tuyệt đối ngoài dự án và positions phải provision riêng.

Kiểm tra bổ sung: Docker Compose config --quiet với đủ 15 file, mọi profile và .env.example trả exit 0 trên Windows; không chạy container/daemon. Đây là validate merged config, chưa kiểm Nginx/Alloy binary hoặc cài mới. git diff --check toàn repo còn báo dòng trống EOF có sẵn tại backend/src/services/order.service.js:91; không sửa source ngoài phạm vi.
