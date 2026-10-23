# Demo Loki và Promtail: ba truy vấn LogQL

Promtail đọc Docker logs của Nginx/Backend thuộc project `ecommerce`, gửi đến
Loki. Các truy vấn dưới dùng nhãn Nginx đã được xác nhận trên lab.
Việc chọn Backend làm target chưa chứng minh đã nhận được log Backend mới.

## Truy cập

Trong PowerShell, mở SSH tunnel và giữ cửa sổ chạy:

```powershell
ssh -N -L 127.0.0.1:3000:127.0.0.1:3000 minishop@192.168.197.135
```

Mở `http://localhost:3000` → Explore → chọn datasource Loki, khoảng thời gian
Last 15 minutes. Nếu chưa có datasource, tạo loại Loki với URL nội bộ
`http://loki:3100`, chọn Save & test; không dùng localhost trong URL datasource.

## Tạo log thử có thể nhận diện

Chạy trong Ubuntu:

```bash
marker="logql-demo-$(date -u +%Y%m%dT%H%M%SZ)"
printf 'MARKER=%s\n' "$marker"
curl --max-time 10 -sS -o /dev/null -w 'HTTP=%{http_code}\n' \
  "http://192.168.197.135/api/$marker"
```

HTTP 404 là dự kiến: đường dẫn API thử không tồn tại, không thay đổi dữ liệu.
Chờ vài giây để Promtail gửi log. Dấu nhận diện phải nằm trong đường dẫn `/api/`:
Nginx không ghi query string; SPA có thể đổi `$uri` về `/index.html`.

## Truy vấn 1 — Xem log Nginx

```logql
{job="docker",container="ecommerce-nginx-1"}
```

Mong đợi có các dòng log gần đây. Có thể lưu ảnh thực tế để minh họa báo cáo.

## Truy vấn 2 — Phân tích JSON và lọc HTTP 404

```logql
{job="docker",container="ecommerce-nginx-1"} | json | __error__="" | status = 404
```

Mong đợi thấy URI `/api/logql-demo-...` vừa tạo. Kiểm tra đúng dấu nhận diện,
không chỉ dựa vào các dòng lỗi cũ.

## Truy vấn 3 — Đếm yêu cầu thử trong 5 phút

```logql
sum(count_over_time({job="docker",container="ecommerce-nginx-1"} |= "/api/logql-demo-" [5m]))
```

Chọn kiểu Instant để xem số lượng tại thời điểm hiện tại; mong đợi ít nhất 1
khi vừa tạo request. Chế độ Range cũng hợp lệ: mỗi điểm trên biểu đồ là số
request trong cửa sổ 5 phút trước thời điểm đó. Nếu quá 5 phút, tạo lại request
hoặc chọn khoảng thời gian có chứa lần thử.

## Trạng thái kiểm chứng

Sau gộp Compose, yêu cầu thử `/api/logcheck-...` đã trả 404 và được tìm thấy
trong Docker logs lẫn Loki: `DOCKER_LOG_FOUND=True`, `LOG_PIPELINE_CHECK_OK`.
Đã đối chiếu ba ảnh Grafana Explore do người dùng cung cấp sau khi chạy demo:

| Truy vấn | Kết quả quan sát |
|---|---|
| Log Nginx | 17 dòng log trong khoảng thời gian được chọn |
| JSON và HTTP 404 | 2 dòng log phù hợp bộ lọc |
| Đếm URI thử | Biểu đồ Range có giá trị 1 |

Đây là kết quả tại thời điểm thử, không phải số liệu cố định. Ảnh được dùng để
đối chiếu trong phiên làm việc, chưa đưa vào kho mã nguồn theo lựa chọn của
người dùng. Kết quả xác nhận ba truy vấn trên log Nginx; không thay thế kiểm
chứng log Backend mới. Không công khai cookie, token hay dữ liệu cá nhân.
