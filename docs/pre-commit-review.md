# Rà soát trước commit — 21/10/2026

## Kết quả đã có

- Người vận hành gửi backend49/49testđạt, frontendbuild vàESLintđạt. Đây là test cục bộ, không thay thế runtime/restore.
- Quét251đường dẫn candidate bằng git ls-files cached/others/exclude-standard; dò private key marker, token provider, URL có credentials và literal assignment nhạy cảm. Không in giá trị secrets.
- Mười cảnh báo nằm trong backend/frontend test: URL kiểm tra từ chối credentials và dữ liệu password fixture; không phải bằng chứng secrets production. Kiểm tra tĩnh có thể bỏ sót, không bảo đảm tuyệt đối sạch secrets.
- Không thấy.env thật/private key/archive/executable trong danh sách tracked được kiểm tra. .env.example là mẫu được phép.
- Chỉ monitoring/prometheus/prometheus.yml đã staged từ trước. Không thay đổi index/commit/push trong lượt rà.
- Đã loại docs/monitoring-backup, docs/security-remediation-backups, docs/evidence-review và archive/state khỏi candidate bằng.gitignore ở lượt trước.
- Phát hiện screenshots/Python có70file không thuộcMiniShop, gồm.exe; đã thêm ignore riêng thư mục này. Không xóa dữ liệu.

## Trước khi stage

- Chọn ảnh rõ nội dung, che email/thông tin tài khoản trong ảnhRBAC; ảnh/chữ trong bitmap không được quét đầy đủ bằng kiểm tra văn bản.
- Không stage toàn bộ screenshots tự động. Ảnh lịch sửAlloy không dùng chứng minhPromtail mới.
- Tài liệu có IP/đường dẫn môi trường và thông tin sinh viên, cần người sở hữu rà phạm vi công khai. Không đưa backup riêng tư vàoGit.
- git diff --check toànrepo trước đó báo dòng trốngEOF tại backend/src/services/order.service.js:91; chưa tự sửa source ngoài phạm vi.
- Đồng bộ source/config đã cải thiện nhưng cài mới/restore vẫnNOT VERIFIED.

## Nhóm commit đề xuất (chưa thực hiện)

1. Authentication, Customer/Admin, migration vàFrontend với test tương ứng; kèm thay đổi đơn hàng liên quan.
2. Nginx, monitoring/exporters, logging/Promtail, hardening và cấu hình mẫu. Kiểm tra dependency giữa các overlay, không bỏ file cần thiết.
3. README, runbooks, báo cáo và các ảnh đã chọn/che dữ liệu.

Chỉ tạo commit khi người dùng giao riêng. Không dùng git add .; rà staged diff theo nhóm trước commit. Không ghi rằng GitHub đã có các thay đổi mới khi chưa push/kiểm chứng remote.
