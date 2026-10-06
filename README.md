# ФСП · ЛЦТ 2026

Монорепозиторий: Go/Gin, Next.js App Router, Postgres, Redis, S3 (SeaweedFS) и Keycloak.
Реализованы авторизация, справочники и API профилей кандидатов и компаний.
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

`make setup` создаёт `.env`, `apps/api/.env` и `apps/web/.env`, не перезаписывая существующие файлы.
При смене локальных паролей обновляйте соответствующие env-файлы. Next.js проксирует API через
`API_PROXY_TARGET` (по умолчанию `http://localhost:8080`). Для удалённого бека измените эту переменную
в `apps/web/.env` и перезапустите dev-сервер; для production пересоберите приложение.
Для обновления сессии задайте `OIDC_TOKEN_URL` и `OIDC_CLIENT_ID=fsp-web`.
Секреты в `NEXT_PUBLIC_*` не помещаем: эти значения входят в браузерную сборку.
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
apps/web/              Next.js App Router: npm workspace и корневой package-lock.json
api/openapi.yaml       общий контракт API
infra/keycloak/        серверный и локальный импорт realm
compose.yaml           локальные контейнеры
compose.ci.yaml        готовые образы интеграционного CI
deploy/                серверный Compose и пример окружения
scripts/               проверки и серверный деплой
```

В беке `cmd/api` собирает зависимости, `internal/httpapi` собирает маршруты,
`internal/auth` проверяет токены, `internal/platform` подключает хранилища.
Модуль компаний разделён по слоям:

```text
internal/company/entity/       модели, ошибки и проверка входных данных
internal/company/service/      сценарии профиля, документов и потребностей; интерфейсы хранилищ
internal/company/repository/   SQL-запросы и транзакции PostgreSQL
internal/company/web/          HTTP-обработчики, маршруты и ответы об ошибках
internal/catalog/              общие справочники, их репозиторий и сервис
internal/catalog/web/          публичные HTTP-методы справочников
internal/httpapi/middleware/   получение текущего пользователя и проверка роли
internal/httpapi/request/      разбор JSON и пагинации
```

`web` обращается к сервисам, сервисы работают через интерфейсы хранилищ,
а `repository` реализует эти интерфейсы. Модели не зависят от HTTP или PostgreSQL.
Связи между слоями собираются в `cmd/api`. Справочники вынесены из компаний,
чтобы их могли использовать другие модули.
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
API-контракт меняем вместе с кодом; копию OpenAPI для Go embed проверяет `make check`.

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
Миграция `20261006012035_companies_files.sql` применяется после `users`; старые миграции не менялись.

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

### Потребности работодателя

Потребность привязана к компании и описывает, кого ищет команда. Это отдельная запись
`employer_needs`: специализация, необязательный грейд, название, описание команды и задач,
зарплатная вилка в рублях за месяц, город, часовой пояс, навыки и форматы работы.
Навыки хранятся в `need_skills`, форматы — в `need_work_formats`.

| Метод | Путь | Доступ |
| --- | --- | --- |
| POST | `/api/v1/companies/{company_id}/needs` | Владелец или рекрутер |
| GET | `/api/v1/companies/{company_id}/needs` | Активный участник |
| GET | `/api/v1/companies/{company_id}/needs/{need_id}` | Активный участник |
| PATCH | `/api/v1/companies/{company_id}/needs/{need_id}` | Владелец или рекрутер |
| DELETE | `/api/v1/companies/{company_id}/needs/{need_id}` | Владелец или рекрутер; архивирование |

У списка есть `limit` (1–100, по умолчанию 20), `offset` (0–10000) и необязательный
фильтр `status`. Без фильтра возвращаются все статусы. Чужая компания или потребность — 404,
свой участник без прав записи — 403. `company_id` и `created_by` через PATCH менять нельзя.
Создание и замена связанных навыков/форматов выполняются одной транзакцией.

Для селектов фронт использует публичные справочники:

- `GET /api/v1/catalogs` — специализации, грейды, форматы работы;
- `GET /api/v1/catalogs/skills?q=golang&limit=20&offset=0` — навыки с поиском по названию,
  коду и синонимам. Без `q` возвращается страница активных навыков.

ID справочников общие с будущим модулем соискателей. В миграции уже есть начальные данные:
направления Backend/Frontend/QA и другие, Intern/Junior/Middle/Senior, офис/гибрид/удалённо,
16 распространённых навыков. Модуль соискателей должен переиспользовать эти таблицы, а не
создавать второй набор справочников. Дополнение справочников — отдельной миграцией.

Минимальный черновик:

```json
{
  "specialization_id": 1,
  "title": "Go-разработчик",
  "description": "Разработка API. Команда из двух бэкендеров и фронтендера."
}
```

По умолчанию статус `draft`. Для `active` нужно выбрать хотя бы один навык и формат работы:

```json
{
  "specialization_id": 1,
  "grade_id": 3,
  "title": "Go-разработчик",
  "description": "Разработка сервисов и API платформы",
  "salary_from_rub": 150000,
  "salary_to_rub": 250000,
  "city": "Москва",
  "timezone": "Europe/Moscow",
  "status": "active",
  "skills": [
    {
      "skill_id": "00000000-0000-4000-8000-000000000001",
      "required": true,
      "weight": 1
    }
  ],
  "work_format_ids": [3]
}
```

Фронт берёт актуальные ID из справочников; UUID в примере — начальный навык Go.
Вес навыка обязателен: 0.01–100 с точностью до двух знаков. `required` по умолчанию false.
Нижняя граница зарплаты не может быть выше верхней; обе можно оставить незаполненными.
Часовой пояс — IANA, например `Europe/Moscow` или `UTC`; база часовых поясов встроена в API.

PATCH сохраняет неуказанные поля. `skills` и `work_format_ids` заменяют набор целиком,
`[]` очищает его у черновика или архива. `null` очищает только грейд, границы зарплаты,
город и часовой пояс. Одновременные PATCH не затирают не переданные ими поля.

DELETE переводит запись в `archived`, сохраняя ID и связи для будущих подборок и ATS.
Повторный DELETE возвращает 204. Для восстановления используйте PATCH с `status: active`
и необходимыми навыками/форматами. Сам расчёт рекомендаций и интеграция с ATS в этот этап не входят.

Новая миграция `20261006075710_employer_needs.sql` применяется после компаний, добавляет
справочники и три таблицы потребностей. Старый API совместим с расширенной схемой.
Новые переменные окружения и GitHub Secrets не требуются.

Интеграционный тест создаёт отдельную схему в тестовом Postgres, проверяет миграцию вверх/вниз,
права, валидацию, замену связей, архив и одновременные обновления. S3 для него не нужен:

```sh
cd apps/api
# Задайте TEST_DATABASE_URL для отдельного тестового Postgres.
go test -race -tags=integration ./internal/httpapi -run TestCompanyNeeds
```

### Профиль кандидата

Пользователь входит через Keycloak, подтверждает почту и регистрируется в API через
`POST /api/v1/me/register` с `{"role":"candidate"}`. Дальше во всех запросах нужен
`Authorization: Bearer <access_token>`. Методы доступны только роли `candidate`: работодатель получит 403.
Профиль создаётся явным запросом кандидата, у одного пользователя он один.

| Метод | Путь | Что делает |
| --- | --- | --- |
| POST | `/api/v1/me/profile` | Создать свой профиль, 201 и `Location: /api/v1/me/profile` |
| GET | `/api/v1/me/profile` | Получить свой профиль |
| PATCH | `/api/v1/me/profile` | Изменить свой профиль |
| PUT | `/api/v1/me/profile/avatar` | Загрузить или заменить аватар, multipart, поле `file` |
| GET | `/api/v1/me/profile/avatar` | Получить свой аватар (картинка) |
| DELETE | `/api/v1/me/profile/avatar` | Удалить аватар, 204 |

Поля профиля, все необязательны: `headline` (до 200 символов), `summary` (до 10000), `city` (до 200),
`timezone` (IANA, например `Europe/Moscow`), `experience_months` (0–600, по умолчанию 0),
`salary_min_rub` (желаемая зарплата в месяц), `search_status` и `work_format_ids`.
`search_status`: `open`, `passive` или `hidden`; по умолчанию `hidden` — профиль никому не виден,
пока кандидат сам не выберет другой статус. `work_format_ids` берите из `GET /api/v1/catalogs`.
Грейд и категория не задаются: они появятся после тестирования. В ответе есть `id`, `avatar_file_id`
и `updated_at`; `user_id` наружу не отдаётся.

В PATCH отправляйте только изменяемые поля: отсутствующее поле не меняется, `null` очищает необязательное
поле. `experience_months` и `search_status` очистить нельзя. Непустой `work_format_ids` заменяет набор
целиком, `[]` очищает его. Нельзя передавать `id`, `user_id`, `avatar_file_id`, `updated_at`: это 400.

Ошибки приходят в формате `{"error":{"code","message"}}`, сообщение на русском:

| Код | Статус | Когда |
| --- | --- | --- |
| `profile_exists` | 409 | Профиль уже создан |
| `profile_not_found` | 404 | Профиля ещё нет, создайте его через POST |
| `avatar_not_found` | 404 | Аватар не загружен |
| `validation_error` | 400 | Некорректный JSON, неизвестное поле, значение вне границ, неизвестный формат работы |
| `invalid_file` | 400 | Нужен ровно один файл в поле `file`, файл пустой или повреждён |
| `file_too_large` | 413 | Аватар больше 2 МиБ |
| `unsupported_file_type` | 415 | Допустимы только JPEG и PNG |
| `forbidden` / `user_inactive` | 403 | Не кандидат / учётная запись заблокирована |
| `storage_unavailable` | 503 | Хранилище файлов недоступно |

Аватар: только JPEG и PNG, до 2 МиБ и до 4 мегапикселей. Тип определяется по содержимому, не по расширению.
Повторная загрузка заменяет аватар. **Аватар видит только сам кандидат**: карточки кандидатов для работодателей
анонимны, и показ фото решим вместе с офферами. Для показа достаточно
`fetch(url, {headers: {Authorization: 'Bearer ' + token}})`, затем `blob()` и `URL.createObjectURL(blob)`;
при смене или размонтировании картинки вызывайте `URL.revokeObjectURL`. Токен в URL не передавайте.

```sh
curl --fail-with-body -X POST "$API_URL/api/v1/me/profile" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"headline":"Go-разработчик","experience_months":30,"search_status":"open","work_format_ids":[1,3]}'

curl --fail-with-body -X PUT "$API_URL/api/v1/me/profile/avatar" \
  -H "Authorization: Bearer $TOKEN" -F 'file=@./photo.png'
```

Данные лежат в `candidate_profiles` и `candidate_work_formats`, содержимое аватара — в приватном S3 в общей
таблице `files` с целью `candidate_avatar`. Миграция `20261006092005_candidate_profiles.sql` применяется после
`employer_needs`. Интеграционные тесты профиля и аватара используют те же `TEST_DATABASE_URL` и `TEST_S3_*`:

```sh
cd apps/api
go test -race -tags=integration ./internal/httpapi -run 'TestCandidate'
```
