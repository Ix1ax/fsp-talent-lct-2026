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
по `http://<PUBLIC_HOST>:8025`; SMTP остаётся внутри Docker-сети. Письма сохраняются
в volume `mailpit-data`. Для общего пароля интерфейса добавьте
`MAILPIT_UI_AUTH=team:<отдельный пароль>` в Secret `PRODUCTION_ENV`.
Без этой переменной веб-интерфейс открыт без авторизации.

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

- PR: автоматические проверки отключены. Тесты и линтеры запускаем локально через `make check`.
- Push в `main`: сборка образа API с Docker-кешем, публикация в GHCR и деплой. Фронт и интеграционное окружение в Actions не собираются.
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
Для `main` можно оставить один review. Обязательные статусы backend/frontend/integration и «Определение изменений» нужно убрать из защиты ветки: эти jobs больше не запускаются.
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

### Компании и документы

Сначала пользователь входит через Keycloak, подтверждает почту и регистрируется в API через
`POST /api/v1/me/register` с `{"role":"employer"}`. Дальше во всех запросах нужен
`Authorization: Bearer <access_token>`; локальный UUID уже предоставляет middleware.

| Метод | Путь | Доступ |
| --- | --- | --- |
| POST | `/api/v1/companies` | Работодатель создаёт компанию и становится `owner` |
| GET | `/api/v1/companies?limit=20&offset=0` | Только компании пользователя |
| GET | `/api/v1/companies/{company_id}` | Активный участник |
| PATCH | `/api/v1/companies/{company_id}` | Только владелец |
| GET | `/api/v1/companies/{company_id}/files` | Активный участник; та же пагинация |
| POST | `/api/v1/companies/{company_id}/files` | Только владелец, multipart |
| GET | `/api/v1/companies/{company_id}/files/{file_id}/download` | Активный участник |
| DELETE | `/api/v1/companies/{company_id}/files/{file_id}` | Только владелец |

Минимальное тело создания: `{"name":"Компания","contact_email":"hr@example.org"}`.
Дополнительно: `description`, `inn`, `contact_url`. В PATCH отправляйте только изменяемые поля;
`null` очищает необязательное поле. ИНН необязателен, проверяется по контрольной сумме и уникален.
Проверка ИНН не означает верификацию компании: она создаётся со статусом `unverified`.
Чужая компания или файл возвращают 404, свой профиль без прав владельца — 403.
Приглашения участников, модерация и вакансии в этот этап не входят.

Загрузка — ровно один `file` и `purpose`: `company_document` или `company_logo`.
Документы: PDF/JPEG/PNG до 10 МиБ; логотип: JPEG/PNG до 2 МиБ. Изображения — до 4 мегапикселей.
Тип определяется по содержимому, изображения декодируются для проверки; антивирусного сканирования нет.
API обрабатывает до двух загрузок одновременно; при занятости вернёт `503 upload_busy` и `Retry-After: 2`.
Успешная загрузка логотипа автоматически обновляет `logo_file_id`; предыдущий файл остаётся
в списке, пока владелец его не удалит. Для удаления логотипа используйте DELETE его файла.

```sh
curl --fail-with-body "$API_URL/api/v1/companies/$COMPANY_ID/files" \
  -H "Authorization: Bearer $TOKEN" \
  -F 'purpose=company_document' \
  -F 'file=@./договор.pdf'
```

В Swagger (`/docs/`) доступны авторизация, создание компании, выбор файла и скачивание.
Фронту для показа логотипа нужен `fetch(downloadURL, {headers: {Authorization: 'Bearer ' + token}})`:
из ответа получить `blob()`, затем `URL.createObjectURL(blob)`; при смене/размонтировании картинки
вызвать `URL.revokeObjectURL`. Токен в URL не передавать. `Content-Disposition` доступен через CORS.

В Postgres лежат `companies`, `company_members`, общая таблица `files` и связь `company_documents`.
В приватном S3 — только содержимое файлов со случайными ключами. Прямые ссылки и ключи S3 API не выдаёт.
Используются существующие `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`;
новые GitHub Secrets не нужны. Бакет должен существовать и запрещать анонимное чтение.
Миграция `20261006010000_companies_files.sql` применяется после `users`; старые миграции не менялись.

Файл проходит состояния `pending → ready → deleting → deleted`. Скачать можно только `ready`.
При сбое загрузки API пытается убрать файл; при недоступном S3 или аварийной остановке незавершённая
запись остаётся видна в списке. Владелец может повторить DELETE для `pending`/`deleting`.
Автоматического фонового удаления таких записей пока нет. После удаления метаданные сохраняются,
содержимое S3 удаляется. На уровне компании изменения блокируются транзакцией, чтобы параллельные
PATCH не затирали друг друга.

Интеграционный тест компаний создаёт временную схему в `TEST_DATABASE_URL`, применяет и откатывает
новую миграцию, проверяет права и реальные операции S3. Используйте отдельный тестовый бакет:

```sh
cd apps/api
# Задайте TEST_DATABASE_URL и TEST_S3_ENDPOINT, TEST_S3_BUCKET, TEST_S3_ACCESS_KEY, TEST_S3_SECRET_KEY.
go test -race -tags=integration ./internal/httpapi -run TestCompaniesAndPrivateS3
```
