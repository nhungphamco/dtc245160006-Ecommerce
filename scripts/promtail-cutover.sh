#!/usr/bin/env bash
# Lab cutover only. Run on the verified Ubuntu host, after C08 preflight.
# No down/prune/volume deletion, DB changes, or application recreation.
set -Eeuo pipefail
umask 077

[[ $EUID -eq 0 ]] || { echo 'STOP: RUN_WITH_SUDO' >&2; exit 1; }
project=/home/minishop/Ecommerce
backup=/home/minishop/minishop-before-promtail.SKaFy3
state=/home/minishop/.minishop-promtail
alloy_state=/var/lib/docker/volumes/ecommerce_alloy_data/_data
image='grafana/promtail:3.6.7@sha256:d5c160912b35cd658b82bff2d06554e38f868fd46141562b9b4da7a7408cc179'
expected_config=fe5ad8139f3e75534e07c9923c5395c8bf82eb5681362a55377b1b593494ae0e
expected_overlay=4fef088d29139ddbbd8d9df3ce6cfc6898a28780238cc933416b282d6fd57608
rollback_needed=0

fail() { printf 'STOP: %s\n' "$1" >&2; exit 1; }
cleanup() {
  local rc=$?
  trap - EXIT INT TERM
  if (( rollback_needed )); then
    set +e
    echo 'CUTOVER_FAILED: attempting collector rollback; keeping data and backups.' >&2
    if docker inspect ecommerce-promtail-1 >/dev/null 2>&1; then
      if ! docker stop --time 30 ecommerce-promtail-1; then
        echo 'MANUAL_ACTION_REQUIRED: Promtail stop failed; Alloy not restarted to avoid dual ingestion.' >&2
        exit 1
      fi
    fi
    if docker start ecommerce-alloy-1; then
      echo 'ROLLBACK_ALLOY_STARTED: verify readiness and logs; Promtail state was retained.' >&2
    else
      echo 'MANUAL_ACTION_REQUIRED: Alloy could not be restarted.' >&2
    fi
    (( rc != 0 )) || rc=1
  fi
  exit "$rc"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

files=(
  compose.yaml compose.nginx.yaml compose.monitoring.yaml
  compose.cadvisor-fix.yaml compose.mysql-exporter-fix.yaml
  compose.nginx-metrics.yaml compose.nginx-exporter.yaml
  compose.grafana-smtp.yaml compose.logging.yaml compose.loki.yaml
  compose.alloy.yaml compose.security-phpmyadmin.yaml
  compose.security-mysql-logging.yaml compose.security-phpmyadmin-resources.yaml
  compose.promtail.yaml
)
args=(--project-directory "$project" -p ecommerce)
for file in "${files[@]}"; do
  [[ -f "$project/$file" ]] || fail "COMPOSE_FILE_MISSING: $file"
  args+=(-f "$project/$file")
done
[[ -d "$backup" && ! -L "$backup" ]] || fail BACKUP_DIRECTORY_UNEXPECTED
[[ -d "$state" && ! -L "$state" ]] || fail STATE_DIRECTORY_UNEXPECTED
[[ $(stat -c '%u:%g:%a' "$state") == '0:0:700' ]] || fail STATE_PERMISSIONS_UNEXPECTED
[[ -z $(find "$state" -mindepth 1 -maxdepth 1 -print -quit) ]] || fail STATE_NOT_EMPTY_DO_NOT_OVERWRITE
[[ $(sha256sum "$project/logging/promtail.yaml" | awk '{print $1}') == "$expected_config" ]] || fail CONFIG_HASH_MISMATCH
[[ $(sha256sum "$project/compose.promtail.yaml" | awk '{print $1}') == "$expected_overlay" ]] || fail OVERLAY_HASH_MISMATCH
[[ $(docker inspect ecommerce-alloy-1 --format '{{.State.Running}}') == true ]] || fail ALLOY_NOT_RUNNING
[[ $(docker inspect ecommerce-alloy-1 --format '{{range .Mounts}}{{if eq .Destination "/alloy-data"}}{{.Source}}{{end}}{{end}}') == "$alloy_state" ]] || fail ALLOY_STATE_PATH_UNEXPECTED
[[ -d "$alloy_state" ]] || fail ALLOY_STATE_MISSING
if docker inspect ecommerce-promtail-1 >/dev/null 2>&1; then
  fail PROMTAIL_ALREADY_EXISTS_DO_NOT_OVERWRITE
fi
[[ $(docker image inspect "$image" --format '{{.Os}}/{{.Architecture}}') == linux/amd64 ]] || fail IMAGE_NOT_AVAILABLE_OR_WRONG_ARCH
[[ $(df -Pk "$backup" | awk 'NR==2 {print $4}') -ge 262144 ]] || fail LESS_THAN_256MIB_DISK_AVAILABLE
[[ $(du -sm "$alloy_state" | awk '{print $1}') -le 64 ]] || fail ALLOY_STATE_OVER_64MIB_REVIEW_FIRST
docker compose "${args[@]}" config --quiet
curl --max-time 10 -fsS -o /dev/null http://127.0.0.1:3100/ready
curl --max-time 10 -fsS -o /dev/null http://192.168.197.135/api/health

nginx_id=$(docker inspect ecommerce-nginx-1 --format '{{.Id}}')
backend_id=$(docker inspect ecommerce-backend-1 --format '{{.Id}}')
[[ $nginx_id =~ ^[0-9a-f]{64}$ && $backend_id =~ ^[0-9a-f]{64}$ ]] || fail INVALID_SOURCE_IDS
for name in ecommerce-nginx-1 ecommerce-backend-1; do
  [[ $(docker inspect "$name" --format '{{index .Config.Labels "com.docker.compose.project"}}') == ecommerce ]] || fail SOURCE_PROJECT_MISMATCH
  [[ $(docker inspect "$name" --format '{{.State.Running}}') == true ]] || fail SOURCE_NOT_RUNNING
done

run_dir=$(mktemp -d "$backup/cutover.XXXXXX")
printf 'CUTOVER_BACKUP_DIR=%s\n' "$run_dir"
snapshot() {
  local -a ids=()
  mapfile -t ids < <(docker ps -aq --filter label=com.docker.compose.project=ecommerce)
  (( ${#ids[@]} > 0 )) || fail NO_PROJECT_CONTAINERS
  docker inspect "${ids[@]}" --format '{{.Name}} {{.Id}} {{.Image}} {{.State.StartedAt}} {{.State.Status}}'
}
snapshot > "$run_dir/containers-before.txt"
tar -czf "$run_dir/config-at-cutover.tar.gz" -C "$project" \
  "${files[@]}" logging/config.alloy logging/promtail.yaml

# Docker cursor values are Unix seconds; seed just before stopping Alloy.
cutover_epoch=$(date -u +%s)
printf 'cutover_epoch=%s\ncutover_utc=%s\nnginx_id=%s\nbackend_id=%s\n' \
  "$cutover_epoch" "$(date -u -d "@$cutover_epoch" +%FT%TZ)" "$nginx_id" "$backend_id" \
  > "$run_dir/cutover-metadata.txt"
python3 - "$state/positions.yaml" "$cutover_epoch" "$nginx_id" "$backend_id" <<'PY'
import os, sys
path, epoch, nginx, backend = sys.argv[1:]
fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
with os.fdopen(fd, "w", encoding="utf-8") as stream:
    stream.write(f'positions:\n  cursor-{nginx}: "{epoch}"\n  cursor-{backend}: "{epoch}"\n')
PY
cp -- "$state/positions.yaml" "$run_dir/positions-seeded.yaml"

rollback_needed=1
echo 'STOPPING_ALLOY_ONLY'
docker stop --time 30 ecommerce-alloy-1
[[ $(docker inspect ecommerce-alloy-1 --format '{{.State.Running}}') == false ]] || fail ALLOY_DID_NOT_STOP
[[ $(docker inspect ecommerce-alloy-1 --format '{{.State.ExitCode}}') != 137 ]] || fail ALLOY_STOP_WAS_FORCED
tar -czf "$run_dir/alloy-state-at-stop.tar.gz" -C "$alloy_state" .
[[ $(docker inspect ecommerce-nginx-1 --format '{{.Id}}') == "$nginx_id" ]] || fail NGINX_ID_CHANGED
[[ $(docker inspect ecommerce-backend-1 --format '{{.Id}}') == "$backend_id" ]] || fail BACKEND_ID_CHANGED

echo 'STARTING_PROMTAIL_ONLY'
docker compose "${args[@]}" up -d --no-deps --no-build --pull never promtail
promtail_ip=$(docker inspect ecommerce-promtail-1 --format '{{with index .NetworkSettings.Networks "ecommerce_monitoring_network"}}{{.IPAddress}}{{end}}')
[[ $promtail_ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail PROMTAIL_INTERNAL_IP_MISSING
ready=0
echo 'WAITING_FOR_PROMTAIL_READY'
for (( attempt=1; attempt<=30; attempt++ )); do
  if curl --max-time 2 -fsS -o /dev/null "http://$promtail_ip:9080/ready" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 2
done
(( ready == 1 )) || fail PROMTAIL_NOT_READY
echo 'PROMTAIL_READY'
curl --max-time 5 -fsS "http://$promtail_ip:9080/targets" > "$run_dir/promtail-targets.html"

# One safe GET with a unique URI proves fresh ingestion, not old Alloy data.
marker="/api/promtail-cutover-${cutover_epoch}-${RANDOM}"
status=$(curl --max-time 10 -sS -o /dev/null -w '%{http_code}' "http://192.168.197.135$marker")
[[ $status == 404 ]] || fail MARKER_RESPONSE_NOT_404
printf -v log_query 'sum(count_over_time({service="nginx"} |= "%s" [5m]))' "$marker"
ingestion_ok=0
echo 'WAITING_FOR_FRESH_NGINX_LOG'
for (( attempt=1; attempt<=12; attempt++ )); do
  if curl --max-time 5 -fsS -G --data-urlencode "query=$log_query" \
      http://127.0.0.1:3100/loki/api/v1/query > "$run_dir/marker-query.json" &&
    python3 - "$run_dir/marker-query.json" <<'PY'
import json, sys
with open(sys.argv[1]) as stream:
    data = json.load(stream)
ok = data.get("status") == "success" and any(
    float(item["value"][1]) >= 1 for item in data.get("data", {}).get("result", [])
)
sys.exit(0 if ok else 1)
PY
  then
    ingestion_ok=1
    break
  fi
  sleep 5
done
(( ingestion_ok == 1 )) || fail FRESH_NGINX_LOG_NOT_FOUND
curl --max-time 10 -fsS -o /dev/null http://192.168.197.135/api/health
snapshot > "$run_dir/containers-after.txt"
python3 - "$run_dir/containers-before.txt" "$run_dir/containers-after.txt" <<'PY'
import sys
def read(path):
    with open(path) as stream:
        return {row[0]: row[1:] for line in stream if (row := line.split())}
before, after = map(read, sys.argv[1:])
if len(before) != 12 or set(after) != set(before) | {"/ecommerce-promtail-1"}:
    raise SystemExit("STOP: UNEXPECTED_CONTAINER_INVENTORY")
for name, old in before.items():
    new = after[name]
    if name == "/ecommerce-alloy-1":
        if new[:3] != old[:3] or new[3] != "exited":
            raise SystemExit("STOP: ALLOY_BASELINE_CHANGED")
    elif new != old:
        raise SystemExit("STOP: OTHER_CONTAINER_CHANGED: " + name)
if after["/ecommerce-promtail-1"][3] != "running":
    raise SystemExit("STOP: PROMTAIL_NOT_RUNNING")
print("OTHER_11_CONTAINERS_UNCHANGED")
PY
printf 'MARKER_URI=%s\n' "$marker" | tee "$run_dir/marker-uri.txt"
(
  cd "$run_dir"
  sha256sum config-at-cutover.tar.gz alloy-state-at-stop.tar.gz \
    positions-seeded.yaml cutover-metadata.txt containers-before.txt \
    containers-after.txt promtail-targets.html marker-query.json marker-uri.txt > SHA256SUMS
  sha256sum --check --strict SHA256SUMS
)
chown --reference="$backup" "$run_dir" "$run_dir"/*
rollback_needed=0
echo 'CUTOVER_OK'
echo 'ALLOY_STOPPED; PROMTAIL_RUNNING; FRESH_NGINX_LOG_CONFIRMED; API_HEALTH_OK'
printf 'CUTOVER_BACKUP_DIR=%s\n' "$run_dir"
