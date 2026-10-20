#!/usr/bin/env bash

set +x
set -uo pipefail
umask 077

usage() {
    printf 'Cách dùng: %s <URL-backend> [Origin-được-phép]\n' "$0" >&2
    printf 'Ví dụ: %s https://minishop.example.com\n' "$0" >&2
    printf '       %s http://127.0.0.1:3001 https://minishop.example.com\n' "$0" >&2
}

if [[ $# -lt 1 || $# -gt 2 ]]; then
    usage
    exit 2
fi

BASE_URL=${1%/}

if [[ ! "$BASE_URL" =~ ^https?://[^/@[:space:]]+(/[^?#[:space:]]*)?$ ]]; then
    printf 'FAIL: URL backend không hợp lệ.\n' >&2
    usage
    exit 2
fi

DERIVED_ORIGIN=$(printf '%s\n' "$BASE_URL" | sed -E 's#^(https?://[^/]+).*$#\1#')
ORIGIN=${2:-$DERIVED_ORIGIN}

if [[ ! "$ORIGIN" =~ ^https?://[^/@[:space:]]+$ ]]; then
    printf 'FAIL: Origin phải có dạng scheme://host[:port], không có path.\n' >&2
    exit 2
fi

if ! command -v curl >/dev/null 2>&1; then
    printf 'FAIL: Không tìm thấy curl. Hãy cài curl trên Ubuntu trước.\n' >&2
    exit 2
fi

if ! command -v sed >/dev/null 2>&1; then
    printf 'FAIL: Không tìm thấy sed.\n' >&2
    exit 2
fi

TMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/minishop-auth-test.XXXXXX") || {
    printf 'FAIL: Không tạo được thư mục tạm an toàn.\n' >&2
    exit 2
}
chmod 700 "$TMP_DIR"

cleanup() {
    unset TEST_PASSWORD
    rm -rf -- "$TMP_DIR"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

AUTH_URL="${BASE_URL}/api/auth"
COOKIE_JAR="${TMP_DIR}/cookies.txt"
RESPONSE_FILE="${TMP_DIR}/response.json"
REQUEST_FILE="${TMP_DIR}/request.json"
TEST_EMAIL="minishop-auth-test-$(date +%s)-$$-${RANDOM}@example.invalid"
TEST_NAME="MiniShop Integration Test"

printf 'Mật khẩu thử nghiệm (nhập ẩn, tối thiểu 12 ký tự): ' >&2
IFS= read -r -s TEST_PASSWORD
printf '\n' >&2

if [[ ${#TEST_PASSWORD} -lt 12 ]]; then
    printf 'FAIL: Mật khẩu cần có ít nhất 12 ký tự.\n'
    exit 2
fi

json_escape() {
    local value=$1
    value=${value//\\/\\\\}
    value=${value//\"/\\\"}
    value=${value//$'\t'/\\t}
    value=${value//$'\r'/\\r}
    value=${value//$'\n'/\\n}
    printf '%s' "$value"
}

write_request() {
    local escaped_name escaped_email escaped_password
    escaped_name=$(json_escape "$TEST_NAME")
    escaped_email=$(json_escape "$TEST_EMAIL")
    escaped_password=$(json_escape "$TEST_PASSWORD")

    printf '{"fullName":"%s","email":"%s","password":"%s"}\n' \
        "$escaped_name" "$escaped_email" "$escaped_password" > "$REQUEST_FILE"
}

request() {
    local method=$1
    local url=$2
    shift 2

    if ! HTTP_STATUS=$(curl \
        --silent \
        --show-error \
        --connect-timeout 10 \
        --max-time 30 \
        --request "$method" \
        --header "Origin: $ORIGIN" \
        "$@" \
        --output "$RESPONSE_FILE" \
        --write-out '%{http_code}' \
        "$url"); then
        printf 'FAIL: Không thể gửi request đến %s.\n' "$url"
        exit 1
    fi
}

expect_status() {
    local label=$1
    local expected=$2
    local actual=$3

    if [[ "$actual" == "$expected" ]]; then
        printf 'HTTP %s — PASS: %s.\n' "$actual" "$label"
    else
        printf 'FAIL: %s — mong đợi HTTP %s, nhận HTTP %s.\n' \
            "$label" "$expected" "$actual"
        exit 1
    fi
}

response_has() {
    local pattern=$1
    grep -Eq "$pattern" "$RESPONSE_FILE"
}

printf 'Bắt đầu kiểm thử Backend Authentication.\n'
printf 'Backend: %s\n' "$BASE_URL"
printf 'Origin gửi kèm request: %s\n' "$ORIGIN"
printf 'Email test tự sinh: %s\n\n' "$TEST_EMAIL"

write_request
request POST "${AUTH_URL}/register" \
    --header 'Content-Type: application/json' \
    --data-binary "@${REQUEST_FILE}" \
    --cookie-jar "$COOKIE_JAR"
expect_status "Đăng ký Customer" 201 "$HTTP_STATUS"

if ! response_has '"success"[[:space:]]*:[[:space:]]*true' ||
    ! response_has '"role"[[:space:]]*:[[:space:]]*"customer"'; then
    printf 'FAIL: Phản hồi đăng ký không có success/customer như mong đợi.\n'
    exit 1
fi
printf 'PASS: Phản hồi đăng ký xác nhận role Customer.\n'

write_request
request POST "${AUTH_URL}/login" \
    --header 'Content-Type: application/json' \
    --data-binary "@${REQUEST_FILE}" \
    --cookie-jar "$COOKIE_JAR"
expect_status "Đăng nhập" 200 "$HTTP_STATUS"

if ! response_has '"success"[[:space:]]*:[[:space:]]*true' ||
    ! response_has '"user"[[:space:]]*:'; then
    printf 'FAIL: Phản hồi đăng nhập không đúng định dạng mong đợi.\n'
    exit 1
fi
printf 'PASS: Đăng nhập trả thông tin user, không cần đọc cookie.\n'

request GET "${AUTH_URL}/me" --cookie "$COOKIE_JAR"
expect_status "Đọc phiên hiện tại (/me)" 200 "$HTTP_STATUS"

if ! response_has '"success"[[:space:]]*:[[:space:]]*true' ||
    ! response_has '"role"[[:space:]]*:[[:space:]]*"customer"'; then
    printf 'FAIL: /me không trả user Customer hợp lệ.\n'
    exit 1
fi
printf 'PASS: Session cookie xác thực được user Customer.\n'

request POST "${AUTH_URL}/logout" \
    --cookie "$COOKIE_JAR" \
    --cookie-jar "$COOKIE_JAR"
expect_status "Đăng xuất" 204 "$HTTP_STATUS"

request GET "${AUTH_URL}/me" --cookie "$COOKIE_JAR"
expect_status "Từ chối session sau đăng xuất" 401 "$HTTP_STATUS"

printf '\nKẾT QUẢ: PASS — toàn bộ kiểm thử Backend Authentication thành công.\n'
printf 'Lưu ý: script tạo một tài khoản Customer thử nghiệm mới và không xóa tài khoản đó.\n'
