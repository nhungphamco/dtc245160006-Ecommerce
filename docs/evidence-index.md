# Danh mục ảnh nghiệm thu MiniShop

Rà ngày 21/10/2026: đã xem tổng quan 38 PNG bằng contact sheet; xem riêng ảnh gốc nginx-api-proxy.png, prometheus-targets.png và finalllcontainer.png. Không coi việc xem thumbnail là kiểm chứng mọi chi tiết chữ nhỏ. Không sửa/xóa ảnh gốc.

## Ảnh ưu tiên

| Nội dung | File trong screenshots/ | Phạm vi và lưu ý |
|---|---|---|
| Website | nginx-website.png | Trang chủ; chưa chứng minh hoàn tất đặt hàng |
| MySQL/phpMyAdmin | phpmyadmin-database.png, mysql-containers.png | Dữ liệu sản phẩm; chưa phải restore |
| Nginx API/headers | nginx-api-proxy.png | Ảnh gốc cho thấy API200/database connected và năm security headers; snapshot ngày18/10, cấu hình rollback lịch sử. Không dùng làm bộ Compose hiện hành |
| Origin guard | auth-origin-guard.png | Thiếu Origin và Origin lạ bị403; chưa có case Origin hợp lệ trong cùng ảnh |
| RBAC | auth-rbac-admin.png, auth-rbac-customer.png | Đối chiếu output đã nhận; ảnh có email/thông tin tài khoản cần che khi công khai; customer deny body chưa tự chứng minh status403 |
| Prometheus | prometheus-targets.png | Các target nhìn thấy UP; ảnh cắt không thấy đầy đủ cả năm, cần ảnh mới đủ hoặc ghép output PromQL đã kiểm |
| Host/container | grafana-container-15p.png, grafanacadvisor.png | Có biểu đồ; là snapshot trước chuyển collector, không minh chứng đủ Promtail mới |
| MySQL dashboard | grafanamys.png | Ưu tiên hơn grafanamysql.png: bản sau có panel No data |
| Nginx dashboard | ngix1.png, ngix2.png | Requests, active connections và nginx status có dữ liệu |
| Logging lịch sử | loki-logql-nginx.png, loki-logql-backend.png, tranglokifebe.png | Dữ liệu giai đoạn cũ; không chứng minh fresh Backend ingestion sau cutover |
| Promtail cutover | promtail-nginx-cutover.png | Marker mới/status404 đã được đối chiếu trong chat; dùng làm bằng chứng sau chuyển |
| Promtail hardening | promtail-hardening.png | Snapshot cấu hình RO/caps/NNP/limits/no published ports; socket risk vẫn còn |
| Inventory cuối | finalllcontainer.png | Đã xem gốc:12Up, AlloyExited0, MySQL/Nginx/cAdvisor healthy. Ưu tiên hơn final-containers.png (Alloy còn chạy) |
| Alerting | A03-alert-rule-normal.png, gialap.png | Có normal/firing theo ảnh tổng quan; chưa chứng minh email thực sự được nhận |

## Cần bổ sung hoặc đối chiếu riêng

- Network isolation và LAN exposed ports: đã có output trong hội thoại, chưa thấy ảnh chuyên biệt trong38file.
- Backup integrity ngoài VM: đã có9checksumOK trong hội thoại, chưa thấy ảnh chuyên biệt; không nhầm với restore.
- Git commits: chưa thấy ảnh lịch sử commits. Không commit/push chỉ để tạo ảnh.
- Đặt hàng thành công và SQL đơn tương ứng: chưa thấy minh chứng rõ từ tổng quan ảnh.
- Prometheus đủ5targets: ảnh hiện có bị cắt; outputPromQL trong hội thoại đã đạt.
- HTTP headers HTML200/API404: output đã đạt trong hội thoại; ảnhAPI200 lịch sử đã có.
- Restore cô lập: NOT VERIFIED do chưa có môi trường tài nguyên phù hợp, không tạo ảnh giả thay thế.

Các ảnh database-auth-migration.png và cấu hình cảnh báo chỉ nên đưa phụ lục nếu cần; không hướng dẫn chạy lại migration từ ảnh lịch sử. Không đưa contact sheets vào báo cáo công khai trước rà dữ liệu cá nhân. Tập ảnh không thay thế test hoặc báo cáo giới hạn.
