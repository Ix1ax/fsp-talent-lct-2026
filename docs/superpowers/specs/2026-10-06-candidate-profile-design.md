# Профиль кандидата: дизайн первого шага

## Цель

Кандидат (роль `candidate`) создаёт и ведёт публичную часть своего профиля и загружает аватар. Профиль станет основой для категорий и подбора работодателем. Контакты, заявленные навыки, тестирование и публикация для работодателей в этот шаг не входят.

## Границы

Входит:
- таблицы `candidate_profiles` и `candidate_work_formats`;
- методы создания, чтения и изменения своего профиля;
- загрузка, получение и удаление своего аватара.

Не входит:
- `candidate_contacts`, `candidate_skills`, `skill_evidence`, категории и грейды кандидата;
- колонка `published_at` и методы публикации;
- показ профиля или аватара работодателям;
- автоматическая очистка файлов-сирот в S3.

## Принятые решения

- Профиль создаётся явным запросом кандидата, а не автоматически. Один пользователь — один профиль.
- `search_status` по умолчанию `hidden`: профиль никому не виден, пока кандидат сам не выберет `open` или `passive`.
- Справочники (`specializations`, `grades`, `work_formats`, `skills`) общие и живут в `internal/catalog`. Своих справочников у кандидата нет, ссылки идут на те же ID.
- Грейд и категорию кандидату на этом шаге не назначаем: они появляются только после теста.
- Аватар видит только сам кандидат. Работодателю его покажем позже по тому же правилу, что и контакты (после принятого оффера), чтобы анонимная карточка не раскрывала личность.
- Роль берётся из локальной БД через `middleware.RequireRole(user.RoleCandidate)`, идентификатор пользователя — из `middleware.UserFrom`, а не `sub` из токена.

## Данные

Одна миграция с временной меткой.

`candidate_profiles`:

| Поле | Тип | Ограничения |
| --- | --- | --- |
| `id` | uuid | PK, `gen_random_uuid()` |
| `user_id` | uuid | `NOT NULL UNIQUE`, FK `users(id)` `ON DELETE CASCADE` |
| `avatar_file_id` | uuid | FK `files(id)`, `NULL` |
| `headline` | text | `NULL`, до 200 символов |
| `summary` | text | `NULL`, до 10000 символов |
| `city` | text | `NULL`, до 200 символов |
| `timezone` | varchar(64) | `NULL`, часовой пояс IANA |
| `experience_months` | integer | `NOT NULL DEFAULT 0`, от 0 до 600 |
| `salary_min_rub` | bigint | `NULL`, от 0 до 1 000 000 000 |
| `search_status` | varchar(16) | `NOT NULL DEFAULT 'hidden'`, одно из `open`, `passive`, `hidden` |
| `updated_at` | timestamptz | `NOT NULL DEFAULT now()` |

`candidate_work_formats`: `(candidate_id, work_format_id)` — составной PK, FK на `candidate_profiles(id)` `ON DELETE CASCADE` и на `work_formats(id)`.

## API

Все методы требуют `Authorization: Bearer` и роль `candidate`. Ошибки в формате `{"error":{"code","message"}}`, сообщения на русском.

| Метод | Назначение | Ответы |
| --- | --- | --- |
| `POST /api/v1/me/profile` | Создать профиль | 201 + `Location`; 409 `profile_exists`; 400 `validation_error` |
| `GET /api/v1/me/profile` | Получить свой профиль | 200; 404 `profile_not_found` |
| `PATCH /api/v1/me/profile` | Изменить профиль | 200; 404 `profile_not_found`; 400 `validation_error` |
| `PUT /api/v1/me/profile/avatar` | Загрузить или заменить аватар (`multipart/form-data`, поле `file`) | 200 (профиль); 404; 413 `file_too_large`; 415 `unsupported_file_type`; 400 `invalid_file`; 503 `storage_unavailable` |
| `GET /api/v1/me/profile/avatar` | Получить свой аватар | 200 (картинка); 404 |
| `DELETE /api/v1/me/profile/avatar` | Удалить аватар | 204; 404 |

Общие ответы: 401 `unauthorized` без токена, 403 `forbidden` для роли не `candidate`, 403 `user_inactive` для заблокированного.

Тело профиля (создание, ответ): `headline`, `summary`, `city`, `timezone`, `experience_months`, `salary_min_rub`, `search_status`, `work_format_ids`; в ответе дополнительно `id`, `avatar_file_id`, `updated_at`. `user_id` наружу не отдаём.

PATCH: отсутствие поля сохраняет значение, `null` очищает необязательное поле. `experience_months` и `search_status` очистить нельзя. `work_format_ids`: непустой список заменяет набор целиком, `[]` очищает набор. PATCH без полей — 400.

## Валидация

- Пробелы по краям обрезаются, пустая строка становится `null`, нулевой символ отвергается.
- Длины и диапазоны — по таблице данных.
- Часовой пояс проверяется через `time.LoadLocation`, значение `Local` отвергается.
- `work_format_ids`: до 10 штук, уникальные положительные ID. Несуществующий формат — 400 `validation_error`, а не 500.
- JSON разбирается через `request.JSON`: нужен `Content-Type: application/json`, неизвестные поля отвергаются.

## Аватар

Допустимы JPEG и PNG до 2 МиБ и до 4 мегапикселей. Тип определяется по содержимому, а не по Content-Type или расширению. В `files.Prepare` добавляется цель `candidate_avatar` с теми же правилами, что у логотипа, и префиксом ключа `candidates/` вместо `companies/`.

Загрузка и замена:
1. Файл проходит `Prepare`, в `files` создаётся запись `pending` (`owner_user_id` — кандидат, `visibility = private`).
2. Объект кладётся в S3.
3. В одной транзакции запись становится `ready`, `avatar_file_id` указывает на неё, а прежний аватар (если был) помечается `deleting`.
4. После коммита прежний объект удаляется из S3 и запись получает `deleted`.

Если шаг 2 или 3 не удался, новая запись и объект убираются, профиль не меняется. Если упало удаление старого объекта после коммита, остаётся запись `deleting`, которую можно удалить повторно: так же сделано для файлов компаний.

Скачивание: доступно только владельцу профиля со статусом `ready`. Заголовки `X-Content-Type-Options: nosniff` и `Cache-Control: private, no-store`. Одновременных загрузок не более двух (как у компаний). Для пути аватара в роутере задаётся лимит тела запроса, равный лимиту аватара с запасом на multipart.

## Структура кода

`internal/candidate/{entity,service,repository,web}` по образцу `internal/company`:
- `entity`: модель, нормализация, PATCH-логика, ошибки;
- `service`: сценарии поверх интерфейсов хранилищ, работа с `files.Objects`;
- `repository`: SQL на `pgxpool`, права проверяются в SQL;
- `web`: маршруты и обработчики, преобразование ошибок в ответы.

Подключение через `Options` в `httpapi/router.go` и сборку в `cmd/api/main.go`. Контракт: `api/openapi.yaml` и копия `apps/api/internal/httpapi/docs/openapi.yaml`.

## Тестирование

- Юнит: валидация и нормализация, PATCH (нет поля, `null`, пустой PATCH, замена `work_format_ids`), `files.Prepare` для `candidate_avatar` (тип по содержимому, подмена расширения и Content-Type, размер, мегапиксели).
- Сервис: подделки хранилища, сценарии отката при сбое S3 и при сбое транзакции.
- Интеграционные на реальном Postgres (`-tags=integration`): создание, дубль (409), PATCH с `null`, форматы работы (неизвестный ID), чужой пользователь не видит и не меняет профиль, роль не `candidate` получает 403, заблокированный получает 403, замена и удаление аватара, аватар недоступен другому кандидату.
- Готовность: `make check`, `make integration`, ручной вызов API на локальном стеке. Миграция проверяется с нуля.

## Допущения

- Кандидат управляет только своим профилем, администратор и работодатель к этим методам доступа не имеют.
- `hidden` по умолчанию безопаснее для приватности; видимость для работодателей определится вместе с категориями и публикацией.
- Очистку сирот в S3 (записи `pending` и `deleting`) делаем отдельной задачей, если понадобится.
