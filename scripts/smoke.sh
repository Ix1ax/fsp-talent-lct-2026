#!/bin/sh
set -eu
web_base="${SMOKE_URL:-http://localhost:3000}"
api_base="${SMOKE_API_URL:-http://localhost:8080}"

check_url() {
  printf 'Проверка %s\n' "$1"
  # Проверяем конечный ответ, чтобы редирект не скрывал ошибку или цикл переходов.
  code=$(curl --fail --location --max-redirs 5 --silent --show-error --output /dev/null --write-out '%{http_code}' "$1")
  [ "$code" = 200 ] || { echo "Неожиданный статус $1: $code"; exit 1; }
}

# Через фронт проверяем само приложение и проксирование продуктового API.
check_url "$web_base/"
check_url "$web_base/api/v1/info"

# Swagger и служебные методы обслуживает Go, прокси документации на фронте не нужен.
for path in /healthz /readyz /api/v1/info /docs/ /docs/assets/swagger-ui-bundle.js /openapi.yaml /api/v1/auth/config; do
  check_url "$api_base$path"
done
cors=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' -X OPTIONS -H 'Origin: https://frontend.example.test' -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: authorization' "$api_base/api/v1/me")
[ "$cors" = 204 ] || { echo 'Предварительный запрос CORS завершился ошибкой'; exit 1; }
code=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$api_base/api/v1/me")
case "$code" in 401) ;; *) echo "Неожиданный статус /me без авторизации: $code"; exit 1;; esac
printf '\nПроверки доступности пройдены\n'
