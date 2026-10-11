# Указатель эндпоинтов API

Сверено с `api/openapi.yaml` ветки `main` 11.10.2026: **153 операции на 122 путях**. Пути в таблицах полные: продуктовые начинаются с `/api/v1`, служебные `/healthz` и `/readyz` — без префикса.

[README проекта](../README.md) · [OpenAPI: поля, ограничения и ответы](../api/openapi.yaml) · [Swagger сервера](http://89.104.69.242:8080/docs/) · [Swagger localhost](http://localhost:8080/docs/)

API origin: сервер `http://89.104.69.242:8080`, локально `http://localhost:8080`. Через фронт продуктовые методы доступны на том же `/api/v1` с портом 3000 (Docker) или 5173 (dev). Swagger и OpenAPI обслуживаются непосредственно API.

## Авторизация и обозначения

- **Публичный** — авторизация не нужна. Для входа в админку требуются email/password в теле запроса.
- **JWT Keycloak** — `Authorization: Bearer <access_token>` пользователя нужного окружения. Дополнительно проверяются роль, статус, членство, собственность и согласия конкретного сценария. `/me/register` доступен до регистрации локальной роли; `/me` позволяет заблокированному пользователю прочитать свой статус.
- **adminSession** — отдельный токен из `POST /api/v1/admin/auth/login`; пользовательский JWT не подходит. Управление `/admin/admins` требует superadmin.
- `{...}` — параметр пути, подставляемый без фигурных скобок. ID специализации/грейда числовые, ID навыка и профиля кандидата — UUID.

Тип авторизации взят из security схемы операции; конкретные полномочия описаны в OpenAPI и доменной документации. Колонка query перечисляет имена параметров, но не заменяет их типы, значения по умолчанию и ограничения. Для метода могут быть дополнительные параметры пути и заголовки. Тело и ответы смотрите в Swagger по названию операции.

## Служебные методы, вход и регистрация

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/auth/config` | Публичная конфигурация входа через Keycloak | Публичный | — |
| GET | `/api/v1/info` | Информация об API | Публичный | — |
| GET | `/api/v1/me` | Текущий пользователь приложения | JWT Keycloak | — |
| POST | `/api/v1/me/register` | Первичная регистрация пользователя с выбором роли | JWT Keycloak | — |
| GET | `/healthz` | Проверка процесса API | Публичный | — |
| GET | `/readyz` | Доступность Postgres, Redis и S3-бакета | Публичный | — |

## Публичные справочники

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/catalogs` | Справочники специализаций, грейдов и форматов | Публичный | — |
| GET | `/api/v1/catalogs/skills` | Найти навык в справочнике | Публичный | `limit`, `offset`, `q` |

## Профиль, согласия, навыки и карьера кандидата

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/me/consents` | История согласий кандидата и текущая версия политики | JWT Keycloak | — |
| POST | `/api/v1/me/consents` | Дать согласие | JWT Keycloak | — |
| DELETE | `/api/v1/me/consents/{kind}` | Отозвать активное согласие | JWT Keycloak | `company_id` |
| GET | `/api/v1/me/contacts` | Получить свои контакты | JWT Keycloak | — |
| PUT | `/api/v1/me/contacts` | Сохранить свои контакты | JWT Keycloak | — |
| GET | `/api/v1/me/education` | Список: образование | JWT Keycloak | — |
| POST | `/api/v1/me/education` | Добавить: образование | JWT Keycloak | — |
| PUT | `/api/v1/me/education/{id}` | Заменить: образование | JWT Keycloak | — |
| DELETE | `/api/v1/me/education/{id}` | Удалить: образование | JWT Keycloak | — |
| GET | `/api/v1/me/experience` | Список: место работы | JWT Keycloak | — |
| POST | `/api/v1/me/experience` | Добавить: место работы | JWT Keycloak | — |
| PUT | `/api/v1/me/experience/{id}` | Заменить: место работы | JWT Keycloak | — |
| DELETE | `/api/v1/me/experience/{id}` | Удалить: место работы | JWT Keycloak | — |
| GET | `/api/v1/me/profile` | Получить свой профиль кандидата | JWT Keycloak | — |
| POST | `/api/v1/me/profile` | Создать свой профиль кандидата | JWT Keycloak | — |
| PATCH | `/api/v1/me/profile` | Изменить свой профиль кандидата | JWT Keycloak | — |
| GET | `/api/v1/me/profile/avatar` | Получить свой аватар | JWT Keycloak | — |
| PUT | `/api/v1/me/profile/avatar` | Загрузить или заменить свой аватар | JWT Keycloak | — |
| DELETE | `/api/v1/me/profile/avatar` | Удалить свой аватар | JWT Keycloak | — |
| GET | `/api/v1/me/profile/export.pdf` | Скачать собственное стандартное резюме PDF | JWT Keycloak | — |
| GET | `/api/v1/me/profile/full` | Полный профиль кандидата одним ответом | JWT Keycloak | — |
| POST | `/api/v1/me/profile/import/resume` | Импорт резюме из PDF: черновик профиля | JWT Keycloak | — |
| GET | `/api/v1/me/profile/onboarding` | Состояние первичного пути кандидата | JWT Keycloak | — |
| PUT | `/api/v1/me/profile/onboarding` | Сохранить опрос, предполагаемый грейд и софт-скиллы | JWT Keycloak | — |
| GET | `/api/v1/me/skills` | Мои навыки | JWT Keycloak | — |
| POST | `/api/v1/me/skills` | Добавить навык по названию | JWT Keycloak | — |
| PUT | `/api/v1/me/skills/{skill_id}` | Добавить навык или изменить уровень | JWT Keycloak | — |
| DELETE | `/api/v1/me/skills/{skill_id}` | Убрать навык из списка | JWT Keycloak | — |

## Привязка ФСП и достижения

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/me/fsp` | Привязка и достижения ФСП | JWT Keycloak | — |
| DELETE | `/api/v1/me/fsp` | Удалить собственную привязку ФСП и импортированные достижения | JWT Keycloak | — |
| POST | `/api/v1/me/fsp/link` | Привязать тестовый ФСП ID | JWT Keycloak | — |
| POST | `/api/v1/me/fsp/sync` | Обновить достижения ФСП | JWT Keycloak | — |

## Тестирование кандидата

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/me/assessments/attempts` | Начать тест | JWT Keycloak | — |
| GET | `/api/v1/me/assessments/attempts/{id}` | Попытка или её итог | JWT Keycloak | — |
| PUT | `/api/v1/me/assessments/attempts/{id}/answers/{question_id}` | Сохранить или заменить ответ | JWT Keycloak | — |
| POST | `/api/v1/me/assessments/attempts/{id}/submit` | Завершить попытку и получить итог | JWT Keycloak | — |
| GET | `/api/v1/me/assessments/attempts/current` | Активная попытка | JWT Keycloak | — |
| GET | `/api/v1/me/assessments/available` | Тесты, которые можно пройти, и их состояние | JWT Keycloak | — |
| GET | `/api/v1/me/assessments/history` | История собственных попыток и присвоенных категорий | JWT Keycloak | `limit`, `offset` |

## Компании, документы, команда и потребности

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/companies` | Мои компании | JWT Keycloak | `limit`, `offset` |
| POST | `/api/v1/companies` | Создать компанию и стать её владельцем | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}` | Профиль моей компании | JWT Keycloak | — |
| PATCH | `/api/v1/companies/{company_id}` | Обновить профиль компании | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/files` | Документы и логотипы компании | JWT Keycloak | `limit`, `offset` |
| POST | `/api/v1/companies/{company_id}/files` | Загрузить документ или установить логотип | JWT Keycloak | — |
| DELETE | `/api/v1/companies/{company_id}/files/{file_id}` | Удалить документ или логотип | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/files/{file_id}/download` | Скачать приватный файл компании | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/invitations` | Список приглашений | JWT Keycloak | `limit`, `offset` |
| POST | `/api/v1/companies/{company_id}/invitations` | Пригласить сотрудника | JWT Keycloak | — |
| DELETE | `/api/v1/companies/{company_id}/invitations/{invitation_id}` | Отозвать приглашение | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/members` | Список команды компании | JWT Keycloak | `limit`, `offset` |
| PATCH | `/api/v1/companies/{company_id}/members/{user_id}` | Изменить роль сотрудника | JWT Keycloak | — |
| DELETE | `/api/v1/companies/{company_id}/members/{user_id}` | Отключить сотрудника | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/needs` | Потребности моей компании | JWT Keycloak | `limit`, `offset`, `status` |
| POST | `/api/v1/companies/{company_id}/needs` | Создать потребность работодателя | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/needs/{need_id}` | Получить потребность компании | JWT Keycloak | — |
| PATCH | `/api/v1/companies/{company_id}/needs/{need_id}` | Изменить потребность компании | JWT Keycloak | — |
| DELETE | `/api/v1/companies/{company_id}/needs/{need_id}` | Архивировать потребность | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/verification` | Статус заявки компании на подтверждение | JWT Keycloak | — |
| POST | `/api/v1/companies/{company_id}/verification/request` | Подать компанию на подтверждение | JWT Keycloak | — |
| POST | `/api/v1/company-invitations/accept` | Принять приглашение в компанию | JWT Keycloak | — |

## Банк кандидатов и подбор

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/companies/{company_id}/candidates` | Банк кандидатов компании | JWT Keycloak | `limit`, `offset`, `work_format_ids`, `experience_min_months`, `experience_max_months`, `salary_max_rub`, `viewed`, `interaction_status`, `has_offer`, `has_fsp_achievements`, `grade_status`, `specialization_id`, `grade_id`, `skill_id`, `verified_skill_only` |
| GET | `/api/v1/companies/{company_id}/candidates/{candidate_id}` | Подробная карточка доступного кандидата | JWT Keycloak | — |
| POST | `/api/v1/companies/{company_id}/candidates/{candidate_id}/view` | Зафиксировать открытие профиля кандидата | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/needs/{need_id}/candidates` | Подборка по степени соответствия потребности | JWT Keycloak | `limit`, `offset`, `work_format_ids`, `experience_min_months`, `experience_max_months`, `salary_max_rub`, `viewed`, `interaction_status`, `has_offer`, `has_fsp_achievements`, `grade_status`, `specialization_id`, `grade_id`, `skill_id`, `verified_skill_only` |

## Предложения и доступ к контактам

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/companies/{company_id}/offers` | Предложения моей компании | JWT Keycloak | `status`, `limit`, `offset` |
| POST | `/api/v1/companies/{company_id}/offers` | Отправить предложение кандидату | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/offers/{offer_id}` | Просмотреть предложение со стороны компании | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/offers/{offer_id}/candidate-contacts` | Контакты кандидата по принятому предложению | JWT Keycloak | — |
| GET | `/api/v1/me/offers` | Входящие предложения кандидата | JWT Keycloak | `status`, `limit`, `offset` |
| GET | `/api/v1/me/offers/{offer_id}` | Посмотреть условия входящего предложения | JWT Keycloak | — |
| POST | `/api/v1/me/offers/{offer_id}/respond` | Принять или отклонить предложение | JWT Keycloak | — |
| POST | `/api/v1/me/offers/{offer_id}/view` | Отметить просмотр предложения | JWT Keycloak | — |

## Задания компаний и решения

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/companies/{company_id}/tasks` | Список заданий своей компании | JWT Keycloak | `limit`, `offset`, `company_id`, `specialization_id`, `grade_id`, `q`, `status`, `published_from`, `published_to` |
| POST | `/api/v1/companies/{company_id}/tasks` | Опубликовать ежедневное задание с файлом | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/tasks/{task_id}` | Карточка задания своей компании | JWT Keycloak | — |
| POST | `/api/v1/companies/{company_id}/tasks/{task_id}/close` | Закрыть приём решений | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/tasks/{task_id}/file` | Скачать файл задания своей компании | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/tasks/{task_id}/submissions` | Список решений задания | JWT Keycloak | `limit`, `offset`, `company_id`, `task_id`, `candidate_id`, `status`, `sort` |
| GET | `/api/v1/companies/{company_id}/tasks/{task_id}/submissions/{submission_id}` | Посмотреть решение кандидата | JWT Keycloak | — |
| GET | `/api/v1/companies/{company_id}/tasks/{task_id}/submissions/{submission_id}/file` | Скачать файл решения | JWT Keycloak | — |
| PATCH | `/api/v1/companies/{company_id}/tasks/{task_id}/submissions/{submission_id}/review` | Оценить решение и оставить комментарий | JWT Keycloak | — |
| GET | `/api/v1/me/task-submissions` | Мои решения и результаты проверки | JWT Keycloak | `limit`, `offset`, `company_id`, `task_id`, `status`, `sort` |
| GET | `/api/v1/me/task-submissions/{submission_id}` | Моё решение с оценкой компании | JWT Keycloak | — |
| GET | `/api/v1/me/task-submissions/{submission_id}/file` | Скачать свой файл решения | JWT Keycloak | — |
| GET | `/api/v1/tasks` | Все задания компаний для соискателя | JWT Keycloak | `limit`, `offset`, `company_id`, `specialization_id`, `grade_id`, `q`, `status`, `published_from`, `published_to`, `submitted` |
| GET | `/api/v1/tasks/{task_id}` | Карточка задания для соискателя | JWT Keycloak | — |
| GET | `/api/v1/tasks/{task_id}/file` | Скачать файл задания | JWT Keycloak | — |
| POST | `/api/v1/tasks/{task_id}/submissions` | Отправить файл решения | JWT Keycloak | — |

## Административная сессия и аккаунты

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/admins` | Список администраторов | adminSession | `limit`, `offset` |
| POST | `/api/v1/admin/admins` | Создать администратора | adminSession | — |
| PATCH | `/api/v1/admin/admins/{admin_id}` | Блокировать или включить обычного администратора | adminSession | — |
| POST | `/api/v1/admin/auth/login` | Вход в отдельную админку | Публичный | — |
| POST | `/api/v1/admin/auth/logout` | Выйти из админки | adminSession | — |
| GET | `/api/v1/admin/auth/me` | Текущий администратор | adminSession | — |

## Административные справочники и модерация навыков

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/catalogs` | Доступные справочники админки | adminSession | — |
| GET | `/api/v1/admin/catalogs/{kind}` | Записи справочника, включая архивные | adminSession | `q`, `limit`, `offset` |
| POST | `/api/v1/admin/catalogs/{kind}` | Создать запись справочника | adminSession | — |
| GET | `/api/v1/admin/catalogs/{kind}/{id}` | Получить запись справочника | adminSession | — |
| PATCH | `/api/v1/admin/catalogs/{kind}/{id}` | Изменить или архивировать запись | adminSession | — |
| DELETE | `/api/v1/admin/catalogs/{kind}/{id}` | Удалить неиспользуемую запись | adminSession | — |
| POST | `/api/v1/admin/catalogs/skills/{id}/approve` | Одобрить предложенный навык | adminSession | — |
| POST | `/api/v1/admin/catalogs/skills/{id}/merge` | Объединить навык с одобренной записью | adminSession | — |
| POST | `/api/v1/admin/catalogs/skills/{id}/reject` | Отклонить навык и убрать его из резюме и потребностей | adminSession | — |
| GET | `/api/v1/admin/catalogs/skills/pending` | Очередь предложенных навыков | adminSession | `limit`, `offset` |

## Банк заданий, шаблоны и предпросмотры

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/assessments/previews/{preview_id}` | Восстановить своё пробное прохождение | adminSession | — |
| DELETE | `/api/v1/admin/assessments/previews/{preview_id}` | Удалить своё пробное прохождение | adminSession | — |
| PUT | `/api/v1/admin/assessments/previews/{preview_id}/answers/{question_id}` | Сохранить или заменить ответ предпросмотра | adminSession | — |
| POST | `/api/v1/admin/assessments/previews/{preview_id}/submit` | Завершить своё пробное прохождение | adminSession | — |
| GET | `/api/v1/admin/assessments/questions` | Список заданий банка | adminSession | `skill_id`, `difficulty`, `kind`, `active`, `status`, `limit`, `offset` |
| POST | `/api/v1/admin/assessments/questions` | Создать задание и версию 1 (черновик) | adminSession | — |
| GET | `/api/v1/admin/assessments/questions/{id}` | Задание со всеми версиями | adminSession | — |
| POST | `/api/v1/admin/assessments/questions/{id}/archive` | Выключить задание | adminSession | — |
| POST | `/api/v1/admin/assessments/questions/{id}/versions` | Новая версия задания (черновик) | adminSession | — |
| POST | `/api/v1/admin/assessments/questions/{id}/versions/{version}/publish` | Опубликовать версию задания | adminSession | — |
| GET | `/api/v1/admin/assessments/templates` | Список шаблонов тестов | adminSession | `stack_skill_id`, `specialization_id`, `grade_id`, `status`, `limit`, `offset` |
| POST | `/api/v1/admin/assessments/templates` | Создать шаблон теста (черновик) | adminSession | — |
| GET | `/api/v1/admin/assessments/templates/{id}` | Шаблон с составом | adminSession | — |
| POST | `/api/v1/admin/assessments/templates/{id}/archive` | Архивировать шаблон | adminSession | — |
| POST | `/api/v1/admin/assessments/templates/{id}/publish` | Опубликовать шаблон | adminSession | — |
| POST | `/api/v1/admin/assessments/templates/{template_id}/previews` | Начать серверное пробное прохождение | adminSession | — |

## Операционная админка

| Метод | Путь | Назначение | Авторизация | Query-параметры |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/admin/assessments/attempts` | Попытки тестирования кандидатов | adminSession | `limit`, `offset`, `status`, `candidate_id`, `specialization_id`, `grade_id` |
| GET | `/api/v1/admin/assessments/attempts/{id}` | Метаданные попытки кандидата | adminSession | — |
| GET | `/api/v1/admin/audit-events` | Общий журнал административных действий | adminSession | `limit`, `offset`, `source`, `actor_id`, `entity_type`, `entity_id`, `action`, `from`, `to` |
| GET | `/api/v1/admin/companies` | Список: компании | adminSession | `limit`, `offset`, `status`, `access_status`, `q` |
| GET | `/api/v1/admin/companies/{company_id}` | Карточка: компании | adminSession | — |
| GET | `/api/v1/admin/companies/{company_id}/files` | Документы компании | adminSession | `limit`, `offset` |
| GET | `/api/v1/admin/companies/{company_id}/files/{file_id}/download` | Скачать документ для проверки компании | adminSession | — |
| GET | `/api/v1/admin/companies/{company_id}/members` | Участники компании | adminSession | `limit`, `offset` |
| PATCH | `/api/v1/admin/companies/{company_id}/status` | Заблокировать или разблокировать компанию | adminSession | — |
| PATCH | `/api/v1/admin/companies/{company_id}/verification` | Подтвердить компанию, отклонить заявку или отозвать подтверждение | adminSession | — |
| GET | `/api/v1/admin/needs` | Список: потребности | adminSession | `limit`, `offset`, `status`, `q`, `company_id`, `specialization_id`, `grade_id` |
| GET | `/api/v1/admin/needs/{id}` | Карточка: потребности | adminSession | — |
| PATCH | `/api/v1/admin/needs/{id}/moderation` | Скрыть потребность или снять модерацию | adminSession | — |
| GET | `/api/v1/admin/offers` | Список: приглашения | adminSession | `limit`, `offset`, `status`, `company_id`, `candidate_id` |
| GET | `/api/v1/admin/offers/{id}` | Карточка: приглашения | adminSession | — |
| GET | `/api/v1/admin/stats` | Сводная статистика платформы | adminSession | — |
| GET | `/api/v1/admin/tasks` | Список: ежедневные задания | adminSession | `limit`, `offset`, `status`, `q`, `company_id`, `specialization_id`, `grade_id` |
| GET | `/api/v1/admin/tasks/{id}` | Карточка: ежедневные задания | adminSession | — |
| GET | `/api/v1/admin/tasks/{id}/file` | Скачать файл ежедневного задания | adminSession | — |
| PATCH | `/api/v1/admin/tasks/{id}/moderation` | Скрыть ежедневное задание или восстановить видимость | adminSession | — |
| GET | `/api/v1/admin/users` | Список: пользователей | adminSession | `q`, `limit`, `offset`, `status`, `role` |
| GET | `/api/v1/admin/users/{id}` | Карточка: пользователей | adminSession | — |
| GET | `/api/v1/admin/users/{id}/companies` | Компании пользователя | adminSession | `limit`, `offset` |
| PATCH | `/api/v1/admin/users/{id}/status` | Блокировать или включить пользователя | adminSession | — |

## Документация и внутренние маршруты фронта

Эти пути не входят в приведённые 153 операций OpenAPI:

| Сервис | Метод и путь | Назначение |
| --- | --- | --- |
| Go | `GET /docs`, `GET /docs/` | Redirect и Swagger UI |
| Go | `GET /openapi.yaml` | Встроенная спецификация с issuer текущего окружения |
| Go | `GET /docs/oauth2-redirect.html` | Callback OAuth Swagger |
| Go | `GET /docs/assets/...` | Статические ресурсы Swagger |
| Next.js | `POST /api/auth/session` | Установка cookies веб-сессии после callback |
| Next.js | `POST /api/auth/refresh` | Обновление cookies и возврат access token браузеру |
| Next.js | `GET /api/auth/refresh?next=...` | Обновление сессии и redirect на разрешённый путь |
| Next.js | `POST /api/auth/logout` | Очистка веб-сессии и возврат idTokenHint для выхода Keycloak |
| Next.js | `GET /api/auth/pkce` | PKCE для HTTP-стенда |

Контракт веб-сессии: [документация фронта](../apps/web/docs/api-and-auth.md). OIDC endpoints Keycloak и настройки окружения: [README](../README.md#keycloak-регистрация-и-почта).

## Обновление указателя

При изменении API обновляйте таблицы вместе с `api/openapi.yaml` и синхронизируйте встроенную копию `apps/api/internal/httpapi/docs/openapi.yaml`. Таблицы должны содержать каждую пару HTTP-метод + путь спецификации ровно один раз. Проверка совпадения схем: `sh scripts/check-openapi.sh`.
