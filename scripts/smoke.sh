#!/bin/sh
set -eu
base="${SMOKE_URL:-http://localhost:3000}"
curl --fail --silent --show-error "$base/healthz"
curl --fail --silent --show-error "$base/readyz"
curl --fail --silent --show-error "$base/api/v1/info"
curl --fail --silent --show-error "$base/docs/" > /dev/null
curl --fail --silent --show-error "$base/docs/assets/swagger-ui-bundle.js" > /dev/null
curl --fail --silent --show-error "$base/openapi.yaml" > /dev/null
curl --fail --silent --show-error "$base/api/v1/auth/config" > /dev/null
cors=$(curl --silent --output /dev/null --write-out '%{http_code}' -X OPTIONS -H 'Origin: https://frontend.example.test' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: authorization' "$base/api/v1/me")
[ "$cors" = 204 ] || { echo 'Предварительный запрос CORS завершился ошибкой'; exit 1; }
code=$(curl --silent --output /dev/null --write-out '%{http_code}' "$base/api/v1/me")
case "$code" in 401) ;; *) echo "Неожиданный статус /me без авторизации: $code"; exit 1;; esac
printf '\nПроверки доступности пройдены\n'
