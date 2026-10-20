# C08 — Chuyển collector Alloy sang Promtail cho bài lab

Ngày21/10/2026. **CUTOVER THÀNH CÔNG, ĐANG NGHIỆM THU.** Người dùng đã chọn dùng Promtail để khớp yêu cầu môn học. Không tự SSH, pull, start/stop hoặc thay container trên Ubuntu. Mỗi lượt thực hành tối đa1–3khối lệnh; chờ output trước bước phụ thuộc.

## Lý do và giới hạn

Grafana thông báo Promtail EOL02/03/2026: https://grafana.com/docs/loki/latest/send-data/promtail/. Dùng theo lựa chọn người dùng cho bài lab, không mô tả là nâng cấp bảo mật/production. Runtime sau cutover đã dùng Promtail; các mô tả Alloy bên dưới ghi lại baseline trước chuyển; không đổi tên trong các báo cáo lịch sử thành Promtail khi chưa chuyển và kiểm thử thành công.

Nguồn tĩnh: archive riêng tư C06 /home/minishop/minishop-security-after-rotation.VMDOYM/config.tar.gz và bản Windows đã kiểm checksum. Đã đọc compose.logging.yaml, compose.loki.yaml, compose.alloy.yaml, logging/config.alloy sau redaction trong output. Archive có cấu hình Alloy và Loki, không có service Promtail cũ trong các file đã đọc; chưa khẳng định không có container/file Promtail ngoài đó.

Alloy hiện đọc Docker API, filter project=ecommerce, chỉ keep nginx/backend; nhãn service=Compose service, container bỏ slash đầu, project=minishop, job=docker. Push http://loki:3100/loki/api/v1/push. Promtail draft giữ các nhãn/endpoint này và raw payload; service_name do Loki hiện infer cần đối chiếu runtime sau chuyển. Không thêm nhãn collector vào mọi stream hoặc sửa dashboard để che thiếu dữ liệu.

## Thiết kế và kế hoạch trước triển khai (lịch sử)

- compose.promtail.yaml: append sau14file hiện hành, thêm promtail, gắn profile alloy-rollback cho Alloy. Profile không tự stop container Alloy đang chạy; cần thao tác chuyển riêng. Default up về sau không tự bật Alloy nếu không kích hoạt profile, nhưng explicit service/profile vẫn có thể bật. Không đổi images/networks/mounts các service hiện tại.
- logging/promtail.yaml: Docker service discovery2service, relabel như Alloy, positions riêng /var/lib/promtail/positions.yaml. Không docker stage vì API target đã tách timestamp/payload; khác cách đọc raw json-file.
- Discovery được thu hẹp ngay tại Docker API bằng name regex ^/ecommerce-(nginx|backend)-[0-9]+$ ngoài projectfilter; đã sao lưu bản draft cũ ở Windows trước sửa. Người dùng đối chiếu dockerps filter trả đúng2nguồn và chạy configcheck thành công sau sửa.
- scripts/promtail-cutover.sh: script cutover đã chuẩn bị và kiểm tra bash -n trên Windows, đã được người dùng chạy thành công trên Ubuntu; xem kết quả cutover bên dưới. Có preflight hash/config/state/image/sourceIDs, backup config+baseline, seedcursor, stopAlloy, backupstate sau stop, startPromtail, readiness, marker404 mới và đối chiếu11containerkhác. Bất kỳ lỗi sau khi bắt đầu stopAlloy sẽ cố dừngPromtail rồi startAlloy; nếu không dừng đượcPromtail thì yêu cầu can thiệp, không cố bật2collector. Không bảo đảm rollback thành công trong mọi lỗi host/daemon.
- Bind state mới dự kiến /home/minishop/.minishop-promtail, không dùng/ghi đè alloy_data hoặc Loki data. Chưa tạo thư mục/state trên Ubuntu. Khi chuẩn bị cần kiểm tra không có state sẵn, tạo owner root/mode700, seed file600; config không chứa secret mới cần mode644 để processUID0/dropALL đọc được. Chưa tự thay quyền file nào trên Ubuntu.
- Promtail image đề xuất grafana/promtail:3.6.7, pin manifest linux/amd64 digest sha256:d5c160912b35cd658b82bff2d06554e38f868fd46141562b9b4da7a7408cc179. Manifest lookup từ Windows CLI thành công; chưa pull image, chưa validate binary hoặc Docker API compatibility trên host. Bắt buộc xác minh host amd64 trước khi dùng; không chạy emulation hoặc hạ Docker API security để chữa lỗi.
- Root để chạm socket tương tự Alloy; read_only rootfs, dropALL, NNP, tmpfs16m, không publish9080, chỉ monitoring_network, mem256MiB/totalmemswap512MiB/CPU0.3/PID64. Đây là ngân sách ban đầu, không khẳng định RSS nhỏ hơn Alloy. Docker socket RO vẫn có thể thực hiện API có quyền rộng; H02 chưa được xử lý bởi chuyển collector.

## Backup và preflight bắt buộc trước cutover

1. Người dùng xác nhận architecture, Docker server/API/minAPI, Compose version, Alloy image/ID/status và giới hạn tài nguyên hiện tại. Kiểm tra Promtail cũ nếu có bằng field chọn lọc, không inspect/env/rawlogs toàn bộ.
2. Backup mới đủ14file hiện tại, config.alloy và metadata container/image/StartedAt cùng checkpoint Alloy phù hợp; giữ alloy_data nguyên trạng, không xóa volume hoặc đổi cấu hình Alloy gốc. C06 archive13file chưa chứa C07 resources; không coi nó bao phủ đầy đủ14file.
3. Copy file mới với guard không overwrite. Kiểm checksum, pinimage/availabledisk, pull đúng image trong lượt riêng được trình trước; không pull/up toàn stack.
4. Validate full15file và so baseline14file: chỉ Alloy profiles, service Promtail mới và resource declarations dự kiến khác.12service cũ giữ nguyên cấu hình ngoài Alloyprofile. Network không thêm publish, Loki/DB không recreate.
5. Dùng binary image đã kéo để config-check trong container tạm không có socket, không production network/credentials, read-only config; chỉ sau khi người dùng biết lệnh tạo container tạm. Không dùng dry-run scrape với socket khi Alloy đang chạy vì có thể đẩy/replay log không dự kiến. Không coi parser local là Promtail config validation.

Preflight người dùng đã gửi: Docker29.9.1/API1.56/minAPI1.40/linuxamd64;12container đang chạy/Alloyactive; RAMavailable608MiB/swap130MiB/disk2.8GiB. Backup14files /home/minishop/minishop-before-promtail.SKaFy3: archive/baseline checksumOK, directory700. File Promtail đã copy Ubuntu. Promtail image inspect đúngarch, binary -check-syntax thành công/exit0; lần130 trước chỉ bị ngắt, không kết luận lỗiconfig. State mới /home/minishop/.minishop-promtail700root:root, LokiReady200. Sau lọcname, outputPROMTAIL_PREFLIGHT_OK/ALLOY_STILL_RUNNING đã nhận. Đây là bằng chứng preflight; kết quả ingestion nằm ở mục cutover bên dưới.

## Positions và cutover

Không dùng trực tiếp checkpoint Alloy làm Promtail positions. Source Promtail3.6.7 dùng cursor-<full-container-ID> làm key, timestamp Unixseconds làm value; không có cursor thì since0, có thể đọc lại log hiện còn trong Docker.

Quy trình sẽ soạn thành lệnh sau preflight: lưu mốcUTC ngay trước stopAlloy, fullID nginx/backend; seed2cursor ở state mới bằng mốc đó, có backup manifest/metadata. Stop riêng Alloy có graceful flush, rồi khởi động riêng Promtail --no-deps/--no-build/--pullnever. Không recreate Backend/Nginx/Loki/MySQL. Kiểm tra ID mục tiêu không đổi giữa seed/start; nếu đổi thì dừng để seed đúng, không khởi động với checkpoint rỗng.

Timestamp cursor độ phân giải giây và mốc trước graceful stop có thể tạo cửa sổ log lặp ngắn; không hứa zero-loss/exactly-once. Giữ payload/timestamp/labels để Loki xử lý theo cơ chế thực, kiểm lỗioutoforder/tooold và query đối chiếu. Không chạy2collector đọc cùng stream lâu dài. Trong lúc dừng có thể tạm ngừng log ingestion; Docker logs còn giữ là buffer hữu hạn, không bảo đảm lấy được log bị rotate khỏi buffer.

Nếu Promtail lỗi, stop riêng Promtail rồi start lại container Alloy cũ, giữ nguyên image/config/alloy_data; không bật cả hai để thử. Kiểm APIhealth/metrics/logs sau rollback. Không xóa checkpoint Promtail hoặc Alloyvolume. Không restore database hoặc down toàn stack.

## Kiểm thử và nghiệm thu sau chuyển

- Promtail running/noOOM/restart, đúng image/config/state/socketRO/caps/limits/noports; Alloy stopped và bị loại khỏi defaultprofile. Container inventory phải phân biệt13configuredservices/12active khi có1collector cũ dừng, không ghi tất cả container đều running như baseline12trước chuyển.
- HTTPready nội bộ chỉ đọc, discovery có2target đúng service/ID. Readiness chưa đủ chứng minh có log. Không publish9080 raLAN để xem /targets.
- Một GET API404 với URI mới để nhận diện marker không chứasecret; LogQL chọnURI saucutover cho thấy status404,service/nginx,container/project/job đúng. Lọc thời gian đúngmốc để không dùng logAlloy cũ làm bằng chứngPromtail.
- Backend có thể yên lặng; checkpointseed sẽ không replay startup cũ để giả bằng chứng mới. Nếu không có logBackend mới, ghi rõ targetdiscovered nhưng end-to-end freshBackend NOTVERIFIED, hoặc trình phương án tạo logthử an toàn riêng trước. Không gây500/reset/restartBackend hoặc ghi /proc/1/fd/1 chỉ để có ảnh khi chưa duyệt.
- APIhealth và Prometheus5UP/mysql_up/nginx_up giữ hoạt động; diff12container cũ chỉ Alloy chuyển running→stopped, ID/image/starttime11servicekhác không đổi. Kiểm disk/RAM/swap.
- Dashboard cũ/query theo service/container/project/job giữ được tính tương thích theo thiết kế; runtime phải xác minh, không khẳng định trước.
- Lưu ảnhcollector/version/targets và queryNginx/Backend/error có dữ liệu được xác minh; tài liệu ghi rõ EOL/lab và ngoại lệ tồn đọng.

## Nguồn kỹ thuật đã tham chiếu

- https://raw.githubusercontent.com/grafana/loki/v3.6.7/docs/sources/send-data/promtail/configuration.md
- https://raw.githubusercontent.com/grafana/loki/v3.6.7/clients/pkg/promtail/targets/docker/target.go
- https://raw.githubusercontent.com/grafana/loki/v3.6.7/clients/pkg/promtail/positions/positions.go
- https://raw.githubusercontent.com/grafana/loki/v3.6.7/clients/pkg/promtail/targets/docker/target_group.go
- https://raw.githubusercontent.com/grafana/loki/v3.6.7/clients/cmd/promtail/Dockerfile

Các file này chỉ giúp soạn draft; registry/host/binary/runtime còn cần kiểm thử. Không coi tag trùng Loki là bằng chứng tương thích đầy đủ.

## Kết quả cutover đã nhận ngày 21/10/2026

Người dùng gửi CUTOVER_OK, PROMTAIL_READY, ALLOY_STOPPED; PROMTAIL_RUNNING; FRESH_NGINX_LOG_CONFIRMED; API_HEALTH_OK và OTHER_11_CONTAINERS_UNCHANGED. Collector hiện tại là Promtail; Alloy được giữ dừng để rollback. Không chạy lại script cutover sau khi đã thành công.

Marker mới: /api/promtail-cutover-1792530832-5818. Backup tại /home/minishop/minishop-before-promtail.SKaFy3/cutover.MJalqH có chín mục checksum OK: cấu hình lúc chuyển, state Alloy sau dừng, positions đã seed, metadata, hai snapshot container, trang targets, kết quả query marker và URI marker. Chưa xác nhận bản ngoài VM.

Đã chứng minh Nginx gửi log mới qua Promtail tới Loki và API vẫn hoạt động. Chưa xem ảnh Grafana sau chuyển, chưa xác minh log Backend mới hoặc snapshot limits/OOM dài hạn. Trang targets được lưu không tự chứng minh Backend đã phát sinh log mới. Rollback chưa diễn tập. Các câu dự kiến/chưa triển khai ở phần kế hoạch trên được giữ để mô tả trình tự ban đầu, không phải trạng thái hiện tại.
