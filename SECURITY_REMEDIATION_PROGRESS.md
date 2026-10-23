# MINISHOP — SECURITY REMEDIATION PROGRESS

> **Cập nhật source 24/10/2026:** đã gộp Compose từ 15 thành 5 file, bỏ Alloy và script cutover lịch sử. So sánh normalized config của 12 service còn lại đạt khi bật/tắt SMTP. Chưa triển khai bộ file mới trên VM hoặc xóa container/volume Alloy cũ. Xem [biên bản](docs/compose-consolidation.md). Các mục bên dưới giữ nguyên theo thời điểm thực hiện.

Ngày cập nhật: 21/10/2026, Asia/Saigon.

Đối chiếu SECURITY_AUDIT_REPORT.md và SECURITY_RUNTIME_VERIFICATION_REPORT.md. Báo cáo runtime giữ nguyên bằng chứng trước khắc phục; file này ghi nhận tiến triển Giai đoạn C. Lệnh Ubuntu/Windows do người dùng chạy, trợ lý đối chiếu output được gửi. Không commit/push.

## C01 — Env example: hoàn tất phần biến mẫu

- D:/Ecommerce/.env.example thêm MYSQL_EXPORTER_PASSWORD và GF_SECURITY_ADMIN_PASSWORD bằng placeholder.
- Backup trước sửa: docs/security-remediation-backups/C01-20261021-024253/env-example.before.txt, checksum đối chiếu trước sửa đạt.
- Kiểm tra giữ nguyên dòng cũ, hai biến xuất hiện một lần và khớp Compose; không sửa .env thật hoặc runtime.
- M04 mới xử lý phần biến mẫu; README/runbook tổng thể chưa hoàn tất.

## C02 — Backup MySQL mới và bản ngoài VM: đã có bằng chứng

- Metadata năm bảng đều InnoDB, tổng xấp xỉ 0.20 MiB theo information_schema.
- Dump dùng single-transaction, quick, routines/events/triggers, hex-blob, no-tablespaces, set-gtid-purged OFF, database minishop. Không dump system users/grants; không thay schema hoặc dữ liệu nghiệp vụ.
- Ubuntu: /home/minishop/minishop-db-backup.DTN5at/database.sql, 9155 byte; DUMP_OK, checksum OK; thư mục700, SQL/manifest600.
- Windows: C:/Users/nhungpham/MiniShopPrivateBackups/minishop-db-backup.DTN5at/database.sql; SCP thành công, OFF_VM_COPY_CHECKSUM_OK, 9155 byte.
- Thư mục Windows đã áp icacls bỏ quyền kế thừa, cấp full control cho current identity, báo thành công; chưa rà mọi ACL effective sau đó. Đây là bản ngoài VM trên cùng máy vật lý, không phải bảo vệ khỏi mất toàn máy.
- H05 cải thiện độ mới và bản ngoài VM; restore, lịch backup, RPO/RTO vẫn chưa xác minh/chốt.

## C03 — Backup cấu hình hiện tại: đã có bằng chứng

- Ubuntu: /home/minishop/minishop-security-config.C9FXwP/config.tar.gz; checksum OK.
- Windows: C:/Users/nhungpham/MiniShopPrivateBackups/minishop-security-config.C9FXwP/config.tar.gz; 14974 byte, OFF_VM_CONFIG_CHECKSUM_OK.
- Archive đã được kiểm checksum cục bộ; inventory bên trong có đủ11 Compose files gốc được xác minh ở B01. Lệnh tạo archive còn chọn monitoring/logging/nginx, Dockerfiles, file mẫu và README; không thêm .env thật hoặc SMTP secret ngoài dự án.
- Giữ archive ở nơi riêng tư: chưa rà toàn bộ nội dung để khẳng định không còn literal secrets. Không copy nguyên archive vào Git, không giải nén đè workspace/runtime.
- Backup này được tạo trước overlay hardening phpMyAdmin, nên chưa đại diện bộ12file sau C04. H03 bàn giao source/runbook hoàn chỉnh còn tồn đọng.

## C04 — Log rotation phpMyAdmin: hoàn tất và đã kiểm tra

- File mới D:/Ecommerce/compose.security-phpmyadmin.yaml; bản Ubuntu cùng tên tại /home/minishop/Ecommerce.
- Chỉ thêm logging json-file/max-size5m/max-file3 cho phpmyadmin; không đổi port, network, credentials hoặc resource limits.
- Người dùng phê duyệt triển khai riêng phpMyAdmin. Validate đủ12file config --quiet OK; trích config chọn trường cho thấy12service, phpMyAdmin vẫn image phpmyadmin:5.2, loopback8081, db_network.
- Baseline trước sửa ghi trong một file containers-before-pma.* thuộc thư mục backup C03; đường dẫn suffix cụ thể chưa được gửi. Diff BEFORE/AFTER có output đã đối chiếu.
- Runtime sau sửa: running, LogConfig json-file với max-size5m/max-file3; phpMyAdmin HTTP200, API health200/database connected.
- Image giữ nguyên sha256:da3c72f9886fca93037b740c93fe1697a7924fe6790a58733814cee61ec49af8.
- Diff container metadata chỉ có phpMyAdmin đổi ID/StartedAt;11container còn lại không đổi trong phép đối chiếu.
- StartedAt mới 2026-10-20T19:59:06.904237005Z, tương ứng02:59:06 ngày21/10 Việt Nam. Không coi đây là thời gian lập toàn bộ báo cáo.
- Chưa ép ghi15MB log để thử rotation; chỉ xác minh config driver hiệu lực. Không stress test.
- H04 xử lý phần rotation phpMyAdmin; MySQL rotation và limits Backend/MySQL/phpMyAdmin vẫn còn.
- Bộ vận hành sau C04 phải ghép thêm compose.security-phpmyadmin.yaml sau11file gốc; không dùng riêng Compose gốc khi recreate.
- Rollback nếu cần: bỏ riêng overlay phpMyAdmin khỏi bộfile, giữ nguyên project/image, recreate chỉ phpmyadmin theo kế hoạch. Không restore MySQL hoặc down toàn stack; không tự chạy rollback khi hệ thống đang tốt.
- Ảnh được đề xuất: screenshots/06-10-phpmyadmin-log-rotation.png; chưa xác nhận file ảnh đã lưu.

## C05 — Log rotation MySQL: hoàn tất và đã kiểm tra

- File mới D:/Ecommerce/compose.security-mysql-logging.yaml, chỉ khai báo logging json-file/max-size5m/max-file3 cho mysql.
- Người dùng đã phê duyệt riêng restart MySQL. Có output so sánh JSON cấu hình bộ12file trước và13file sau: ONLY_MYSQL_LOGGING_CHANGED, SERVICE_COUNT=12; image mysql:8.4 và mounts giữ nguyên. Không xuất environment/secrets khi đối chiếu.
- Backup cấu hình gốc C03 và DB C02 đã có checksum đạt ở các bước trước. Đã trình preflight kiểm lại checksum/image/volume và lưu baseline; không nhận đầy đủ output preflight, nên không khẳng định riêng từng preflight đã được chứng minh lại. Có baseline diff và row comparison sau áp dụng do người dùng gửi.
- Người dùng gửi kết quả Compose báo riêng ecommerce-mysql-1 Healthy sau bước recreate được hướng dẫn --no-deps/--no-build/--pull never/--wait. Không có bằng chứng thay grants, schema hoặc resource limits trong bước này.
- Runtime cuối: Status=running, Health=healthy, LogConfig json-file/max-file3/max-size5m, DataVolume=ecommerce_mysql_data.
- Image giữ nguyên sha256:24989179f58856db763f418010c1169fecc944e3ec1ea7e921572d83eb070f70 theo diff BEFORE/AFTER. Chỉ MySQL đổi container ID/StartedAt;11container khác không đổi.
- StartedAt mới 2026-10-20T20:07:02.75661535Z, tương ứng03:07:02 ngày21/10 Việt Nam.
- Đối chiếu COUNT(*) của order_items/orders/products/sessions/users trả ROW_COUNTS_UNCHANGED. Đây là kiểm tra số dòng, không phải checksum toàn bộ dữ liệu hoặc restore test.
- API health HTTP200/database connected. Sau thời gian chờ35s: mysql_up1 và cả5collector đã thấy đều success1.
- H04 đã xử lý phần Docker log rotation MySQL/phpMyAdmin; Backend cũng đã có rotation theo runtime report. Chưa giới hạn RAM/CPU/PID cho Backend/MySQL/phpMyAdmin; chưa khẳng định H04 được giải quyết toàn bộ.
- Chưa ép sinh đủ15MB log để diễn tập rollover; chỉ xác minh cấu hình có hiệu lực. Log container cũ có thể mất khi recreate; không khẳng định đã giữ toàn bộ lịch sử đó.
- Bộ vận hành hiện tại gồm11file gốc, compose.security-phpmyadmin.yaml rồi compose.security-mysql-logging.yaml. Không bỏ overlay khi recreate về sau trừ rollback có chủ đích.
- Rollback nếu cần: bỏ riêng overlay MySQL mới, giữ overlay phpMyAdmin đã áp, đúng project/image/volume và recreate chỉ mysql. Rollback vẫn gián đoạn DB; không phục hồi dump cũ hoặc down -v. Chưa cần chạy rollback vì kiểm tra hiện tại đạt.
- Ảnh được đề xuất: screenshots/06-11-mysql-log-rotation.png; đã nhận bằng chứng chữ, chưa xác nhận file PNG đã lưu.

## C06 — Runbook và backup cấu hình sau rotation: hoàn tất phần backup

- Tạo tài liệu mới D:/Ecommerce/docs/security-operations.md, có đủ13file theo đúng thứ tự, hướng dẫn kiểm tra chỉ đọc và rollback riêng service. Kiểm tra số file trong array đạt13. Chưa xác nhận tài liệu đã copy lên Ubuntu, chưa đồng bộ toàn bộ source cấu hình Ubuntu về workspace Windows hoặc sửa README tổng thể.
- Ubuntu: /home/minishop/minishop-security-after-rotation.VMDOYM/config.tar.gz. Output tar inventory xác nhận13Compose files, checksumOK,15181byte; thư mục700, archive/manifest600.
- Windows: C:/Users/nhungpham/MiniShopPrivateBackups/minishop-security-after-rotation.VMDOYM/config.tar.gz; người dùng gửi OFF_VM_ROTATION_CONFIG_CHECKSUM_OK,15181byte. Chưa nhận đầy đủ output ACL/copy của lần này, không khẳng định riêng mọi bước đó đã được kiểm chứng lại.
- Các archive cũ được giữ nguyên theo quy trình đã hướng dẫn; không ghi đè, không giải nén áp dụng runtime.
- H03 cải thiện phần bảo toàn bộ cấu hình runtime hiện tại và runbook13file. Chưa hoàn tất bộ source bàn giao đã rà secrets, tài liệu cài mới/schema/secret provisioning, hoặc thử tái triển khai.
- Ảnh được đề xuất: screenshots/06-12-config-backup-13-files.png; có bằng chứng chữ checksum, chưa xác nhận file PNG đã lưu.

## C07 — Resource limits phpMyAdmin: hoàn tất trong phạm vi kiểm thử lab

- Snapshot mới người dùng gửi: RAM available632MiB, swap dùng124MiB/2GiB. Backend55.55MiB/11PIDs, phpMyAdmin41.09MiB/7PIDs, MySQL464.3MiB/37PIDs. Cả ba Memory0/NanoCpus0/PidsLimitnull, RestartCount0/OOMKilledfalse. Không coi snapshot là peak hoặc load test.
- File chuẩn bị mới D:/Ecommerce/compose.security-phpmyadmin-resources.yaml, chỉ phpmyadmin: mem_limit256m, memswap_limit512m, cpus0.50, pids_limit128.
- Người dùng phê duyệt riêng C07. Output so sánh bộ13file/14file trả ONLY_PHPMYADMIN_RESOURCES_CHANGED, SERVICE_COUNT12, đúng4trường resources và logging5m×3 giữ nguyên. Runtime sau áp dụng xác minh đủ các giá trị dưới; không khẳng định từng lệnh copy/preflight đã có output riêng đầy đủ.
- Mức này là ngân sách khởi đầu cho lab, không phải cấu hình tối ưu đã được chứng minh. Limit không đặt trước RAM; MemorySwap512MiB là tổng RAM+swap, không phải512MiB swap cộng thêm. PIDlimit tính cả threads; chưa thử concurrency/import lớn.
- Backup trước thay đổi là cấu hình13file C06 có checksum ngoàiVM. File mới không ghi đè file nguồn có sẵn.
- Đã recreate riêng phpMyAdmin; giới hạn có thể làm tác vụ quản trị nặng chậm hoặc lỗi khi chạm ngưỡng. Không import lớn hoặc stress test.
- Rollback dự kiến: bỏ riêng overlay resources mới, giữ2overlay logging đã áp, đúng image/project, recreate chỉ phpmyadmin; verify logging và service khác giữ nguyên. Không thay limits/tuning MySQL hoặc backend cùng bước.
- Inspect runtime: running, image giữ nguyên sha256:da3c72f9886fca93037b740c93fe1697a7924fe6790a58733814cee61ec49af8, Memory268435456/MemorySwap536870912/NanoCpus500000000/PidsLimit128; LogConfig5m×3, RestartCount0/OOMfalse. phpMyAdmin HTTP200, APIhealth200/databaseconnected.
- Snapshot sau áp: phpMyAdmin28.62MiB/256MiB,7PIDs, CPU0.01%; không restart/OOM trong output được gửi. Chưa kiểm tra peak/concurrency hoặc dài hạn.
- Diff BEFORE/AFTER chỉ phpMyAdmin đổi ID/StartedAt;11container khác không đổi, image không đổi. StartedAt mới2026-10-20T20:27:38.883265684Z, tương ứng03:27:38 ngày21/10 Việt Nam.
- Đăng nhập thử ban đầu dùng nhầm user Ubuntu minishop nên Access denied; không quy lỗi đó cho limits và không reset credential/grants. Sau hướng dẫn dùng đúng tài khoản DB, người dùng gửi ảnh phpMyAdmin truy vấn SELECT COUNT(*) AS product_count FROM minishop.products thành công, product_count4, thời gian hiển thị0.0020s.
- Cảnh báo không có cột duy nhất ở kết quả COUNT liên quan sửa lưới kết quả, không phải lỗi SQL. Không dùng ảnh COUNT làm bằng chứng toàn bộ chức năng hoặc dữ liệu nguyên vẹn.
- Bộ vận hành sau C07 gồm14file:13file trước đó rồi compose.security-phpmyadmin-resources.yaml. Đã cập nhật runbook trên Windows; chưa xác nhận đã sync runbook sang Ubuntu.
- H04 đã có limits riêng phpMyAdmin và rotation core services; Backend/MySQL vẫn chưa có limits riêng. Không đánh dấu H04 đã xử lý toàn bộ.
- Ảnh đã nhận trong chat cho tác vụ COUNT; tên lưu đề xuất screenshots/06-13-phpmyadmin-resource-limits.png, chưa xác nhận file PNG đã lưu.

## C08 — Chuyển Alloy sang Promtail: cutover thành công, đang nghiệm thu

- Người dùng chọn Promtail theo yêu cầu bài lab, đã biết Promtail EOL 02/03/2026. Không coi đây là nâng cấp bảo mật hoặc khuyến nghị production. Mọi thao tác Ubuntu do người dùng thực hiện.
- File mới: compose.promtail.yaml, logging/promtail.yaml, scripts/promtail-cutover.sh; bộ cấu hình có 15 file. Alloy giữ nguyên định nghĩa trong profile alloy-rollback; Promtail dùng image 3.6.7 pin digest linux/amd64.
- Preflight đã xác minh Docker 29.9.1/API 1.56/minAPI 1.40/linux amd64; image có trên Ubuntu, config-check exit 0. Diff cấu hình chỉ thêm Promtail và profile Alloy, không đổi cấu hình 12 service cũ còn lại. Docker discovery lọc đúng Nginx/Backend.
- Backup trước chuyển: /home/minishop/minishop-before-promtail.SKaFy3, cấu hình 14 file và baseline đã kiểm checksum. State Promtail riêng /home/minishop/.minishop-promtail, root:root, mode 700; không dùng lại checkpoint Alloy.
- Người dùng chạy script và gửi PROMTAIL_READY, OTHER_11_CONTAINERS_UNCHANGED, CUTOVER_OK, ALLOY_STOPPED; PROMTAIL_RUNNING; FRESH_NGINX_LOG_CONFIRMED; API_HEALTH_OK.
- Marker mới đã được tìm thấy qua Loki: /api/promtail-cutover-1792530832-5818. Đây là bằng chứng ingestion Nginx sau chuyển; không dùng log Alloy cũ làm bằng chứng Promtail.
- Backup lúc chuyển: /home/minishop/minishop-before-promtail.SKaFy3/cutover.MJalqH. Chín mục checksum OK: config-at-cutover.tar.gz, alloy-state-at-stop.tar.gz, positions-seeded.yaml, cutover-metadata.txt, containers-before.txt, containers-after.txt, promtail-targets.html, marker-query.json, marker-uri.txt. Chưa có bằng chứng copy bộ này ngoài VM.
- Có 13 service định nghĩa, dự kiến 12 container hoạt động và Alloy dừng có chủ đích. Script xác nhận 11 container ứng dụng/DB/monitoring khác giữ nguyên metadata; không recreate toàn stack.
- Script có nhánh cố rollback khi lỗi sau dừng Alloy; lần này không cần kích hoạt. Chưa diễn tập rollback, không bảo đảm mọi lỗi host/daemon đều tự khôi phục.
- Còn cần ảnh Grafana với marker, kiểm tra target Backend và log Backend mới, snapshot limits/restart/OOM sau chuyển. Không gây lỗi ứng dụng hoặc restart Backend chỉ để tạo log.
- Docker socket và quyền root của collector vẫn là rủi ro H02. Không đánh dấu toàn bộ logging/security nghiệm thu hoàn tất từ readiness hoặc một marker Nginx.

## Giới hạn còn lại

Chưa restore cô lập do môi trường thử chưa sẵn sàng; không khởi động Docker Desktop/MySQL thứ hai trên máy thiếu RAM. HTTPS, socket hardening, grants, limits Backend/MySQL, retention/redaction, IDOR, authenticated CSRF/logout, clean deployment và phần kiểm chứng khác vẫn theo bảng finding report. Không đánh dấu đã giải quyết High chỉ vì đã có backup và một phần limits/log rotation. Archive C03 giữ11file gốc; C06 bổ sung bản13file và Windows checksumOK; archive đó chưa bao gồm overlay resources thứ14 sau C07, cần backup bổ sung theo bước riêng, không ghi đè archive cũ.

Cập nhật C08: đã có backup 14 file trước chuyển và 15 file lúc chuyển trên Ubuntu tại các đường dẫn nêu trên; chưa xác nhận các bản mới này ngoài VM. Các bản lịch sử 11/13 file vẫn được giữ nguyên.

## C08 — Bằng chứng nghiệm thu bổ sung

- Đã nhận ảnh Grafana truy vấn marker /api/promtail-cutover-1792530832-5818: một log mới, status 404, service nginx, container ecommerce-nginx-1, project minishop, job docker.
- Promtail running, RestartCount 0, OOM false; snapshot 17.2 MiB/256 MiB, CPU 0.36%, 8 PIDs. Inspect xác minh root 0:0, ReadonlyRootfs true, CapDrop ALL, no-new-privileges, Memory 268435456, MemorySwap 536870912, NanoCpus 300000000, PidsLimit 64, Ports rỗng. Config và socket RO; positions RW. Rủi ro Docker socket/root vẫn còn.
- Docker Backend không có log trong một giờ; ID Backend có trong trang targets Promtail. Chưa chứng minh ingestion log Backend mới, giữ NOT VERIFIED.
- Sau chuyển: năm target Prometheus up=1, mysql_up=1, nginx_up=1.
- Người dùng kiểm checksum trên Ubuntu và Windows: cả chín file cutover đều OK. Bản ngoài VM tại C:/Users/nhungpham/MiniShopPrivateBackups/promtail-cutover.MJalqH. Đây là kiểm integrity, chưa phải restore test.
- Inventory cuối: 12 container Up; Alloy Exited (0) có chủ đích. MySQL, Nginx, cAdvisor healthy. Promtail không publish cổng; các dịch vụ quản trị vẫn bind loopback theo docker ps. Không coi snapshot này là kiểm thử truy cập LAN mới.
- Ảnh đề xuất: 06-15-promtail-nginx-cutover.png, 06-16-promtail-hardening.png, 06-17-final-containers-promtail.png. Đã nhận ảnh Grafana trong chat; chưa xác nhận tên file PNG được lưu trên đĩa.
- Chốt chuyển collector thành công trong phạm vi đã kiểm chứng. Restore cô lập, lịch backup, log Backend mới và các finding bảo mật khác vẫn còn; chưa nghiệm thu toàn bộ dự án.

## C15 — Backup tự động, 23/10/2026

Người vận hành cài script/service/timer:02:00giờViệtNam, timerenabledactive. Dump thử và hai lần startservice thủ công đạt; retention giữ7bản đã tích hợp, output3bản hợp lệ/giữ3/xóa0/RETENTION_APPLY_OK. Resultsuccess/exit0. Chưa kiểm chứng lần chạy tự nhiên, nhánh dọn khi hơn7bản, copyngoàiVM của backupmới hoặc restore. RPOmục tiêu24giờ có điều kiện; RTOchưa xác định. Xem docs/automated-backup.md.

Auth bổ sung: output runtime xác nhận login200, cookie trước logout200, Originlạ logout403/phiênvẫn200, logoutđúngOrigin204, cookiecũsau logout401. Chứng minh Origin guard cho logout và server-side session revocation; chưa bao phủ mọi CSRFendpoint hoặc session expiry tự nhiên. IDOR mới có xác nhận miệng của người dùng, chưa nhận outputbổsung.

Cập nhật C15: bản backup backup-20261023T083147Z-EUICom được kiểm gzip/checksum thành công, xuất riêng cho SCP và copy 4 file vào D:/MiniShopPrivateBackups/db-auto-20261023T083147Z-EUICom. Người dùng gửi OFF_VM_AUTOMATED_DB_BACKUP_CHECKSUM_OK; dump gzip 2979 byte. Copy ngoài VM thủ công, chưa tự đồng bộ; lần chạy timer tự nhiên/restore/nhánh dọn hơn7bản vẫn chưa xác minh. File nguồn systemd và helper lưu trên Windows; chưa commit/push trong lượt này.
