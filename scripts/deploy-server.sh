#!/bin/sh
# Запускается на сервере из директории релиза после docker login и загрузки файлов.
set -eu
umask 077
chmod 600 .env
docker compose pull
docker compose up -d postgres redis s3 keycloak-db mailpit keycloak gateway
docker compose run --rm migrate
docker compose up -d --wait --wait-timeout 360
# Проверяем backend внутри сети, а затем HTTPS-сайт снаружи.
docker compose exec -T api wget -q -O /dev/null http://127.0.0.1:8080/readyz
API_DOMAIN=$(sed -n 's/^API_DOMAIN=//p' .env)
curl --fail --silent --show-error --retry 12 --retry-delay 5 --retry-all-errors "https://$API_DOMAIN/readyz"
curl --fail --silent --show-error "https://$API_DOMAIN/docs/" > /dev/null
