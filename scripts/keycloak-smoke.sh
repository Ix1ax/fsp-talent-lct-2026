#!/bin/sh
set -eu
# Этот клиент и пароль существуют только в локальном realm, не в серверном импорте.
response=$(curl --fail --silent --show-error 'http://localhost:8180/realms/fsp/protocol/openid-connect/token' \
  --data-urlencode 'client_id=fsp-local-test' \
  --data-urlencode 'grant_type=password' \
  --data-urlencode 'username=dev@example.test' \
  --data-urlencode 'password=local-demo-only')
token=$(printf '%s' "$response" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')
printf '%s' "$token" | python3 -c 'import sys; print("header = \"Authorization: Bearer " + sys.stdin.read() + "\"")' | \
  curl --fail --silent --show-error --config - http://localhost:8080/api/v1/me > /dev/null
printf 'Keycloak → JWT → API: OK\n'
