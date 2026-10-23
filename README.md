# MiniShop

Website thương mại điện tử mẫu cho học phần **Triển khai và Quản trị Hệ thống Phần mềm**. Hỗ trợ xem sản phẩm, giỏ hàng, đặt hàng, tài khoản khách hàng và quản trị cửa hàng.

## Công nghệ

- **Frontend:** React, Vite.
- **Backend:** Node.js 24, Express, MySQL 8.4.
- **Triển khai:** Docker Compose, Nginx.
- **Giám sát và log:** Prometheus, Grafana, Loki, Promtail.
- **Sao lưu:** MySQL dump, systemd timer, retention và SHA-256.

```text
Trình duyệt → Nginx / React → Express API → MySQL
Exporters → Prometheus → Grafana
Docker logs → Promtail → Loki → Grafana
```

## Chạy thử

Dùng **Ubuntu mới hoặc môi trường thử riêng**, có Git, Docker Engine và Docker Compose từ 2.24.4. Các lệnh dưới chạy trong **Ubuntu Bash**, không áp dụng cho máy lab đang có dữ liệu.

### 1. Lấy source và cấu hình

```bash
git clone https://github.com/nhungphamco/dtc245160006-Ecommerce.git "$HOME/minishop-demo"
cd "$HOME/minishop-demo"
test -e .env || (umask 077; cp .env.example .env)
nano .env
```

Đặt mật khẩu riêng cho `MYSQL_ROOT_PASSWORD` và `MYSQL_PASSWORD`; giữ `MYSQL_DATABASE=minishop`, `MYSQL_USER=minishop_app`. Không đưa `.env` thật lên Git. Các biến Grafana/exporter/SMTP chỉ cần cấu hình khi triển khai thêm phần giám sát tương ứng.

### 2. Khởi động ứng dụng

```bash
dcdemo() {
  sudo docker compose --project-directory "$PWD" -p minishop-demo \
    -f compose.yaml -f compose.nginx.yaml -f deploy/compose.demo.yaml "$@"
}

dcdemo config --quiet
dcdemo up -d --build
dcdemo ps
```

Demo gồm **MySQL, Backend, Nginx và phpMyAdmin**. Chờ MySQL/Nginx healthy, mở **http://localhost:18080** trên máy Ubuntu. Dừng nếu một lệnh lỗi.

Nếu dùng trình duyệt Windows, chạy trong **PowerShell**, thay user/IP và giữ cửa sổ SSH mở:

```powershell
ssh -N -L 127.0.0.1:18080:127.0.0.1:18080 -L 127.0.0.1:18081:127.0.0.1:18081 <ubuntu_user>@<ubuntu_ip>
```

Sau đó mở **http://localhost:18080** trên Windows. phpMyAdmin ở **http://localhost:18081**, dùng tài khoản MySQL trong `.env`. Dùng đúng `localhost` để khớp Origin của demo.

### 3. Tạo Admin đầu tiên

Trong terminal Ubuntu, tại thư mục dự án và đã khai báo `dcdemo`:

```bash
dcdemo exec backend node src/cli/create-first-admin.js
```

Nhập thông tin tài khoản, câu xác nhận `CREATE FIRST ADMIN` và mật khẩu ít nhất 12 ký tự. Đăng nhập rồi mở **http://localhost:18080/#admin**. Đăng ký thông thường trên web chỉ tạo Customer.

### 4. Kiểm tra và dừng

```bash
curl --max-time 10 -fsS http://localhost:18080/api/health
dcdemo logs --tail 50 backend
dcdemo stop
```

API mong đợi `{"status":"ok","database":"connected"}`. Thử thêm giỏ, đặt đơn, xem lịch sử và đăng nhập Admin bằng dữ liệu thử. Mở lại bằng `dcdemo start`; khai báo lại hàm nếu mở terminal mới.

**Lưu ý:** overlay demo tạo schema/migration khi volume mới, không chạy lại migration trên database đã có dữ liệu. Demo chưa cài monitoring/logging/backup; các cấu hình lab cần đường dẫn, tài khoản exporter và state riêng. Không xóa volume hoặc reset DB để cập nhật giao diện.

## Kiểm tra source

Cần Node.js 24. Chạy ở thư mục gốc, dừng nếu có lỗi:

```bash
npm --prefix backend ci
npm --prefix frontend ci
npm --prefix backend test
node --test frontend/tests/accountApi.test.mjs frontend/tests/adminApi.test.mjs
npm --prefix frontend run lint
npm --prefix frontend run build
```

Rà ngày **24/10/2026**: backend **49 test**, frontend API **16 test** đều đạt; lint/build thành công. Các test dùng dữ liệu giả lập, không thay thế kiểm thử database thật. Overlay demo đã validate Compose, chưa diễn tập cài mới end-to-end trong lượt này.

## Môi trường lab

- Website: **http://192.168.197.135/**; Admin: **http://192.168.197.135/#admin**.
- Grafana `127.0.0.1:3000`, Prometheus `127.0.0.1:9090`, phpMyAdmin `127.0.0.1:8081` trên Ubuntu; truy cập từ xa bằng SSH tunnel.
- `localhost:5173` là frontend phát triển trên Windows, không phải bản Ubuntu. Sửa source cần build/deploy lại image mới có hiệu lực trên lab.

Lab đã có web/API, metrics, log Nginx và backup. Chưa nghiệm thu toàn bộ: còn HTTP, restore bản backup mới, log Backend sau cutover và một số kiểm tra bảo mật. Source monitoring chưa tái tạo đầy đủ dashboard/alert và cấu hình thực tế trên VM. Promtail đã [EOL](https://grafana.com/docs/loki/latest/send-data/promtail/), được giữ cho bài lab.

## Tài liệu

- [Vận hành hệ thống](docs/security-operations.md)
- [Sao lưu MySQL](docs/automated-backup.md)
- [Chuyển collector sang Promtail](docs/promtail-transition.md)
- [Minh chứng](docs/evidence-index.md)

Không commit mật khẩu, token, SQL dump, file build, dependency hoặc backup riêng tư.

---

**Phạm Thị Nhung — DTC245160006 — KHMT 23A** · Giảng viên: **Hoàng Văn Tâm** · Đề 9: Website Thương mại điện tử.
