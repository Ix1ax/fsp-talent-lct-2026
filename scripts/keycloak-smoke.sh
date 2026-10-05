#!/bin/sh
set -eu
# Этот клиент и пароль существуют только в локальном realm, не в серверном импорте.
response=$(curl --fail --silent --show-error 'http://localhost:8180/realms/fsp/protocol/openid-connect/token' \
  --data-urlencode 'client_id=fsp-local-test' \
  --data-urlencode 'grant_type=password' \
  --data-urlencode 'username=dev@example.test' \
  --data-urlencode 'password=local-demo-only') || {
  echo 'Keycloak не выдал токен локальному тестовому пользователю' >&2
  exit 1
}
# Проверяем состав токена для диагностики. Подпись и срок действия проверит сам API.
# Токен и его содержимое не выводим в журнал CI.
token=$(printf '%s' "$response" | python3 -c '
import base64, json, sys
response = json.load(sys.stdin)
token = response.get("access_token", "")
try:
    payload = token.split(".")[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
except (IndexError, ValueError):
    sys.exit("Keycloak вернул некорректный JWT")
if not claims.get("sub"):
    sys.exit("В JWT нет sub: добавьте scope basic в Default client scopes клиента Keycloak")
audience = claims.get("aud", [])
if isinstance(audience, str):
    audience = [audience]
if "fsp-api" not in audience:
    sys.exit("В JWT нет audience fsp-api: проверьте настройку audience mapper")
if claims.get("email_verified") is not True:
    sys.exit("Почта локального тестового пользователя не подтверждена")
print(token)
')
auth_header() { printf 'header = "Authorization: Bearer %s"\n' "$token"; }
# Первый вход: выбираем роль. Повторный запуск возвращает 409, это нормально.
status=$(auth_header | curl --silent --show-error --output /dev/null --write-out '%{http_code}' --config - \
  --header 'Content-Type: application/json' --data '{"role":"candidate"}' http://localhost:8080/api/v1/me/register)
if [ "$status" != 201 ] && [ "$status" != 409 ]; then
  echo "API не зарегистрировал тестового пользователя, статус $status" >&2
  exit 1
fi
identity=$(auth_header | curl --fail --silent --show-error --config - http://localhost:8080/api/v1/me) || {
  echo 'API отклонил тестовый токен: проверьте issuer, подпись и доступность JWKS' >&2
  exit 1
}
printf '%s' "$identity" | python3 -c '
import json, sys
identity = json.load(sys.stdin)
if not identity.get("sub") or identity.get("email") != "dev@example.test" or identity.get("email_verified") is not True or identity.get("role") != "candidate" or identity.get("status") != "active" or not identity.get("id"):
    sys.exit("API вернул неверные данные локального тестового пользователя")
'
printf 'Проверка Keycloak → JWT → API пройдена\n'
