# MINISHOP — SECURITY AUDIT REPORT

Ngày: 20/10/2026 (Asia/Saigon). Phạm vi: **Giai đoạn A — static security audit**.

## Executive Summary

Đã kiểm tra mã nguồn và cấu hình tại `D:\Ecommerce`, bao gồm cấu hình nằm trong archive backup. Chỉ tạo báo cáo này; không sửa cấu hình/source, không đọc giá trị `.env`, không SSH, không chạy Docker/container, migration, reset DB, commit hoặc push. Không thực hiện kiểm thử runtime hay quét CVE qua mạng.

**Chưa đủ bằng chứng để nghiệm thu bảo mật toàn hệ thống.** Có các kiểm soát tốt: MySQL không publish port trong cấu hình đọc được; công cụ quản trị bind loopback; Backend/Nginx chạy non-root; Nginx có read-only, drop ALL capabilities, no-new-privileges; ứng dụng có Argon2id, session token ngẫu nhiên lưu hash, RBAC và Origin guard.

Rủi ro ưu tiên cao: HTTP truyền thông tin đăng nhập/session không mã hóa; cADVISOR có Docker socket và overlay backup bổ sung containerd socket; thiếu giới hạn RAM/log rotation cho ba dịch vụ cơ sở; bộ cấu hình bàn giao chưa phản ánh logging và các overlay đã dùng. Chưa xác minh grants MySQL, backup hiện tại, quyền host và cấu hình thực trên Ubuntu.

Người dùng xác nhận logging đã kiểm thử thành công, có dashboard và log Nginx/Backend cùng panel lỗi HTTP. Báo cáo ghi nhận kết quả đó, **không phủ nhận triển khai** chỉ vì bản Windows thiếu cấu hình; cũng không suy ra Loki đã được hardening từ việc dashboard có dữ liệu.

Quy ước:

- **CONFIRMED**: có bằng chứng tĩnh; chỉ khẳng định trong file/bản backup đã đọc, không mặc định đang áp dụng trên Ubuntu.
- **SUSPECTED**: có dấu hiệu nhưng chưa đủ bằng chứng kết luận tác động hoặc điều kiện khai thác.
- **NOT VERIFIED**: cần dữ liệu Ubuntu hoặc kiểm thử ở B. Mức độ là mức rủi ro nếu điều kiện tương ứng tồn tại.

## Evidence and Configuration Inventory

Không có `AGENTS.md` tại root `D:\` hoặc trong cây dự án được phát hiện. Git working tree có nhiều thay đổi/staged/untracked từ trước; không đụng đến index hay thay đổi sẵn có. `.env` không hiện diện ở root Windows tại thời điểm kiểm tra; Git chỉ liệt kê `.env.example` trong nhóm file env hiện được track. Chưa kiểm toán toàn bộ lịch sử Git, remote hoặc quyền NTFS/Ubuntu.

### Tất cả Compose tìm được

| Nguồn | File | Vai trò / kết luận |
|---|---|---|
| Working tree | `compose.yaml` | MySQL, phpMyAdmin, Backend |
| Working tree | `compose.nginx.yaml` | Nginx/React, app network, origin/proxy |
| Working tree | `compose.monitoring.yaml` | node-exporter, cADVISOR, mysql-exporter, Prometheus, Grafana |
| Archive, không có file rời hiện tại | `compose.cadvisor-fix.yaml` | cADVISOR image khác và containerd socket |
| Archive, không có file rời hiện tại | `compose.mysql-exporter-fix.yaml` | Tắt riêng collector slave_status |
| Archive, không có file rời hiện tại | `compose.nginx-metrics.yaml` | Bind mount Nginx monitoring config |
| Archive, không có file rời hiện tại | `compose.nginx-exporter.yaml` | Nginx exporter trên app/monitoring networks |
| Tham chiếu lịch sử, chưa đọc được file | `/home/minishop/minishop-nginx-backup.HMoT73/compose.nginx.rollback.yaml` | README:9, docs/nginx-deployment.md:46,64 ghi nhận image rollback; chưa xác minh còn áp dụng |

Archive: `docs/monitoring-backup/minishop-monitoring-nginx-good.hP93Pr/config.tar.gz`, đọc bằng `tar -tzf` và `tar -xOzf` (stdout, không giải nén xuống đĩa). SHA256 khớp entry `SHA256SUMS:1`: `86b5c90f1b6dac14a1befff92068c2df5240b95f4c88a0d90eca70c18c521e82`. Checksum chứng minh khớp manifest cục bộ, không chứng minh nguồn gốc hoặc độ mới.

Hai file `compose.nginx.yaml` và `compose.monitoring.yaml` trong archive giống working tree khi so sánh văn bản. `compose.yaml` khác: bản backup dùng APP_ORIGIN cố định localhost và không có mapping AUTH_ALLOWED_ORIGINS như bản Windows. Archive còn có `nginx/nginx.monitoring.conf` và Prometheus scrape config với job nginx-exporter. Không được lấy riêng ba file Windows làm bộ cấu hình vận hành chuẩn.

Thư mục `logging/loki` và `logging/promtail` có mặt nhưng không có file cấu hình. Không phát hiện Compose logging hoặc cấu hình Loki/Promtail trong archive trên. Những file chỉ được nhắc trong tài liệu không được tính là đã đọc. B chưa bắt đầu nên inventory Ubuntu chưa đầy đủ.

Ký hiệu **ARC::path:line** bên dưới là đường dẫn và dòng bên trong archive vừa nêu. Các đường dẫn khác tương đối với `D:\Ecommerce`.

### Ports và isolation theo cấu hình đọc được

| Dịch vụ | Publish host | Network / lưu ý |
|---|---|---|
| nginx | `192.168.197.135:80 -> 8080` | app_network; listener metrics 8081 chỉ có trong ARC config, không publish |
| backend | `127.0.0.1:3001 -> 3000` | db_network + app_network khi ghép overlay nginx |
| mysql | Không khai báo publish | db_network |
| phpmyadmin | `127.0.0.1:8081 -> 80` | db_network |
| prometheus | `127.0.0.1:9090 -> 9090` | monitoring_network |
| grafana | `127.0.0.1:3000 -> 3000` | monitoring_network |
| node-exporter, cadvisor | Không khai báo publish | monitoring_network |
| mysql-exporter | Không khai báo publish | db_network + monitoring_network |
| nginx-exporter (ARC) | Không khai báo publish | app_network + monitoring_network |
| Loki/Promtail | NOT VERIFIED | Thiếu cấu hình để đánh giá ports, mounts, retention, auth |

Nguồn: compose.yaml:19–20,42–43,76–83,94–96; compose.nginx.yaml:4–42; compose.monitoring.yaml:21–185; ARC::compose.nginx-exporter.yaml:1–24. Các network đều bridge, không khai báo `internal: true`. Tách network hạn chế kết nối trực tiếp giữa các nhóm; không phải firewall chặn egress hay bảo vệ khỏi container có host socket.

### Quyền và tài nguyên từng container

| Dịch vụ | User / hardening khai báo | Mounts và giới hạn |
|---|---|---|
| Backend | Dockerfile:13 USER node; NNP | Không mount host; chưa read_only/cap_drop; chưa RAM/CPU/PID/log rotation |
| Nginx | Dockerfile:12 USER nginx; NNP, read_only, cap_drop ALL | tmpfs /tmp 32m; 128m RAM, 0.5 CPU, 64 PID; logs 5m x3; ARC có config bind ro |
| MySQL | User thực phụ thuộc entrypoint/image, NOT VERIFIED; chưa NNP/cap_drop/read_only | mysql_data writable, init.sql ro; chưa RAM/CPU/PID/log rotation |
| phpMyAdmin | User thực NOT VERIFIED; chưa NNP/cap_drop/read_only | Không host mount; chưa RAM/CPU/PID/log rotation |
| node-exporter | User image NOT VERIFIED; NNP; chưa read_only/cap_drop | /proc, /sys, / ro; 48m, 0.1 CPU, 32 PID; logs 3m x2 |
| cADVISOR | User image NOT VERIFIED; NNP; chưa read_only/cap_drop | Docker socket, /sys, /var/lib/docker ro; ARC thêm containerd socket ro; 80m, 0.15 CPU, 32 PID; logs 3m x2 |
| mysql-exporter | User image NOT VERIFIED; NNP; chưa read_only/cap_drop | Password qua environment; 32m, 0.1 CPU,16 PID; logs 3m x2 |
| Prometheus | User image NOT VERIFIED; NNP; chưa read_only/cap_drop | Config ro, data volume rw;160m,0.25 CPU,64 PID; logs 5m x3 |
| Grafana | User image NOT VERIFIED; NNP; chưa read_only/cap_drop | Provisioning ro, data volume rw;128m,0.2 CPU,64 PID; logs 5m x3 |
| nginx-exporter (ARC) | User image NOT VERIFIED; NNP, read_only, cap_drop ALL | 32m,0.1 CPU,32 PID; logs 3m x2 |
| Loki/Promtail | NOT VERIFIED toàn bộ | Không suy đoán quyền hoặc mount từ chức năng thu log |

NNP = `no-new-privileges:true`. Không thấy `privileged:true` trong các Compose đã đọc; không kết luận quyền runtime từ việc vắng khóa này. Nguồn: hai Dockerfile, compose.yaml:5–83, compose.nginx.yaml:24–38, compose.monitoring.yaml:21–170 và ARC overlays.

## Current Security Controls

- Authentication: Argon2id (19456 KiB, timeCost 2, parallelism 1), password tối thiểu 12 ký tự, giới hạn 1024 byte; backend/src/services/password.service.js:3–15, auth.service.js:6–29.
- Session: token randomBytes(32), SHA256 token tại DB, TTL 7 ngày; truy vấn kiểm tra expiry và active user; logout xóa session. auth.service.js:41–66,155–174; repositories/auth.repository.js:68–86. Cookie HttpOnly, SameSite=Lax, Secure phụ thuộc req.secure; middleware/sessionCookie.js:29–44.
- RBAC phía server: admin router bắt buộc session rồi requireAdmin trước mọi route; đăng ký luôn role customer; routes/admin.routes.js:11–22, middleware/requireAdmin.js:1–7, repositories/auth.repository.js:15–18.
- Chống IDOR account: truy vấn chi tiết đơn gắn cả user_id và order_id; repositories/account.repository.js:46–51. Không thấy bypass quyền trong các tuyến đã đọc; chưa thay thế kiểm thử âm tính.
- Origin guard kiểm tra allowlist chính xác, từ chối thiếu/null/malformed Origin; áp dụng auth POST, profile PATCH, admin writes và checkout có cookie. authOrigin.js:13–55; routes/auth.routes.js:41–54; account.routes.js:10–14; admin.routes.js:12–13; order.routes.js:9–13. Guest checkout có chủ đích không yêu cầu session/Origin, cần kiểm soát abuse riêng.
- Login 10/15 phút/IP, register 5/giờ/IP: routes/auth.routes.js:17–39. Nginx ghi đè X-Forwarded-For từ remote_addr, TRUST_PROXY=1 ở overlay; nginx.conf:61–64, compose.nginx.yaml:6–7.
- SQL tham số hóa, transaction và khóa tồn kho trong checkout; giới hạn 50 sản phẩm/đơn, quantity tối đa 100; services/order.service.js:36–75; repositories/order.repository.js:20–24,83–119. Admin sort/update keys đi qua allowlist: services/admin.service.js:40–74,83–110; repositories/admin.repository.js:60–74.
- Nginx có CSP, nosniff, DENY, Referrer/Permissions Policy; body 100k, timeouts, deny dotfiles; log access JSON không ghi query/body/cookie/Authorization: nginx.conf:12–31,43–48,87–89. ARC monitoring config giữ các kiểm soát tương ứng tại dòng 12–31,58–63,102–104.
- `.gitignore:4–9` bỏ env và key/pem; `git check-ignore` xác nhận đường dẫn env ở root/backend/frontend bị ignore. Frontend Dockerfile-specific ignore có allowlist và chặn env/key; backend Dockerfile chỉ copy package manifests và src.
- Prometheus retention 3d/1GB, scrape 30s; Grafana tắt signup và yêu cầu password qua env; compose.monitoring.yaml:118–119,149–151; prometheus.yml:7–9. Đây là cấu hình tĩnh, chưa xác nhận hiệu lực runtime.

## Findings — theo mức độ

### High

| ID / trạng thái | Bằng chứng và vị trí | Tác động | Đề xuất |
|---|---|---|---|
| H01 CONFIRMED cấu hình HTTP; runtime NOT VERIFIED | compose.nginx.yaml:18; nginx.conf:38,43; sessionCookie.js:31–33; app.js:51–53 | HTTP không mã hóa login, PII và cookie session; cookie Secure không bật với request HTTP chuẩn. LAN không bảo đảm chống nghe lén/MITM. | Demo chỉ dùng dữ liệu/tài khoản thử và phạm vi LAN được chấp nhận; trước sử dụng dữ liệu thật triển khai TLS, origin HTTPS và proxy trust chính xác; nghiệm thu cookie Secure. HSTS chỉ sau khi HTTPS ổn định. |
| H02 CONFIRMED socket/host exposure; khai thác NOT VERIFIED | compose.monitoring.yaml:60–63; ARC::compose.cadvisor-fix.yaml:7–15; node-exporter host root ở compose.monitoring.yaml:29–32 | `:ro` trên Unix socket không biến API thành read-only; nếu process có quyền kết nối, socket Docker/containerd có thể mở rộng tác động sang host. Host root/DB storage cũng là dữ liệu nhạy cảm. NNP không giới hạn API được cấp. | Xác minh user/quyền socket, mounts cần thiết và network; loại mount không dùng sau thử nghiệm. Đánh giá proxy API allowlist nếu tương thích. Không thêm privileged hoặc mở socket qua TCP. |
| H03 CONFIRMED khoảng trống cấu hình bàn giao; bộ runtime NOT VERIFIED | Inventory ở trên; README:9; docs/nginx-deployment.md:40–46,64; ARC overlays; logging/loki và logging/promtail trống | Dùng ba file Windows có thể bỏ mất fix cADVISOR/exporter/Nginx metrics và toàn bộ logging; thiếu rollback overlay có thể đổi image. Tái triển khai không tái lập được trạng thái đã demo. | B lấy config_files/project/image và tên file thực tế trước; sau duyệt C đồng bộ cấu hình đã lọc secrets, ghi đúng thứ tự overlay và rollback. Không giải nén đè hoặc up toàn stack để thử. |
| H04 CONFIRMED thiếu giới hạn tại Compose; OOM/disk-full SUSPECTED | compose.yaml:5–83 không mem_limit/cpus/pids_limit/logging; monitoring limits:35–37,66–68,96–98,129–131,161–163 | VM 1.9 GiB dễ bị MySQL/backend/phpMyAdmin dùng quá ngân sách; log ba service phụ thuộc daemon defaults chưa biết. Full disk gây lỗi DB/TSDB. | Đo RAM/swap/disk, OOM trước; phân bổ giới hạn phù hợp, tuning MySQL nếu cần kế hoạch riêng; rotation từng service. Không áp limit thấp tùy ý cho MySQL đang chạy. |
| H05 NOT VERIFIED backup hiện tại; CONFIRMED thiếu runbook tự động đầy đủ trong repo | docs/MINISHOP_PROGRESS_REPORT.md:36,117; docs/nginx-deployment.md:48–50; archive cấu hình và dashboard không phải dump DB | Có ghi nhận restore cô lập lịch sử nhưng chưa chứng minh bản mới, lịch backup, bản ngoài VM, RPO/RTO, mã hóa và khả năng phục hồi dữ liệu hiện tại. Named volume không phải backup. | Chốt RPO/RTO; backup DB nhất quán, cấu hình và Grafana phù hợp; checksum, quyền hạn chế và bản ngoài VM. Restore vào môi trường cô lập có ngân sách tài nguyên; không restore lên production. |
| H06 NOT VERIFIED grants và provisioning exporter/app | compose.yaml:10–13,66–68; compose.monitoring.yaml:85–95; init.sql:1–36 không tạo exporter; không có GRANT exporter trong SQL repo | Không biết app có DDL/quyền vượt nhu cầu, exporter có quyền ghi/ALL/GRANT OPTION hoặc số connection quá lớn hay không. Không khẳng định exporter đã có least privilege từ comment. | B kiểm tra metadata tài khoản, host matched và grants, không lấy authentication_string; so collector thực với quyền cần. Giữ app/migration/exporter tách quyền; giới hạn exporter connections phù hợp, không mặc định SELECT toàn server là tối thiểu. |

### Medium

| ID / trạng thái | Bằng chứng và vị trí | Tác động | Đề xuất |
|---|---|---|---|
| M01 CONFIRMED thiếu read_only/cap_drop/NNP ở một số service | Ma trận container; compose.yaml:5–83 và compose.monitoring.yaml:21–170 | Tăng khả năng sửa filesystem hoặc dùng quyền không cần khi service bị xâm nhập. User image thực chưa xác minh; không kết luận tất cả chạy root. | B inspect User/CapAdd/CapDrop/ReadonlyRootfs/SecurityOpt và effective UID. C harden từng service; MySQL/Grafana/Prometheus cần writable data paths, không read-only mù quáng. |
| M02 CONFIRMED không internal network/egress policy | compose.yaml:94–96; compose.nginx.yaml:40–42; compose.monitoring.yaml:182–185 | Các bridge tách nhóm nhưng chưa hạn chế egress; mọi peer monitoring có thể chạm exporter; exporter hai mạng mở rộng vùng tin cậy. | Xác nhận connectivity cần thiết, firewall host/Docker và published ports; cân nhắc internal mạng DB/monitoring sau thử DNS/egress. Không gắn Nginx vào DB network. |
| M03 CONFIRMED thiếu limiter cho checkout/API chung | nginx.conf:9–104 và ARC monitoring conf:9–119 không limit_req/limit_conn; routes/order.routes.js:9–13 không limiter | Guest có thể đặt đơn/spam giữ tồn kho hoặc gây tải DB; giới hạn login không bảo vệ API còn lại. Không có stress test chứng minh DoS. | Đề xuất limiter nhỏ theo endpoint/IP và xử lý retry hợp lý; chốt guest checkout policy. Chỉ kiểm thử vài request có kiểm soát trong B, không gửi loạt đơn thật. |
| M04 CONFIRMED env example/tài liệu không khớp | .env.example:1–6 thiếu MYSQL_EXPORTER_PASSWORD, GF_SECURITY_ADMIN_PASSWORD; compose.monitoring.yaml:86,149 yêu cầu; README:225–226 dùng tên GRAFANA_ADMIN_* khác | Cài mới fail hoặc đặt biến sai; origin IP hardcode giảm khả năng chuyển môi trường. | C bổ sung tên biến placeholder đúng, danh sách required/optional và origin từng môi trường; không ghi đè .env thật. |
| M05 CONFIRMED schema khởi tạo chưa đủ cho cài mới | compose.yaml:17 chỉ mount init.sql; init.sql:1–36; migrations/001_auth.sql:4–41; 002_product_visibility.sql | Volume mới thiếu users/sessions/orders.user_id/products.is_active mà code yêu cầu; phục hồi/tái triển khai có thể thất bại. | Viết quy trình schema-version và bootstrap/migration có kiểm soát, thử ở môi trường riêng sau duyệt. Không tự chạy migration trên DB hiện tại. |
| M06 CONFIRMED resource/retention chỉ một phần; logging NOT VERIFIED | compose.monitoring.yaml:118–119; logging config thiếu; ma trận giới hạn | Monitoring hiện có tổng RAM limit 448 MiB + Nginx128 =576 MiB; ARC nginx-exporter thêm32 =608 MiB, chưa tính DB/backend/phpMyAdmin/Loki/Promtail/OS. Retention1GB không phải quota toàn volume gồm WAL/head/compaction. | Đo ngân sách thực, retention Loki/compactor/log rotation/positions và disk alerts; không giảm retention khi chưa chấp nhận mất lịch sử. |
| M07 SUSPECTED log chứa thông tin nội bộ/PII | app.js:65,114–115 in error/err; repositories/auth.repository.js:39 in rollbackError; nginx.conf:28–30 có IP/URI | Lỗi mysql2 có thể chứa SQL/params; pipeline Loki chưa đọc nên chưa chứng minh redaction/access/retention. Không xác nhận đã lộ secret. | Review định dạng lỗi an toàn, redaction ở nguồn và collector; giới hạn người xem logs và retention PII. Không gửi raw logs hoặc inspect toàn bộ để kiểm tra. |
| M08 NOT VERIFIED exposure/auth Grafana/Prometheus/Loki thực tế | compose.monitoring.yaml:125–128,149–160 bảo vệ bằng loopback; Loki không có cấu hình; ARC::nginx/nginx.monitoring.conf:37–49 | File bổ sung, proxy hoặc Docker/firewall có thể thay exposure. Prometheus/exporter/stub_status không có auth cấu hình; nội bộ vẫn có peer truy cập. | B xác minh port binding/network/proxy và truy cập từ Windows; Grafana yêu cầu login, signup/anonymous theo config thực, Loki chỉ nội bộ/tunnel có kiểm soát. Không kết luận public chỉ vì không có auth. |
| M09 CONFIRMED session hết hạn không có cleanup được phát hiện; tăng disk SUSPECTED | auth.service.js:6,59–66; auth.repository.js:68–86; migrations/001_auth.sql:17–32 | Session hết hạn không được chấp nhận, nhưng bản ghi có thể tích lũy; nhiều lần login cấp session mới. | Đo số lượng/index/dung lượng, chốt cleanup và giới hạn session sau phê duyệt; không DELETE trong A/B read-only. |

### Low và giới hạn đánh giá

| ID / trạng thái | Bằng chứng và vị trí | Tác động / đề xuất |
|---|---|---|
| L01 CONFIRMED readiness/alerts chưa đầy đủ trong file đọc | Backend không healthcheck Compose; monitoring không healthcheck/rule_files; app.js:56–70; compose.monitoring.yaml | Running không chứng minh ready hoặc dữ liệu đúng. B dùng health endpoints/metrics và dữ liệu panel; C bổ sung probes nhẹ và alert cần thiết. Image có healthcheck sẵn hay không: NOT VERIFIED. |
| L02 CONFIRMED tags không pin digest; CVE NOT VERIFIED | backend/Dockerfile:1; frontend/Dockerfile:1,9; image tags trong Compose/ARC | Rebuild có thể thay artefact. Lưu image ID/digest, lockfiles và SBOM/scan ở quy trình riêng sau duyệt; không gán CVE hay tình trạng hỗ trợ phiên bản từ tên tag. |
| L03 CONFIRMED CSP cho phép inline styles và ảnh HTTP/HTTPS bất kỳ | nginx.conf:48; ARC::nginx/nginx.monitoring.conf:63; admin.service.js:59–66 | Cân nhắc thu hẹp img-src theo nguồn thực và HTTPS, giữ tương thích UI; URL ảnh ngoài còn có privacy/mixed-content risk. Không có bằng chứng XSS từ các khai báo này. |
| L04 NOT VERIFIED secrets và supply chain đầy đủ | .gitignore:4–9; env absence hiện tại; archive config và Git working state | Ignore không xóa secret đã commit trước đây. Chưa quét lịch sử, ảnh, toàn bộ dashboard exports, npm transitive CVE, host permissions hay secret rotation. B/C có thể review cục bộ với output chỉ path/dòng và redaction; không in giá trị hoặc hash xác thực. |

## Risk Assessment

| Nhóm | Đánh giá hiện tại | Điều kiện chấp nhận |
|---|---|---|
| Confidentiality | High nếu HTTP mang dữ liệu thật hoặc socket bị lạm dụng | HTTPS trước dữ liệu thật; kiểm soát socket/mount và tools nội bộ |
| Integrity | High chưa xác minh grants/restore và provenance | Runtime RBAC/IDOR đạt; grants phù hợp; config đúng bộ; backup restore được |
| Availability | High với VM1.9GiB và đĩa nhỏ | Không OOM/restart loop; đủ headroom/disk cho backup và TSDB, rotation/retention rõ |
| Reproducibility | High với overlays chỉ trong archive/Ubuntu và logging config thiếu | Bộ cấu hình đầy đủ, đúng thứ tự, tài liệu không secrets, schema/restore có quy trình |

Không xác nhận sự cố xâm nhập hay lỗ hổng khai thác thực tế. Chưa có finding Critical đã chứng minh. Có thể nghiệm thu demo HTTP LAN với dữ liệu thử nếu người dùng chấp nhận rủi ro có ghi nhận; không coi đó là đạt chuẩn triển khai Internet/dữ liệu thật.

## Runtime Verification Plan — chỉ sau khi phê duyệt A

**B chưa thực hiện.** Mỗi lượt hướng dẫn tối đa 1–3 lệnh, nêu rõ Ubuntu hay Windows, mục đích/kết quả mong đợi rồi chờ output. Người dùng tự thao tác Ubuntu; trợ lý không tự SSH. Không xuất docker inspect/config/env/log toàn bộ. Dùng format/select trường an toàn, không password/token/cookie/auth hash. Không up/down/recreate/migration ở bước kiểm tra đọc.

| Thứ tự | Môi trường / cách kiểm tra dự kiến | Kết quả cần thấy |
|---|---|---|
| B01 Provenance | Ubuntu: `sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'`, sau đó inspect riêng labels project/config_files/working_dir cho container đã xác định; kiểm kê Compose ở đúng thư mục dự án và backup được nhắc | Đủ container kể cả Loki/Promtail; biết project và đầy đủ thứ tự file thực tế, không đoán tên container |
| B02 Ports/networks | Ubuntu: `sudo ss -lntup`; inspect chọn PortBindings/Networks; network inspect chỉ chọn peers/Internal; Windows thử kết nối các port đã xác định | Chỉ website bind LAN theo thiết kế; MySQL/exporters/Loki không public, quản trị loopback; DB/app/monitoring isolation đúng. ss riêng lẻ không đủ chứng minh Docker exposure/firewall |
| B03 Hardening | Ubuntu: inspect chọn User, Privileged, ReadonlyRootfs, SecurityOpt, CapAdd/CapDrop, Mounts, Memory/PidsLimit/LogConfig; effective UID từng service khi cần | Nginx/backend non-root; NNP/ro/caps đúng; không mount thừa, không socket TCP; xác định quyền socket thực |
| B04 Capacity | Ubuntu: `free -h`, `df -h`, `sudo docker stats --no-stream`; lượt sau `swapon --show` và disk summary nếu cần | Biết RAM/swap/disk/headroom, không OOM/restart; đủ tài nguyên trước backup/restore. Không tải nặng |
| B05 Health/metrics | Ubuntu loopback/tunnel: Prometheus ready/Targets, query up, mysql_up, collector success, Nginx metrics, cADVISOR series từng container; MySQL SELECT1 bằng credential có sẵn được nhập kín | Tất cả target cần thiết UP, mysql_up1, collector cần dùng thành công; không coi No data là0; mysqladmin ping riêng không chứng minh app login/query được |
| B06 Grafana/Loki | Windows qua tunnel hiện có hoặc người dùng thiết lập: dashboard/Explore; LogQL dùng labels thực lấy từ Explore; `/ready` Loki trên endpoint nội bộ đã xác định | Dashboard container/MySQL/Nginx có dữ liệu đúng; log Nginx/Backend và thống kê lỗi HTTP trả dữ liệu, thời gian/labels đúng; không tạo lỗi hàng loạt |
| B07 Headers | Ubuntu: `curl -sS -D - -o /dev/null http://192.168.197.135/`; lượt riêng cho asset, /api/health và route404 (lọc Set-Cookie nếu endpoint auth) | CSP/nosniff/DENY/Referrer/Permissions Policy trên HTML/API/lỗi; không SPA fallback cho API. Với HTTP hiện tại không yêu cầu HSTS |
| B08 Auth/RBAC/CSRF | Trình duyệt bằng tài khoản thử: guest/customer/admin, Origin thiếu/sai/đúng; account order của người khác; logout/expired session; thao tác ghi chỉ dữ liệu thử được đồng ý | Guest401, customer403 admin API; admin200; không đọc đơn người khác; request ghi cookie+Origin sai403; cookie flags đúng scheme; logout thu hồi session. 429 kiểm tra nhẹ, không brute-force |
| B09 DB privilege/secrets | Ubuntu: truy vấn metadata User/Host/plugin/account status và grants đã chọn cho app/exporter; không select authentication_string, không in env hoặc password | Exporter không quyền ghi/ALL/GRANT OPTION; quyền theo collector, connection limit phù hợp; app không quyền quản trị server. Chỉ tên biến/trạng thái hiện diện, không giá trị secret |
| B10 Backup integrity | Xác định bản mới/lịch/RPO/RTO, quyền file/bản ngoài VM; `sha256sum -c` đúng manifest đã chọn (chỉ output OK/FAIL, không dump nội dung) | Checksum OK, timestamp đáp ứng RPO, không nhầm backup config với DB backup; đủ đĩa và bảo vệ PII |
| B11 Restore cô lập | Chỉ soạn lệnh sau khi chốt tài nguyên và môi trường thử, có phê duyệt riêng cho việc tạo/ghi DB thử; không chạy đồng thời thêm MySQL nếu VM thiếu RAM | Project/volume/network riêng, không mount mysql_data production hoặc publish DB; import bản copy, đối chiếu schema/counts và integrity không lộ nội dung; đo RTO, xác nhận production không đổi |
| B12 Final acceptance | Đối chiếu toàn bộ container/image/config hash và kiểm tra website/monitoring/logging sau các bước được duyệt | Không container lỗi/OOM; metrics/logs hiện tại; bằng chứng và rủi ro còn lại được ký nhận |

Phê duyệt B không tự phê duyệt thay đổi C, stress test hoặc restore vào production. Backup/restore thử có ghi dữ liệu trong môi trường cô lập sẽ được trình kế hoạch cụ thể trước khi thực hiện.

### Ảnh minh chứng — nhắc chụp sau khi từng kiểm tra đạt

| PNG đề xuất | Lệnh/màn hình sau khi đã xác định endpoint/container | Cần thấy, cần che |
|---|---|---|
| `06-01-network-ports.png` | B02: docker ps formatted + ss + inspect networks chọn trường, chia ảnh nếu cần | LAN chỉ cổng được duyệt, loopback admin, DB không publish và peers tách mạng |
| `06-02-container-hardening.png` | B03: inspect chọn User/NNP/ReadonlyRootfs/CapDrop/Mounts | Hardening và mounts đúng từng service; không Env |
| `06-03-http-security-headers.png` | B07: curl headers cho website/API | Các security headers và status; không Set-Cookie |
| `06-04-auth-rbac.png` | B08: DevTools/status guest401/customer403/admin200 và CSRF403 | Endpoint/status và role thử; che request/response cookies, password, PII |
| `06-05-backup-integrity.png` | B10: sha256sum -c đúng manifest | OK, thời điểm backup và quyền file, không nội dung dump |
| `06-06-isolated-restore.png` | B11: script/lệnh kiểm tra được duyệt, output schema/count/integrity/RTO | RESTORE_OK và isolation, production không đổi; không token_hash/password_hash/PII |
| `06-07-final-containers.png` | B12: docker ps formatted, health và restart/OOM fields chọn lọc | Toàn bộ service kể cả logging, không restart loop/unhealthy |
| `06-08-prometheus-grafana.png` | B05/B06: Targets và dashboard | Target UP và series từng container/Nginx/MySQL có dữ liệu |
| `06-09-loki-logql.png` | B06: Explore query đúng labels thực, panel lỗi HTTP | Log Nginx/Backend + query thống kê; che dữ liệu nhạy cảm trong logs |

## Remediation Plan — đề xuất, chưa phê duyệt C

Mỗi bước C phải trình file/diff cụ thể, backup cấu hình trước sửa, ảnh hưởng, rollback và kiểm thử. Không thay hàng loạt.

| Ưu tiên | File/phạm vi dự kiến | Ảnh hưởng / kiểm thử sau sửa |
|---|---|---|
| 1 | README.md, .env.example, các overlay/config logging thực tế sau khi B xác định | Đồng bộ runbook/biến mẫu và bộ cấu hình; so diff không secret, validate đúng overlay trong chế độ không in env; không ghi đè .env thật |
| 2 | compose.monitoring.yaml + cadvisor-fix thực, logging Compose thực | Giảm quyền/socket/mount chỉ khi chứng minh không cần; có thể mất discovery/log collection. Kiểm thử series từng container, Targets và logs trước/sau |
| 3 | compose.yaml và overlay tài nguyên/rotation được chọn | Giới hạn có thể cần recreate từng service, MySQL gây gián đoạn riêng; chọn maintenance window nếu cần. Kiểm tra OOM, health, website/DB, thu log Loki tiếp tục |
| 4 | nginx config/overlay TLS, APP_ORIGIN và cookie/proxy config nếu cần | TLS/origin ảnh hưởng login và trình duyệt; kiểm tra cert/chain, HTTPS origin, Secure cookie, headers và CSRF. Không bật HSTS sớm |
| 5 | nginx config và/hoặc routes/order.routes.js | Rate limit có thể chặn khách hợp lệ; thử số request nhỏ, 429 và phục hồi, checkout thử an toàn |
| 6 | Quy trình DB grants/backup/schema, scripts mới được duyệt riêng | Thay quyền có thể gãy ứng dụng/exporter; kiểm tra từng chức năng/collector, restore riêng. Không migration/reset production trong kế hoạch tự động |
| 7 | Logging/error handling, session maintenance, healthchecks/alerts | Redaction có thể giảm chi tiết debug; cleanup là thay đổi dữ liệu cần duyệt; test lỗi an toàn và theo dõi dung lượng |

## Rollback

- Trước C lưu đúng file sẽ sửa cùng quyền/hash, bộ Compose và thứ tự, project name, image ID/digest, trạng thái baseline. Backup secrets phải kín và ngoài báo cáo. Không đổi project name/volume production.
- Chỉ phục hồi config/image service vừa thay, dùng đầy đủ bộ overlay đã xác minh và `--no-deps` khi phù hợp; không down toàn stack. Nginx config bind mount hay baked-in image phải phân biệt để rollback đúng artefact.
- Mount/capability rollback: trả đúng cấu hình trước sửa, recreate riêng exporter/collector rồi kiểm tra discovery/metrics/logs; không thêm privileged để chữa nhanh.
- Giới hạn/logging rollback: trả thông số cũ, recreate service liên quan theo kế hoạch; rotation/retention đã xóa dữ liệu không được phục hồi bằng việc đổi config lại.
- HTTPS rollback cần đồng bộ origin/proxy/cookie; không dùng HTTP rollback với dữ liệu thật ngoài phạm vi đã chấp nhận. HSTS có ảnh hưởng phía client, phải xét trước khi bật.
- Database: backup DB không phải rollback mặc định cho thay đổi Nginx/exporter. Không restore dump cũ lên production, không reset mật khẩu/GRANT/migration khi chưa duyệt kế hoạch riêng. Không downgrade image DB/Grafana mù quáng vì có thể có thay đổi định dạng dữ liệu.
- Không xóa volume, không `down -v`, không prune volumes, không đổi storage driver, không commit/push.

## Acceptance Criteria

1. Xác minh đầy đủ file Compose runtime, thứ tự và image; cấu hình source/backup/runbook đủ tái lập cả logging, không chứa secrets.
2. Chỉ website public trong phạm vi đã duyệt; DB/exporters/Loki không public ngoài thiết kế; Grafana/Prometheus/admin qua loopback/tunnel có kiểm soát; mạng tách đúng.
3. Container user/caps/NNP/read-only/mounts có bằng chứng và ngoại lệ có lý do; host socket có đánh giá và quyết định rõ.
4. Authentication/RBAC/IDOR/Origin guard đạt kiểm thử âm tính; không lộ cookie/token/password; HTTPS và cookie Secure trước dữ liệu thật, hoặc ngoại lệ demo HTTP LAN được ghi nhận rõ.
5. MySQL health/query và quyền app/exporter phù hợp collector; không quyền quản trị/ghi không cần thiết cho exporter.
6. VM đủ RAM/swap/disk cho vận hành và backup; không OOM/restart loop; rotation/retention toàn bộ service được kiểm chứng, có dự phòng cho WAL/compaction/backup.
7. Backup mới đạt RPO đã thống nhất, checksum OK, có bản ngoài VM và restore cô lập đạt schema/integrity/RTO; production không thay đổi do thử restore.
8. Tất cả container cuối cùng ổn định; Targets UP và metrics đúng, Grafana có dữ liệu, Loki trả log Nginx/Backend và thống kê lỗi HTTP; không coi ảnh lịch sử thay cho kiểm tra hiện tại.
9. Findings High được xử lý hoặc có chấp nhận rủi ro cụ thể; NOT VERIFIED trọng yếu có kết quả trước khi ký nghiệm thu. Ảnh PNG theo kế hoạch được chụp sau khi đạt, đã che bí mật/PII.

**Dừng tại cuối Giai đoạn A. Chờ người dùng phê duyệt báo cáo trước khi hướng dẫn B; chưa thực hiện hoặc phê duyệt bất kỳ thay đổi C nào.**
