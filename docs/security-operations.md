# MiniShop — Runbook vận hành sau C08

Cập nhật21/10/2026, Asia/Saigon. Đây là tài liệu mới trên Windows; chưa xác nhận đã được copy lên Ubuntu. Không thay thế toàn bộ README cũ. Đối chiếu SECURITY_REMEDIATION_PROGRESS.md để xem bằng chứng và giới hạn.

## Bộ cấu hình hiện tại

Ubuntu project ecommerce, thư mục /home/minishop/Ecommerce. Sau C08, dùng đúng 15 file theo thứ tự dưới. 11 file đầu là cấu hình gốc; hai file tiếp theo áp log rotation, file thứ 14 áp limits phpMyAdmin, file thứ 15 chuyển collector sang Promtail. Alloy được giữ trong profile alloy-rollback và đã dừng có chủ đích. Không dùng riêng compose.yaml để recreate service. Không bỏ overlay hardening khi thao tác về sau trừ rollback được duyệt.

**Chạy trong Bash trên Ubuntu**, không chạy khối này trong PowerShell:

```bash
compose_args=(
  --project-directory /home/minishop/Ecommerce
  -p ecommerce
  -f /home/minishop/Ecommerce/compose.yaml
  -f /home/minishop/Ecommerce/compose.nginx.yaml
  -f /home/minishop/Ecommerce/compose.monitoring.yaml
  -f /home/minishop/Ecommerce/compose.cadvisor-fix.yaml
  -f /home/minishop/Ecommerce/compose.mysql-exporter-fix.yaml
  -f /home/minishop/Ecommerce/compose.nginx-metrics.yaml
  -f /home/minishop/Ecommerce/compose.nginx-exporter.yaml
  -f /home/minishop/Ecommerce/compose.grafana-smtp.yaml
  -f /home/minishop/Ecommerce/compose.logging.yaml
  -f /home/minishop/Ecommerce/compose.loki.yaml
  -f /home/minishop/Ecommerce/compose.alloy.yaml
  -f /home/minishop/Ecommerce/compose.security-phpmyadmin.yaml
  -f /home/minishop/Ecommerce/compose.security-mysql-logging.yaml
  -f /home/minishop/Ecommerce/compose.security-phpmyadmin-resources.yaml
  -f /home/minishop/Ecommerce/compose.promtail.yaml
)
```

Biến chỉ tồn tại trong terminal đó. Khai báo lại khi mở terminal mới. Các đường dẫn và projectname trong runbook chỉ đúng cho môi trường đã xác minh; không dùng cho máy khác mà chưa đối chiếu.

## Kiểm tra chỉ đọc

Chạy riêng từng lệnh và đối chiếu output, không coi đây là script tự triển khai:

```bash
sudo docker compose "${compose_args[@]}" config --quiet
```

Validate không xuất config chứa giá trị env. Thành công chưa chứng minh file trên đĩa giống toàn bộ container đang chạy. Không dùng config không lọc hoặc inspect đầy đủ để gửi báo cáo.

```bash
sudo docker compose "${compose_args[@]}" --profile '*' config --services
```

Khi bao gồm mọi profile, có 13 service được định nghĩa: mysql, phpmyadmin, backend, nginx, prometheus, grafana, cadvisor, node-exporter, mysql-exporter, nginx-exporter, loki, alloy, promtail. Trạng thái sau cutover là 12 container hoạt động và Alloy dừng có chủ đích. Thứ tự output có thể khác.

```bash
sudo docker compose "${compose_args[@]}" ps --all
```

Mong đợi không Exited/Restarting/unhealthy ngoài kế hoạch đã biết; running không đủ để chứng minh ứng dụng/metrics/logs đúng.

```bash
curl --max-time 10 -sS -w '\nHTTP=%{http_code}\n' http://192.168.197.135/api/health
```

Mong đợi200/statusok/databaseconnected. Health không thay thế test các chức năng nghiệp vụ.

## Bảo toàn dữ liệu và cập nhật

- Bất kỳ up/recreate nào cũng cần kiểm tra imageID/digest hiện tại, volume/network mapping, config diff, backup, tác động và phê duyệt đúng service. Không up toàn stack để thử. Restart đơn thuần không áp dụng logging/environment mới.
- phpMyAdmin image lúc C04: sha256:da3c72f9886fca93037b740c93fe1697a7924fe6790a58733814cee61ec49af8.
- MySQL image lúc C05: sha256:24989179f58856db763f418010c1169fecc944e3ec1ea7e921572d83eb070f70; mysql_data phải ánh xạ volume ecommerce_mysql_data. Tag có thể thay đổi, phải đối chiếu trước mỗi lần recreate.
- C04/C05 xác minh LogConfig json-file, max-size5m/max-file3; không thay MySQL schema/grants/image/volume/resource limits. Chỉ respective container bị recreate. Log Docker cũ có thể mất khi recreate; chưa stress rollover15MB.
- C07 xác minh riêng phpMyAdmin RAM256MiB, tổng RAM+swap512MiB, CPU0.5, PIDlimit128, giữ logging/image; chỉ phpMyAdmin bị recreate. HTTP/API200, no restart/OOM trong snapshot, tác vụ COUNT products trả4 thành công qua UI. Không coi đây là chứng minh import/concurrency lớn đạt. Rollback resources nếu cần: bỏ riêng compose.security-phpmyadmin-resources.yaml, giữ compose.promtail.yaml và các overlay logging, kiểm tra config/image và recreate chỉ phpmyadmin theo kế hoạch được duyệt.
- Không down -v, xóa/prune volume, resetDB/migrate, đổi storage driver, ghi đè.env hoặc commit/push nếu chưa được giao riêng. Không restore dump cũ để rollback Nginx/exporter/logging config.
- Rollback MySQL logging nếu cần: bỏ riêng compose.security-mysql-logging.yaml khỏi bộfile, giữ overlay phpMyAdmin, xác minh image/volume rồi recreate riêng mysql theo kế hoạch được duyệt. Vẫn gây gián đoạnDB; không tự chạy khi đanghealthy.
- Rollback phpMyAdmin logging nếu cần: bỏ riêng compose.security-phpmyadmin.yaml, giữ overlay MySQL nếu đã áp, xác minh image và recreate riêng phpmyadmin. Không thay service khác.
- Sau bất kỳ thay đổi: xác minh config hiệu lực, health/API/metrics/logs, và diff name/containerID/imageID/StartedAt với baseline; chỉ service được phép mới đổiID.

## Backup đã có bằng chứng

DB mới: /home/minishop/minishop-db-backup.DTN5at/database.sql,9155byte, checksumOK; Windows C:/Users/nhungpham/MiniShopPrivateBackups/minishop-db-backup.DTN5at/database.sql, checksumcopyOK. Chưa thực hiện restore cô lập, chưa có RPO/RTO/lịch backup đã chốt. Đây là bản ngoàiVM nhưng cùng máy vật lý.

Config trước hardening: /home/minishop/minishop-security-config.C9FXwP/config.tar.gz, Windows cùng tên dưới MiniShopPrivateBackups,14974byte, checksumOK. Archive chứa11Compose files gốc, chưa chứa2overlay sauC05; giữ nguyên bản lịch sử này.

Config sau C05: /home/minishop/minishop-security-after-rotation.VMDOYM/config.tar.gz,15181byte; tar inventory13Compose files/checksumOK, thư mục700, archive/manifest600. Bản Windows C:/Users/nhungpham/MiniShopPrivateBackups/minishop-security-after-rotation.VMDOYM/config.tar.gz có checksum khớp theo output người dùng. Đây là backup bộ cấu hình13file hiện tại; không phải bằng chứng mọi nội dung archive đã được rà secrets hoặc clean deployment đã thành công.

Sau C07 runtime có14file; archive13file trên là baseline trước limits, chưa chứa compose.security-phpmyadmin-resources.yaml. File nguồn overlay thứ14 có trên Windows và đã có hiệu lực Ubuntu theo inspect. Chưa có bằng chứng archive mới14file ngoàiVM; giữ bản13file và bổ sung backup trong bước riêng.

Archive cấu hình phải giữ kín: không có.env thật/SMTPsecret trong danh sách chọn không có nghĩa đã loại hết literal secrets trong các config khác. Không đưa archive raw vào Git. Để bàn giao source cần rà secrets, so sánh/diff với Windows rồi đồng bộ có kiểm soát; chưa khẳng định H03 hoàn tất từ việc tạo backup.

Backup config không đủ cho tái triển khai toàn bộ: cần source/lockfiles/images hoặc build tái lập, secrets nhập riêng, schema/bootstrap/grants và dữ liệu đã thử restore. SMTP secret ngoài dự án phải có phương án lưu/khôi phục kín riêng; không coi archive này đã bao phủ secret đó.

## Minh chứng và tồn đọng

Ảnh đề xuất C04:06-10-phpmyadmin-log-rotation.png; C05:06-11-mysql-log-rotation.png. Chỉ lưu output đã kiểm tra, không in/chụp password,token,cookieValue,hashxác thực hoặc nội dungdump/PII.

H04 mới xử lý rotation core services: Backend đã có rotation trước; MySQL/phpMyAdmin có sauC04/C05. Limits còn thiếu. HTTPS, sockets, grants, retention/redaction, restore, test auth còn thiếu và bộ source bàn giao đầy đủ vẫn theo audit/runtime/progress reports. Không coi runbook mới là bằng chứng các vấn đề đó đã khắc phục.

## Kết quả C08 và rollback collector

Người dùng đã chạy script cutover thành công: PROMTAIL_READY, CUTOVER_OK, FRESH_NGINX_LOG_CONFIRMED và API_HEALTH_OK; 11 container khác không đổi. Alloy dừng có chủ đích. Backup tại /home/minishop/minishop-before-promtail.SKaFy3/cutover.MJalqH có chín mục kiểm checksum OK, gồm cấu hình lúc chuyển, state Alloy sau dừng, positions và metadata. Chưa xác nhận bản backup này ngoài VM.

Nếu cần rollback, dừng riêng Promtail rồi mới start container Alloy cũ; giữ nguyên state và volume, không chạy đồng thời hai collector. Chưa diễn tập rollback. Log Backend mới và ảnh Grafana sau chuyển còn cần kiểm chứng; readiness không thay thế kiểm thử ingestion. Xem docs/promtail-transition.md.
