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

### Команда компании и приглашения

Роль `employer` относится к пользователю приложения, а `owner/recruiter/viewer` —
к его участию в конкретной компании. Один работодатель может участвовать в нескольких компаниях.
Создатель компании становится владельцем. Владелец и его права через API сотрудников не меняются.

| Действие | owner | recruiter | viewer |
| --- | --- | --- | --- |
| Читать компанию, документы, потребности и список команды | Да | Да | Да |
| Редактировать профиль компании, загружать и удалять документы | Да | Нет | Нет |
| Создавать, редактировать и архивировать потребности | Да | Да | Нет |
| Приглашать, менять роли, отключать сотрудников | Да | Нет | Нет |
| Читать и отзывать приглашения | Да | Нет | Нет |

| Метод | Путь | Что делает |
| --- | --- | --- |
| GET | `/api/v1/companies/{company_id}/members` | Список сотрудников с локальными UUID, ролями и статусами |
| PATCH | `/api/v1/companies/{company_id}/members/{user_id}` | Сменить роль: `{"role":"recruiter"}` или `viewer` |
| DELETE | `/api/v1/companies/{company_id}/members/{user_id}` | Отключить доступ, сохранив пользователя и историю |
| POST | `/api/v1/companies/{company_id}/invitations` | Создать приглашение: `{"email":"hr@example.org","role":"recruiter"}` |
| GET | `/api/v1/companies/{company_id}/invitations` | Список приглашений без токенов |
| DELETE | `/api/v1/companies/{company_id}/invitations/{invitation_id}` | Отозвать непринятое приглашение |
| POST | `/api/v1/company-invitations/accept` | Принять приглашение: `{"token":"…"}` |

Списки поддерживают `limit` (1–100, по умолчанию 20) и `offset` (0–10000).
Без токена — 401, недостаточно прав в своей компании — 403, чужая компания — 404.
Отключённый участник сразу теряет доступ к компании, документам и потребностям.
Повторное отключение успешно; вернуть доступ можно только новым приглашением.

При создании приглашения API один раз возвращает случайный `token`, ID и `expires_at`.
Он действует 7 дней и привязан к email. В БД хранится только SHA-256 токена.
Повторное ожидающее приглашение на тот же email даёт 409; старое можно отозвать,
а после истечения срока — создать новое. Автоматической отправки письма пока нет.
Фронт формирует ссылку на свой экран принятия, лучше передавать токен во фрагменте URL,
не записывать его в логи и убрать из адресной строки после чтения.

Получатель входит через Keycloak с подтверждённым email, регистрируется в API как
`employer`, затем вызывает принятие с токеном. Email берётся из проверенного JWT,
локальный `user_id` — из middleware; указать чужой ID или email в теле нельзя.
Кандидат не становится работодателем автоматически. Одновременное принятие не создаёт дубли,
повторный запрос того же активного сотрудника успешен. Новое приглашение активному участнику
не меняет роль (409) — для этого владелец использует PATCH сотрудника.

Миграция `20261006094000_company_invitations.sql` добавляет только таблицу приглашений
и индексы. Старый API совместим, новые переменные окружения и Secrets не нужны.
Модули пользователей и кандидатов не меняются.

```sh
cd apps/api
# Задайте TEST_DATABASE_URL для отдельного тестового Postgres.
go test -race -tags=integration ./internal/httpapi -run 'TestCompanyMembers|TestCompanyNeeds'
```

### Профиль кандидата

Пользователь входит через Keycloak, подтверждает почту и регистрируется в API через
`POST /api/v1/me/register` с `{"role":"candidate"}`. Дальше во всех запросах нужен
`Authorization: Bearer <access_token>`. Методы доступны только роли `candidate`: работодатель получит 403.
Профиль создаётся явным запросом кандидата, у одного пользователя он один. Для создания профиля нужно согласие `processing`, для публичного статуса ещё и `publication`: см. раздел «Согласия и контакты кандидата».

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
Грейд и категория не задаются вручную: их подтверждает тестирование. В ответе есть `id`, `avatar_file_id`
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

### Согласия и контакты кандидата

Персональные данные кандидата обрабатываются только с его согласием (152-ФЗ). Порядок для фронта:

1. Вход через Keycloak и регистрация `POST /api/v1/me/register` с `{"role":"candidate"}`.
2. `GET /api/v1/me/consents`: взять `current_policy_version`, показать кандидату текст политики этой версии.
3. `POST /api/v1/me/consents` с `{"kind":"processing","policy_version":"<текущая версия>"}`. Без этого нельзя создать профиль и сохранить контакты (409 `consent_required`).
4. Для публикации профиля (`search_status` `open` или `passive`) дополнительно `{"kind":"publication",...}`. Пока его нет, профиль остаётся скрытым и не попадает в банк кандидатов.

| Метод | Путь | Что делает |
| --- | --- | --- |
| GET | `/api/v1/me/consents` | История согласий (новые первыми, активное имеет `revoked_at: null`) и `current_policy_version` |
| POST | `/api/v1/me/consents` | Дать согласие: `kind`, `policy_version`, `company_id` (только для `ats_transfer`) |
| DELETE | `/api/v1/me/consents/{kind}` | Отозвать активное согласие (для `ats_transfer` с `?company_id=`), 204 |
| PUT | `/api/v1/me/contacts` | Сохранить свои контакты целиком |
| GET | `/api/v1/me/contacts` | Получить свои контакты |
| GET | `/api/v1/companies/{company_id}/offers/{offer_id}/candidate-contacts` | Для работодателя: контакты кандидата по принятому предложению |

Виды согласий: `processing` (обработка персональных данных), `publication` (публикация профиля), `ats_transfer`
(передача в ATS конкретной компании, нужен `company_id`; пока только хранится). Повторная выдача после отзыва создаёт
новую запись, история сохраняется. Версия политики хранится на сервере (`PRIVACY_POLICY_VERSION`); если фронт передаст
устаревшую, придёт 409 `policy_outdated`: нужно обновить текст и подтвердить заново.

**Отзыв.** Отзыв `processing` отзывает все активные согласия, переводит профиль в `hidden` и закрывает контакты
(кандидат получает 409 `consent_required`, работодатель 409 `contacts_unavailable`). Данные не удаляются.
Отзыв `publication` только скрывает профиль. Повторная выдача согласия статус профиля не восстанавливает:
кандидат сам возвращает `open` или `passive` через `PATCH /api/v1/me/profile`.

**Контакты.** Поля: `full_name` и `email` обязательны, `phone` (5-20 символов: цифры, `+`, пробелы, скобки, дефис) и
`telegram` (5-32 символа, латиница, цифры, `_`; ведущий `@` отбрасывается) необязательны. PUT заменяет объект целиком.
Контакты не показываются в карточках банка кандидатов. Работодатель получает их только если он активный `owner` или
`recruiter` компании, отправившей предложение, предложение принято (`accepted`) и у кандидата активно `processing`;
роль `viewer`, чужая компания и другой статус дают 404. Ответы с контактами не кешируются
(`Cache-Control: private, no-store`). Каждая выдача работодателю записывается в журнал аудита без самих контактов.

| Код | Статус | Когда |
| --- | --- | --- |
| `consent_required` | 409 | Нет нужного согласия: для профиля, публикации или контактов |
| `consent_exists` | 409 | Такое согласие уже дано |
| `policy_outdated` | 409 | Передана не текущая версия политики |
| `consent_not_found` | 404 | Нет активного согласия такого вида при отзыве |
| `company_not_found` | 404 | Компания для `ats_transfer` не найдена |
| `contacts_not_found` | 404 | Контакты ещё не сохранены |
| `contacts_unavailable` | 409 | Работодателю: нет активного согласия или контактов у кандидата |
| `request_too_large` | 413 | Тело JSON больше 2 МиБ (для аватара вместо этого `file_too_large`) |

```sh
curl --fail-with-body "$API_URL/api/v1/me/consents" -H "Authorization: Bearer $TOKEN"

curl --fail-with-body -X POST "$API_URL/api/v1/me/consents" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"kind":"processing","policy_version":"2026-10-07"}'

curl --fail-with-body -X PUT "$API_URL/api/v1/me/contacts" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"full_name":"Иван Иванов","email":"ivan@example.org","phone":"+7 900 123-45-67","telegram":"@ivan_dev"}'
```

При обновлении сервера профили, которые были опубликованы до появления согласий, переводятся в `hidden`:
кандидатам нужно дать согласия и снова выбрать `open` или `passive`. Данные лежат в `candidate_consents`,
`candidate_contacts` и `audit_events`; миграция `*_consents_contacts.sql` применяется после `candidate_offers`.
Интеграционные тесты используют те же `TEST_DATABASE_URL` и `TEST_S3_*`:

```sh
cd apps/api
go test -race -tags=integration ./internal/httpapi -run 'Consent|CandidateContacts'
```

### Навыки кандидата

Кандидат ведёт список навыков из общего справочника (те же `skills.id`, что у потребностей работодателя) с самооценкой
уровня. Нужен существующий профиль; отдельного согласия не требуется. Порядок для фронта:

1. Показать справочник: `GET /api/v1/catalogs/skills?q=...` (поиск по коду, названию и синонимам).
2. `PUT /api/v1/me/skills/{skill_id}` с `{"claimed_level": 1..5}`: добавляет навык или меняет его уровень.
3. `GET /api/v1/me/skills`: список по названию. `DELETE /api/v1/me/skills/{skill_id}`: убрать навык.

| Метод | Путь | Что делает |
| --- | --- | --- |
| GET | `/api/v1/me/skills` | Мои навыки: `skill_id`, `code`, `name`, `claimed_level`, `verified_level`, `source`, `confidence`, `updated_at` |
| PUT | `/api/v1/me/skills/{skill_id}` | Добавить навык или изменить уровень, 200 |
| DELETE | `/api/v1/me/skills/{skill_id}` | Убрать навык, 204 |

`claimed_level` обязателен и целый (1-5), это самооценка, а не подтверждённый грейд. `source` и `confidence` приходят только
в ответе: клиент их передать не может (лишнее поле даст 400). Веса источников: `claimed` 0.3, `test` 0.8, `fsp` 1.0. Источник
выбирается автоматически: `test` с `confidence` 0.8 и `verified_level`, если навык подтверждён пройденным тестом (см. «Тестирование
кандидата»), иначе `claimed` с 0.3; достижения ФСП добавят источник `fsp`.

Правила: навык должен быть в справочнике и активен (иначе 400); не более 50 навыков (иначе 400); навык, который выключили
в справочнике после добавления, остаётся в списке, его можно менять и удалять. Работодатели навыки кандидата пока не видят,
фильтры банка кандидатов не учитывают их.

| Код | Статус | Когда |
| --- | --- | --- |
| `validation_error` | 400 | Неверный UUID, уровень или JSON, лишнее поле, неизвестный или выключенный навык, лимит 50 |
| `profile_not_found` | 404 | Профиль ещё не создан |
| `skill_not_found` | 404 | Навыка нет в списке кандидата (при удалении) |
| `request_too_large` | 413 | Тело JSON больше 2 МиБ |
| `forbidden` / `user_inactive` | 403 | Не кандидат / учётная запись заблокирована |

```sh
curl --fail-with-body -X PUT "$API_URL/api/v1/me/skills/$SKILL_ID" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"claimed_level":4}'

curl --fail-with-body "$API_URL/api/v1/me/skills" -H "Authorization: Bearer $TOKEN"
```

Данные лежат в `candidate_skills`; миграция `*_candidate_skills.sql` применяется после `consents_contacts`. Интеграционные тесты
используют те же `TEST_DATABASE_URL` и `TEST_S3_*`:

```sh
cd apps/api
go test -race -tags=integration ./internal/httpapi -run 'CandidateSkills'
```

### Полный профиль кандидата

`GET /api/v1/me/profile/full` отдаёт всё, что нужно экрану профиля и онбордингу, одним ответом: профиль, активные согласия,
свои контакты, навыки и чек-лист готовности. Вызывать после входа и после каждого шага заполнения. Роль `candidate`.
Метод всегда отвечает 200 активному кандидату, даже если профиля ещё нет (`profile: null`), поэтому отдельный запрос
«есть ли профиль» не нужен. Ответ содержит контакты и не кешируется (`Cache-Control: private, no-store`).

```json
{
  "profile": { "...как GET /api/v1/me/profile...": "или null" },
  "consents": { "current_policy_version": "2026-10-07", "items": [ "только активные согласия" ] },
  "contacts": { "...как GET /api/v1/me/contacts...": "или null" },
  "skills": [ "как GET /api/v1/me/skills, со статусом модерации" ],
  "category": null,  // после пройденного теста: {specialization_id, specialization, grade_id, grade, confirmed_at}
  "achievements": [],
  "experience": [ "места работы, как GET /api/v1/me/experience" ],
  "education": [ "образование, как GET /api/v1/me/education" ],
  "experience_estimated_months": 14,  // подсказка по стажу или null, если мест работы нет
  "readiness": { "percent": 55, "ready_to_publish": true, "items": [ { "code": "profile", "title": "Профиль создан", "done": true, "required": true } ] }
}
```

- `contacts` равен `null`, если контактов нет **или нет активного согласия `processing`**; ошибка при этом не возвращается.
- `skills` содержит все навыки кандидата, в том числе ожидающие модерации (`moderation_status: pending`). Они засчитываются в готовность.
- `category` равна `null`, пока кандидат не прошёл ни одного теста, затем это специализация и грейд последнего пройденного теста (см. «Тестирование кандидата»). `achievements` пока заготовка под достижения ФСП: всегда `[]`. В навыках после теста появляются `source: "test"`, `confidence: 0.8` и `verified_level`.
- `experience` и `education` это списки из «Опыт работы и образование кандидата». `experience_estimated_months` — подсказка: стаж по местам работы в месяцах (пересекающиеся периоды не считаются дважды, текущая работа считается до текущего месяца). Поле профиля `experience_months` она не заменяет и не меняет: решать, переносить ли значение, должен кандидат. В чек-лист готовности эти разделы не входят.
- `consents.current_policy_version` нужно показать кандидату и вернуть при выдаче согласия (`POST /api/v1/me/consents`).

**Готовность** это подсказка для интерфейса, а не ограничение: условия публикации (`processing` и `publication`) по-прежнему
проверяет сервер при смене `search_status`. `percent` это доля выполненных пунктов от всех 11 (целое 0-100),
`ready_to_publish` истинно, когда выполнены все обязательные.

| Код | Пункт | Обязательный | Выполнено, когда |
| --- | --- | --- | --- |
| `consent_processing` | Согласие на обработку персональных данных | да | активно `processing` |
| `profile` | Профиль создан | да | профиль существует |
| `contacts` | Контакты сохранены | да | контакты есть и активно `processing` |
| `skills` | Добавлен хотя бы один навык | да | есть любой навык кандидата |
| `work_formats` | Выбран формат работы | да | выбран хотя бы один формат |
| `consent_publication` | Согласие на публикацию профиля | да | активно `publication` |
| `headline` | Заголовок профиля | нет | заполнен |
| `summary` | Описание о себе | нет | заполнено |
| `city` | Город | нет | заполнен |
| `salary` | Желаемая зарплата | нет | указана |
| `avatar` | Аватар | нет | загружен |

Пункты идут в фиксированном порядке (как в таблице), `title` на русском языке. Отзыв `processing` сразу отражается в ответе:
согласий нет, профиль `hidden`, `contacts` равен `null`, готовность падает. Данные читаются одним согласованным снимком,
поэтому части ответа не противоречат друг другу.

```sh
curl --fail-with-body "$API_URL/api/v1/me/profile/full" -H "Authorization: Bearer $TOKEN"
```

Новых таблиц и миграций нет. Интеграционные тесты используют те же `TEST_DATABASE_URL` и `TEST_S3_*`:

```sh
cd apps/api
go test -race -tags=integration ./internal/httpapi -run 'CandidateFullProfile'
```

### Опыт работы и образование кандидата

Кандидат ведёт в профиле списки мест работы и образования. Роль `candidate`, нужен созданный профиль (иначе `404 profile_not_found`).
Согласие `processing` для этих данных не требуется. Пока данные видит и меняет только сам кандидат: работодателям они не отдаются.
Ответы не кешируются (`Cache-Control: private, no-store`).

| Метод | Путь | Что делает |
| --- | --- | --- |
| GET | `/api/v1/me/experience` | Места работы: сначала текущее, затем по началу от новых к старым |
| POST | `/api/v1/me/experience` | Добавить место работы (до 30) |
| PUT | `/api/v1/me/experience/{id}` | Заменить запись целиком |
| DELETE | `/api/v1/me/experience/{id}` | Удалить запись (204) |
| GET | `/api/v1/me/education` | Образование по году окончания от новых к старым |
| POST | `/api/v1/me/education` | Добавить запись (до 10) |
| PUT | `/api/v1/me/education/{id}` | Заменить запись целиком |
| DELETE | `/api/v1/me/education/{id}` | Удалить запись (204) |

Списки приходят как `{"items": [...]}`. Частичных правок (PATCH) нет: PUT заменяет запись целиком.

```json
{"company":"LazurMedia","position":"PHP-программист","started_on":"2022-11","ended_on":null,"description":"Разработка REST API"}
{"level":"higher","institution":"Университет «Дубна»","specialty":"Программная инженерия","graduation_year":2027}
```

- Месяц передаётся и приходит строкой `ГГГГ-ММ` (`2022-11`; `2022-5` и `2022-13` дают 400). `ended_on: null` или отсутствие поля значит «по
  настоящее время». Начало и окончание не могут быть в будущем (граница по самому восточному часовому поясу, UTC+14, чтобы кандидат в любом поясе мог указать свой текущий месяц), окончание не раньше начала.
- Длины: `company`, `position`, `institution`, `specialty` до 200 символов (первые три обязательны), `description` до 2000. Пробелы по краям
  обрезаются.
- `level`: `secondary`, `vocational`, `incomplete_higher`, `higher`, `bachelor`, `master`, `phd`, `doctor`. `graduation_year` от 1950 до 2100;
  будущий год допустим (учится сейчас).
- Подсказка по стажу приходит в `GET /api/v1/me/profile/full` как `experience_estimated_months` (см. «Полный профиль кандидата»).

| Код | Статус | Когда |
| --- | --- | --- |
| `validation_error` | 400 | Неверное тело, месяц, уровень, длина, неизвестное поле |
| `unauthorized` | 401 | Нет действительного токена |
| `forbidden` | 403 | Роль не candidate |
| `user_inactive` | 403 | Пользователь заблокирован |
| `profile_not_found` | 404 | Профиль кандидата не создан |
| `experience_not_found` | 404 | Место работы не найдено или чужое (в том числе неверный UUID) |
| `education_not_found` | 404 | Запись об образовании не найдена или чужая |
| `limit_reached` | 409 | Уже 30 мест работы или 10 записей образования |
| `request_too_large` | 413 | Тело больше 2 МиБ |
| `candidate_unavailable` | 503 | Сервис профилей не настроен |

```sh
curl --fail-with-body -X POST "$API_URL/api/v1/me/experience" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"company":"LazurMedia","position":"PHP-программист","started_on":"2022-11","ended_on":null}'
```

Интеграционные тесты используют `TEST_DATABASE_URL`:

```sh
cd apps/api
go test -race -tags=integration ./tests/integration -run 'TestCareer|TestFullProfileCareer'
```

### Импорт резюме из PDF

`POST /api/v1/me/profile/import/resume` принимает PDF резюме с hh.ru и возвращает **черновик** профиля. Метод ничего не сохраняет:
ни файл, ни разобранные данные. Фронт показывает черновик в формах, кандидат правит его и сохраняет обычными методами
(`POST /me/profile`, `PUT /me/skills/{id}`, `PUT /me/contacts`, `POST /me/experience`, `POST /me/education`). Роль `candidate`, нужно
активное согласие `processing` (в файле персональные данные), профиль не обязателен: импорт можно запускать при онбординге до
создания профиля. Ответ не кешируется (`Cache-Control: private, no-store`).

Запрос `multipart/form-data` с одним файлом в поле `file` и без других полей: PDF до 5 МиБ, до 10 страниц, с текстовым слоем
(скан не читается).

```json
{
  "draft": {
    "headline": "Backend разработчик (Go)",
    "city": "Тверь",
    "summary": "Текст из блока «Обо мне»",
    "salary_min_rub": null,
    "work_format_ids": [3, 2],
    "contacts": {"full_name": "Иванов Иван", "email": "ivan@example.test", "phone": "+7 (900) 000-00-00", "telegram": "@ivanov"},
    "skills": [{"name": "PostgreSQL", "skill_id": "<uuid>"}, {"name": "ASP.NET Core", "skill_id": null}],
    "experience": [{"company": "ООО Пример", "position": "Go-разработчик", "started_on": "2022-11", "ended_on": null, "description": "…"}],
    "education": [{"level": "higher", "institution": "Университет «Дубна»", "specialty": "Программная инженерия", "graduation_year": 2027}],
    "languages": [{"name": "Английский", "level": "B1"}]
  },
  "warnings": ["Не удалось разобрать период места работы «…»: запись пропущена"]
}
```

- Поля, которые не удалось определить, равны `null` (строки и числа) или `[]` (списки); `warnings` всегда массив. Показывайте
  предупреждения кандидату рядом с формами.
- `experience` и `education` в том же формате, что тела `POST /me/experience` и `POST /me/education`: можно отправлять без преобразования
  (месяцы `ГГГГ-ММ`, уровни образования как в схеме).
- Навыки сопоставляются со справочником по названию, коду и алиасам без учёта регистра (только одобренные и активные).
  `skill_id: null` значит, что такого навыка нет: предложите добавить его через `POST /me/skills` (он уйдёт на модерацию).
  Навыки из черновика с `skill_id` добавляются через `PUT /me/skills/{skill_id}` с уровнем `claimed_level`, которого в резюме нет:
  его выбирает кандидат.
- `work_format_ids` соответствуют справочнику форматов работы (`GET /api/v1/catalogs`).
- **Точность.** Должность, город, формат работы, контакты, навыки и языки распознаются надёжно. Места работы и образование
  разбираются приблизительно, потому что макет PDF может отличаться: кандидат всегда проверяет их перед сохранением. Если
  hh.ru изменит шаблон, часть данных не распознается и появятся предупреждения.
- В `summary` попадает весь текст блока «Обо мне», в том числе внутренние заголовки («Ключевые навыки», «Опыт работы»):
  это оформление самого кандидата, а не разделы резюме. Длинный текст обрезается до 10000 символов с предупреждением.
- Из файла берётся только текст. Файл и черновик нигде не хранятся: файл читается в память и не пишется даже во временные файлы.
- Разбор идёт в **отдельном процессе** (тот же бинарник API в служебном режиме) с ограничениями по времени, процессорному времени и
  памяти: специально собранный PDF не может зациклить или перегрузить сервер, такой процесс просто убивается (`422`).

**Ограничения.** Не больше двух разборов одновременно (слот занят только на время самого разбора): при занятости `503 import_busy` с
заголовком `Retry-After: 5`, повторите запрос через несколько секунд. Разбор ограничен по времени (10 секунд), в документе не больше
200 тысяч символов, повреждённый или вредоносный файл не роняет сервер.

| Код | Статус | Когда |
| --- | --- | --- |
| `validation_error` | 400 | Нет поля `file`, не multipart, лишние поля |
| `unauthorized` | 401 | Нет действительного токена |
| `forbidden` | 403 | Роль не candidate |
| `user_inactive` | 403 | Пользователь заблокирован |
| `consent_required` | 409 | Нет активного согласия `processing` |
| `resume_too_large` | 413 | Файл больше 5 МиБ |
| `resume_unrecognized` | 422 | Не PDF, повреждён, без текста (скан) или не похож на резюме hh.ru |
| `import_busy` | 503 | Идут другие разборы |
| `candidate_unavailable` | 503 | Сервис не настроен |

```sh
curl --fail-with-body -X POST "$API_URL/api/v1/me/profile/import/resume" \
  -H "Authorization: Bearer $TOKEN" -F "file=@./resume.pdf;type=application/pdf"
```

Тестовый PDF в `apps/api/internal/candidate/resume/testdata/` синтетический (выдуманный человек), его генерирует
`gen_fixture.py` в том же каталоге. Тесты:

```sh
cd apps/api
go test -race ./internal/candidate/resume ./internal/candidate/service
go test -race -tags=integration ./tests/integration -run 'TestResume'
```

### Тестирование кандидата

Кандидат выбирает специализацию и грейд, проходит автопроверяемый тест из опубликованного шаблона, и результат подтверждает
его уровень. Все методы под `/api/v1/me/assessments`, нужен токен кандидата (`Authorization: Bearer <access token>`), ответы не
кешируются (`Cache-Control: private, no-store`). Для старта нужны профиль и активное согласие `processing`.

| Метод | Путь | Что делает |
| --- | --- | --- |
| GET | `/available` | Тесты по парам «специализация и грейд» и их состояние: `can_start`, `reason`, `retry_at`, `confirmed` |
| POST | `/attempts` | Начать тест: `{"specialization_id":1,"grade_id":2}`; возвращает задания без правил проверки |
| GET | `/attempts/current` | Активная попытка с заданиями и сохранёнными ответами |
| GET | `/attempts/{id}` | Попытка: пока активна, задания; после завершения итог в `result` |
| PUT | `/attempts/{id}/answers/{question_id}` | Сохранить или заменить ответ (204) |
| POST | `/attempts/{id}/submit` | Завершить и получить итог (повтор безопасен) |

**Сценарий для фронта.** `GET /available` рисует список (кнопка активна при `can_start`; при `retake_cooldown` покажите
`retry_at`). `POST /attempts` стартует таймер: `deadline_at` приходит с сервера, показывайте обратный отсчёт по нему.
Для каждого задания вызывайте `PUT .../answers/{question_id}`: `{"selected":["a"]}` для заданий с `prompt.options`
(несколько id, только если у задания `multiple: true`) или `{"text":"..."}` для коротких ответов (до 500 символов).
Ответ можно менять сколько угодно раз. Если страницу перезагрузили, `GET /attempts/current` вернёт попытку с уже сохранёнными
ответами. `POST /attempts/{id}/submit` закрывает попытку. Если дедлайн прошёл, сервер сам закроет попытку при следующем
обращении по сохранённым ответам, а новый ответ получит `409 attempt_closed`. Итог всегда можно прочитать через
`GET /attempts/{id}`.

**Итог (`result`).** `passed`, `score_percent`, `pass_score`, разбор по навыкам (`skills`: `percent`, `confirmed`, `level`),
`category` при успехе и `retry_at` при провале. Правильные ответы кандидату не показываются.

**Правила.**
- Оценка автоматическая: выбор верен при точном совпадении набора вариантов, текст сравнивается без учёта лишних пробелов
  (и регистра, если задание его не требует). Частичных баллов нет. Задание стоит `weight / question_count` своей строки состава,
  успех это `score_percent >= pass_score`.
- Просроченная попытка оценивается по сохранённым ответам: достаточно верных ответов, и она засчитается как успешная,
  иначе получит статус `expired`. Закрытие просроченной попытки сохраняется при любом обращении (`/available`, `/attempts/current`,
  старт), а её `finished_at` равен дедлайну: срок пересдачи считается от него, а не от момента, когда кандидат вернулся.
- Успех подтверждает навыки теста: навык подтверждается, если процент баллов по нему не ниже проходного. Уровень 1–5 по
  проценту: от 40 — 2, от 55 — 3, от 70 — 4, от 85 — 5 (иначе 1). В списке навыков кандидата такой навык получает
  `source: "test"`, `confidence: 0.8` и `verified_level`; самооценка `claimed_level` остаётся как есть. Навык теста, которого
  не было в списке, добавляется без самооценки и не считается в лимите 50 навыков. Повторный успех не понижает уже
  подтверждённый уровень. Навыки, которые уже не одобрены в справочнике, не подтверждаются; при слиянии навыков подтверждение
  переезжает на целевой навык с лучшим уровнем. Если согласие `processing` отозвано, итоги не записываются (попытка закрывается
  по сроку, а `/available` показывает `consent_required`).
- Успех пишет запись в историю грейдов и делает пару «специализация и грейд» текущей категорией кандидата
  (`category` в `GET /me/profile/full`).
- Пересдача: после неудачной или просроченной попытки ту же пару можно пройти снова через `ASSESSMENT_RETAKE_DAYS` дней
  (по умолчанию 7). После успеха тесты на тот же или более низкий грейд этой специализации закрыты (`already_confirmed`),
  более высокий грейд и другая специализация доступны сразу.
- Задания берутся случайно из банка при старте и копируются в попытку: правки банка идущую попытку не меняют. Если банк
  сократился и заданий не хватает, старт даёт `409 assessment_unavailable`.

| Код | Статус | Когда |
| --- | --- | --- |
| `validation_error` | 400 | Неверное тело, UUID или форма ответа (текст вместо выбора, неизвестный вариант, слишком длинный текст) |
| `unauthorized` | 401 | Нет действительного токена |
| `forbidden` | 403 | Роль не candidate |
| `user_inactive` | 403 | Пользователь заблокирован |
| `profile_not_found` | 404 | Профиль кандидата не создан |
| `attempt_not_found` | 404 | Нет такой попытки (или она чужая); нет активной попытки для `/current` |
| `question_not_found` | 404 | Задание не из этой попытки |
| `consent_required` | 409 | Нет активного согласия `processing` (на старте, при сохранении ответа и при `submit`) |
| `attempt_active` | 409 | Уже есть активная попытка; в `error.attempt_id` её id |
| `retake_cooldown` | 409 | Пересдача раньше срока; в `error.retry_at` время (RFC 3339) |
| `already_confirmed` | 409 | Этот грейд (или выше) уже подтверждён |
| `assessment_unavailable` | 409 | Нет опубликованного шаблона для пары или не хватает заданий |
| `attempt_closed` | 409 | Попытка завершена или время вышло |
| `request_too_large` | 413 | Тело больше 2 МиБ |
| `assessments_unavailable` | 503 | Тестирование не настроено |

Настройка сервера: `ASSESSMENT_RETAKE_DAYS` (целое от 1 до 365, по умолчанию 7).

```sh
curl --fail-with-body -X POST "$API_URL/api/v1/me/assessments/attempts" \
  -H "Authorization: Bearer $ACCESS_TOKEN" -H 'Content-Type: application/json' \
  -d '{"specialization_id":1,"grade_id":2}'
```

Интеграционные тесты используют `TEST_DATABASE_URL`:

```sh
cd apps/api
go test -race -tags=integration ./tests/integration -run 'TestStartAttempt|TestSubmit|TestLazyExpiry|TestGradeProgression|TestRetake'
```

### Предложения кандидатам

Компания отправляет кандидату предложение о работе. Это отдельный сценарий от приглашения сотрудника
в команду компании: принятие предложения не создаёт участника компании.

Все методы требуют Bearer-токен Keycloak с подтверждённой почтой и активного локального пользователя.
Работодатель должен иметь роль `employer` и активное членство в компании; кандидат — роль `candidate`.

| Метод | Путь | Кто использует |
| --- | --- | --- |
| POST | `/api/v1/companies/{company_id}/offers` | `owner`, `recruiter`: отправить предложение |
| GET | `/api/v1/companies/{company_id}/offers` | `owner`, `recruiter`, `viewer`: список компании |
| GET | `/api/v1/companies/{company_id}/offers/{offer_id}` | `owner`, `recruiter`, `viewer`: карточка |
| GET | `/api/v1/me/offers` | Кандидат: входящие |
| GET | `/api/v1/me/offers/{offer_id}` | Кандидат: карточка своего предложения |
| POST | `/api/v1/me/offers/{offer_id}/view` | Кандидат: отметить просмотр, без тела запроса |
| POST | `/api/v1/me/offers/{offer_id}/respond` | Кандидат: принять или отклонить |

Сценарий для фронта:

1. Работодатель выбирает кандидата. `candidate_id` — UUID из `candidate_profiles.id`, а не ID пользователя
   или Keycloak. Для теста используйте существующий профиль с `search_status: open` или `passive`;
   скрытому профилю новое предложение отправить нельзя.
2. Форма содержит заголовок, описание, обе границы зарплаты в рублях за месяц и почту работодателя.
   Можно добавить ссылку для связи и `need_id` активной потребности этой компании. Название компании
   и автора сервер заполняет сам; название сохраняется снимком на момент отправки.
3. После успешного POST сервер возвращает `201`, карточку предложения и заголовок `Location`.
   На время отправки блокируйте кнопку: повторный POST создаёт новое предложение, автоматический
   повтор после сетевой ошибки может создать дубль.
4. Кандидат загружает входящие и открывает карточку. GET ничего не меняет; при фактическом открытии
   карточки фронт вызывает POST `/view`. Статус меняется с `sent` на `viewed`.
5. Кнопки «Принять» и «Отклонить» отправляют `{"status":"accepted"}` или `{"status":"rejected"}`.
   Ответить можно и без предварительного `/view`: сервер заполнит время просмотра и ответа.
   Повтор того же ответа успешен, противоположный ответ после принятого решения возвращает `409`.

Статусы: `sent` → `viewed` → `accepted` / `rejected`; также возможен прямой ответ из `sent`.
Повторный `/view` сохраняет исходное время и не меняет окончательное решение. При параллельных
противоположных ответах сохраняется одно решение, второй запрос получает `409`.

Оба списка принимают `status` (один из четырёх статусов), `limit` (1–100, по умолчанию 20) и
`offset` (0–10000, по умолчанию 0). Без `status` возвращаются все статусы. Сортировка — сначала
новые предложения, при одинаковом времени по ID. Формат ответа — `items`, `total`, `limit`, `offset`.
Профиль без предложений получает пустой `items`; отсутствие самого профиля возвращает `404`.
Скрытие профиля после получения предложения не убирает его из входящих.

Пример отправки (переменные содержат реальные токены и UUID вашего тестового окружения):

```sh
curl --fail-with-body -X POST "$API_URL/api/v1/companies/$COMPANY_ID/offers" \
  -H "Authorization: Bearer $EMPLOYER_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"candidate_id\":\"$CANDIDATE_ID\",\"title\":\"Go-разработчик\",\"description\":\"Разработка API в нашей команде\",\"salary_from_rub\":150000,\"salary_to_rub\":200000,\"contact_email\":\"hr@example.org\"}"

curl --fail-with-body "$API_URL/api/v1/me/offers?limit=20&offset=0" \
  -H "Authorization: Bearer $CANDIDATE_TOKEN"

curl --fail-with-body -X POST "$API_URL/api/v1/me/offers/$OFFER_ID/view" \
  -H "Authorization: Bearer $CANDIDATE_TOKEN"

curl --fail-with-body -X POST "$API_URL/api/v1/me/offers/$OFFER_ID/respond" \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"accepted"}'
```

Для Swagger авторизуйтесь через Authorize, затем выполняйте те же методы с аккаунтами работодателя
и кандидата по очереди. `OFFER_ID` берите из ответа отправки или списка входящих.

| HTTP | Что означает |
| --- | --- |
| 400 | Неверные поля, UUID, зарплата, фильтры или недоступная потребность |
| 401 | Нет действительного токена или не подтверждена почта |
| 403 | Неподходящая роль, запись от `viewer` или неактивный пользователь |
| 404 | Объект недоступен этому пользователю, отсутствует профиль или локальная регистрация |
| 409 | Кандидат уже дал противоположный ответ |
| 413 | JSON превышает 2 МиБ |
| 500 / 503 | Внутренняя ошибка / сервис недоступен |

Ошибки имеют формат `{"error":{"code":"validation_error","message":"Текст на русском"}}`.
Чужие предложения и компании не раскрываются через API.

Сейчас `contact_email` и `contact_url` — контакты **работодателя**. Контакты кандидата не возвращаются
даже после принятия: их раскрытие и согласия подключим отдельно после готовности данных кандидата.
Чат, уведомления по почте, редактирование и отзыв предложения пока не реализованы.

Данные хранятся в PostgreSQL в `candidate_offers`; S3 для этого сценария не используется.
Миграция `20261006141620_candidate_offers.sql` совместима с предыдущей версией API.
Новые переменные окружения и GitHub Secrets не нужны.

Проверка прав доступа, области потребности и параллельных ответов на тестовой PostgreSQL
с настроенной `TEST_DATABASE_URL`:

```sh
cd apps/api
go test -race -tags=integration ./internal/httpapi -run 'TestOffer'
```

### Банк кандидатов и предварительная подборка

Работодатель ищет кандидатов от имени компании. Доступ имеют активные участники `owner`, `recruiter`
и `viewer` с ролью пользователя `employer`. Отсутствующее или отозванное членство возвращает `404`.
В выдаче только активные кандидаты с `search_status: open` или `passive`; скрытые профили исключены
также из отдельной карточки. Все методы требуют авторизации.

| Метод | Путь | Назначение |
| --- | --- | --- |
| GET | `/api/v1/companies/{company_id}/candidates` | Каталог доступных кандидатов |
| GET | `/api/v1/companies/{company_id}/candidates/{candidate_id}` | Безопасная карточка |
| GET | `/api/v1/companies/{company_id}/needs/{need_id}/candidates` | Подборка под активную потребность компании |

Карточка содержит `id`, город, часовой пояс, стаж в месяцах, зарплатные ожидания, статус поиска и
`work_format_ids`. `id` — UUID профиля кандидата; его передавайте как `candidate_id` при отправке
оффера. Контакты, локальный ID пользователя, аватар, заголовок и свободное описание не возвращаются.
Свободный текст исключён, поскольку кандидат может вписать туда контакты. Этот API не меняет профили.

Оба списка принимают одинаковые параметры. Каждый параметр передаётся один раз, пустые значения,
неизвестные параметры и некорректные диапазоны возвращают `400`.

| Параметр | Правило |
| --- | --- |
| `limit` | 1–100, по умолчанию 20 |
| `offset` | 0–10000, по умолчанию 0 |
| `work_format_ids` | До 10 уникальных ID через запятую, например `1,3`; подходит любой выбранный формат |
| `experience_min_months` | Минимальный стаж включительно, 0–600 месяцев |
| `experience_max_months` | Максимальный стаж включительно, 0–600; не меньше минимального |
| `salary_max_rub` | Зарплатные ожидания не выше суммы, 0–1000000000 рублей в месяц |

ID форматов берите из общего справочника; несуществующие ID возвращают `400`. Разные условия
объединяются через И. При явном `salary_max_rub` кандидаты без зарплатных ожиданий исключаются.
Ответ списка: `items`, `total`, `limit`, `offset`. `total` считается после фильтрации до пагинации;
пустая страница возвращает `items: []`. Обычный каталог сортируется по UUID по возрастанию,
это не рейтинг квалификации.

Подборка использует только активную потребность той компании, которая указана в URL.
Чужая, отсутствующая, черновая или архивная потребность возвращает `404`. Система:

1. Исключает профили без пересечения форматов работы с потребностью.
2. Исключает известные зарплатные ожидания выше `salary_to_rub`. Если бюджет или ожидания неизвестны,
   зарплата не даёт совпадения; кандидат может остаться в подборке.
3. Применяет дополнительные фильтры запроса, которые только сужают исходную подборку.
4. Сортирует по количеству совпадений формата, бюджета, города и часового пояса по убыванию,
   затем по UUID по возрастанию. Город сравнивается без учёта регистра и крайних пробелов;
   часовой пояс — по точному IANA-значению. Пагинация применяется после сортировки.

У каждого элемента дополнительно есть `matched_conditions` (0–4), русские объяснения `reasons`
и `unknown_conditions`: `work_format`, `salary`, `city`, `timezone`. Последний массив означает,
что для сравнения не хватает данных кандидата или условия потребности; известное несовпадение
туда не включается. `matched_conditions` не является процентом пригодности или оценкой грейда.

В ответе подборки также есть `need_id`, `matching_mode: conditions_only` и `unassessed_criteria`:
`specialization`, `confirmed_grade`, `skills`, `test_results`, `fsp_achievements`.
**Это предварительный подбор условий работы.** Специализация, грейд, навыки, тесты и достижения
пока не сравниваются; полноценный подбор по ТЗ подключается после готовности данных кандидата.
Фронту следует показывать это ограничение, а неизвестную зарплату не подписывать как подходящую бюджету.

Сценарий фронта: выбрать компанию → открыть каталог или выбрать активную потребность → настроить
фильтры → открыть карточку → отправить оффер с ID кандидата и, при необходимости, `need_id`.
В подборке просмотр доступен `viewer`, но отправка оффера — только `owner` и `recruiter`.
При смене фильтров сбрасывайте `offset` в 0; при возвращении из карточки сохраняйте фильтры в URL.

```sh
curl --fail-with-body "$API_URL/api/v1/companies/$COMPANY_ID/candidates?work_format_ids=3&experience_min_months=12&salary_max_rub=200000&limit=20&offset=0" \
  -H "Authorization: Bearer $EMPLOYER_TOKEN"

curl --fail-with-body "$API_URL/api/v1/companies/$COMPANY_ID/needs/$NEED_ID/candidates?limit=20&offset=0" \
  -H "Authorization: Bearer $EMPLOYER_TOKEN"

curl --fail-with-body "$API_URL/api/v1/companies/$COMPANY_ID/candidates/$CANDIDATE_ID" \
  -H "Authorization: Bearer $EMPLOYER_TOKEN"
```

В Swagger используйте Authorize с аккаунтом работодателя, затем те же методы. Ошибки возвращаются
в общем формате `error.code` / `error.message`: `400` — параметры, `401` — авторизация,
`403` — роль или неактивный пользователь, `404` — недоступный объект или отсутствие локальной
регистрации, `500` — внутренняя ошибка, `503` — сервис не настроен.

Модуль `internal/candidatebank` разделён на entity, repository, service и web. Новых миграций,
переменных окружения и GitHub Secrets нет. Интеграционные проверки на тестовой PostgreSQL
с `TEST_DATABASE_URL`:

```sh
cd apps/api
go test -race -tags=integration ./internal/httpapi -run '^TestCandidate(Bank|Recommendations)'
```

### Банк заданий и шаблоны тестов (админка)

Администратор создаёт задания и шаблоны тестов и публикует их. Кандидаты и работодатели сами задания не видят: кандидат
проходит тест через `/api/v1/me/assessments` (см. «Тестирование кандидата»), а правила проверки ему не отдаются. Все методы под `/api/v1/admin/assessments`, нужна действующая админская
сессия (`Authorization: Bearer <admin access token>`, как у `/api/v1/admin/catalogs`), ответы не кешируются.

| Метод | Путь | Что делает |
| --- | --- | --- |
| POST | `/questions` | Создать задание и версию 1 (черновик) |
| GET | `/questions` | Список: фильтры `skill_id`, `difficulty`, `kind`, `active`, `status`, `limit`, `offset` |
| GET | `/questions/{id}` | Задание со всеми версиями, текстами и правилами проверки |
| POST | `/questions/{id}/versions` | Новая версия (черновик) |
| POST | `/questions/{id}/versions/{version}/publish` | Опубликовать версию |
| POST | `/questions/{id}/archive` | Выключить задание |
| POST | `/templates` | Создать шаблон теста (черновик) вместе с составом |
| GET | `/templates` | Список: фильтры `specialization_id`, `grade_id`, `status` |
| GET | `/templates/{id}` | Шаблон с составом и числом доступных заданий по каждой строке |
| POST | `/templates/{id}/publish` | Опубликовать шаблон |
| POST | `/templates/{id}/archive` | Архивировать шаблон |

**Порядок работы:** создать задание, при необходимости добавить версию, опубликовать версию, затем создать шаблон с составом
и опубликовать его. Опубликованное **не меняется**: исправление это новая версия (черновик), которую нужно опубликовать.
Публикация новой версии архивирует предыдущую опубликованную версию этого задания. Публикация шаблона архивирует ранее
опубликованный шаблон той же пары «специализация и грейд». Редактировать черновики на месте нельзя. Неизменяемость
гарантирует и база данных: опубликованное содержимое не изменить даже прямым запросом.

**Виды заданий.** Все задания проверяются автоматически, чужой код нигде не запускается. Сложность `difficulty` от 1 до 5.

```json
{"skill_id":"<uuid навыка>","difficulty":1,"kind":"choice",
 "prompt":{"text":"Какое слово запускает горутину?","options":[{"id":"a","text":"go"},{"id":"b","text":"async"}]},
 "grading_spec":{"type":"choice","correct":["a"],"multiple":false}}
```

```json
{"skill_id":"<uuid навыка>","difficulty":1,"kind":"short_answer",
 "prompt":{"text":"Какая команда показывает состояние рабочего каталога?"},
 "grading_spec":{"type":"text","accepted":["git status"],"case_sensitive":false}}
```

```json
{"skill_id":"<uuid навыка>","difficulty":2,"kind":"code_reading",
 "prompt":{"text":"Что выведет код?","code":"x := 5\ny := &x\n*y = 7\nfmt.Println(x)","language":"go"},
 "grading_spec":{"type":"text","accepted":["7"]}}
```

- `choice`: нужны `options` (от 2 до 10, у каждого `id` из латиницы, цифр, дефиса или подчёркивания и `text`), правила `type: choice`;
  при `multiple: false` правильный вариант ровно один.
- `short_answer`: без `options`, правила `type: text`, от 1 до 20 допустимых ответов (сравнение после обрезки пробелов).
- `code_reading`: обязателен `code`; правила либо `choice` (тогда нужны `options`), либо `text` (без `options`).
- Правила проверки (`grading_spec`) видит только администратор: кандидату они не передаются. Лишние поля отвергаются (400).

**Шаблон теста.** `POST /templates`:

```json
{"specialization_id":1,"grade_id":2,"time_limit_sec":1800,"pass_score":60,
 "blueprint":[{"skill_id":"<uuid>","difficulty":1,"question_count":4,"weight":1},
              {"skill_id":"<uuid>","difficulty":2,"question_count":2,"weight":2}]}
```

`time_limit_sec` от 300 до 14400, `pass_score` в процентах (1-100) от взвешенной суммы, в составе от 1 до 30 строк, пары навык
и сложность не повторяются, `weight` от 0.01 до 100. Версия пары назначается автоматически. При публикации для каждой строки
состава нужно не меньше `question_count` активных заданий с опубликованной версией (черновики, архивные версии и выключенные
задания не считаются), иначе приходит 409 с перечнем нехватки:

```json
{"error":{"code":"insufficient_questions","message":"В банке не хватает опубликованных заданий для состава шаблона"},
 "shortages":[{"skill_id":"<uuid>","difficulty":1,"required":4,"available":2}]}
```

| Код | Статус | Когда |
| --- | --- | --- |
| `unauthorized` | 401 | Нет админской сессии |
| `validation_error` | 400 | Неверное тело, UUID, номер версии, фильтр, неизвестный навык, специализация или грейд |
| `assessment_not_found` | 404 | Задание, версия или шаблон не найдены |
| `assessment_conflict` | 409 | Версия не черновик, задание выключено, шаблон не черновик, повторная архивация |
| `insufficient_questions` | 409 | Не хватает опубликованных заданий для состава шаблона |
| `request_too_large` | 413 | Тело больше 2 МиБ |
| `assessments_unavailable` | 503 | Банк заданий не настроен |

**Демо-банк.** Миграция создаёт два опубликованных шаблона уровня Junior и 32 задания на русском: backend (Go, SQL, Git, 30 минут,
проходной балл 60) и frontend (JavaScript, TypeScript, React, 25 минут, проходной балл 60). Остальное создаётся через API.
Действия администраторов пишутся в журнал `assessment_events` (без текстов заданий и правил).

```sh
curl --fail-with-body -X POST "$API_URL/api/v1/admin/assessments/questions" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"skill_id":"'"$SKILL_ID"'","difficulty":1,"kind":"short_answer","prompt":{"text":"Какая команда создаёт коммит?"},"grading_spec":{"type":"text","accepted":["git commit"]}}'
```

Интеграционные тесты используют `TEST_DATABASE_URL`:

```sh
cd apps/api
go test -race -tags=integration ./tests/integration -run 'TestAssessment'
```
