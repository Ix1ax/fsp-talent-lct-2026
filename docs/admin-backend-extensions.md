# Админка: блокировка аккаунтов и серверное пробное прохождение

Реализовано по `ADMIN_BACKEND_TODO.md` от фронтенда, 8 октября 2026 года. Это фактический контракт новых методов. Существующие GET/POST `/admins`, банк вопросов, шаблоны и кандидатские попытки сохраняют свои DTO и поведение. Полный контракт — [OpenAPI](../api/openapi.yaml), Swagger — `/docs/`.

## Подключение

Базовый адрес локально: `http://localhost:8080/api/v1/admin`. Во всех запросах, кроме входа, нужен `Authorization: Bearer <admin_access_token>`. Вход — POST `/auth/login` с JSON `{email,password}`. Это отдельная сессия админки, не Keycloak. Сессия действует 8 часов, refresh нет.

JSON-запросы требуют `Content-Type: application/json`. Неизвестные поля запрещены. Лимит тела — 2 МиБ. Админские ответы имеют `Cache-Control: no-store`, ошибки — `{error:{code,message}}`. Диагностика: заголовок ответа `X-Request-ID`. На 401 очистить админскую сессию; на 403 показать запрет доступа.

Секреты и тестовые реквизиты не включаются в этот документ. Начального superadmin настраивает бэкенд через уже существующие `ADMIN_BOOTSTRAP_EMAIL` и `ADMIN_BOOTSTRAP_PASSWORD`.

## 1. Статус администратора

```http
PATCH /api/v1/admin/admins/{admin_id}
Authorization: Bearer <superadmin_access_token>
Content-Type: application/json

{"status":"blocked"}
```

Включение: `{"status":"active"}`. Успех — 200 с тем же AdminAccount, что в списке:

```json
{
  "id":"11111111-1111-4111-8111-111111111111",
  "email":"staff@example.test",
  "role":"admin",
  "status":"blocked",
  "created_at":"2026-10-08T09:00:00Z"
}
```

Правила:

- Только superadmin; обычный admin получает 403 forbidden.
- Изменяется только обычный admin. Собственный аккаунт и любой superadmin защищены от смены статуса. Таким образом отключить последнего superadmin этим API нельзя.
- Поля role, email, password не принимаются. status обязателен, допустимы только active/blocked.
- Блокировка атомарно меняет статус и удаляет **все** сессии целевого аккаунта. Старые токены дают 401. Заблокированный аккаунт не может войти.
- Включение требует нового входа; отозванные токены не восстанавливаются.
- Повтор того же статуса возвращает 200. Повтор blocked также удаляет любые оставшиеся сессии.
- Реальные переходы записываются в `admin_status_events`: actor_id, admin_id, old_status, new_status, created_at. Идемпотентный повтор не создаёт дополнительного перехода. Пароли/токены не записываются.

| HTTP | Код | Условие |
| --- | --- | --- |
| 400 | validation_error | UUID, статус, JSON или неизвестное поле |
| 401 | unauthorized | Недействующая сессия |
| 403 | forbidden | Требуется superadmin |
| 404 | admin_not_found | Аккаунт не найден |
| 409 | admin_status_change_forbidden | Собственный аккаунт или superadmin |
| 413 | request_too_large | Размер JSON |
| 500 | internal_error | Ошибка сервера |
| 503 | admin_unavailable | Админка не настроена |

После успеха обновить список `/admins`. Скрыть кнопки статуса у superadmin. В UI объяснить, что при blocked завершаются все его сессии.

## 2. Серверный предпросмотр теста

Доступ: admin и superadmin. Предпросмотр принадлежит создавшему его аккаунту, поэтому после нового входа этого же аккаунта его можно восстановить по ID. Logout/блокировка прекращают доступ по прежнему токену.

| Метод | Путь относительно `/api/v1/admin` | Успех |
| --- | --- | --- |
| POST | `/assessments/templates/{template_id}/previews` | 201 Preview; Location |
| GET | `/assessments/previews/{preview_id}` | 200 Preview |
| PUT | `/assessments/previews/{preview_id}/answers/{question_id}` | 204 без тела |
| POST | `/assessments/previews/{preview_id}/submit` | 200 Preview с результатом |
| DELETE | `/assessments/previews/{preview_id}` | 204 без тела |

Start и submit выполняются без тела. `template_id` задаёт конкретный UUID версии шаблона. Разрешены draft/published, archived — 409 assessment_conflict. Старый шаблон без основного навыка — 400 validation_error.

### Запуск и безопасные повторы

Перед запуском создайте `crypto.randomUUID()` и передайте его в `Idempotency-Key`. Повторяйте **тот же** ключ и template_id после сетевой ошибки. Сервер вернёт тот же preview с 201; повтор не меняет таймер, снимки и порядок. После завершения повтор этого ключа также возвращает сохранённый результат. Ключ другого шаблона — 409 idempotency_conflict.

Ключ необязателен, но без него каждый POST создаёт новый preview. Допускаются 1–128 печатных ASCII-символов без пробелов. Уникальность — в пределах аккаунта. CORS уже разрешает Idempotency-Key. Ключ действует до retain_until либо удаления preview; после этого его можно использовать заново. Для нового самостоятельного прохождения используйте новый ключ.

Не более 3 одновременно активных и непросроченных preview на администратора. Превышение — 409 preview_limit. Повтор существующего Idempotency-Key работает и при достигнутом лимите.

### DTO

```ts
type PreviewStatus = 'in_progress' | 'submitted' | 'expired';
interface PreviewAnswer {
  selected?: string[];
  text?: string;
}
interface PreviewQuestion {
  id: string;           // ID вопроса внутри preview: используется в PUT
  question_id: string;  // ID исходного вопроса банка
  position: number;
  version: number;      // Зафиксированная версия вопроса
  skill_id: string;
  skill_name: string;
  difficulty: number;
  weight: number;       // Баллы одного вопроса, не вес целой строки blueprint
  kind: 'choice' | 'code_reading' | 'short_answer';
  prompt: {
    text: string;
    code?: string;
    language?: string;
    options?: {id: string; text: string}[];
  };
  answer_form: {type: 'choice' | 'text'; multiple: boolean};
  answer: PreviewAnswer | null;
}
interface PreviewResult {
  score_percent: number;
  pass_score: number;
  passed: boolean;
  correct_count: number;
  unanswered_count: number;
  question_count: number;
  skills: {skill_id: string; percent: number}[];
  questions: {
    id: string;          // ID из PreviewQuestion
    correct: boolean;
    answered: boolean;
    correct_answer: {
      type: 'choice' | 'text';
      correct?: string[];
      multiple?: boolean;
      accepted?: string[];
      case_sensitive?: boolean;
    };
  }[];
}
interface Preview {
  id: string;
  template_id: string;
  template_version: number;
  status: PreviewStatus;
  started_at: string;
  expires_at: string;
  server_time: string;
  finished_at: string | null;
  retain_until: string;
  time_limit_sec: number;
  pass_score: number;
  questions: PreviewQuestion[];
  result: PreviewResult | null;
}
```

В активном preview `result=null`. `grading_spec`, правильные ID и accepted не выдаются. Форма ответа определяется через answer_form, а не только kind: code_reading бывает choice и text. false-поля правильного ответа могут отсутствовать: трактуйте отсутствующие multiple/case_sensitive как false.

Пример ответа старта (условные IDs):

```json
{
  "id":"11111111-1111-4111-8111-111111111111",
  "template_id":"22222222-2222-4222-8222-222222222222",
  "template_version":2,
  "status":"in_progress",
  "started_at":"2026-10-08T09:00:00Z",
  "expires_at":"2026-10-08T09:30:00Z",
  "server_time":"2026-10-08T09:00:00Z",
  "finished_at":null,
  "retain_until":"2026-10-15T09:00:00Z",
  "time_limit_sec":1800,
  "pass_score":70,
  "questions":[{
    "id":"33333333-3333-4333-8333-333333333333",
    "question_id":"44444444-4444-4444-8444-444444444444",
    "position":1,"version":1,
    "skill_id":"00000000-0000-4000-8000-000000000001",
    "skill_name":"Go","difficulty":1,"weight":1,
    "kind":"short_answer",
    "prompt":{"text":"Какая команда показывает статус репозитория?"},
    "answer_form":{"type":"text","multiple":false},
    "answer":null
  }],
  "result":null
}
```

### Сохранение и восстановление

В URL PUT используйте `PreviewQuestion.id`. Тело — ровно тот же формат, что у кандидата:

```json
{"selected":["a"]}
```

или:

```json
{"text":"git status"}
```

Choice: непустой набор известных ID без дублей; при multiple=false ровно один. Text: непустой текст до 500 Unicode-символов без NUL. Неподходящая форма — 400. Для смены ответа повторяется PUT; ответ заменяется, успех 204 без JSON. Очистка ответа до «не отвечено» отдельным API не реализована; можно пропустить вопрос, не сохраняя ответ.

GET возвращает все вопросы в первоначальном порядке с текущими сохранёнными answer. Не создавайте новый preview при перезагрузке страницы: сохраняйте preview ID и восстанавливайте GET. Другой администратор получает 404 preview_not_found на GET/PUT/submit; его данные не раскрываются.

### Таймер

Таймер контролируется PostgreSQL. Фронт может вычислить смещение часов из server_time и отображать `(expires_at - server_time)` с учётом прошедшего времени. Клиентский обратный отсчёт не даёт права продлить прохождение.

На первом GET/PUT/submit после дедлайна сервер оценивает уже сохранённые ответы, фиксирует `status=expired`, `finished_at=expires_at` и результат. Новый PUT после дедлайна не принимается: 409 preview_expired. GET и submit возвращают 200 с expired и результатом. Непросроченный submit ставит submitted. Повтор submit возвращает прежний результат; server_time при чтении меняется, результат и finished_at — нет.

`expired` описывает завершение по времени. `result.passed` независимо может быть true, если сохранённых правильных ответов хватило: это тот же расчёт порога, что у кандидата. После submitted PUT получает 409 preview_closed.

### Точный расчёт оценки

Используются общие функции кандидата: `QuestionPoints`, `ValidateAnswer`, `GradeAnswer`, `Score`, `SkillScore.Percent`. Общим является и отбор вопросов.

1. Для каждой строки blueprint берутся случайные активные вопросы указанного навыка/сложности с опубликованной версией. Навык должен быть active и approved. Выбор внутри каждой строки случайный; строки обходятся по skill_id/difficulty, как у кандидата.
2. Стоимость вопроса = `blueprint.weight / blueprint.question_count`. Она фиксируется в `numeric(10,4)`, как в кандидатских attempt_questions. Например, 1/3 сохраняется как 0.3333.
3. Choice засчитывается только при точном совпадении множества selected с correct. Порядок не важен. Частичных баллов нет.
4. Text сравнивается с любым accepted. Пробелы по краям удаляются, последовательности whitespace заменяются одним пробелом. При case_sensitive=false строки приводятся к нижнему регистру. Нет regex, приблизительного совпадения или исполнения кода.
5. Пропущенный или неверный ответ даёт 0, правильный — полную стоимость.
6. `score_percent = round(earned / possible * 100, 2)`. По каждому навыку процент вычисляется так же. Округление — Go `math.Round` до сотых.
7. `passed=true` только если общий процент **и** процент основного навыка stack_skill_id не ниже pass_score. Большой результат по дополнительным навыкам не компенсирует провал стека.

Пример результата для трёх равных вопросов, двух правильных и одного пропущенного:

```json
{
  "score_percent":66.67,
  "pass_score":70,
  "passed":false,
  "correct_count":2,
  "unanswered_count":1,
  "question_count":3,
  "skills":[{"skill_id":"00000000-0000-4000-8000-000000000001","percent":66.67}],
  "questions":[
    {"id":"33333333-3333-4333-8333-333333333333","correct":true,"answered":true,
     "correct_answer":{"type":"text","accepted":["git status"]}}
  ]
}
```

В примере разбор сокращён до одного вопроса; реальный questions содержит каждый вопрос. После завершения Preview.questions остаётся доступным, поэтому разбор связывается по id и показывает prompt, answer и correct_answer.

### Нехватка банка

Start возвращает 409 с **верхнеуровневым** shortages:

```json
{
  "error":{"code":"insufficient_questions","message":"В банке не хватает опубликованных заданий для состава шаблона"},
  "shortages":[{
    "skill_id":"00000000-0000-4000-8000-000000000001",
    "difficulty":1,
    "required":5,
    "available":3
  }]
}
```

Отображайте дефицит у соответствующей строки состава. Частичный preview не создаётся, Idempotency-Key не расходуется. Публикация шаблона для пробного запуска не требуется: можно проверить draft, если опубликованных вопросов хватает.

### Изоляция, срок хранения и удаление

Снимки и ответы хранятся в отдельных `assessment_previews` и `assessment_preview_questions`. Не создаются assessment_attempts, grade_history, candidate_categories, skill_evidence, candidate_skills или кандидатские лимиты. Существующие подбор и статистика не читают эти таблицы.

Состояние банка после старта не влияет на вопросы, названия навыков, правильные ответы, веса и порядок preview. Запущенный draft сохраняет тот же template_version при последующем изменении/публикации шаблона.

Срок хранения — **7 дней от started_at**, не от submit. После retain_until объект недоступен. Просроченное хранение очищается лениво при запуске/чтении/удалении preview, до 100 старых объектов за запрос; при отсутствии запросов физическое удаление произойдёт при следующем обращении. Каскадно удаляются снимки и ответы. Новых переменных окружения нет.

DELETE отменяет и физически удаляет preview в любом состоянии. Повтор, отсутствующий или чужой UUID — 204; чужой preview при этом не меняется. Статус cancelled не хранится и не возвращается, поскольку следующий GET должен дать 404.

### Ошибки предпросмотра

| HTTP | Код | Условие / действие |
| --- | --- | --- |
| 400 | validation_error | UUID, Idempotency-Key или форма ответа |
| 401 | unauthorized | Logout, блокировка или истечение админской сессии |
| 403 | forbidden | Аккаунт уже не имеет прав при проверке операции в БД |
| 404 | assessment_not_found | Шаблон не найден |
| 404 | preview_not_found | Чужой/отсутствующий/удалённый/старый preview или чужой вопрос |
| 409 | assessment_conflict | Архивный шаблон |
| 409 | insufficient_questions | Недостаточный банк; есть shortages |
| 409 | preview_limit | Уже 3 активных непросроченных preview |
| 409 | idempotency_conflict | Ключ закреплён за другим template_id |
| 409 | preview_expired | PUT после дедлайна; перечитать GET |
| 409 | preview_closed | PUT после submit; перечитать GET |
| 413 | request_too_large | Размер JSON |
| 500 | internal_error | Ошибка сервера |
| 503 | admin_unavailable / assessments_unavailable / previews_unavailable | Сервис не настроен |

## 3. Как заменить временный loadTemplatePreview

1. На кнопке предпросмотра создать ключ и отправить POST конкретного template_id.
2. Сохранить preview ID, вывести Preview.questions. Не загружать для прохождения grading_spec из банка.
3. Выбирать контрол ввода через answer_form и сохранять PUT; ждать 204 перед отметкой «Сохранено».
4. При перезагрузке восстановить GET, синхронизировать таймер с server_time.
5. На завершении отправить submit и показывать серверный result с разбором; локальная оценка больше не нужна.
6. На preview_expired/preview_closed перечитать GET. После отмены DELETE очистить локальное состояние.
7. После сетевой ошибки старта повторить тот же Idempotency-Key. После сетевой ошибки сохранения/submit безопасно повторить тот же запрос.

## 4. Запуск, миграции и проверка

Из корня проекта:

```sh
make setup                  # При первой настройке; реальные секреты хранить только в .env
make infra
make migrate                # Применить обе новые миграции до запуска нового API
make api
```

Новые миграции добавочные:

1. `20261008120000_admin_status_events.sql` — журнал смены статуса.
2. `20261008121000_admin_assessment_previews.sql` — отдельные preview и снимки вопросов.

Порядок развёртывания: применить миграции → новый API → подключить новые фронтовые действия. Старый API и фронт продолжают работать после этих миграций. До применения миграций новые операции использовать нельзя. Откат preview-миграции удаляет только административные пробные прохождения; откат аудита удаляет журнал новых действий, но не аккаунты и не кандидатские результаты. Не откатывайте миграции при работающем новом API.

Проверки:

```sh
make check
make integration
```

Адрес БД берётся из локального `apps/api/.env`; интеграционные тесты создают изолированные временные схемы, применяют миграции с нуля и проверяют откат/повторное применение последней. Новые сценарии: `admin_status_integration_test.go`, `assessment_previews_integration_test.go`. Включены реальное совпадение оценки preview и кандидатской попытки, конкурентный запуск с одним ключом и отсутствие боевых записей после административного прохождения.

Необязательное добавление total к старым админским спискам не входит в эту доработку: их формат items/limit/offset сохраняется.
