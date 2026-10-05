# ФСП · ЛЦТ 2026

Монорепозиторий: Go/Gin API, Next.js (App Router) + FSD/TypeScript, PostgreSQL, Redis и S3. Сейчас здесь инфраструктурная основа, а не готовый продукт хакатона.

## Быстрый запуск

Нужны Docker с Compose v2 и свободные порты 3000, 5432, 6379, 8080, 8333.

```sh
cp .env.example .env
make up
make smoke
```

Откройте http://localhost:3000. Миграции применяются перед стартом API. Данные Postgres и S3 сохраняются в Docker volumes. `make down` останавливает окружение без удаления данных. `docker compose down -v` удаляет данные — для обычной остановки его не используем.

## Локальная разработка

Нужны Go 1.26+, Node 24 LTS и npm. Все npm-команды выполняются из корня: один workspace и один `package-lock.json` на монорепу.

```sh
make setup
make infra
make migrate
make api     # первый терминал
make web     # второй терминал, http://localhost:3000
```

Если меняете пароли в корневом `.env`, обновите `apps/api/.env` для запуска Go на хосте. `make setup` существующие файлы не перезаписывает. Если перед этим запущен полный стек, выполните `make down`, чтобы освободить порты.

Next.js проксирует `/api`, `/healthz` и `/readyz` в Go через `rewrites` (`API_PROXY_TARGET`). В контейнерах тот же механизм: Next.js ходит во внутренний сервис `api`. Фронт в браузере использует относительные URL: нет отдельных сборок под каждый домен и не нужен CORS для штатного запуска. Секретов в `NEXT_PUBLIC_*` быть не должно: эти переменные попадают в браузер.

## Структура

```text
apps/api/              Go-модуль, Dockerfile, cmd, internal, миграции
apps/web/              Next.js App Router + FSD, Dockerfile (standalone)
api/openapi.yaml       контракт с фронтендом
compose.yaml           локальное окружение
deploy/               серверное окружение и HTTPS (Caddy)
scripts/               общие проверки
docs/                 архитектура, разработка, деплой
.github/workflows/     CI и публикация/деплой
```

Папки `deploy` и `docs` находятся в корне. Фронтенд может менять `apps/web`, бекенд — `apps/api`; контракт API согласуем в `api/openapi.yaml`. Не создаём вложенные Git-репозитории и дополнительные npm lock-файлы.

## Что уже работает

- Gin, `pgxpool`, Redis и AWS SDK v2 с S3-совместимым endpoint.
- Конфигурация из окружения с проверками, JSON-логи без тел запросов и токенов, request ID, таймауты, graceful shutdown.
- `/healthz` для проверки процесса, `/readyz` для проверки Postgres, Redis и S3-бакета, `/api/v1/info` для связи с фронтом.
- `/api/v1/me` с OIDC JWT-проверкой подписи, issuer, audience, срока действия и подтверждённого email. Без провайдера возвращается 503, а не анонимный доступ.
- SQL-миграции Goose с пустой начальной миграцией. Предметных таблиц пока нет.
- Сборки Docker, CI с тестами и проверкой полного стека, публикация образов в GHCR, опциональный деплой на VPS.

Регистрация, кабинеты, доменная авторизация, тестирование, приглашения и загрузка резюме — следующие задачи. Кнопок, выдающих их за готовые функции, здесь нет.

## Проверки

```sh
make check   # gofmt, vet, race-тесты, ESLint, TypeScript, Next.js build
make smoke   # проверка уже запущенного контейнерного стека
make integration # запись/чтение Postgres, Redis и S3; нужен apps/api/.env
```

Подробнее: [архитектура](docs/architecture.md), [разработка](docs/development.md), [деплой и секреты](docs/deployment.md), [API](api/openapi.yaml).
