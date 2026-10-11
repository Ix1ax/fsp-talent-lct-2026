#!/bin/sh
# Update presentation of an existing realm. Import does not update existing realms.
# Pass Compose options before the implicit `exec`, e.g. -f deploy/compose.yaml.
set -eu
docker compose "$@" exec -T keycloak /bin/bash -s <<'KEYCLOAK_SCRIPT'
set -eu
umask 077
theme=/opt/keycloak/themes/fsp-scout/login
for file in theme.properties template.ftl login.ftl messages/messages_ru.properties; do
  if [ ! -r "$theme/$file" ]; then
    printf 'Keycloak не может прочитать тему: %s/%s. Проверьте bind mount и права 755/644.\n' "$theme" "$file" >&2
    exit 1
  fi
done
# Check the resources named in theme.properties before selecting the theme.
for resource in $(sed -n -e 's/^styles=//p' -e 's/^scripts=//p' -e 's/^favicons=//p' "$theme/theme.properties"); do
  if [ ! -r "$theme/resources/$resource" ]; then
    printf 'Keycloak не может прочитать ресурс темы: %s/resources/%s.\n' "$theme" "$resource" >&2
    exit 1
  fi
done
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
# Default merge mode preserves the remaining realm and SMTP settings.
/opt/keycloak/bin/kcadm.sh update realms/fsp --config "$config" \
  -s loginTheme=fsp-scout \
  -s 'displayName=ФСП Скаут' \
  -s 'displayNameHtml=ФСП Скаут' \
  -s 'smtpServer.fromDisplayName=ФСП Скаут'
printf 'Тема fsp-scout и название ФСП Скаут применены к realm fsp\n'
KEYCLOAK_SCRIPT
