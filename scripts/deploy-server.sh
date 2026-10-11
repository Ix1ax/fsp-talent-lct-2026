#!/bin/sh
# Запускается на сервере после загрузки конфигурации и входа в GHCR.
set -eu
umask 077
chmod 600 .env
# SCP can preserve restrictive permissions from the release preparation step.
# Only the public theme tree is made readable by the unprivileged container user.
test -f keycloak-themes/fsp-scout/login/theme.properties
find keycloak-themes/fsp-scout -type d -exec chmod 755 {} +
find keycloak-themes/fsp-scout -type f -exec chmod 644 {} +
# Миграции запускает Compose перед API. Уже работающие хранилища не пересоздаются без изменений.
command -v python3 >/dev/null
docker compose --env-file .env -f compose.yaml pull api web
docker compose --env-file .env -f compose.yaml up -d --remove-orphans --wait --wait-timeout 360
# Reattach the theme directory and reload cached templates/resources.
docker compose --env-file .env -f compose.yaml up -d --no-deps --force-recreate --wait --wait-timeout 360 keycloak
sh keycloak-theme.sh --env-file .env -f compose.yaml
python3 keycloak-web.py --env-file .env -f compose.yaml
curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-all-errors http://127.0.0.1:8080/readyz
curl --fail --silent --show-error http://127.0.0.1:8080/docs/ > /dev/null
curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-all-errors http://127.0.0.1:3000/ > /dev/null
curl --fail --silent --show-error http://127.0.0.1:3000/api/v1/auth/config > /dev/null
printf '\nAPI запущен на порту 8080, фронт — на порту 3000\n'
