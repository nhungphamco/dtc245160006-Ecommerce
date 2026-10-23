#!/usr/bin/env python3
"""Check the deployed HTTP demo without credentials or configuration changes."""
import argparse
import json
import sys
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url", help="Example: http://192.168.197.135")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    # Do not follow redirects: a login redirect must not masquerade as API success.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    client = urllib.request.build_opener(NoRedirect)
    checks = [("/", 200), ("/api/health", 200),
              ("/api/__minishop_missing_endpoint__", 404)]
    headers = ["Content-Security-Policy", "X-Content-Type-Options",
               "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]
    failed = False
    for path, expected in checks:
        try:
            response = client.open(base + path, timeout=10)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            body = response.read()
            status = response.code
            missing = [key for key in headers if not response.headers.get(key)]
            ok = status == expected and not missing
            if path == "/api/health":
                try:
                    data = json.loads(body)
                    ok = ok and data.get("status") == "ok" and data.get("database") == "connected"
                except (ValueError, AttributeError):
                    ok = False
            elif path.startswith("/api/"):
                try:
                    ok = ok and json.loads(body).get("success") is False
                except (ValueError, AttributeError):
                    ok = False
            print(f"PATH={path} HTTP={status} EXPECTED={expected} HEADERS={len(headers)-len(missing)}/5 RESULT={'PASS' if ok else 'FAIL'}")
            failed = failed or not ok
    print("NGINX_CHECK_OK" if not failed else "NGINX_CHECK_FAILED")
    return int(failed)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError):
        print("STOP: REQUEST_FAILED; check the URL and service availability", file=sys.stderr)
        sys.exit(1)
