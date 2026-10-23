#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
readonly root=/home/minishop/minishop-backups/automatic
[[ $EUID -eq 0 ]] || { echo 'STOP: ROOT_REQUIRED' >&2; exit 1; }
[[ -d "$root" && ! -L "$root" ]] || { echo 'STOP: BACKUP_DIRECTORY_NOT_READY' >&2; exit 1; }
[[ $(stat -c '%u:%a' "$root") == '0:700' ]] || { echo 'STOP: BACKUP_DIRECTORY_PERMISSIONS' >&2; exit 1; }
exec 9>/run/lock/minishop-db-backup.lock
flock -n 9 || { echo 'STOP: BACKUP_ALREADY_RUNNING' >&2; exit 1; }
available=$(df -Pk "$root" | awk 'NR==2 {print $4}')
[[ "$available" =~ ^[0-9]+$ && "$available" -ge 524288 ]] || { echo 'STOP: LESS_THAN_512_MIB_FREE' >&2; exit 1; }
[[ $(docker inspect --format '{{.State.Status}}' ecommerce-mysql-1) == running ]] || { echo 'STOP: MYSQL_NOT_RUNNING' >&2; exit 1; }
folder=$(mktemp -d "$root/backup-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
trap 'printf "BACKUP_FAILED: partial files retained in %s\n" "$folder" >&2' ERR
# No password arguments or values are printed to the host journal.
docker exec ecommerce-mysql-1 sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -u root --single-transaction --quick --routines --events --triggers --hex-blob --no-tablespaces --set-gtid-purged=OFF --databases minishop' 2>"$folder/dump.stderr.partial" | gzip -c >"$folder/database.sql.gz.partial"
[[ -s "$folder/database.sql.gz.partial" ]]
gzip -t "$folder/database.sql.gz.partial"
mv -- "$folder/database.sql.gz.partial" "$folder/database.sql.gz"
(
  cd "$folder"
  sha256sum database.sql.gz > SHA256SUMS.partial
  sha256sum --check --strict SHA256SUMS.partial
  mv -- SHA256SUMS.partial SHA256SUMS
)
printf 'utc=%s\ncontainer=ecommerce-mysql-1\ndatabase=minishop\nconsistency=single-transaction\nrestore_test=not_performed\n' "$(date -u +%FT%TZ)" >"$folder/metadata.txt"
# COMPLETE is only created after dump, gzip and checksum checks pass.
printf 'BACKUP_COMPLETE\n' >"$folder/COMPLETE"
trap - ERR
printf 'BACKUP_OK=%s\n' "$folder"
# Retention is not enabled during the first manual verification stage.
