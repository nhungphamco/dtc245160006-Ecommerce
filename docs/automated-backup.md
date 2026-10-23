# Backup tự động MySQL

Cập nhật ngày 23/10/2026. Các thao tác Ubuntu do người vận hành thực hiện; tài liệu phân biệt cấu hình đã cài, kết quả chạy thủ công và kiểm chứng theo lịch.

## File nguồn và vị trí cài đặt

| Source | Vị trí trên Ubuntu |
|---|---|
| scripts/minishop-db-backup.sh | /usr/local/sbin/minishop-db-backup |
| scripts/minishop-backup-retention.py | /usr/local/sbin/minishop-backup-retention |
| deploy/systemd/minishop-db-backup.service | /etc/systemd/system/minishop-db-backup.service |
| deploy/systemd/minishop-db-backup.timer | /etc/systemd/system/minishop-db-backup.timer |
| deploy/systemd/minishop-db-backup.service.d/retention.conf | /etc/systemd/system/minishop-db-backup.service.d/retention.conf |

Không chạy trực tiếp file nguồn để cài mới khi chưa kiểm tra đường dẫn, quyền, Docker container và backup cấu hình. Helper/script cài root:root, mode 700; units/drop-in mode 644. Chưa diễn tập installer cho máy mới.

## Lịch và dữ liệu

- Lịch hằng ngày lúc **02:00 Asia/Ho_Chi_Minh**, tương ứng 19:00 UTC ngày trước. Host dùng Etc/UTC và NTP đã đồng bộ. Timer enabled/active; Persistent=true cho phép chạy bù khi bỏ lỡ lịch.
- Thời điểm kế tiếp quan sát được: 19:00 UTC ngày 23/10/2026. **Chưa nhận bằng chứng lần chạy tự nhiên theo lịch.**
- Đích: /home/minishop/minishop-backups/automatic, root:root, mode 700; file mode 600. Backup thủ công bên ngoài giữ nguyên.
- Dump database minishop từ ecommerce-mysql-1, single-transaction/quick, gồm routines/events/triggers, hex-blob, không tablespaces/GTID-purged. Bản InnoDB nhất quán khi không có DDL đồng thời; không chạy migration/schema change trong lúc backup.
- gzip và SHA-256 được kiểm trước khi tạo COMPLETE. File dump.stderr.partial giữ chẩn đoán kể cả khi thành công; cần bảo vệ vì có thể chứa thông tin nhạy cảm.
- flock chống chạy chồng. Dừng khi dung lượng trống dưới 512 MiB; đây không phải quota hoặc bảo đảm đủ dung lượng cho mọi kích thước DB.

## Retention

Giữ 7 bản hoàn tất mới nhất theo tên UTC. Helper kiểm checksum và gzip trước dọn, chỉ xét thư mục con trực tiếp đúng format, năm regular files biết trước và quyền dự kiến. Không recursive delete. Bản dở/ngoài format giữ lại; cấu trúc/quyền bất thường làm dừng kiểm tra. Các bản dở cần theo dõi dung lượng riêng.

ExecStartPost chạy retention sau dump. Nếu retention lỗi, service có thể failed dù dump mới đã hợp lệ; xem cả Result và journal. Không kết luận chỉ dựa vào BACKUP_OK.

## Kết quả đã kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| Chạy trực tiếp 08:24:16 UTC | gzip/checksum đạt; API health 200, database connected |
| Start service thủ công 08:28:24 UTC | Result=success, ExecMainStatus=0, BACKUP_OK |
| Start service sau tích hợp retention 08:31:47 UTC | Backup thành công; 3 bản hợp lệ, giữ 3, delete candidates 0; RETENTION_APPLY_OK |
| Bản mới nhất lúc kiểm | backup-20261023T083147Z-EUICom; gzip -t exit 0 và checksum đạt |
| Sao chép Windows ngoài VM | D:/MiniShopPrivateBackups/db-auto-20261023T083147Z-EUICom; 4 file, SQL gzip 2979 byte; OFF_VM_AUTOMATED_DB_BACKUP_CHECKSUM_OK |

Bản xuất dùng /home/minishop/minishop-backup-export.MEsrtM với thư mục 700/file 600 của minishop; không nới quyền bản root gốc. Windows áp ACL riêng. Manifest chỉ kiểm database.sql.gz, không chứng minh toàn vẹn độc lập của metadata/COMPLETE. Copy ngoài VM là **thủ công**, không tự đồng bộ; cùng máy vật lý chưa phải phục hồi thảm họa đầy đủ.

Nhánh xóa khi có hơn 7 bản chưa diễn tập. Không sinh thêm dump trên VM chỉ để đạt ngưỡng.

## Kiểm tra chỉ đọc trên Ubuntu

```bash
systemctl list-timers --all --no-pager minishop-db-backup.timer
systemctl show minishop-db-backup.service -p Result -p ExecMainStatus
sudo journalctl -u minishop-db-backup.service -n 20 --no-pager
```

Để chứng minh lần chạy theo lịch, đối chiếu thời gian LAST của timer với journal và bản backup cùng thời điểm; lần start service thủ công không thay thế bằng chứng này. Chỉ kiểm sau mốc dự kiến hoặc khi máy được bật lại, không đổi đồng hồ để thử.

## Rollback

Service trước retention được sao lưu tại /home/minishop/minishop-backup-setup/service-before-retention.li1HiE/service.before, mode 600. Drop-in/helper là file mới.

Tắt lịch: sudo systemctl disable --now minishop-db-backup.timer. Không dừng cưỡng bức service đang dump. Để bỏ retention, xác nhận service không chạy, gỡ riêng retention.conf rồi daemon-reload; giữ timer/script dump và toàn bộ backup. Rollback chưa diễn tập.

## Giới hạn và minh chứng

RPO mục tiêu 24 giờ nếu lịch chạy thành công; chưa có lịch sử chạy tự nhiên để đánh giá. RTO chưa xác định, restore cô lập chưa thực hiện. Checksum/gzip không thay thế restore test.

Đã xem và xác nhận ba ảnh trong screenshots: backup-timer-active.png, backup-service-retention-success.png, backup-auto-off-vm.png. Ảnh service kết hợp cả kết quả dump và retention; không cần hai ảnh tách riêng. Không đưa dump/archive vào Git hoặc chụp secrets.
