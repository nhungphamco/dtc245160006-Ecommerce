# MiniShop — Nginx triển khai có kiểm soát

Trạng thái ngày 18/10/2026: **đã triển khai Nginx/React production trên Ubuntu và kiểm tra phục hồi image đang hoạt động**. Người dùng chạy các lệnh Ubuntu; trợ lý chuẩn bị file Windows và kiểm tra output gửi về, không tự SSH. Phạm vi là HTTP LAN với dữ liệu thử, không phải nghiệm thu HTTPS/production Internet.

## Kết quả đã xác nhận

| Hạng mục | Bằng chứng |
|---|---|
| Build | Log build 16/16 FINISHED, khoảng 29 giây; tạo minishop-frontend:nginx-v1. |
| Cấu hình | Compose config --quiet đạt; nginx -t trong image báo syntax is ok/test is successful. |
| Container | Log Compose ps có bốn service chạy; Nginx và MySQL healthy. MySQL/phpMyAdmin giữ uptime sau khi recreate riêng Backend/Nginx. |
| API proxy | Curl http://192.168.197.135/api/health trả HTTP 200, database connected, Server nginx. |
| Website | Người dùng xác nhận giao diện và sản phẩm tại IP Ubuntu hoạt động, cả sau Ctrl+F5 sau bài phục hồi. |
| Customer | Người dùng xác nhận đăng ký thử, F5 giữ session, profile, logout/login lại, Checkout và lịch sử đơn hoạt động. Không có log chi tiết hay mã đơn kèm xác nhận cuối. |
| Phân quyền/Admin | Người dùng xác nhận Guest 401/Customer 403 qua API, Admin đăng nhập/Dashboard thành công sau khôi phục mật khẩu Admin ID 2 được cho phép. Không lưu email/mật khẩu vào tài liệu. |
| Headers trang HTML | Curl -I / trả 200, no-cache, CSP, nosniff, DENY, Referrer-Policy, Permissions-Policy; không HSTS. |
| Mạng | Docker inspect xác nhận Nginx chỉ app_network; Backend app_network + db_network; MySQL/phpMyAdmin chỉ db_network. |
| Phục hồi | Recreate riêng Nginx từ nginx-known-good thành công; API 200/DB connected; người dùng xác nhận ps và website sau đó đạt. |

Đây là kết quả thực hành có mức chứng cứ như bảng, không phải toàn bộ bài test được trợ lý trực tiếp chạy. Chưa thử nâng cấp sang image lỗi rồi rollback phiên bản cũ; chưa diễn tập rollback toàn bộ cấu hình Backend. Chưa có output kiểm thử Origin lạ, Guest Checkout riêng, đồng thời InnoDB hoặc rà soát logs runtime trong phiên triển khai này. Ảnh được yêu cầu chụp nhưng chưa xác minh tất cả đã lưu vào repository.

## Kiến trúc đã chốt

Ubuntu LAN 192.168.197.135:80 → Nginx non-root :8080 → backend:3000 qua app_network. Backend giữ db_network để kết nối MySQL. Nginx không tham gia db_network. React được build trong stage Node 24, image runtime Nginx Alpine chỉ chứa dist. Node heap build giới hạn 512 MiB; đây không phải giới hạn tổng RAM của BuildKit. VM có 1,9 GiB RAM, 2 GiB swap và còn 5,2 GiB disk TRƯỚC build; chưa đo lại sau build.

Các file mới: frontend/Dockerfile, frontend/Dockerfile.dockerignore, nginx/nginx.conf, compose.nginx.yaml. Compose gốc không bị sửa. Overlay phải được ghép sau compose.yaml, trong cùng thư mục/project Ecommerce hiện có. Không đổi project name, không đổi hoặc xóa mysql_data. MySQL/phpMyAdmin kế thừa nguyên cấu hình gốc. Khi dùng overlay, backend giữ db_network và được thêm app_network theo quy tắc merge Compose.

Origin HTTP được override bằng đúng http://192.168.197.135, không ghi đè .env. AUTH_ALLOWED_ORIGINS vẫn kế thừa cấu hình hiện có; không tự thêm wildcard. Frontend dùng /api cùng origin. TRUST_PROXY=1 phù hợp đúng một hop Nginx, với X-Forwarded-For được Nginx ghi đè từ remote_addr. Backend vẫn chỉ publish loopback; không mở trực tiếp backend ra LAN. Đổi IP/port phải cập nhật origin và host port tương ứng trước khi triển khai.

## Bảo mật và vận hành

Nginx chạy USER nginx trên cổng 8080, root filesystem read-only, tmpfs /tmp, drop capabilities, no-new-privileges, giới hạn runtime 128 MiB/0,5 CPU/64 PID. stdout access log JSON không có query/body/cookie/Authorization; stderr error log có thể chứa chi tiết request tùy lỗi nên chỉ chia sẻ sau khi rà soát. Log Docker của Nginx xoay tối đa ba file 5 MiB. Chưa có collector/monitoring tập trung.

Headers CSP/nosniff/frame deny/referrer/permissions áp dụng ở Nginx, kể cả lỗi. Không bật HSTS hoặc upgrade-insecure-requests trong demo HTTP. CSP cho ảnh HTTP/HTTPS vì API cho nhập URL ảnh; ứng dụng dùng script cùng origin, không cho unsafe-inline JavaScript. Origin, Cookie, Set-Cookie chuyển tiếp nguyên trạng; HttpOnly/SameSite vẫn do Backend đặt. Không cấu hình CORS wildcard. API không rơi vào SPA fallback và không retry mutation tự động. /healthz chỉ xác nhận Nginx sống, không thay thế /api/health kiểm tra Backend và MySQL.

HTTP qua IP LAN chỉ dùng tài khoản giả/dữ liệu thử. Trước tài khoản hoặc dữ liệu thật: thống nhất hostname/certificate tin cậy (hoặc CA nội bộ được cài tin cậy), cấu hình TLS 443 và redirect HTTP, đổi APP_ORIGIN sang HTTPS, xác nhận req.secure và cookie Secure, rà soát X-Forwarded-* và trust proxy, tránh mixed content, thử Auth/Customer/Admin. Chỉ bật HSTS sau khi HTTPS hoạt động ổn định; không bật includeSubDomains/preload tùy tiện.

## Backup và rollback

Backup cấu hình triển khai mới: `/home/minishop/minishop-nginx-backup.HMoT73`. Compose gốc có SHA256 `96ffaa12c6780995976cdae06f8c9533cb3a4a0ecd5349f0f592e53667bb8e6c`, khớp bản sao. Compose Ubuntu dùng APP_ORIGIN cố định localhost:5173 khác bản Windows tham chiếu environment, nên đã giữ nguyên Compose Ubuntu và thêm overlay. Không ghi đè .env.

Backend trước Nginx được giữ tag `minishop-backend:before-nginx`; ID đã ghi: `sha256:146531923a8ed6f9d123726eb33caa75251c0fbb17b17723ecacdb7a6246332c`.

Nginx tốt được giữ tag `minishop-frontend:nginx-known-good`; ID được người dùng kiểm tra: `sha256:6b69cb612ba0f85e4159132b921f620582ac54133f0c24efa82a967cf91adcee`. File `nginx-image-id.txt` trong backup ghi tham chiếu từ container. Các tag known-good và nginx-v1 ở thời điểm này trỏ cùng artefact, nên bài kiểm tra xác nhận khả năng recreate/phục hồi chứ chưa mô phỏng chuyển phiên bản.

File `/home/minishop/minishop-nginx-backup.HMoT73/compose.nginx.rollback.yaml` chỉ override services.nginx.image thành minishop-frontend:nginx-known-good. Đây là lớp thứ ba đang áp dụng sau bài kiểm tra. Giữ file này và bộ config, không chỉ image, để tái lập trạng thái hiện tại.

Đã có log checksum OK cho /home/minishop/minishop-admin-release.lBh4Wo; đây là backup cũ trước Admin, không đại diện dữ liệu mới nhất. Không phục hồi database từ backup cũ để rollback riêng Nginx.

Cho lần cập nhật tiếp theo: sao lưu các cấu hình sắp thay, giữ image đang chạy theo ID/tag riêng trước khi build đè tag. Không in docker inspect toàn bộ vì chứa environment. Xác định backup DB mới nhất; nếu cần bản mới thì tạo mysqldump nhất quán riêng với quyền file hạn chế, không hiển thị nội dung và không thay schema. Không coi bản SQL cũ là backup cho dữ liệu thử mới phát sinh trong đợt nghiệm thu này.

Build Nginx trước khi chuyển Backend sang origin/mạng mới để giảm gián đoạn. Chỉ recreate backend với --no-deps khi áp dụng environment/network, sau đó chạy riêng nginx; không up/recreate cả stack. Backend có gián đoạn ngắn; MySQL và phpMyAdmin giữ nguyên container/volume. Kiểm tra schema/API hiện có, không chạy migration trong triển khai Nginx.

Rollback riêng frontend cập nhật: quay về image Nginx đã lưu qua overlay rollback và recreate riêng nginx với --no-deps --no-build --force-recreate. Cách này đã được diễn tập với image tốt hiện tại. Rollback lần đầu thêm Nginx (chưa diễn tập): dừng riêng nginx; dùng Compose gốc và một overlay image Backend trỏ đúng before-nginx để recreate riêng backend --no-deps, phục hồi origin/network trước đó. Không chỉ trông vào tag ecommerce-backend vì tag có thể đổi. Truy cập phát triển bằng Vite/tunnel cũ được khôi phục theo cấu hình gốc. Không down toàn stack, không down -v, không xóa network/volume, không restore SQL cho rollback frontend.

## Đồng bộ đã thực hiện

Gói minishop-nginx-deploy.tar.gz gồm 49 file source/frontend lockfile/config/Dockerfile/overlay/tài liệu, khoảng 90 KB. Không có node_modules, dist, .env, Git, private key hoặc dump. SHA256 đã khớp hai máy: `050ca3d5317f98376cf0c82e19ed6a6cf49c237b9ebc5a811cb284603bf5125d`. Giải nén tại `/home/minishop/minishop-nginx-stage.Jmxamn`; copy frontend, nginx, compose.nginx.yaml sang dự án và diff/cmp đạt COPY_OK. Dockerfile-specific ignore dùng allowlist để hạn chế build context.

Docker Compose Ubuntu v5.6.0. Kiểm tra config hợp nhất và nginx -t đạt trước khi chạy. Chỉ recreate Backend để đổi Origin/mạng, rồi chạy riêng Nginx. Không chạy migration, không recreate MySQL/phpMyAdmin. Công cụ khôi phục mật khẩu riêng được chạy sau khi người dùng cho phép, có mục đích đổi mật khẩu Admin ID 2/thu hồi session; không thuộc startup hay migration.

## Vận hành sau nghiệm thu

Lệnh quản trị dùng bộ ba file: `/home/minishop/Ecommerce/compose.yaml`, `/home/minishop/Ecommerce/compose.nginx.yaml`, `/home/minishop/minishop-nginx-backup.HMoT73/compose.nginx.rollback.yaml`, theo đúng thứ tự. Các thao tác thường dùng với bộ file đó: `ps` để kiểm tra; `logs --tail 50 nginx` để xem log; `restart nginx` để khởi động lại đúng service. Restart không áp dụng config/image mới; cập nhật cần build và recreate có kiểm soát. Khi chuyển sang bản frontend mới phải chủ động bỏ hoặc cập nhật overlay rollback vì nó đang ghim image known-good.

Health Nginx: `http://192.168.197.135/healthz`; health toàn đường API/DB: `http://192.168.197.135/api/health`. Nếu có 503, kiểm tra Backend và mạng trước; không chạy lại migration hoặc xóa volume. Nếu 403 Auth, kiểm tra origin chính xác (scheme/IP/port) và cấu hình APP_ORIGIN. Quản trị phpMyAdmin vẫn cần đường truy cập loopback/tunnel phù hợp; việc website không cần tunnel không đồng nghĩa phpMyAdmin đã public.

Ảnh cần lưu lần lượt khi có kết quả: docker-before-nginx.png, nginx-containers.png, nginx-website.png, nginx-api-proxy.png, nginx-security-headers.png, nginx-network.png. Không chụp .env, session cookie, token, mật khẩu hoặc dump.

README và tài liệu này đã được cập nhật trên Windows theo bằng chứng trên. Chưa tự đồng bộ bản tài liệu mới lên Ubuntu, chưa commit/push. Báo cáo kiểm toán trước Nginx được giữ như lịch sử, có ghi chú dẫn sang biên bản này. Hạng mục Prometheus/Grafana, Loki/collector và HTTPS vẫn chờ triển khai riêng.

## Tài liệu đối chiếu

- https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/
- https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
