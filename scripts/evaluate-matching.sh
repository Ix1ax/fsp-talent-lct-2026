#!/bin/sh
set -eu
# Явный адрес тестовой БД не даёт случайно запустить проверку на рабочем окружении.
: "${TEST_DATABASE_URL:?Укажите TEST_DATABASE_URL для отдельной тестовой базы PostgreSQL}"
GIN_MODE="${GIN_MODE:-release}"
export TEST_DATABASE_URL GIN_MODE
cd "$(dirname "$0")/../apps/api"
go test -race -tags=integration ./tests/integration -run '^TestCandidateMatchingEvaluation$' -count=1 -v
