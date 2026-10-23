# Tình trạng cấu hình bàn giao

Cập nhật **24/10/2026**: source đã được gộp từ 15 thành 5 file Compose gốc và bỏ Alloy. Xem [biên bản so sánh](compose-consolidation.md) và [runbook hiện hành](security-operations.md).

- Source mới: `compose.yaml`, `compose.nginx.yaml`, `compose.monitoring.yaml`, `compose.logging.yaml`, `compose.grafana-smtp.yaml` tùy chọn.
- Cấu hình merge của 12 service khớp baseline source cũ, cả bật/tắt SMTP; chỉ bỏ service Alloy và khai báo volume Alloy.
- `deploy/compose.demo.yaml` vẫn chỉ dùng ứng dụng trên máy mới.
- Chưa chuyển bộ file mới lên Ubuntu. Labels container trên VM có thể vẫn tham chiếu file cũ và overlay image trong staging; không pull/xóa file khi chưa sao lưu và đối chiếu.
- Chưa hoàn thiện đồng bộ Prometheus/Grafana: thiếu job Nginx, datasource Loki và dashboard/alert artefact trong repo. Gộp Compose không giải quyết các khoảng trống này.

Mật khẩu, state và secret SMTP được giữ ngoài source; validate env mẫu không chứng minh các file/path đó đã sẵn sàng trên máy mới.
