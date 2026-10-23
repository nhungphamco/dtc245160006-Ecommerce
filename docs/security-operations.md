# Vận hành MiniShop

Bộ cấu hình source được tinh gọn ngày **24/10/2026**. Hệ thống dùng **Promtail**, không còn service/volume Alloy trong source hiện hành. [Biên bản so sánh](compose-consolidation.md) ghi rõ phạm vi kiểm tra.

## Bộ file hiện hành

| File | Nội dung |
|---|---|
| `compose.yaml` | MySQL, Backend, phpMyAdmin; log rotation và giới hạn phpMyAdmin |
| `compose.nginx.yaml` | Website, proxy Backend và cấu hình Nginx metrics |
| `compose.monitoring.yaml` | Prometheus, Grafana, cAdvisor, node-exporter, MySQL/Nginx exporters |
| `compose.logging.yaml` | Loki và Promtail |
| `compose.grafana-smtp.yaml` | Gửi mail Grafana, tùy chọn |

Dùng thứ tự: nền → Nginx → monitoring → logging → SMTP (nếu cần). `deploy/compose.demo.yaml` vẫn chỉ dùng demo ứng dụng trên máy mới theo README.

## Kiểm tra source mới

**Ubuntu Bash**, sau khi bộ source mới đã được chuẩn bị ở đúng vị trí. Đây là kiểm tra cấu hình, không khởi động container:

```bash
cd /home/minishop/Ecommerce
compose_args=(
  --project-directory /home/minishop/Ecommerce
  -p ecommerce
  -f compose.yaml
  -f compose.nginx.yaml
  -f compose.monitoring.yaml
  -f compose.logging.yaml
)
sudo docker compose "${compose_args[@]}" config --quiet
sudo docker compose "${compose_args[@]}" config --services
```

Có **12 service** trong full stack, không có Alloy. Nếu dùng SMTP, thêm `-f compose.grafana-smtp.yaml` trước lệnh `config`. Phải có biến SMTP và secret file với quyền đọc phù hợp. Không in config đầy đủ đã nội suy mật khẩu.

Các điều kiện lab vẫn giữ: IP `192.168.197.135`, project `ecommerce`, Docker/containerd socket, state `/home/minishop/.minishop-promtail`, dữ liệu volume và schema đã có. Đây chưa phải cấu hình full stack portable cho mọi máy.

## Máy Ubuntu đang chạy có bộ file cũ

**Gộp source không tự cập nhật container.** Nginx từng được cập nhật bằng overlay image ngoài repo; các service khác có thể mang danh sách file khác. Trước bất kỳ lần chuyển cấu hình nào, đọc label của từng service mục tiêu:

```bash
sudo docker inspect ecommerce-nginx-1 --format 'Image={{.Config.Image}} ComposeFiles={{index .Config.Labels "com.docker.compose.project.config_files"}}'
sudo docker ps -a --filter label=com.docker.compose.project=ecommerce --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Quy trình chuyển bộ file trên VM:

1. Sao lưu các file cũ được container tham chiếu, `.env` giữ kín, image IDs và các overlay image đang có hiệu lực. Không pull đè source Ubuntu đang sửa/untracked.
2. Đặt bộ file mới trong staging; dùng `--project-directory /home/minishop/Ecommerce` để giữ bind paths đúng, project vẫn `ecommerce`.
3. So sánh config cũ/mới bằng môi trường thật trong file riêng tư. Giữ overlay image hiện tại ở cuối; không vô tình quay Nginx về tag `nginx-v1`.
4. Chỉ sau khi diff đúng kế hoạch mới cập nhật riêng service cần thiết với `--no-deps --no-build --pull never`. Không `up` cả stack để thử, không dùng `--remove-orphans`, không xóa volume.
5. Kiểm tra HTTP/API, metrics, log, mounts và container ID của các service không thuộc phạm vi thay đổi.

Bài so sánh source đã đạt với env mẫu không thay thế bước so sánh runtime này. Container Alloy cũ đang dừng và volume cũ trên Ubuntu **chưa bị xóa** trong lượt gộp source; xử lý riêng sau khi xác nhận không còn dùng, không tự dọn theo tên orphan.

## Kiểm tra hoạt động

```bash
curl --max-time 10 -fsS -w '\nHTTP=%{http_code}\n' http://192.168.197.135/healthz
curl --max-time 10 -fsS -w '\nHTTP=%{http_code}\n' http://192.168.197.135/api/health
curl --max-time 10 -fsS -G --data-urlencode 'query={__name__=~"up|mysql_up|nginx_up"}' http://127.0.0.1:9090/api/v1/query
curl --max-time 10 -fsS http://127.0.0.1:3100/ready
```

Mong đợi Nginx/API 200, database connected, năm job UP ở lab, mysql_up/nginx_up=1 và Loki ready. Source Prometheus/Grafana còn khoảng trống bàn giao đã nêu trong README; không sửa query để che thiếu dữ liệu. Kiểm fresh Nginx/Backend log riêng, không suy ra ingestion từ trạng thái running.

## Dữ liệu và quay lại phiên bản trước

Giữ volume MySQL/Loki/Grafana/Prometheus và positions Promtail. Để quay lại một thay đổi, dùng bộ cấu hình và image đã sao lưu của đúng service; không restore DB cũ để rollback giao diện. Source hiện tại không cung cấp lại Alloy hoặc script cutover lịch sử.

Xem [backup MySQL](automated-backup.md), [lịch sử chuyển collector](promtail-transition.md) và [README](../README.md) cho phạm vi demo, kiểm thử và hạn chế.
