#!/bin/sh
# Update only the login theme of an existing realm. Import does not update existing realms.
# Pass Compose options before the implicit `exec`, e.g. -f deploy/compose.yaml.
set -eu
docker compose "$@" exec -T keycloak /bin/bash -s <<'KEYCLOAK_SCRIPT'
set -eu
umask 077
config=$(mktemp /tmp/fsp-theme-admin.XXXXXX)
trap 'rm -f "$config"' EXIT
attempt=0
until /opt/keycloak/bin/kcadm.sh config credentials --config "$config" \
  --server http://localhost:8080 --realm master \
  --user "$KC_BOOTSTRAP_ADMIN_USERNAME" --password "$KC_BOOTSTRAP_ADMIN_PASSWORD" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo 'Не удалось назначить тему Keycloak: проверьте действующий admin и доступность сервера.' >&2
    exit 1
  fi
  sleep 2
done
/opt/keycloak/bin/kcadm.sh update realms/fsp --config "$config" -s loginTheme=fsp-scout
printf 'Тема fsp-scout назначена realm fsp\n'
KEYCLOAK_SCRIPT
