#!/bin/sh
set -eu
base="${SMOKE_URL:-http://localhost:3000}"
curl --fail --silent --show-error "$base/healthz"
curl --fail --silent --show-error "$base/readyz"
curl --fail --silent --show-error "$base/api/v1/info"
curl --fail --silent --show-error "$base/" > /dev/null
code=$(curl --silent --output /dev/null --write-out '%{http_code}' "$base/api/v1/me")
case "$code" in 401|503) ;; *) echo "Unexpected unauthenticated /me status: $code"; exit 1;; esac
printf '\nSmoke checks passed\n'
