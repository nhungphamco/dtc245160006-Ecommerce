# Demo giám sát Prometheus và Grafana

## Cấu hình và phạm vi

Source khai báo đủ năm job: prometheus, node-exporter, cadvisor,
mysql-exporter và nginx-exporter. Máy lab đã được kiểm tra `TOTAL=5 UP=5`
qua API trong phiên nghiệm thu sau gộp Compose. Đây không phải kết quả cài mới.

Dashboard `monitoring/grafana/dashboards/minishop-overview.json` là mẫu import
được bổ sung để tái sử dụng truy vấn. Chưa import/kiểm chứng dashboard mới trên VM.
Không ghi đè dashboard hiện có hoặc thay volume Grafana.

## Truy cập từ Windows

Chạy trong PowerShell và giữ cửa sổ mở:

```powershell
ssh -N -L 127.0.0.1:3000:127.0.0.1:3000 -L 127.0.0.1:9090:127.0.0.1:9090 minishop@192.168.197.135
```

Mở Grafana tại `http://localhost:3000`, Prometheus tại `http://localhost:9090`.
Đăng nhập bằng tài khoản đã cấu hình, không chụp mật khẩu.

## Kịch bản demo

1. Prometheus → Status → Targets: cả năm target phải UP.
2. Grafana → Dashboards → New → Import: chọn JSON mẫu và datasource Prometheus.
3. Mở website, truy cập sản phẩm; chờ khoảng 30–60 giây để Prometheus scrape.
4. Xem các panel container CPU/RAM, Nginx requests và trạng thái MySQL.
5. Lưu ảnh thực tế: `monitoring-targets-five-up.png`, `monitoring-overview.png`
   trong `screenshots/`, chỉ sau khi đã xác nhận dữ liệu hiển thị.

## Truy vấn PromQL

| Mục đích | Truy vấn | Kết quả mong đợi |
|---|---|---|
| Khả năng scrape | `up` | Năm target có giá trị 1 |
| CPU container (số lõi sử dụng) | `sum by (name) (rate(container_cpu_usage_seconds_total{job="cadvisor",name!=""}[5m]))` | Chuỗi số liệu từng container |
| RAM container (byte) | `container_memory_working_set_bytes{job="cadvisor",name!=""}` | Dung lượng working set |
| Số request Nginx mỗi giây | `rate(nginx_http_requests_total{job="nginx-exporter"}[5m])` | Có dữ liệu sau ít nhất hai lần scrape |
| Kết nối exporter đến MySQL | `mysql_up{job="mysql-exporter"}` | Giá trị 1 |

Target UP chỉ chứng minh endpoint metrics phản hồi; `mysql_up` và số liệu ứng dụng
cần được kiểm tra riêng. `No data` khác giá trị 0: kiểm tra datasource, khoảng
thời gian, tên metrics và nhãn trước khi kết luận.

Việc thêm job vào source chưa tự reload Prometheus trên VM. Lab hiện đã có job
Nginx nên không cần restart chỉ để tạo commit. Kiểm tra cú pháp cấu hình sửa đổi
bằng `promtool check config` trong môi trường có Prometheus trước khi triển khai.
