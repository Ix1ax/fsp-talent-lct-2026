#!/bin/sh
# Запускается на сервере после загрузки конфигурации и входа в GHCR.
set -eu
umask 077
chmod 600 .env
# Миграции запускает Compose перед API. Уже работающие хранилища не пересоздаются без изменений.
docker compose pull api
docker compose up -d --remove-orphans --wait --wait-timeout 360
curl --fail --silent --show-error --retry 5 --retry-delay 2 --retry-all-errors http://127.0.0.1:8080/readyz
curl --fail --silent --show-error http://127.0.0.1:8080/docs/ > /dev/null
printf '\nБек запущен и доступен на порту 8080\n'
