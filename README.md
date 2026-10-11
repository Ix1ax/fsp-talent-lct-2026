# ФСП Скаут · ЛЦТ 2026

Платформа поиска работы и подбора IT-специалистов для трека ФСП на «Лидерах цифровой трансформации 2026». Кандидат собирает профиль, подтверждает квалификацию тестами и получает предложения компаний. Работодатель формирует потребности, подбирает кандидатов и проверяет решения своих заданий. Администратор управляет справочниками, тестами и модерацией.

Монорепозиторий содержит **фронтенд Next.js, бэкенд Go**, общий OpenAPI, миграции, локальную инфраструктуру и серверный деплой. Документация сверена с `main` 11 октября 2026 года.

## Материалы сдачи

| Материал | Ссылка |
| --- | --- |
| Развёрнутый прототип | [89.104.69.242:3000](http://89.104.69.242:3000/) |
| Сопроводительная документация по ТЗ (8 пунктов) | [PDF](docs/submission/fsp-scout-documentation.pdf) · [Markdown](docs/submission/documentation.md) |
| Презентация | [PDF](docs/submission/presentation.pdf) · [PPTX](docs/submission/presentation.pptx) |
| Скринкаст | [MP4](docs/submission/screencast.mp4) |
| Руководство пользователя | [PDF](docs/submission/user-guide.pdf) |
| Swagger / OpenAPI | [Swagger](http://89.104.69.242:8080/docs/) · [api/openapi.yaml](api/openapi.yaml) |
| Демо-аккаунты и маршрут проверки для жюри | [ниже](#тестовые-аккаунты-и-доступы) · [docs/jury-demo.md](docs/jury-demo.md) |

Все материалы сдачи лежат в [docs/submission](docs/submission).

## Содержание

- [Материалы сдачи](#материалы-сдачи)
- [Адреса сервера и localhost](#адреса-сервера-и-localhost)
- [Тестовые аккаунты и доступы](#тестовые-аккаунты-и-доступы)
- [Возможности и роли](#возможности-и-роли)
- [Архитектура и структура](#архитектура-и-структура)
- [Запуск в Docker](#запуск-в-docker)
- [Разработка на хосте](#разработка-на-хосте)
- [Переменные окружения](#переменные-окружения)
- [Keycloak, регистрация и почта](#keycloak-регистрация-и-почта)
- [Админка приложения](#админка-приложения)
- [API и документация эндпоинтов](#api-и-документация-эндпоинтов)
- [Основные сценарии и ограничения](#основные-сценарии-и-ограничения)
- [Тесты и проверки](#тесты-и-проверки)
- [Сервер и CI/CD](#сервер-и-cicd)
- [Диагностика](#диагностика)
- [Подробная документация](#подробная-документация)

## Адреса сервера и localhost

Сервер команды: **`89.104.69.242`**, стенд работает по HTTP, без домена и TLS. Локально в браузере и настройках OIDC используем **`localhost`**: Keycloak настроен на этот hostname, замена его IP-адресом нарушает согласованность issuer и redirect URI.

| Сервис / страница | Сервер | Локально, Docker |
| --- | --- | --- |
| Сайт | [Открыть](http://89.104.69.242:3000/) | [localhost:3000](http://localhost:3000/) |
| Вход кандидата / работодателя | [Вход](http://89.104.69.242:3000/login) | [Вход](http://localhost:3000/login) |
| Кабинет кандидата | [Кандидат](http://89.104.69.242:3000/candidate) | [Кандидат](http://localhost:3000/candidate) |
| Кабинет работодателя | [Работодатель](http://89.104.69.242:3000/employer) | [Работодатель](http://localhost:3000/employer) |
| Админка приложения | [Админка](http://89.104.69.242:3000/admin) | [Админка](http://localhost:3000/admin) |
| Swagger UI | [Swagger](http://89.104.69.242:8080/docs/) | [Swagger](http://localhost:8080/docs/) |
| OpenAPI YAML | [Спецификация](http://89.104.69.242:8080/openapi.yaml) | [Спецификация](http://localhost:8080/openapi.yaml) |
| API: процесс | [healthz](http://89.104.69.242:8080/healthz) | [healthz](http://localhost:8080/healthz) |
| API: Postgres, Redis, S3 | [readyz](http://89.104.69.242:8080/readyz) | [readyz](http://localhost:8080/readyz) |
| API: информация | [info](http://89.104.69.242:8080/api/v1/info) | [info](http://localhost:8080/api/v1/info) |
| API: настройки входа | [auth/config](http://89.104.69.242:8080/api/v1/auth/config) | [auth/config](http://localhost:8080/api/v1/auth/config) |
| Тестовая почта Mailpit | [Письма](http://89.104.69.242:8025/) | [Письма](http://localhost:8025/) |
| Keycloak: аккаунт пользователя | [Account](http://89.104.69.242:8081/realms/fsp/account/) | [Account](http://localhost:8180/realms/fsp/account/) |
| Keycloak: OIDC discovery | [Discovery](http://89.104.69.242:8081/realms/fsp/.well-known/openid-configuration) | [Discovery](http://localhost:8180/realms/fsp/.well-known/openid-configuration) |
| Keycloak: административная консоль | [Admin Console¹](http://89.104.69.242:8081/admin/master/console/) | [Admin Console](http://localhost:8180/admin/master/console/) |

¹ Realm `master` сохраняет требование HTTPS для внешнего входа. Публичный HTTP-адрес консоли не гарантирует возможность входа; серверным Keycloak управляем через Admin CLI по SSH, как описано ниже.

При `npm run dev` фронт открывается на **[localhost:5173](http://localhost:5173/)**, админка — **[localhost:5173/admin](http://localhost:5173/admin)**. Все фронтенд-пути из таблицы сохраняются; API, Keycloak и Mailpit остаются на 8080, 8180 и 8025. Продуктовый API доступен и через фронт: `http://localhost:3000/api/v1/...` или `http://localhost:5173/api/v1/...`. Swagger и `/openapi.yaml` открываем непосредственно на порту API.

На 11.10.2026 сайт, `/admin`, `/healthz`, `/readyz`, `/api/v1/info`, Swagger и OpenAPI серверного стенда отвечали `200`; Mailpit без авторизации — `401`. Это проверка доступности; вход и сценарии аккаунтов требуют отдельной проверки.

## Тестовые аккаунты и доступы

### Серверный стенд

Сайт: [89.104.69.242:3000](http://89.104.69.242:3000/). Пользователи входят кнопкой «Войти», администраторы — на [/admin](http://89.104.69.242:3000/admin).

| Роль | Логин | Пароль | Где входить | Что проверять |
| --- | --- | --- | --- | --- |
| Кандидат с заполненным профилем | `candidate@demo.fsp.test` | `1234` | [Вход](http://89.104.69.242:3000/login) | Профиль, подтверждённый Junior Go, история теста, ФСП, предложения, задания и решения |
| Новый кандидат | `new-candidate@demo.fsp.test` | `1234` | [Вход](http://89.104.69.242:3000/login) | Путь с нуля: согласия, профиль или импорт PDF, контакты, опрос, тест, публикация |
| Работодатель — владелец | `employer@demo.fsp.test` | `1234` | [Вход](http://89.104.69.242:3000/login) | Четыре компании, документы, команда, потребности, подбор, предложения, задания |
| Рекрутер | `recruiter@demo.fsp.test` | `1234` | [Вход](http://89.104.69.242:3000/login) | Подбор, предложения и решения в «Демо · Скаут Технологии» |
| Наблюдатель (права просмотра) | `viewer@demo.fsp.test` | `1234` | [Вход](http://89.104.69.242:3000/login) | Только чтение кабинета «Демо · Скаут Технологии» |
| Администратор | `admin@demo.fsp.test` | `adminadminadmin` | [Админка](http://89.104.69.242:3000/admin) | Справочники, модерация, проверка компаний, пользователи, тесты, статистика |
| Суперадминистратор | `superadmin@fsp.local` | `adminadminadmin` | [Админка](http://89.104.69.242:3000/admin) | Всё, что администратор, плюс управление администраторами |
| Тестовая почта Mailpit | `admin` | `admin1234` | [Письма](http://89.104.69.242:8025/) | Письма подтверждения регистрации и восстановления пароля |

Аккаунты, профили, компании, потребности, предложения, задания и файлы создаёт демо-набор при первом `make up`, `make migrate` или серверном деплое; маршрут проверки и состав данных — [docs/jury-demo.md](docs/jury-demo.md). Суперадминистратор — аккаунт первоначальной активации из серверного окружения; повторные миграции его пароль не перезаписывают. Демо-администратор получает пароль `adminadminadmin`. Администратор Keycloak (`admin`, пароль из `KEYCLOAK_ADMIN_PASSWORD` серверного окружения) — инфраструктурная учётная запись, доступна только через Admin CLI по SSH и в публичные материалы не передаётся.

### Локальные аккаунты

| Назначение | Логин | Пароль / условие |
| --- | --- | --- |
| Демо-аккаунты кандидата, работодателя, рекрутера, наблюдателя и администратора | Те же, что на сервере (таблица выше) | Создаются автоматически при первом `make up` или `make migrate` |
| Пользователь локального Keycloak | `dev@example.test` | `local-demo-only`; почта подтверждена |
| Роль этого пользователя в приложении | Выбирается при первом входе | `make auth-smoke` регистрирует его как `candidate` |
| Локальный суперадминистратор | `superadmin@fsp.local` | `adminadminadmin`, **если** заполнены обе `ADMIN_BOOTSTRAP_*` до миграций |
| Локальный администратор Keycloak | `admin` | `local-keycloak-admin-change-me` из `.env.example` |
| Локальный Mailpit | Вход не требуется | Локальный Compose не включает пароль интерфейса |

Один пользователь приложения получает одну роль. Новый аккаунт регистрируется через Keycloak с выбором `candidate` или `employer`. Роли `owner`, `recruiter`, `viewer` назначаются внутри компании, не на странице регистрации.

## Возможности и роли

| Роль | Основные действия |
| --- | --- |
| Кандидат | Профиль, контакты, согласия, навыки, карьера, импорт резюме, анкета, тесты, ФСП-достижения, экспорт PDF, предложения и задания |
| Владелец компании | Создание и редактирование компании, документы, команда, заявка на подтверждение, потребности, подбор, предложения, задания и проверка решений |
| Рекрутер | Потребности, кандидаты, предложения и задания своей компании |
| Наблюдатель | Чтение разрешённых данных компании; без изменений, отправки предложений и проверки решений |
| Администратор | Справочники, модерация навыков, банк вопросов, шаблоны и предпросмотры, компании и пользователи, блокировки, статистика и журнал |
| Суперадминистратор | Действия администратора плюс создание и управление обычными администраторами |

Потребность работодателя — сущность для подбора, в интерфейсе раздел «Потребности». Публичного банка вакансий и самостоятельных откликов кандидатов нет: основной сценарий — обратный подбор, работодатель сам выходит на кандидата.

Достижения ФСП поступают из **синтетического реестра `fsp_mock`**. Реальный API ФСП и подтверждение владения настоящим ФСП ID пока не подключены. Программные задания проверяются по правилам; пользовательский код на сервере не исполняется.

## Архитектура и структура

| Компонент | Технологии / назначение |
| --- | --- |
| Фронтенд | Next.js 15, React 19, TypeScript, Tailwind CSS 4, Radix/shadcn, React Hook Form, Zod |
| Бэкенд | Go 1.26, Gin, pgx, Goose, OIDC, AWS SDK для S3 |
| Данные приложения | PostgreSQL 17 |
| Кеш | Redis 7.4; persistence отключён, данные восстанавливаемые |
| Файлы | Приватный S3-совместимый SeaweedFS 4.37; метаданные в PostgreSQL |
| Авторизация пользователей | Keycloak 26.8, отдельная PostgreSQL БД |
| Почта | Mailpit 1.27.8 |
| Поставка | Docker Compose, GitHub Actions, GHCR |

```text
Браузер → Next.js → Go API → PostgreSQL / Redis / SeaweedFS
             ↕        ↕
          Keycloak → отдельная PostgreSQL БД
             ↓
          Mailpit
```

Кандидат и работодатель входят через Keycloak с Authorization Code + PKCE. Next.js хранит access/refresh tokens в HttpOnly cookies, клиентский access token — в памяти. Прямые запросы в Go API авторизуются Bearer JWT. Админка использует отдельные аккаунты и сессии БД приложения.

```text
apps/api/
  cmd/api/                    сборка зависимостей и запуск API
  cmd/migrate/                up / status / down и bootstrap суперадмина
  cmd/sync-user-identities/   импорт снимка идентичностей Keycloak
  internal/                  доменные модули и подключения инфраструктуры
  internal/httpapi/          роутер, middleware, встроенный Swagger
  migrations/               SQL-миграции, встроенные в бинарник
  tests/integration/        интеграционные проверки
apps/web/
  src/app/                  App Router, layouts, обработчики веб-сессии
  src/screens/              композиция экранов
  src/widgets/              оболочки кабинетов и общие блоки
  src/features/             формы и действия пользователя
  src/entities/             доменные модели и API-клиенты
  src/shared/               UI, транспорт, hooks, утилиты, константы
  public/                   бренд, шрифты, изображения и видео
  docs/                     документация фронтенда
api/openapi.yaml            общий контракт API
infra/keycloak/             server/local realm и тема входа
compose.yaml                локальный стек с профилем app
compose.ci.yaml             интеграционное окружение
deploy/                     серверный Compose и пример env
scripts/                    smoke, деплой, Keycloak, QA
docs/                       документация модулей
.github/workflows/ci.yml     сборка и деплой main
```

Доменные модули API используют слои `entity`, `service`, `repository` и HTTP-обработчики `web`; зависимости собирает `cmd/api`. Права на запись проверяются в сервисах и SQL дополнительно к middleware. Фронтенд организован по FSD; alias `@/` указывает на `src`. Серверные API нельзя импортировать в клиентские компоненты.

## Запуск в Docker

Нужны Git, Docker с Compose v2 и доступ к registry образов. Команды выполняются из корня монорепозитория.

```sh
git clone git@github.com:Ix1ax/fsp-talent-lct-2026.git
cd fsp-talent-lct-2026
git switch main
cp .env.example .env
```

Для Docker-фронта задайте в `.env`:

```dotenv
WEB_PUBLIC_URL=http://localhost:3000
ADMIN_BOOTSTRAP_EMAIL=superadmin@fsp.local
ADMIN_BOOTSTRAP_PASSWORD=adminadminadmin
```

Остальные значения можно оставить из `.env.example`. Затем:

```sh
make up
make smoke
make auth-smoke
```

`make up` собирает API и фронт, запускает инфраструктуру, применяет миграции перед API и настраивает тему Keycloak. Откройте [сайт](http://localhost:3000/), [Swagger](http://localhost:8080/docs/) и [почту](http://localhost:8025/).

```sh
make logs
make down
```

`make down` останавливает стек и сохраняет volumes. `docker compose --profile app down -v` уничтожает локальные базы и файлы; для обычного перезапуска эта команда не нужна.

## Разработка на хосте

Нужны **Go 1.26**, **Node.js 24** (версия Docker-сборки; минимум `package.json` — 22.12.0) и npm. Используется **npm workspace и корневой `package-lock.json`**.

```sh
make setup
```

Команда создаёт `.env`, `apps/api/.env`, `apps/web/.env`, если их нет, устанавливает npm-зависимости и Go-модули. Существующие env не перезаписываются. Задайте в корневом `.env` `WEB_PUBLIC_URL=http://localhost:5173` и `ADMIN_BOOTSTRAP_*`: `make migrate` выполняется в Docker и читает корневой `.env`.

```sh
make infra
make migrate
make api
```

Во втором терминале:

```sh
make web
```

Откройте [localhost:5173](http://localhost:5173/). Фронт и API работают на хосте, инфраструктура — в Docker. Не запускайте одновременно Docker API и API на хосте на одном порту 8080. Зависимости фронта добавляем из корня: `npm install <package> -w apps/web`.

Для локального фронта с серверным бэкендом в `apps/web/.env.local`:

```dotenv
API_PROXY_TARGET=http://89.104.69.242:8080
OIDC_TOKEN_URL=http://89.104.69.242:8081/realms/fsp/protocol/openid-connect/token
OIDC_CLIENT_ID=fsp-web
SESSION_COOKIE_SECURE=false
```

Запустите `make web` и входите с **серверным** аккаунтом. Этот режим работает с общим стендом. Клиент `fsp-web` должен разрешать `http://localhost:5173/*`; серверный скрипт сохраняет этот redirect URI. `.env.local` имеет приоритет над `.env`: измените его при возвращении к локальному API.

## Переменные окружения

### Какой файл используется

| Файл / источник | Кто читает | Содержание |
| --- | --- | --- |
| Корневой `.env` | Локальный Compose | Пароли контейнеров, Keycloak, адрес фронта, bootstrap |
| `apps/api/.env` | `make api`, `make integration` | Подключения Go к инфраструктуре на localhost |
| `apps/web/.env` / `.env.local` | Next.js | Proxy API, token endpoint, cookies, origin |
| `deploy/production.env.example` | Шаблон сервера | Имена серверных переменных |
| GitHub environment `production` → secret `PRODUCTION_ENV` | CI/CD | Действующие серверные значения |
| `~/fsp/.env` на сервере | Серверный Compose | Копия секрета и SHA-теги образов из CI |

Пароли PostgreSQL, Redis и S3 в корневом и API env должны совпадать. Реальные `.env` исключены из Git. `NEXT_PUBLIC_*` входит в браузерную сборку; секреты помещаем в серверные переменные.

### Полный локальный `.env` для Docker

Этот пример подходит для новой локальной установки:

```dotenv
POSTGRES_USER=fsp
POSTGRES_PASSWORD=local-postgres-change-me
POSTGRES_DB=fsp
REDIS_PASSWORD=local-redis-change-me
S3_ACCESS_KEY=local-fsp
S3_SECRET_KEY=local-s3-change-me
S3_BUCKET=fsp-private
KEYCLOAK_DB_PASSWORD=local-keycloak-db-change-me
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=local-keycloak-admin-change-me
WEB_PUBLIC_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=*
SESSION_COOKIE_SECURE=false
ADMIN_BOOTSTRAP_EMAIL=superadmin@fsp.local
ADMIN_BOOTSTRAP_PASSWORD=adminadminadmin
```

Для разработки на хосте поменяйте `WEB_PUBLIC_URL` на `http://localhost:5173`. `MAILPIT_UI_AUTH` локальный Compose не использует; серверный пароль почты на локальном Mailpit не действует.

### Полный `apps/api/.env` для разработки на хосте

```dotenv
APP_ENV=development
HTTP_ADDR=:8080
DATABASE_URL=postgres://fsp:local-postgres-change-me@localhost:5432/fsp?sslmode=disable
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=local-redis-change-me
S3_ENDPOINT=http://localhost:8333
S3_REGION=us-east-1
S3_ACCESS_KEY=local-fsp
S3_SECRET_KEY=local-s3-change-me
S3_BUCKET=fsp-private
OIDC_ISSUER=http://localhost:8180/realms/fsp
OIDC_CLIENT_ID=fsp-api
OIDC_INTERNAL_URL=
CORS_ALLOWED_ORIGINS=*
ADMIN_BOOTSTRAP_EMAIL=superadmin@fsp.local
ADMIN_BOOTSTRAP_PASSWORD=adminadminadmin
PRIVACY_POLICY_VERSION=2026-10-07
ASSESSMENT_RETAKE_DAYS=7
```

### Полный `apps/web/.env` для разработки на хосте

```dotenv
API_PROXY_TARGET=http://localhost:8080
OIDC_TOKEN_URL=http://localhost:8180/realms/fsp/protocol/openid-connect/token
OIDC_CLIENT_ID=fsp-web
APP_ORIGIN=http://localhost:5173
SESSION_COOKIE_SECURE=false
```

`NEXT_PUBLIC_API_URL` по умолчанию `/api`; задавать его обычно не нужно. `API_PROXY_TARGET` — origin без `/api`. После изменения env перезапустите dev-сервер; для production пересоберите приложение: rewrites формируются при сборке. `FSP_DEV_DIST_DIR` переопределяет каталог dev-сборки, по умолчанию `.next-dev`; production использует `.next`.

### Серверное окружение

Основа — [deploy/production.env.example](deploy/production.env.example). Текущие адреса и демо-доступы:

```dotenv
PUBLIC_HOST=89.104.69.242
WEB_PUBLIC_URL=http://89.104.69.242:3000
SESSION_COOKIE_SECURE=false
CORS_ALLOWED_ORIGINS=*
S3_ACCESS_KEY=fsp-server
S3_BUCKET=fsp-private
KEYCLOAK_ADMIN_USER=admin
MAILPIT_UI_AUTH=admin:admin1234
ADMIN_BOOTSTRAP_EMAIL=superadmin@fsp.local
ADMIN_BOOTSTRAP_PASSWORD=adminadminadmin

# Действующие значения из PRODUCTION_ENV:
POSTGRES_PASSWORD=<серверный пароль PostgreSQL>
REDIS_PASSWORD=<серверный пароль Redis>
S3_SECRET_KEY=<серверный секрет S3>
KEYCLOAK_DB_PASSWORD=<серверный пароль БД Keycloak>
KEYCLOAK_ADMIN_PASSWORD=<серверный пароль администратора Keycloak>
```

Подставьте действующие значения вместо `<...>` перед использованием; этот блок не готовый env для запуска. Новые инфраструктурные пароли генерируются через `openssl rand -hex 32`. `API_IMAGE` и `WEB_IMAGE` добавляет CI. Изменение env не меняет пароль уже созданной роли БД. Bootstrap Keycloak относится к первоначальному созданию его администратора.

| Настройка | Значение / смысл |
| --- | --- |
| `OIDC_ISSUER` | Локально `http://localhost:8180/realms/fsp`, сервер `http://89.104.69.242:8081/realms/fsp`; совпадает с JWT `iss` |
| `OIDC_CLIENT_ID` API | `fsp-api`, ожидаемая audience |
| `OIDC_CLIENT_ID` фронта | `fsp-web`, публичный клиент |
| `OIDC_INTERNAL_URL` | В Compose `http://keycloak:8080/realms/fsp`, на хосте пустой |
| `OIDC_ALLOW_HTTP` | Для production HTTP требуется `true`; задан в серверном Compose |
| `OIDC_TOKEN_URL` | Token endpoint; в Docker `http://keycloak:8080/realms/fsp/protocol/openid-connect/token` |
| `APP_ORIGIN` | Один публичный origin фронта с портом; на сервере из `WEB_PUBLIC_URL` |
| `SESSION_COOKIE_SECURE` | `false` для HTTP-стенда; для HTTPS — `true` |
| `PRIVACY_POLICY_VERSION` | По умолчанию `2026-10-07`; версия согласия processing |
| `ASSESSMENT_RETAKE_DAYS` | По умолчанию 7, диапазон 1–365 дней |
| `MAILPIT_UI_AUTH` | Серверная HTTP-авторизация Mailpit, `логин:пароль` |

`PRIVACY_POLICY_VERSION` и `ASSESSMENT_RETAKE_DAYS` читаются Go-процессом. Для переопределения в Docker добавьте их в `api.environment` соответствующего Compose: одного добавления в корневой `.env` недостаточно.

## Keycloak, регистрация и почта

### Параметры Keycloak

| Параметр | Локально | Сервер |
| --- | --- | --- |
| Origin | `http://localhost:8180` | `http://89.104.69.242:8081` |
| Realm | `fsp` | `fsp` |
| Issuer | `http://localhost:8180/realms/fsp` | `http://89.104.69.242:8081/realms/fsp` |
| Клиент фронта | `fsp-web` | `fsp-web` |
| Клиент Swagger | `fsp-swagger` | `fsp-swagger` |
| Audience API | `fsp-api` | `fsp-api` |
| Клиент проверки паролем | `fsp-local-test` | Отсутствует |
| Callback фронта | `http://localhost:5173/auth/callback` или `http://localhost:3000/auth/callback` | `http://89.104.69.242:3000/auth/callback` |
| Callback Swagger | `http://localhost:8080/docs/oauth2-redirect.html` | `http://89.104.69.242:8080/docs/oauth2-redirect.html` |

Полные OIDC endpoints:

| Назначение | Сервер | Localhost |
| --- | --- | --- |
| Discovery | [Конфигурация](http://89.104.69.242:8081/realms/fsp/.well-known/openid-configuration) | [Конфигурация](http://localhost:8180/realms/fsp/.well-known/openid-configuration) |
| Начало входа | [Authorization endpoint](http://89.104.69.242:8081/realms/fsp/protocol/openid-connect/auth) | [Authorization endpoint](http://localhost:8180/realms/fsp/protocol/openid-connect/auth) |
| Обмен кода и refresh | [Token endpoint](http://89.104.69.242:8081/realms/fsp/protocol/openid-connect/token) | [Token endpoint](http://localhost:8180/realms/fsp/protocol/openid-connect/token) |
| Ключи JWT | [JWKS](http://89.104.69.242:8081/realms/fsp/protocol/openid-connect/certs) | [JWKS](http://localhost:8180/realms/fsp/protocol/openid-connect/certs) |
| Выход | [Logout endpoint](http://89.104.69.242:8081/realms/fsp/protocol/openid-connect/logout) | [Logout endpoint](http://localhost:8180/realms/fsp/protocol/openid-connect/logout) |

Authorization и logout вызываются с параметрами OIDC, token endpoint принимает POST; открытие этих ссылок без параметров не является проверкой входа.

Клиент `fsp-web` публичный, client secret не требуется, используется PKCE S256. Direct password grant включён только у локального `fsp-local-test`. API проверяет подпись JWT, issuer, срок, `sub`, audience `fsp-api` и `email_verified=true`. Scope `basic` должен входить в Default client scopes, поскольку добавляет `sub`.

На HTTP по IP браузер может не предоставлять `crypto.subtle`: фронт получает PKCE verifier/challenge через свой `/api/auth/pkce`. На HTTPS и localhost используется браузерная криптография.

### Регистрация

1. Откройте `/login` сайта и регистрацию на странице Keycloak.
2. Укажите отдельный email, имя и пароль. Keycloak хранит учётную запись и пароль.
3. Откройте Mailpit того же окружения, найдите письмо по получателю и перейдите по ссылке подтверждения.
4. Вернитесь на сайт и выберите `candidate` или `employer`. Фронт вызывает `POST /api/v1/me/register`.
5. Кандидат даёт согласия и создаёт профиль; работодатель создаёт компанию и становится владельцем.

Регистрация Keycloak и регистрация роли API — два шага. Вход сам по себе не создаёт профиль или компанию. Повтор регистрации роли возвращает `409`; смена роли этим методом не поддерживается.

### Где лежат письма

Письма подтверждения и восстановления пароля отправляет **Keycloak в Mailpit**, а не во внешние реальные почтовые ящики. Все тестовые получатели видны в одном интерфейсе; логин Mailpit не является email пользователя.

| SMTP realm `fsp` | Тестовое значение |
| --- | --- |
| Host | `mailpit` внутри Docker-сети |
| Port | `1025` |
| From | `no-reply@fsp.local` |
| From display name | `ФСП Скаут` |
| SSL / STARTTLS / SMTP auth | Выключены |

Локально: [localhost:8025](http://localhost:8025/), без пароля. Сервер: [89.104.69.242:8025](http://89.104.69.242:8025/), **`admin` / `admin1234`**. Серверное `MAILPIT_UI_AUTH` передаётся как `MP_UI_AUTH`.

Серверная база писем — `/data/mailpit.db` контейнера, volume `mailpit-data`. Локальный Compose не настраивает постоянную БД Mailpit: сохранение писем после пересоздания не гарантируется. SMTP наружу не опубликован.

### Управление realm и темой

`infra/keycloak/local/fsp-realm.json` импортирует локального пользователя и тестовый клиент; `infra/keycloak/fsp-realm.json` — серверный realm без готовых пользователей. Импорт действует при первом создании realm, изменение JSON не обновляет уже существующий realm.

Локально используйте [консоль](http://localhost:8180/admin/master/console/) с `admin` / `local-keycloak-admin-change-me`. На сервере:

```sh
ssh fsp-deploy@89.104.69.242
cd ~/fsp
docker compose exec keycloak bash
```

Внутри контейнера:

```sh
/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 --realm master \
  --user "$KC_BOOTSTRAP_ADMIN_USERNAME" \
  --password "$KC_BOOTSTRAP_ADMIN_PASSWORD"
/opt/keycloak/bin/kcadm.sh get clients -r fsp -q clientId=fsp-web
```

Новый origin добавляется в redirect URI и web origins `fsp-web`. `scripts/keycloak-web.py` на деплое добавляет текущий origin и сохраняет прежние адреса, включая localhost:5173/3000. Тема — `infra/keycloak/themes/fsp-scout`; локальное обновление — `make keycloak-theme`. [Документация темы](docs/keycloak-design-spec.md).

## Админка приложения

Вход: **[сервер /admin](http://89.104.69.242:3000/admin)**, **[Docker /admin](http://localhost:3000/admin)**, **[dev /admin](http://localhost:5173/admin)**. Нужны email и пароль отдельного административного аккаунта. Демо-суперадмин: **`superadmin@fsp.local` / `adminadminadmin`**, с условиями из таблицы доступов.

Аккаунты находятся в `admin_accounts`, сессии — в `admin_sessions` БД приложения. Пароли хешируются bcrypt, сервер хранит хеш токена сессии. Keycloak admin `admin` не является администратором приложения.

### Первоначальная активация

До миграций задайте оба значения:

```dotenv
ADMIN_BOOTSTRAP_EMAIL=superadmin@fsp.local
ADMIN_BOOTSTRAP_PASSWORD=adminadminadmin
```

Docker и `make migrate` (мигратор тоже запускается в Docker) читают их из корневого `.env`. Bootstrap активирует созданного миграцией суперадмина, у которого ещё нет пароля. Повторные миграции **не меняют пароль действующего суперадмина**. Пароль создаваемого администратора должен занимать 12–72 байта.

Суперадмин создаёт обычного `admin` на `/admin/admins` или через `POST /api/v1/admin/admins`. Публичной регистрации администраторов нет.

### Разделы

Все пути доступны на origin текущего фронта:

| Путь | Назначение |
| --- | --- |
| `/admin/overview` | Статистика платформы |
| `/admin/companies` | Компании, документы, подтверждение и блокировка |
| `/admin/users` | Пользователи, связанные компании и блокировка |
| `/admin/needs` | Потребности и модерация |
| `/admin/offers` | Предложения кандидатам |
| `/admin/tasks` | Задания компаний и модерация |
| `/admin/attempts` | Метаданные кандидатских попыток и итоги |
| `/admin/audit` | Журнал действий |
| `/admin/catalogs` | Справочники |
| `/admin/moderation` | Предложенные навыки |
| `/admin/questions` | Банк заданий и версии |
| `/admin/templates` | Шаблоны и предпросмотр тестов |
| `/admin/admins` | Управление администраторами, только superadmin |

`POST /api/v1/admin/auth/login` выдаёт opaque Bearer token на **8 часов**, без refresh. Фронт хранит его в `sessionStorage` вкладки и проверяет `/auth/me`. Выход отзывает сессию, блокировка администратора — все его сессии. Ограничение входа: 10 попыток на email и 30 на IP за 15 минут; при превышении — `429`, `Retry-After: 900`.

## API и документация эндпоинтов

Сервер: **`http://89.104.69.242:8080/api/v1`**. Локально: **`http://localhost:8080/api/v1`**. Браузер фронта использует `/api/v1` через Next.js proxy.

**Полный перечень: [153 операции API по разделам](docs/api-endpoints.md)**. DTO, параметры, ограничения и ответы — [api/openapi.yaml](api/openapi.yaml). Интерактивные запросы — [серверный Swagger](http://89.104.69.242:8080/docs/) или [локальный Swagger](http://localhost:8080/docs/).

Встроенная схема `apps/api/internal/httpapi/docs/openapi.yaml` должна совпадать с общим контрактом. `/openapi.yaml` работающего API показывает контракт развёрнутого релиза. Swagger использует `fsp-swagger` и PKCE; административные запросы требуют схемы `adminSession` и токена отдельной админки.

### Авторизация

| Методы | Доступ |
| --- | --- |
| health/readiness, info, auth/config, публичные справочники, Swagger | Без авторизации |
| `/me/register` | JWT подтверждённого пользователя Keycloak до регистрации роли |
| `/me` | JWT; роль, статус и локальный ID |
| Собственный профиль, тесты, предложения, решения | JWT активного кандидата, необходимые согласия |
| Компании и их ресурсы | JWT работодателя и разрешённое членство компании |
| `/admin/auth/login` | Email и пароль административного аккаунта |
| Остальные `/admin/...` | Отдельный adminSession; управление администраторами — superadmin |

```http
Authorization: Bearer <access_token>
```

UUID пользователя, UUID профиля и `sub` Keycloak различаются. `candidate_id` в банке и предложениях — **UUID `candidate_profiles.id`**.

### Группы эндпоинтов

Пути относительно `/api/v1`; метод каждой операции — в [полном указателе](docs/api-endpoints.md).

| Группа | Маршруты |
| --- | --- |
| Пользователь | `/me`, `/me/register`, `/auth/config` |
| Справочники | `/catalogs`, `/catalogs/skills` |
| Профиль | `/me/profile`, `/me/profile/full`, `/me/profile/avatar`, `/me/profile/onboarding` |
| Резюме | `/me/profile/import/resume`, `/me/profile/export.pdf` |
| Контакты и согласия | `/me/contacts`, `/me/consents`, `/me/consents/{kind}` |
| Навыки и карьера | `/me/skills`, `/me/skills/{skill_id}`, `/me/experience`, `/me/education` |
| ФСП | `/me/fsp`, `/me/fsp/link`, `/me/fsp/sync` |
| Тестирование | `/me/assessments/available`, `/me/assessments/history`, `/me/assessments/attempts/...` |
| Компании | `/companies`, `/companies/{company_id}`, вложенные `/files`, `/members`, `/invitations`, `/verification` |
| Вход в команду | `/company-invitations/accept` |
| Потребности | `/companies/{company_id}/needs` и их карточки |
| Подбор | `/companies/{company_id}/candidates`, `/companies/{company_id}/needs/{need_id}/candidates` |
| Предложения | `/companies/{company_id}/offers`, `/me/offers`, `/companies/{company_id}/offers/{offer_id}/candidate-contacts` |
| Задания и решения | `/companies/{company_id}/tasks/...`, `/tasks/...`, `/me/task-submissions/...` |
| Админка | `/admin/auth/...`, `/admin/admins`, `/admin/catalogs/...`, `/admin/assessments/...`, компании, пользователи, потребности, предложения, задания, `/admin/stats`, `/admin/audit-events` |

### Пагинация и ошибки

Постраничные списки принимают `limit` 1–100 (по умолчанию 20), `offset` 0–10000 (по умолчанию 0):

```json
{"items": [], "total": 0, "limit": 20, "offset": 0}
```

`total` — все записи по фильтрам до пагинации. Списки с фиксированным пределом, например навыки, опыт и образование, могут возвращать только `items`; проверяйте конкретную схему. Неизвестные поля и параметры отвергаются там, где контракт задаёт строгую проверку.

```json
{"error": {"code": "validation_error", "message": "Описание ошибки на русском"}}
```

| HTTP | Значение |
| --- | --- |
| `400` | Валидация JSON, ID или параметров |
| `401` | Нет действующего токена / неверный вход |
| `403` | Недостаточно прав, блокировка или ограничение сценария |
| `404` | Объект отсутствует или недоступен |
| `409` | Конфликт состояния, недостающие согласия, ограничения теста |
| `413` / `415` / `422` | Размер, неподдерживаемый файл или невозможность разбора |
| `429` | Ограничение частоты входа |
| `500` / `503` | Ошибка или недоступность сервиса / зависимостей |

Используйте `error.code` вместе со статусом. `X-Request-ID` связывает ответ с JSON-логом API. Произвольные POST автоматически не повторяются. Админский предпросмотр поддерживает `Idempotency-Key`; повтор submit кандидатского теста возвращает сохранённый итог.

### Примеры

Получите access token через Keycloak/Swagger и задайте `ACCESS_TOKEN`; токен и API должны относиться к одному окружению.

```sh
API_URL=http://localhost:8080
curl --fail-with-body "$API_URL/api/v1/catalogs"
curl --fail-with-body "$API_URL/api/v1/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
curl --fail-with-body -X POST "$API_URL/api/v1/me/register" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' -d '{"role":"candidate"}'
```

Для сервера замените `API_URL` на `http://89.104.69.242:8080`. `make auth-smoke` получает локальный токен, проверяет claims и регистрирует candidate; password grant этого клиента на сервере отсутствует.

После профиля и processing, пример старта Backend / Go / Junior:

```sh
curl --fail-with-body -X POST "$API_URL/api/v1/me/assessments/attempts" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"specialization_id":1,"stack_skill_id":"00000000-0000-4000-8000-000000000001","grade_id":2}'
```

В приложении берите ID из `/catalogs` и `/me/assessments/available`.

Демонстрационный вход в локальную админку после bootstrap:

```sh
curl --fail-with-body -X POST "$API_URL/api/v1/admin/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"superadmin@fsp.local","password":"adminadminadmin"}'
curl --fail-with-body "$API_URL/api/v1/admin/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

Для второго запроса задайте `ADMIN_TOKEN` равным `access_token` ответа входа. Внутренние `/api/auth/session`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/pkce` обслуживает Next.js, они не входят в Go OpenAPI. [Контракт веб-сессии](apps/web/docs/api-and-auth.md).

## Основные сценарии и ограничения

### Профиль, согласия и резюме

Кандидат даёт processing, создаёт профиль, заполняет контакты, навыки, опыт, образование и анкету со специализацией, основным стеком, заявленным грейдом и soft skills. Анкета не подтверждает квалификацию.

Для появления в банке нужны активный аккаунт, `search_status=open` или `passive` и действующие `processing`/`publication`. `hidden` исключает профиль. `ats_transfer` связан с конкретной компанией; контакты работодателю выдаются по принятому предложению при выполнении правил согласий.

Импорт принимает PDF hh.ru с текстовым слоем: до **5 МБ и 10 страниц**. Возвращает черновик и предупреждения, не сохраняет файл или профиль. Кандидат проверяет поля и сохраняет их обычными API. Скан без текста не поддерживается. Собственное PDF-резюме генерируется в Go и не сохраняется в S3.

### Подтверждение квалификации

Выбор теста: **специализация → стек → грейд**. `stack_skill_id` обязателен при старте и в анкете. Сервер фиксирует случайные вопросы и правила, сохраняет ответы и проверяет дедлайн. Одновременно разрешена одна активная попытка.

Успех требует общего проходного балла и проходного результата по основному стеку. Квалификации хранятся отдельно по специализации и стеку; успешный Go не подтверждает Java. Провал не понижает прежние подтверждения. Пересдача проваленной тройки — через `ASSESSMENT_RETAKE_DAYS` (7 дней по умолчанию). После успешного присвоения смена специализации/грейда ограничена отдельными 7 сутками; другой стек той же специализации и грейда можно подтвердить отдельно.

Миграции создают **56 демо-вопросов и 6 вариантов**: Backend / Go, Backend / Java, Frontend / JavaScript — каждый для Junior и Middle. Правильные ответы кандидатам не раскрываются. Опубликованные вопросы и шаблоны неизменяемы; исправление создаётся новой версией. `choice`, `short_answer`, `code_reading` проверяются автоматически без исполнения кода. Админские предпросмотры изолированы от кандидатских результатов и хранятся 7 дней. [Подробнее](docs/candidate-completion.md).

### Компания и потребности

Создатель компании — `owner`. Он заполняет профиль, загружает документы и приглашает работодателей как `recruiter` или `viewer`. Приглашение сотрудника в команду и предложение кандидату — разные сущности.

Потребность содержит специализацию, необязательный грейд, описание, зарплату, город, timezone, навыки и форматы работы. Статусы: `draft`, `active`, `archived`. Для активации нужны навык и формат работы; DELETE архивирует потребность. Подборка доступна по активной потребности своей компании.

Владелец подаёт заявку подтверждения после заполнения ИНН и загрузки документа. Администратор принимает решение по версии заявки. Изменение реквизитов или удаление документа может сбросить подтверждение. Оно не является обязательным условием функций текущего MVP.

### Подбор и предложения

Рейтинг использует специализацию, грейд, навыки, формат, бюджет, город и timezone. Выдача объясняет совпадения; это сходство, не вероятность найма. Бонус ФСП влияет на порядок внутри одной подтверждённой категории и не меняет `match_score` или грейд.

Карточка для работодателя скрывает контакты и приватные свободные тексты. Фактический просмотр фиксируется POST; GET не меняет историю. Просмотр/отправка предложения исключают профиль из обычной выдачи этой компании на **720 часов**; история доступна с `interaction_status=all`.

Предложение без ответа истекает через **336 часов (14 суток)**. Оно и связанный автоматический просмотр освобождают свой кулдаун; самостоятельный более поздний просмотр может сохранить ограничение. `viewed`/`has_offer` остаются. Принятие/отказ делает кандидат, администратор не подменяет решение. [Подбор](docs/backend-hiring-and-admin.md), [история](docs/candidate-interactions.md), [истечение](docs/offer-expiration.md).

### Задания и файлы

Компания публикует одно задание за календарный день **по Москве**; квота общая для владельца и рекрутеров. Кандидат отправляет одно решение, компания ставит оценку 0–100 и комментарий. Закрытие приёма не возвращает квоту. Оценка задания автоматически не меняет грейд или рейтинг.

| Файл | Ограничение |
| --- | --- |
| Документы компании | PDF, JPEG, PNG, до 10 МБ |
| Логотип / аватар | JPEG, PNG, до 2 МБ |
| Задание / решение | PDF, JPEG, PNG, ZIP, TXT, MD, до 10 МБ |
| Импорт резюме | Текстовый PDF, до 5 МБ и 10 страниц |
| Обычный JSON-запрос | До 2 МБ |

Файлы выдаются API после проверки прав, без публичных S3 URL. Multipart-поля смотрите в конкретной операции OpenAPI. [Контракт заданий](docs/company-daily-tasks.md).

### Блокировки

Блокировки аккаунта и компании независимы, сохраняют историю и проверяются API даже со старым JWT. Заблокированный пользователь может читать статус и причину через `/me`, рабочие методы закрыты. Блокировка владельца автоматически не блокирует компанию. [Блокировки](docs/account-company-blocking.md), [операционная админка](docs/admin-operations.md).

## Тесты и проверки

```sh
make check
```

Проверяет совпадение OpenAPI, gofmt, `go vet`, Go race-тесты, Vitest, TypeScript, ESLint и production-сборку фронта.

| Команда | Назначение |
| --- | --- |
| `make test` | Go-тесты с `-race` |
| `npm run test` | Vitest |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint и консистентность |
| `npm run build` | Production-сборка Next.js |
| `make integration` | БД, Redis, S3; настройки из `apps/api/.env` |
| `make smoke` | Сайт, proxy, health, Swagger, OpenAPI, CORS, `/me` без токена |
| `make auth-smoke` | Локальный Keycloak → JWT → регистрация candidate → API |
| `make matching-evaluation` | Синтетическая оценка подбора на тестовой БД |

Проверка серверного стенда:

```sh
SMOKE_URL=http://89.104.69.242:3000 \
SMOKE_API_URL=http://89.104.69.242:8080 make smoke
```

Обычные HTTP-тесты API используют синтетические JWT и тестовые хранилища. Интеграционные проверки под tag `integration` создают отдельные схемы; без `TEST_DATABASE_URL` проверки БД пропускаются.

```sh
cd apps/api
go test -race ./...
go test -race -tags=integration ./internal/platform ./tests/integration
```

Для второй команды задайте `TEST_DATABASE_URL`, при необходимости `TEST_S3_ENDPOINT`, `TEST_S3_BUCKET`, `TEST_S3_ACCESS_KEY`, `TEST_S3_SECRET_KEY`. Matching запускайте на тестовой БД по [инструкции](docs/matching-evaluation.md). [QA seed](docs/employer-pagination-qa.md) создаёт записи для пагинации, не готовые логины Keycloak.

## Сервер и CI/CD

### Инфраструктура

| Параметр | Значение |
| --- | --- |
| Хост | `89.104.69.242` |
| SSH-пользователь | `fsp-deploy` |
| Каталог релиза | `~/fsp` пользователя деплоя |
| Compose | `~/fsp/compose.yaml`, исходник `deploy/compose.yaml` |
| Env | `~/fsp/.env`, источник GitHub `PRODUCTION_ENV` |
| Registry | `ghcr.io/ix1ax/fsp-talent-lct-2026/api:<SHA>` и `/web:<SHA>` |
| Внешние порты | SSH для деплоя; HTTP 3000, 8080, 8081, 8025 |
| Внутренние сервисы | Postgres 5432, Redis 6379, S3 8333, SMTP 1025; на сервере наружу не опубликованы |
| Постоянные volumes | `postgres-data`, `keycloak-data`, `s3-data`, `mailpit-data` |

Для SSH нужен ключ деплоя; пароль админки приложения не даёт доступ к серверу. Серверу нужны Docker, Compose v2, Python 3, доступ к GHCR.

### Автоматический деплой

[Workflow CI](.github/workflows/ci.yml) запускается **на push в `main`**. Собирает API/фронт, публикует SHA-образы, загружает Compose, env, realm, тему и скрипты в `~/fsp`. Сервер применяет миграции перед API, обновляет контейнеры и Keycloak, проверяет readiness, Swagger, сайт и auth/config через фронт.

Автоматических тестовых jobs на PR сейчас нет: выполняйте `make check` перед PR. Отдельные PAT и `DEPLOY_ENABLED` не нужны.

GitHub → Settings → Environments → `production` → Secrets:

| Secret | Значение |
| --- | --- |
| `DEPLOY_HOST` | `89.104.69.242` |
| `DEPLOY_USER` | `fsp-deploy` |
| `DEPLOY_SSH_KEY` | Приватный SSH-ключ деплоя |
| `DEPLOY_KNOWN_HOSTS` | Проверенная запись SSH host key |
| `PRODUCTION_ENV` | Заполненный серверный env |

`GITHUB_TOKEN` предоставляет GitHub. Деплой заменяет серверный `.env` содержимым секрета и тегами образов: изменения только серверного файла не сохранятся при следующем релизе. `WEB_PUBLIC_URL` — один origin со схемой и портом, без завершающего `/`.

### Обслуживание и резервные копии

```sh
ssh fsp-deploy@89.104.69.242
cd ~/fsp
docker compose ps
docker compose logs -f --tail=100 api web
curl -fsS http://localhost:8080/readyz
curl -fsS http://localhost:3000/api/v1/auth/config
```

Повторный запуск загруженного релиза: `sh deploy-server.sh` из `~/fsp`; он применяет конфигурацию и миграции, не скачивает исходники Git.

До изменений существующих данных сохраняйте базы и S3 **вне VPS**. Пример дампов из каталога релиза:

```sh
umask 077
docker compose exec -T postgres pg_dump -U fsp -d fsp -Fc > fsp.dump
docker compose exec -T keycloak-db pg_dump -U keycloak -d keycloak -Fc > keycloak.dump
```

Эти команды копируют только базы; содержимое S3 и при необходимости Mailpit резервируется отдельно. Автоматические бэкапы и отказоустойчивый кластер не настроены.

Для отката задайте прежний SHA в `API_IMAGE`/`WEB_IMAGE` серверного `.env`, затем:

```sh
docker compose pull api web
docker compose up -d --wait
```

Миграции автоматически не откатываются: старый код должен быть совместим со схемой. Следующий CI снова заменит env.

### Правила изменений

Одна задача — ветка и PR с проверкой другим разработчиком. Обновляйте базу из `main`, меняйте OpenAPI вместе с кодом, синхронизируйте встроенную копию и [указатель маршрутов](docs/api-endpoints.md).

Общая БД меняется миграциями из `main`. SQL-файлы имеют временные метки; применённые миграции не редактируются и не переименовываются. Проверяйте применение с нуля и поверх текущей схемы. Добавление новых полей и удаление старых разделяйте на совместимые этапы. `goose down` на общей БД без согласованного плана не применяется.

## Диагностика

| Симптом | Что проверить |
| --- | --- |
| Keycloak отклоняет redirect URI | Используйте localhost; WEB_PUBLIC_URL, redirect URI и web origins `fsp-web` |
| `401` после входа | Токен нужного окружения, issuer, audience `fsp-api`, `sub`, `email_verified`, срок и JWKS |
| «HTTPS required» в серверной консоли Keycloak | Realm `master`; используйте Admin CLI внутри контейнера по SSH |
| Локальный фронт обращается к серверу | `.env.local` переопределяет `.env`; измените настройки и перезапустите Next.js |
| `404` профиля после входа | Роль и профиль создаются отдельно, проверьте `/me` и создание профиля |
| Кандидата нет в банке | Активность, search_status, processing/publication, фильтры и кулдаун этой компании |
| Админка не принимает Keycloak admin | Нужен аккаунт `admin_accounts`, например активированный superadmin |
| Bootstrap не поменял пароль | Активирует только запись без пароля, не является сбросом |
| Нет письма | Правильный Mailpit, получатель, SMTP realm, контейнеры keycloak/mailpit |
| Mailpit сервера требует вход | `admin` / `admin1234`, действующее MAILPIT_UI_AUTH |
| `/readyz` → `503` | PostgreSQL, Redis, S3, совпадение env, bucket |
| Нельзя начать тест | available.reason/retry_at, согласие, профиль, активная попытка, стек и опубликованный банк |
| PostgreSQL не пускает после смены env | Пароль существующей роли БД не изменился |
| Swagger отличается от репозитория | Контракт развёрнутого релиза и SHA образа |

Локальная диагностика: `make logs`, `docker compose --profile app ps`. Для обновления realm или исправления входа не удаляйте volumes: это удаляет пользователей и данные.

## Подробная документация

| Документ | Содержание |
| --- | --- |
| [Демо-данные для жюри](docs/jury-demo.md) | Аккаунты, состав набора, маршрут проверки, повторный запуск |
| [Сопроводительная документация](docs/submission/documentation.md) | Архитектура, механики тестирования и подбора, валидация, интеграция с ФСП, API, библиотеки, запуск — по пунктам ТЗ |
| [Все эндпоинты](docs/api-endpoints.md) | Методы, пути, назначение, авторизация |
| [OpenAPI](api/openapi.yaml) | DTO, параметры и ответы |
| [Архитектурные решения](docs/architecture.md) | Слои, инструменты и связь с ТЗ |
| [Подбор и админка](docs/backend-hiring-and-admin.md) | Сценарии компании, банка, предложений и модерации |
| [Кандидат и тестирование](docs/candidate-completion.md) | Стек, квалификации, демобанк и PDF |
| [ФСП](docs/fsp-integration.md) | Mock-реестр и границы интеграции |
| [Задания компаний](docs/company-daily-tasks.md) | Файлы, квота, решения и оценка |
| [Взаимодействия](docs/candidate-interactions.md) | Просмотры и 30-дневный кулдаун |
| [Истечение предложений](docs/offer-expiration.md) | 14 суток и освобождение кулдауна |
| [Операционная админка](docs/admin-operations.md) | Подтверждение, модерация, статистика и аудит |
| [Блокировки](docs/account-company-blocking.md) | Аккаунты, компании, причины и права |
| [Идентификация](docs/admin-user-identification.md) | Имя, почта, приватность, импорт пользователей |
| [Предпросмотры и администраторы](docs/admin-backend-extensions.md) | Пробные тесты, статусы и сессии |
| [Оценка подбора](docs/matching-evaluation.md) | Формула и воспроизводимость |
| [QA пагинации](docs/employer-pagination-qa.md) | Тестовые записи и проверки |
| [Тема Keycloak](docs/keycloak-design-spec.md) | Установка и права ресурсов |
| [Фронтенд](apps/web/README.md) | Веб-приложение и разработка |
| [Документация фронта](apps/web/docs/README.md) | Архитектура, дизайн, API и формы |
| [Админка фронта](apps/web/ADMIN.md) | Сессия, версии и предпросмотры |

Документы отдельных доработок описывают состояние на дату создания. Текущие поля и маршруты определяют код `main` и OpenAPI соответствующего релиза.
