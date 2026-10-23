# So sánh trước và sau tinh gọn Compose

**Ngày:** 24/10/2026. **Phạm vi:** cấu hình source; chưa triển khai bộ file mới lên Ubuntu.

## Kết quả

Giảm từ **15 xuống 5 file Compose ở thư mục gốc**, giữ 12 service đang dùng và bỏ Alloy. `deploy/compose.demo.yaml` vẫn là overlay demo riêng.

| File hiện hành | Nội dung được gộp từ bộ cũ |
|---|---|
| `compose.yaml` | Nền + rotation Backend/MySQL/phpMyAdmin + giới hạn phpMyAdmin |
| `compose.nginx.yaml` | Nginx + mount cấu hình Nginx metrics |
| `compose.monitoring.yaml` | Monitoring + cAdvisor fix + MySQL exporter fix + Nginx exporter |
| `compose.logging.yaml` | Loki + Promtail, không còn khai báo profile Alloy |
| `compose.grafana-smtp.yaml` | Giữ riêng SMTP tùy chọn, nội dung không đổi |

Đã bỏ các overlay trung gian tương ứng, `compose.alloy.yaml`, `logging/config.alloy` và script `scripts/promtail-cutover.sh` chỉ dùng cho lần chuyển collector cũ. Bản cũ nằm trong lịch sử Git và backup riêng trên Windows; không giữ script cutover có hash và danh sách file cũ trong source vận hành.

## Cách kiểm chứng

Dùng Docker Compose CLI với cùng project `ecommerce` và **`.env.example`**, không đọc `.env` thật:

1. Lưu JSON cấu hình bộ 15 file cũ, bật mọi profile để bao gồm Alloy.
2. Lưu thêm baseline không bật SMTP.
3. Merge bộ file mới, có và không có SMTP.
4. Loại đúng `services.alloy` và `volumes.alloy_data` khỏi baseline cũ.
5. So sánh toàn bộ cấu trúc JSON, gồm services, networks, volumes và các thuộc tính.

Kết quả cả hai trường hợp:

```text
WITH_SMTP: ALL_12_SERVICES_IDENTICAL
WITHOUT_SMTP: ALL_12_SERVICES_IDENTICAL
ONLY_ALLOY_AND_ITS_VOLUME_DECLARATION_REMOVED
```

Không chỉ so sánh số service: image, command, environment, ports, mounts, network, healthcheck, user, resource limits, rotation và hardening của 12 service đều khớp sau normalize. Các biến môi trường vẫn được giữ dưới dạng nội suy trong YAML nguồn, không thay bằng mật khẩu mẫu đã resolve.

Đây là phép so sánh source với baseline source cũ, **không phải đối chiếu trực tiếp từng container đang chạy**. Overlay image ngoài repo phải được giữ khi chuyển trên Ubuntu.

Demo bốn service cũng được validate lại: project `minishop-demo`, cổng riêng và SQL mounts đúng. Do hardening đã được gộp vào file nền, demo cũng kế thừa rotation/giới hạn phpMyAdmin; Nginx kế thừa cấu hình metrics. Chưa chạy mới container trong lượt này.

## Những gì không thay đổi

- Không đổi image/version của 12 service đang dùng.
- Không sửa Backend/API, SQL, frontend, Prometheus scrape jobs hoặc Grafana datasource.
- Không sửa Promtail config, labels, endpoint Loki hoặc positions path.
- Không đổi IP, cổng, project/volume names hoặc ngân sách tài nguyên của full stack.
- Không SSH, stop/recreate container, xóa volume hay dọn state trên Ubuntu.

Alloy không còn trong **source hiện hành**. Container/volume Alloy lịch sử trên VM cần xử lý riêng khi chuyển cấu hình; lượt này không tuyên bố đã xóa chúng.

Hướng dẫn chuyển bộ file: [runbook](security-operations.md). Các báo cáo audit cũ mô tả thời điểm cũ, không phải danh sách file cần chạy hiện tại.
