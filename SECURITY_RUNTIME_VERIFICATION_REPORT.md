# MINISHOP — SECURITY RUNTIME VERIFICATION REPORT

Ngày lập: **21/10/2026 — Asia/Saigon**.

Tài liệu gốc: [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md).

## 1. Kết luận và phạm vi

**Hệ thống đang hoạt động tại thời điểm kiểm tra cuối đợt; chưa đủ điều kiện nghiệm thu bảo mật toàn bộ.** Đã xác minh 12 container running, restart count 0, OOM flag false, API kết nối DB thành công, Prometheus/Grafana/Loki sẵn sàng, 5 target UP và mysql_up/nginx_up bằng 1.

Các rủi ro còn lại gồm HTTP và session không Secure, host sockets của Alloy/cAdvisor, quyền MySQL app/root rộng, resource limits/log rotation chưa đầy đủ, backup DB cũ, chưa xác minh bản ngoài VM và chưa thực hiện restore cô lập. IDOR được bỏ qua theo lựa chọn người dùng. CSRF trên request có session và thu hồi session khi logout chưa kiểm thử.

Trợ lý **không tự SSH hoặc chạy lệnh trên Ubuntu**. Kết quả runtime trong báo cáo lấy từ output/ảnh người dùng gửi và xác nhận bằng lời trong cuộc trò chuyện. Không suy ra kết quả từ lệnh mới chỉ được đề xuất. Trợ lý chỉ đọc file cục bộ và tạo báo cáo; không sửa source, cấu hình, .env, quyền DB, Docker, Git index, commit hoặc push. Người dùng đã phê duyệt riêng việc đăng nhập Admin/Customer thử để tạo session. Có các GET healthcheck, một GET API không tồn tại và POST login body rỗng để kiểm tra guard; không tạo đơn hàng, migration, reset hoặc restore production.

Đây là bản chốt **đợt kiểm tra B đã thực hiện**, không phải tuyên bố mọi mục B đều PASS. Giai đoạn C **chưa được phê duyệt hoặc thực hiện**.

## 2. Quy ước bằng chứng

- **CONFIRMED:** được chứng minh trong output hoặc ảnh đã gửi; phạm vi cụ thể ghi tại từng mục.
- **USER-CONFIRMED:** người dùng xác nhận giao diện hoạt động, chưa có ảnh/status chi tiết tương ứng.
- **SUSPECTED:** giả thuyết chưa chứng minh nguyên nhân.
- **NOT VERIFIED:** chưa kiểm tra hoặc chưa đủ bằng chứng.
- PASS cho phép kiểm tra cụ thể không đồng nghĩa finding liên quan đã được khắc phục hoàn toàn.

Ubuntu trả thời gian UTC. Ví dụ `2026-10-20T17:36:22+00:00` tương ứng **00:36:22 ngày 21/10/2026** tại Việt Nam. Báo cáo không tự đổi timezone host. Thời điểm snapshot khác nhau; không coi số liệu tức thời là kết quả kiểm thử tải hoặc độ ổn định dài hạn.

## 3. Checklist B01–B12

| Bước | Trạng thái | Bằng chứng và giới hạn |
|---|---|---|
| B01 Inventory/provenance | CONFIRMED phần inventory/validation | 1 project ecommerce, 12 container, 11 Compose files tồn tại, config --quiet OK, --services đủ 12. Nội dung file trên đĩa không được chứng minh giống toàn bộ cấu hình lúc tạo container. |
| B02 Ports/network | CONFIRMED bindings/peers và phép thử Windows | Website TCP80 truy cập được; 11 cổng nội bộ thử từ Windows không kết nối được. 3 bridge networks tách nhóm. Egress, firewall đầy đủ, truy cập container IP từ các nguồn khác và proxy tới tools: NOT VERIFIED. |
| B03 Hardening | CONFIRMED theo inspect/process metadata | Không privileged; user, caps, NNP, mounts, sockets, PID/user namespace đã đối chiếu ở phạm vi dưới. Chưa rà mọi effective syscall/capability của từng worker. |
| B04 Capacity | CONFIRMED snapshot; chưa load test | RAM/swap/disk, giới hạn, logging, restart/OOM, Docker/containerd usage. Không stress test; không chứng minh không có OOM trong lịch sử. |
| B05 Metrics | PASS các phép thử đã chạy | Prometheus ready, 5 UP, 5 MySQL collectors success, đủ 12 container memory series, host/MySQL/Nginx metrics hợp lý. |
| B06 Grafana/logging | PASS phần chức năng được chứng minh; một phần USER-CONFIRMED | cAdvisor dashboard có ảnh; MySQL/Nginx dashboard và Explore hai nguồn do người dùng xác nhận. Loki API có Backend lịch sử và Nginx mới; ảnh LogQL đếm lỗi404. Chưa nghiệm thu toàn bộ alerts/redaction/retention. |
| B07 Headers | PASS 3 response đã thử | HTML200, health JSON200, API lỗi JSON404 đều có 5 header đã yêu cầu. Chưa thử mọi asset/502/503 response. |
| B08 Auth/RBAC/Origin | PARTIAL | Guest401, Admin role và dashboard200, Customer role/profile và thông báo từ chối Admin, cookie flags, login Origin cases. Customer HTTP status chưa chụp trực tiếp. IDOR bỏ qua; authenticated CSRF/logout/rate-limit runtime còn thiếu. |
| B09 MySQL/secrets | CONFIRMED; có finding cần C | App dùng đúng minishop_app; exporter không có quyền ghi trong grants đọc; app ALL trên DB; root@% quản trị rộng. .env600, secrets hạn chế, index không track env thật. Chưa kiểm toán lịch sử Git/secret rotation. |
| B10 Backup | PARTIAL | Dump17/10 và config19/10 checksum OK, file600/dir700; không crontab minishop/root, không thấy MiniShop timer. RPO/RTO, backup ngoài VM, cron hệ thống và backup hiện hành chưa xác minh. |
| B11 Restore | NOT VERIFIED — chưa thực hiện | Windows context local nhưng engine không hoạt động, RAM free0.83GiB; không khởi động thêm MySQL. Chỉ có định hướng kế hoạch, chưa có kế hoạch thực thi được duyệt. |
| B12 Final snapshot | PASS phần trạng thái cuối đợt | 12 running, restart0/OOMfalse, health DB200, 3 readiness/health200, 5 UP, mysql_up/nginx_up1, RAM available780MiB, disk79%. Không phải nghiệm thu toàn bộ security. |

## 4. Cấu hình và kiến trúc runtime đã xác minh

### 4.1 Bộ Compose

Project: `ecommerce`, working directory `/home/minishop/Ecommerce`. Thứ tự đầy đủ ghi nhận từ nhãn Backend/Alloy và Compose project listing:

1. compose.yaml
2. compose.nginx.yaml
3. compose.monitoring.yaml
4. compose.cadvisor-fix.yaml
5. compose.mysql-exporter-fix.yaml
6. compose.nginx-metrics.yaml
7. compose.nginx-exporter.yaml
8. compose.grafana-smtp.yaml
9. compose.logging.yaml
10. compose.loki.yaml
11. compose.alloy.yaml

Cả 11 file xuất hiện trong kết quả find. Ghép đúng thứ tự bằng `compose_args` rồi `config --quiet` trả `COMPOSE_CONFIG_OK`; `config --services` trả đủ 12 service. Container được tạo tại những lần khác nhau nên nhãn config_files không giống nhau; điều đó chưa tự chứng minh sai cấu hình. Overlay nginx.rollback còn ở backup nhưng không có trong nhãn runtime hiện thu được. **Collector hiện tại là Alloy, không phải Promtail.** Không thấy container Compose đã dừng trong inventory đã gửi.

### 4.2 Ports và networks

| Dịch vụ | Host binding đã xác minh |
|---|---|
| nginx | 192.168.197.135:80 →8080 |
| backend | 127.0.0.1:3001 →3000 |
| grafana | 127.0.0.1:3000 →3000 |
| prometheus | 127.0.0.1:9090 →9090 |
| loki | 127.0.0.1:3100 →3100 |
| phpmyadmin | 127.0.0.1:8081 →80 |
| mysql, exporters, alloy | Không có host-port mapping trong inspect |

Windows TCP probe: port80 True; 3000,3001,3100,8081,9090,3306,33060,8080,9100,9104,9113 đều False. Chỉ kết luận cho nguồn Windows và các cổng đã thử. Host SSH22 lắng nghe IPv4/IPv6; cấu hình bảo mật SSH chưa kiểm toán.

| Network | Thành viên |
|---|---|
| ecommerce_app_network | nginx, backend, nginx-exporter |
| ecommerce_db_network | mysql, backend, phpmyadmin, mysql-exporter |
| ecommerce_monitoring_network | prometheus, grafana, loki, alloy, cadvisor, node-exporter, mysql-exporter, nginx-exporter |

Cả ba driver bridge, internal=false. Nginx không nằm trong DB network. Không container nào có network_mode host trong output. Chưa thử egress hoặc mọi đường đi giữa container/host.

### 4.3 Container hardening

| Service | User/config/process đã thấy | Kiểm soát và giới hạn |
|---|---|---|
| backend | Config node; process non-root trên host | NNP; rootfs writable; cap_drop null; không mount; RAM/CPU/PID không giới hạn riêng; logs5m×3 |
| nginx | Config nginx; process non-root | NNP, drop ALL, rootfs RO, /tmp tmpfs32m; config bind RO; RAM128MiB |
| nginx-exporter | 1001:1001 | NNP, drop ALL, rootfs RO; RAM32MiB |
| alloy | UID/GID0 thực | NNP, drop ALL hiệu lực, rootfs writable; Docker socket RO, config RO, alloy_data RW; RAM256MiB |
| cadvisor | UID/GID0 thực | NNP, còn capabilities; Docker/containerd sockets RO, /sys RO, /var/lib/docker RO rslave; RAM80MiB |
| loki | Config10001 | NNP; rootfs writable; config RO, loki_data RW; RAM256MiB |
| grafana | Config472 | NNP; rootfs writable; provisioning/SMTP secret RO, grafana_data RW; RAM128MiB |
| mysql-exporter | Config nobody | NNP; rootfs writable; RAM32MiB |
| prometheus | Config nobody | NNP; rootfs writable; config RO, prometheus_data RW; RAM160MiB |
| node-exporter | Config nobody | NNP; host /, /proc, /sys RO; rootfs mount rslave; RAM48MiB |
| mysql | mysqld UID999 non-root | NNP absent; rootfs writable; mysql_data RW, init.sql RO; không RAM/CPU/PID limit riêng; json-file Config rỗng |
| phpmyadmin | Apache parent root, workers www-data | NNP absent; rootfs writable; không RAM/CPU/PID limit riêng; json-file Config rỗng |

Tất cả privileged=false; cap_add null. NNP=no-new-privileges. RO/RW theo Mounts/ReadonlyRootfs, không suy ra nội dung dữ liệu.

Alloy: CapInh/Prm/Eff/Bnd đều0, NoNewPrivs1, Seccomp2. cAdvisor: CapEff/Prm/Bnd=`00000000a80425fb`, NoNewPrivs1, Seccomp2. Chưa kiểm toán nội dung seccomp profile. Cả hai uid_map `0 0 4294967295`, không user remapping và không cấu hình host PID mode. Docker socket660 root:docker; containerd socket660 root:root. **RO socket không biến Docker/containerd API thành read-only.** Không gọi thử API quản trị hoặc thử khai thác.

## 5. Capacity và monitoring/logging

Baseline: RAM1.9GiB, available716MiB, swap2GiB dùng khoảng99MiB; cuối đợt available780MiB, swap238MiB. Swap tăng chưa đủ để kết luận áp lực RAM hiện hành. Disk root14GiB, used11GiB, available2.8GiB,79%; Docker và home cùng filesystem.

Docker system df: images4.503GB, build cache499.6MB, volumes471.7MB. du: Docker455MiB, containerd4.6GiB (snapshots3.6GiB/content1.1GiB), /var/log153MiB trong đó journal144MiB. Không cộng trực tiếp số đo logical/shared của Docker với du. Không prune/xóa bất kỳ dữ liệu nào.

Volumes đã đo: MySQL210MiB, Prometheus18MiB, Grafana15MiB, Loki296KiB, Alloy36KiB và volume tên ngẫu nhiên210MiB. Không container hiện hữu nào tham chiếu volume ngẫu nhiên theo docker ps -a filter volume; **mục đích/chính sách giữ volume chưa biết, không được coi là có thể xóa**.

Host từng có uptime11 phút, các container có StartedAt quanh `2026-10-20T17:15:50Z`; xác nhận có host restart gần đó nhưng nguyên nhân chưa xác minh. Cuối đợt 12 container Up2hours, RestartCount0/OOMKilledfalse. Những trường này không thay thế lịch sử trước khi recreate/reboot.

Prometheus: ready200; 5 job UP gồm prometheus, node-exporter, cadvisor, mysql-exporter, nginx-exporter. MySQL collectors global_status/global_variables/innodb_cmp/innodb_cmpmem/query_response_time đều success1. Không thấy metric last_scrape_error trong query; không tự coi absent là0. cAdvisor memory working-set count by name trả12 tên, mỗi tên1 series. Host MemTotal2013052928bytes (~1.875GiB), CPU count2. MySQL snapshot questions399, threads_connected1, uptime1089s. Nginx snapshot requests74, active1. Cuối đợt mysql_up1/nginx_up1.

Grafana11.4.0 health200 databaseok, người dùng đăng nhập thành công. Có ảnh dashboard cAdvisor CPU/memory/cache trong15m; dashboard MySQL/Nginx được người dùng xác nhận, chưa đối chiếu ảnh trong chat cho từng panel. Đường biểu diễn cộng dồn không được đọc thành giá trị từng container; chưa đối chiếu định nghĩa metric của mọi panel.

Loki ban đầu ready503 với thông báo chờ15s, sau đó hai lần cách20s ready200 và cuối đợt ready200, không restart/OOM theo inspect. Nguyên nhân503 chưa xác minh; không tự quy cho startup vì lúc đó container đã chạy khoảng20 phút. Labels service/container15m ban đầu chỉ Nginx; Backend Docker logs15m đếm0. Query1h sau đó có1 Backend log. Một GET /api/health200 được theo sau bởi Loki count log Nginx khớp URI trong5m bằng1. Vì đường dẫn không duy nhất, phép đếm này không định danh tuyệt đối request, nhưng phù hợp pipeline nhận log.

Ảnh Explore parse JSON theo status cho thấy status200; khi query >=400 No data, không thay bằng số0 giả. Sau một GET `/api/security-audit-not-found` trả404, ảnh query lọc đúng URI có status404/count1. Đã chứng minh đếm response lỗi qua Loki/Grafana; chưa chứng minh mọi saved dashboard panel dùng cùng query, hoặc toàn bộ redaction/retention đã đạt.

## 6. Authentication, headers và MySQL

Headers trên HTML200, API health JSON200 và API không tồn tại JSON404: nosniff, DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy camera/microphone/geolocation disabled, CSP. CSP còn unsafe-inline cho style và img-src http:/https: rộng. Không HSTS trên HTTP là phù hợp bước triển khai hiện tại; không khắc phục H01. Các cảnh báo COOP trên HTTP LAN xuất hiện trong browser; không có bằng chứng đó là nguyên nhân401.

Guest GET auth/me, account/profile, admin/dashboard đều401 với thông báo cần đăng nhập. Admin auth/me có ảnh roleadmin và status200 ở ảnh trước; admin/dashboard ảnh status200. Customer ảnh success/rolecustomer, profile success và Admin response từ chối quyền; **ảnh không hiển thị status HTTP trực tiếp, không ghi status200/403 như bằng chứng đã đo**. Cookie minishop_session có HttpOnly, SameSiteLax, Path/, Secureoff theo ảnh; không lưu lại hoặc trích giá trị cookie. Một ảnh có lộ một phần Value; cần che trước khi nộp và cân nhắc thu hồi session thử trong bước riêng được duyệt.

Login body{}: thiếu Origin403; Origin untrusted.invalid403; Origin đúng http://192.168.197.135 trả401 thông tin đăng nhập không đúng. Chỉ chứng minh guard login, **không thay thế authenticated CSRF test**. IDOR bỏ qua theo người dùng; logout revocation, expiry và runtime429 chưa kiểm thử. Không ép tài khoản/đơn dữ liệu thử mới để lấp khoảng trống.

MySQL8.4.11, query1 thành công. Backend SELECT CURRENT_USER()/DATABASE() xác nhận minishop_app@%/minishop. Grants:

- exporter@%: PROCESS, REPLICATION CLIENT trên *.*, SELECT trên performance_schema.*; max_user_connections3; caching_sha2_password; không khóa. Không có quyền ghi/GRANT OPTION trong grants được đọc. Cần đối chiếu tiếp quyền nào còn dư theo collector đã dùng.
- minishop_app@%: USAGE toàn cục, ALL PRIVILEGES trên minishop.*; max_user_connections0. Quyền DDL rộng hơn runtime thông thường.
- root@%: quyền toàn server và GRANT OPTION, nhiều quyền quản trị/dynamic privileges; đang không khóa. root@localhost cũng tồn tại. Host% không tự chứng minh public Internet; DB không publish, nhưng peers DB network có đường kết nối.

.env600 minishop:1000; .minishop-secrets700 root; SMTP secret400 ownerUID472 khớp Grafana, group root; mountRO. UNKNOWN ở tên user host không phải lỗi UID. Git index Ubuntu chỉ có .env.example trong nhóm path env kiểm tra. Chưa quét lịch sử Git, secret rotation hoặc CVE/dependency supply chain.

## 7. Backup, restore và giới hạn nghiệm thu

Dump DB tìm được: `/home/minishop/minishop-admin-backup.g4GLdd/database.sql` và `/home/minishop/minishop-admin-release.lBh4Wo/database.sql`, ngày17/10 theo metadata,7130bytes,600. Còn dump before-auth và schema scripts; không coi chúng là bản hiện tại. Search chỉ /home/minishop maxdepth4 với patterns đã dùng; không khẳng định không còn backup ở nơi khác.

Checksum trong admin-release: backend-src.tar.gz, database.sql, backend-image-id.txt, backend-image-reference.txt đềuOK. Monitoring-final.yQnKsr: config.tar.gz/image-ids.txt đềuOK. Cả hai thư mục700/minishop. Archive config19/10 không phải DB backup. Chưa kiểm tra archive mới có đầy đủ logging và11 overlays. Timestamp mtime không bảo đảm thời điểm dump hoàn tất. Manifest khớp chỉ chứng minh integrity so với manifest, không chứng minh nguồn gốc, độ mới, schema consistency hoặc restore.

Không crontab cho root/minishop; list17 system timers không thấy tác vụ MiniShop/MySQL backup. dpkg-db-backup chỉ dành package database, không phải MiniShop. Cron hệ thống/user timer/scheduler ngoài chưa kiểm tra. Người dùng chưa trả lời về RPO/RTO và bản dump ngoài VM: NOT VERIFIED, không ghi là đã có hoặc chắc chắn chưa có.

Windows Docker CLI có sẵn, contextdesktop-linux endpoint namedpipe local; engine không kết nối được. Windows RAM7.77GiB/free0.83GiB; C free14.87GiB, D free274.04GiB. Không khởi động Docker Desktop, không pull/create MySQL, không restore. **B11 chưa đạt.**

Phương án restore đề xuất cho đợt riêng: bố trí đủ RAM trên một engine thử đã xác minh; dùng project/volume/network mới hoàn toàn, không gắn volume/socket production, không publish DB LAN; giữ bản dump và hash, kiểm tra dump có USE/CREATE DATABASE/DEFINER/GRANT để không vô tình tác động ngoài môi trường thử; cấp secrets thử riêng; import vào DB thử, xác minh schema/counts/FK/integrity và đo RTO; đối chiếu baseline production không đổi. Backup17/10 chỉ chứng minh phục hồi bản đó, không đại diện DB hiện tại. Nếu tạo backup mới, copy ngoài VM, tạo môi trường thử hoặc cleanup cần kế hoạch/file/lệnh và phê duyệt riêng trước khi ghi dữ liệu. Chưa có lệnh restore được phê duyệt.

## 8. Finding tracking và kế hoạch C đề xuất

Mức độ dưới đây là rủi ro còn lại, không phải tất cả đều có exploit thực tế. Vị trí source chi tiết xem báo cáo A; các file Ubuntu ngoài bản Windows cần lấy đúng nội dung trước khi soạn diff.

| ID | Kết quả kiểm chứng / mức độ | Cần khắc phục / kiểm chứng tiếp | Phương án và rủi ro | Ưu tiên |
|---|---|---|---|---|
| H01 | CONFIRMED High: HTTP, Secureoff | Có trước dữ liệu thật | TLS/origin/proxy/cookie đồng bộ; rủi ro login/cert, HSTS chỉ sau ổn định; demo HTTP thử cần chấp nhận rõ | P1 |
| H02 | CONFIRMED High: Alloy/cAdvisor root, sockets/host mounts | Có đánh giá giảm quyền | Kiểm tra API/mount cần thiết, bỏ quyền thừa hoặc proxy hạn chế sau thử; có thể mất metrics/log discovery | P1 |
| H03 | CONFIRMED High: Ubuntu11files/Alloy, Windows thiếu bộ bàn giao | Có | Đồng bộ config đã lọc secrets/runbook/order/image IDs; rủi ro overlay ghi đè/recreate sai nếu áp bộ chưa kiểm tra | P1 |
| H04 | CONFIRMED High: 3 core service thiếu limits, MySQL/phpMyAdmin rotation config rỗng | Có | Đo rồi giới hạn/tuning và rotation từng service; MySQL có thể OOM/gián đoạn khi limit sai | P1 |
| H05 | PARTIAL High: checksumOK, dump17/10, chưa restore/offVM/RPO | Có | Chốt RPO/RTO, backup mới nhất quán/offVM và restore riêng; tác vụ tốn disk/RAM, dump chứa PII | P1 |
| H06 | CONFIRMED High: appALL trên DB, root@% quản trị | Có | Tách runtime/migration, thu hẹp quyền và root remote sau kiểm tra dependency; revoke sai gây outage | P1 |
| M01 | CONFIRMED Medium: hardening không đồng đều | Có theo từng image | cap_drop/NNP/RO+writable paths phù hợp; không bật RO mù cho DB/Grafana/Loki | P2 |
| M02 | CONFIRMED segmentation; egress NOT VERIFIED, Medium | Kiểm chứng tiếp | Đánh giá internal/egress/firewall theo flow; có thể gãy DNS/scrape/SMTP | P2 |
| M03 | Runtime API abuse/429 NOT VERIFIED; static omission Medium | Có đánh giá | Limiter endpoint/IP theo nhu cầu; tránh chặn khách/tạo tải nặng; không stress VM | P2 |
| M04 | Static CONFIRMED Medium; Ubuntu env keys chưa đồng bộ mẫu | Có | Sửa .env.example/README placeholder sau review; tuyệt đối không overwrite.env | P2 |
| M05 | Static CONFIRMED Medium; clean deploy chưa thử | Có | Schema version/migration/first-admin runbook thử riêng; không migration production | P2 |
| M06 | CONFIRMED Medium capacity nhỏ; retention NOT VERIFIED | Có | Đọc Loki/Prometheus retention thực, dự phòng WAL/compaction/backup, alerts; giảm retention có thể mất lịch sử | P1/P2 |
| M07 | SUSPECTED/NOT VERIFIED Medium redaction/PII | Kiểm chứng tiếp | Review config.alloy/error logging, redaction và quyền xem; không xuất rawlogs/secret | P2 |
| M08 | Direct bindings/TCP probe CONFIRMED; full access/auth NOT VERIFIED, Medium | Kiểm chứng tiếp | Giữ loopback/tunnel; xem proxy routes và Grafana anonymous/RBAC/Loki access; không suy loopback thành auth hoàn chỉnh | P2 |
| M09 | Runtime cleanup NOT VERIFIED; static thiếu maintenance Medium | Kiểm chứng tiếp | Đo session table, lập cleanup được duyệt riêng; DELETE là thao tác dữ liệu, có thể thu hồi nhầm | P3 |
| L01 | Một phần PASS readiness/metrics; alerts NOT VERIFIED Low | Bổ sung | Probes/alerts nhẹ, kiểm tra actual rules; ảnh tên alert có sẵn chưa chứng minh rule hoạt động | P3 |
| L02 | Runtime image digest/CVE NOT VERIFIED Low | Kiểm chứng tiếp | Ghi actual IDs/digests, scan có kiểm soát; không nâng image hàng loạt | P3 |
| L03 | CONFIRMED Low CSP unsafe-inline/img-src rộng | Đánh giá theo UI | Thu hẹp đúng nguồn dùng thực; có thể làm hỏng style/ảnh | P3 |
| L04 | File perms/index PASS phạm vi hẹp; history/supplychain NOT VERIFIED Low | Kiểm chứng tiếp | Scan local outputredacted, rotation nếu có lộ đầy đủ, không commit secrets | P2/P3 |

Thứ tự an toàn: (1) giữ/hoàn thiện bộ cấu hình và baseline, (2) bảo đảm backup/khả năng rollback, (3) giảm quyền theo từng service/tài khoản đã xác minh, (4) rotation/resource/retention theo số đo, (5) TLS và abuse controls, (6) runbook/probes/alerts/clean deployment. Có thể cần ưu tiên TLS ngay nếu dự định dùng dữ liệu thật. Không gộp thay quyền DB, image upgrade, TLS và retention trong một lần triển khai.

Trước mỗi mục C: trình file và diff cụ thể, backup/hash config và image hiện tại, ảnh hưởng/downtime, rollback, test sau sửa, rồi chờ duyệt. Rollback chỉ service liên quan với đúng11 overlay/project đã đối chiếu; không down toàn stack, không volume deletion, không daemon/storage changes, không restore DB cũ cho lỗi frontend. Retention đã xóa lịch sử không thể undo chỉ bằng config. Thay grants cần giữ baseline quyền và phương án truy cập quản trị còn hoạt động; không revoke tài khoản đang phụ thuộc mà chưa xác minh.

## 9. Lệnh kiểm tra thực tế — danh mục tái đối chiếu

Các lệnh dưới là bản ghi đã được người dùng chạy, **không phải yêu cầu chạy lại hoặc cho phép thay đổi C**. Một số command bị dính khi paste; chỉ dùng phần output hoàn chỉnh và kiểm tra thay thế đúng cú pháp để chốt kết quả.

| Nhóm | Lệnh/phép thử đã có output |
|---|---|
| Inventory | docker ps --format names/status/ports; docker ps -a filter project với labels config_files; docker compose ls --all; find /home/minishop maxdepth5 compose paths |
| Compose | docker compose "${compose_args[@]}" config --quiet; config --services, array11file đúng thứ tự mục4.1 |
| Network | sudo ss -lntup; docker inspect chọn NetworkMode/Ports; docker network inspect project chọn Driver/Internal/Containers; Windows TcpClient ConnectAsync từng port timeout1500ms |
| Quyền | docker inspect chọn User/Privileged/ReadonlyRootfs/CapAdd/CapDrop/SecurityOpt/Mounts/Tmpfs; docker top -eo pid,ppid,user,comm cho backend/nginx/mysql/phpmyadmin |
| Socket/process | stat -Lc path/type/mode/owner/group 2sockets; inspect State.Pid rồi awk Name/Uid/Gid/Groups/Cap*/NoNewPrivs/Seccomp trên /proc/PID/status; cat uid_map và inspect UsernsMode/PidMode Alloy/cAdvisor |
| Capacity | free -h; swapon --show; df -h; docker stats --no-stream; inspect Memory/MemorySwap/NanoCpus/PidsLimit/LogConfig/RestartCount/OOMKilled/StartedAt; uptime; docker system df; du -xhd1 Docker/volumes/containerd/log/home; inspect DockerRootDir/Driver/DriverStatus; docker ps -a filter anonymous volume |
| Metrics | curl GET Prometheus/-/ready và /api/v1/query với PromQL ghi bên dưới |
| Grafana/Loki | GET Grafana/api/health; Loki/ready (lặp2lần20s); Loki labels/service/container values since15m/1h; docker logs backend since15m tail1000 chỉ đếm dòng, không xuất nội dung |
| Headers/auth | curl GET root/api/health/API404 -D - -o /dev/null, lọc Set-Cookie; guest GET3API; browser GET auth/me/profile/admin; browser Application cookie flags; POST login body{} thiếu/sai/đúng Origin |
| DB | mysql root SELECT VERSION/CURRENT_USER/1; SELECT User,Host,plugin,account_locked,max_user_connections; SHOW GRANTS exporter/app/root@%; Backend node pool SELECT CURRENT_USER/DATABASE rồi pool.end |
| Secrets | stat .env/secrets dir/SMTP secret metadata; git ls-files env pathspecs; awk tìm tên GF_SECURITY_ADMIN_PASSWORD chỉ outputREDACTED, không giá trị; người dùng xem.env riêng bằng nano --view |
| Backup | find /home/minishop maxdepth4 extensions dump/archive/checksum -printf metadata; sha256sum --check --strict2manifest; stat2backupdirs; systemctl list-timers; crontab root/minishop chỉ đếm dòng/ứng viên |
| Test host | Windows Get-Command docker; context show/inspect; docker info/ps thất bại engine unavailable; Get-CimInstance RAM; Get-PSDrive C/D |
| Final | ps-a project; inspect status/restarts/oom; GET apphealth; loop3health endpoints; query up và query mysql_up/nginx_up riêng; free/df |

PromQL thực tế:

```promql
up
{__name__=~"mysql_up|nginx_up|mysql_exporter_last_scrape_error|mysql_exporter_collector_success"}
count by (name) (container_memory_working_set_bytes{job="cadvisor",name!=""})
node_memory_MemTotal_bytes{job="node-exporter"} or count(node_cpu_seconds_total{job="node-exporter",mode="idle"})
{job="mysql-exporter",__name__=~"mysql_global_status_threads_connected|mysql_global_status_questions|mysql_global_status_uptime"}
{job="nginx-exporter",__name__=~"nginx_http_requests_total|nginx_connections_active"}
{__name__=~"mysql_up|nginx_up"}
```

Truy vấn cuối từng dùng `up or mysql_up or nginx_up` chỉ hiện up do vector matching/ưu tiên nhánh trái với labels tương ứng. Đã sửa bằng selector cuối trên, được người dùng chạy và trả cả hai bằng1. Không ghi đó là lỗi exporter.

LogQL đã có output API hoặc ảnh/USER-CONFIRMED:

```logql
{service="nginx"}
{service="backend"}
sum by (service) (count_over_time({service=~"nginx|backend"}[15m]))
sum by (service) (count_over_time({service=~"nginx|backend"}[1h]))
sum(count_over_time({service="nginx"} |= "/api/health" [5m]))
sum by (status) (count_over_time({service="nginx"} | json | __error__="" [5m]))
sum by (status) (count_over_time({service="nginx"} | json | __error__="" | status >= 400 [5m]))
sum by (status) (count_over_time({service="nginx"} |= "/api/security-audit-not-found" | json | __error__="" | status >= 400 [5m]))
```

POST guard dùng curl Content-Type application/json, body{} tới `/api/auth/login`; Origin thiếu, `http://untrusted.invalid`, `http://192.168.197.135` lần lượt403/403/401. HTTP bodies không chứa thông tin đăng nhập; không in cookie/password. Admin/Customer login được người dùng thao tác riêng sau duyệt.

## 10. Ảnh minh chứng và trạng thái lưu

**Không khẳng định đã lưu ảnh theo tên đề xuất nếu người dùng chưa xác nhận.** Trợ lý không copy ảnh cookie/profile thô sang thư mục nộp. Ảnh có email/PII hoặc cookieValue phải che trước khi công bố. Không coi tên file là nội dung đã nghiệm thu.

| Nội dung | Bằng chứng trong chat | Tên ảnh đề xuất |
|---|---|---|
| Network/ports | Output host/network và Windows TCP matrix đã nhận, chưa ảnh riêng | 06-01-network-ports.png |
| Hardening | Output inspect/top/proc đã nhận, chưa ảnh hoàn chỉnh | 06-02-container-hardening.png |
| Headers | Output3response đã nhận | 06-03-http-security-headers.png |
| Guest | Output401cả3API | 06-04-auth-rbac-guest.png |
| Admin | Ảnh role và dashboardstatus200 đã xem; cần chePII | 06-04-auth-rbac-admin.png |
| Customer | Ảnh3body đã xem; HTTPstatus trực tiếp chưa có; cần chePII | 06-04-auth-rbac-customer.png |
| Cookie | Ảnh flags đã xem; một phầnValue lộ, không dùng bản thô | Chỉ bản đã cheValue hoặc kết quả chữ |
| Origin | Output403/403/401 đã nhận | 06-04-auth-origin-guard.png |
| Backup integrity | Output6mụcOK/dir700 đã nhận | 06-05-backup-integrity.png |
| Restore | **Chưa thực hiện, chưa có ảnh nghiệm thu** | 06-06-isolated-restore.png — chưa thu |
| Final containers/resources | Outputđã nhận, chưa ảnh cuối riêng | 06-07-final-containers.png; 06-07-final-monitoring-resources.png |
| Dashboard containers | Ảnh CPU/memory/cache đã xem | 06-08-prometheus-grafana-containers.png |
| Dashboard MySQL/Nginx | USER-CONFIRMED, chưa ảnh trong chat tương ứng | 06-08-prometheus-grafana-mysql.png; 06-08-prometheus-grafana-nginx.png |
| Loki rawsources | USER-CONFIRMED Explore; API có bằng chứng counts | 06-09-loki-logql-nginx.png; 06-09-loki-logql-backend.png |
| Loki404 | Ảnh status404/count1 và URI filter đã xem | 06-09-loki-http-errors.png |

Kiểm kê tên file cục bộ `D:\Ecommerce\screenshots` lúc lập báo cáo thấy các tên liên quan: auth-origin-guard.png, auth-rbac-admin.png, auth-rbac-customer.png, final-containers.png, grafana-container-15p.png, grafanamysql.png, grafanamys.png, grafana-nginx-query.png, loki-http-error.png, loki-logql-backend.png, loki-logql-nginx.png, prometheus-targets.png và các ảnh khác. **Mới kiểm tra tên file, chưa mở/kiểm toán nội dung hoặc độ mới của các file này trong lượt lập báo cáo.** Không đổi tên hoặc xác nhận chúng thay thế các ảnh đề xuất.

## 11. Quyết định nghiệm thu và bước tiếp theo

**Đạt kiểm tra vận hành cuối đợt tại thời điểm đo**, có minh chứng chức năng ứng dụng, network/bindings, metrics, logs, headers và một phần auth. **Chưa nghiệm thu security/backup/restore toàn diện**; không khẳng định sẵn sàng Internet hoặc dữ liệu thật.

Các việc phải chốt trước nghiệm thu đầy đủ: xử lý/chấp nhận từng findingHigh; bổ sung backup đáp ứngRPO/RTO và bản ngoàiVM; restore cô lập được duyệt và có bằng chứng; xử lý khoảng trống IDOR/authenticatedCSRF/logout hoặc ghi rõ chấp nhận ngoại lệ; đọc retention/redaction/alerts thực; bộ11Compose/Alloy và runbook bàn giao đầy đủ; rà và chePII/secrets trong ảnh.

**Không có thay đổi Giai đoạn C nào đã được thực hiện.** Chờ người dùng chọn và phê duyệt riêng từng mục C với diff/backup/tác động/rollback/test cụ thể. Không yêu cầu chạy lại các phép thử đã có đủ bằng chứng trừ khi cấu hình thay đổi hoặc có nghi vấn mới.
