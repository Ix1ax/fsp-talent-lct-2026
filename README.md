# ФСП · ЛЦТ 2026

Монорепозиторий: Go/Gin, React/Vite, Postgres, Redis, S3 (SeaweedFS) и Keycloak.
Здесь только бойлерплейт. Продуктовые методы и таблицы пока не реализованы.
Комментарии и сообщения приложения пишем на русском.

## Запуск и разработка

Нужны Docker и Compose. Для разработки на хосте — Go 1.26 и Node 24.

```sh
cp .env.example .env
make up
make smoke
make auth-smoke
```

| Локальный сервис | Адрес |
| --- | --- |
| Фронт | http://localhost:3000 |
| API и Swagger | http://localhost:8080/docs/ |
| Keycloak | http://localhost:8180 |
| Тестовые письма | http://localhost:8025 |

Локальный пользователь: `dev@example.test`, пароль `local-demo-only`.
Он и клиент входа по паролю существуют только в локальном realm.
Администратор локального Keycloak задан в `.env.example`.
`make down` сохраняет данные, `docker compose down -v` удаляет volumes.

Для разработки без пересборки контейнеров:

```sh
make setup
make infra
make migrate
make api   # первый терминал
make web   # второй терминал, http://localhost:5173
```

`make setup` создаёт `.env` и `apps/api/.env`, не перезаписывая существующие файлы.
При смене локальных паролей обновляйте оба файла. Vite проксирует API в локальный бек.
Для удалённого бека задайте `VITE_API_BASE_URL=http://89.104.69.242:8080`
в `apps/web/.env` и перезапустите Vite. Секреты в `VITE_*` не помещаем.
Зависимости фронта добавляем из корня: `npm install <package> -w apps/web`.

## Сервер

HTTP, прямой доступ по IP, без Caddy, доменов и сертификатов.

| Проверка | Адрес |
| --- | --- |
| Swagger | http://89.104.69.242:8080/docs/ |
| Процесс API | http://89.104.69.242:8080/healthz |
| Postgres, Redis и S3 | http://89.104.69.242:8080/readyz |
| Версия API | http://89.104.69.242:8080/api/v1/info |
| Настройки входа | http://89.104.69.242:8080/api/v1/auth/config |
| Настройки Keycloak | http://89.104.69.242:8081/realms/fsp/.well-known/openid-configuration |

`GET /api/v1/me` принимает `Authorization: Bearer <access_token>`.
Проверяем подпись JWT, issuer, audience `fsp-api`, срок действия, `sub`
и подтверждённую почту. Без токена — `401`.
Ошибки: `{"error":{"code":"unauthorized","message":"…"}}`.
Токены, SQL, пароли и тела запросов не выводим в ответы и логи.
`X-Request-ID` связывает запрос с JSON-логом. CORS разрешает любые origin;
авторизация API работает без cookies.

Postgres хранит данные приложения; отдельная БД Keycloak — пользователей и вход.
Redis — восстанавливаемый кеш, S3 — содержимое файлов. Базы, Redis и S3 наружу
не опубликованы. Mailpit принимает тестовые письма; его интерфейс доступен
на сервере через `127.0.0.1:8025` и SSH-туннель.

Адрес сервера задаёт `PUBLIC_HOST`. Для тестового HTTP в Compose включён
`OIDC_ALLOW_HTTP=true`. Новые адреса фронта добавляем в redirect URI и web origins
клиента `fsp-web`. Scope `basic` должен быть Default у клиентов входа: он добавляет `sub`.
Импорт JSON действует только при первом создании realm. Существующие настройки
меняем через Keycloak Admin CLI по SSH, не удаляя пользователей и volumes.
Административный realm `master` сохраняет стандартное требование HTTPS для внешних
запросов. Для серверного управления используем `kcadm.sh` внутри контейнера
с адресом `http://localhost:8080`; локальная админка доступна на `localhost:8180`.

## CI/CD

Один workflow `.github/workflows/ci.yml`:

- PR: проверки Go, фронта и Docker-окружения, включая реальную авторизацию.
- Push в `main`: те же проверки, затем образ API с Docker-кешем, GHCR и деплой.
- Compose обновляет изменённые контейнеры и применяет миграции перед API.
  Проверяет `/readyz` и Swagger. Фронт на этот сервер не деплоится.

Создайте GitHub environment `production` и заполните Secrets:

| Секрет | Значение |
| --- | --- |
| `DEPLOY_HOST` | `89.104.69.242` |
| `DEPLOY_USER` | `fsp-deploy` |
| `DEPLOY_SSH_KEY` | Приватный SSH-ключ пользователя деплоя |
| `DEPLOY_KNOWN_HOSTS` | Проверенная SSH-запись сервера |
| `PRODUCTION_ENV` | Заполненный `deploy/production.env.example` |

`GITHUB_TOKEN` предоставляет GitHub. PAT и `DEPLOY_ENABLED` не нужны.
Пароли генерируем через `openssl rand -hex 32`. Смена env не меняет пароль
уже созданной роли Postgres: для ротации отдельно обновляем роль в БД.
Серверу нужны Docker, доступ к GHCR и открытые порты 8080/8081.
Секреты и реальные `.env` не коммитим.

```sh
cd ~/fsp
docker compose ps
docker compose logs -f --tail=100 api
```

Перед миграциями существующих данных делаем резервную копию БД вне VPS.
Файлы S3 также резервируем. Автоматических бэкапов и отказоустойчивого кластера нет.
Для отката API указываем предыдущий SHA в `API_IMAGE` серверного `.env`,
затем `docker compose pull api && docker compose up -d --wait`.
Миграции не откатываются; схема должна оставаться совместимой.

## Структура и правила команды

```text
apps/api/              Go: cmd, internal, миграции и Dockerfile
apps/web/              React/Vite: один npm workspace и корневой lock-файл
api/openapi.yaml       общий контракт API
infra/keycloak/        серверный и локальный импорт realm
compose.yaml           локальные контейнеры
compose.ci.yaml        готовые образы интеграционного CI
deploy/                серверный Compose и пример окружения
scripts/               проверки и серверный деплой
```

В беке `cmd` собирает приложение, `internal/httpapi` содержит HTTP-обработчики,
`internal/auth` проверяет токены, `internal/platform` подключает хранилища.
Новые предметные модули: сервис, SQL-репозиторий и обработчики.
Права на записи проверяем в сервисах и SQL, а не только в middleware.

Одна задача — ветка и PR, второй разработчик проверяет PR. У каждого своя локальная БД.
Общую БД меняют только миграции из `main`. Перед PR подтягиваем `main`.
Для `main` включаем обязательные проверки backend/frontend/integration и один review.
Создаём миграцию через `goose create имя sql` из `apps/api/migrations`.
Используем временные метки. После вливания миграцию не меняем: исправление — новый файл.
Согласуем изменения одной таблицы, проверяем миграции с нуля и поверх `main`.
Если новая метка старше уже применённых, обновляем её до вливания.
Сначала добавляем поля и переводим код, удаление старых полей — отдельным изменением.
`goose down` на общей БД без согласования не запускаем.
API-контракт меняем вместе с кодом; копию OpenAPI для Go embed проверяет CI.

```sh
make check        # gofmt, vet, race-тесты, линтер и сборка фронта
make integration  # чтение и запись Postgres, Redis, S3; нужен apps/api/.env
```
