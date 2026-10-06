# Профиль кандидата: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Кандидат создаёт и ведёт публичную часть профиля и свой аватар через `/api/v1/me/profile`.

**Architecture:** Новый модуль `internal/candidate/{entity,service,repository,web}` по образцу `internal/company`. Права проверяются в SQL и сервисе, роль и локальный ID берутся из `middleware.CurrentUser`/`RequireRole`. Аватар использует таблицу `files`, `files.Prepare` и `files.Objects` (приватный S3) с тем же жизненным циклом `pending → ready → deleting → deleted`, что у файлов компаний.

**Tech Stack:** Go 1.26, Gin, pgx/v5 (pgxpool), goose, AWS SDK v2 (S3), `internal/catalog` для справочников.

**Spec:** `docs/superpowers/specs/2026-10-06-candidate-profile-design.md`

## Global Constraints

- Модуль Go: `github.com/ix1ax/lct-fsp-hackaton-2026/apps/api`; импорты как в соседнем коде. Ветка: `backend/feature/candidate-profile`.
- Ошибки только в формате `{"error":{"code","message"}}`, `message` на русском. Комментарии на русском.
- Роль и ID пользователя берём из `middleware.UserFrom` (локальная БД), не из тела запроса и не `sub` из JWT.
- Тело JSON читается через `request.JSON` (нужен `Content-Type: application/json`, неизвестные поля отвергаются).
- Миграция с временной меткой (`date +%Y%m%d%H%M%S`, позже `20261006075710`); `Down` обязан работать; влитые миграции не менять.
- `search_status` по умолчанию `hidden`; `avatar_file_id` и `published_at`: колонка `avatar_file_id` добавляется, `published_at` — нет.
- Аватар: только JPEG/PNG по содержимому, до 2 МиБ, до 4 мегапикселей; ключ в S3 с префиксом `candidates/`; видит только владелец.
- Контракт: `api/openapi.yaml` и его копия `apps/api/internal/httpapi/docs/openapi.yaml` должны совпадать (`scripts/check-openapi.sh`).
- Коммиты: сообщения на русском, **без** `Co-Authored-By`; хук pre-commit ломается без рабочего pnpm, поэтому коммитить `git commit --no-verify` (разрешено пользователем).
- Не отправлять ветку на GitHub и не открывать PR без явной команды пользователя.

## Review Focus

Входы, которые спецификация подразумевает, но ни одна задача не проверяет «по умолчанию»; тест каждого добавлен в задачу-владельца:

1. Два одновременных `POST /me/profile` одного кандидата: ровно один 201, остальные 409, не 500 (Task 4).
2. Два одновременных PATCH разных полей не затирают друг друга (Task 4).
3. Массовое присвоение: PATCH/POST с полями `user_id`, `id`, `avatar_file_id`, `updated_at` отвергается 400 (Task 2).
4. Файл `a.png` с текстом внутри, PNG свыше 4 мегапикселей, пустой файл, файл больше лимита не принимаются как аватар (Task 3).
5. Профиль и аватар недоступны другому кандидату и заблокированному пользователю (Tasks 4, 6, 7).

---

### Task 1: Миграция профиля кандидата

**Files:**
- Create: `apps/api/migrations/<timestamp>_candidate_profiles.sql`
- Test: `apps/api/internal/httpapi/candidate_integration_test.go` (build tag `integration`)

**Interfaces:**
- Produces: таблицы `candidate_profiles(id, user_id UNIQUE, avatar_file_id, headline, summary, city, timezone, experience_months, salary_min_rub, search_status, updated_at)` и `candidate_work_formats(candidate_id, work_format_id)` по таблице данных из спецификации.

- [ ] **Step 1: Write the failing test** `TestCandidateSchemaConstraints` через `companyTestDB(t)` (он уже делает Up→Down→Up самой новой миграции и пропускается без `TEST_DATABASE_URL`). Утверждения: второй профиль того же `user_id` → код `23505`; `experience_months=601`, `salary_min_rub=-1`, `search_status='public'` → `23514`; формат работы с неизвестным ID → `23503`; удаление пользователя каскадно удаляет профиль и его форматы; `search_status` по умолчанию `hidden`, `experience_months` по умолчанию 0.
- [ ] **Step 2: Run** `cd apps/api && TEST_DATABASE_URL=… go test -race -tags=integration ./internal/httpapi -run TestCandidateSchemaConstraints -v`. Expected: FAIL (таблицы нет).
- [ ] **Step 3: Create the migration** по образцу `20261006075710_employer_needs.sql`: `candidate_profiles` с `CHECK` по длинам и диапазонам из спецификации и `avatar_file_id uuid REFERENCES files(id)`; `candidate_work_formats` с PK `(candidate_id, work_format_id)` и `ON DELETE CASCADE` на профиль; `Down` удаляет сначала `candidate_work_formats`, потом `candidate_profiles`.
- [ ] **Step 4: Run** тот же тест. Expected: PASS (включая Down/Up, который делает helper).
- [ ] **Step 5: Commit** `git add apps/api/migrations apps/api/internal/httpapi/candidate_integration_test.go && git commit --no-verify -m "feat: миграция профиля кандидата"`.

### Task 2: Модель профиля и валидация

**Files:**
- Create: `apps/api/internal/candidate/entity/profile.go`, `errors.go`
- Test: `apps/api/internal/candidate/entity/profile_test.go`

**Interfaces:**
- Produces:
  - `type ProfileInput struct { Headline, Summary, City, Timezone *string; ExperienceMonths int; SalaryMinRUB *int64; SearchStatus string; WorkFormatIDs []int16 }` с JSON-тегами `headline, summary, city, timezone, experience_months, salary_min_rub, search_status, work_format_ids`.
  - `type Profile struct { ID string; AvatarFileID *string; ProfileInput; UpdatedAt time.Time }` (теги `id`, `avatar_file_id`, `updated_at`; встроенный `ProfileInput` разворачивается в JSON).
  - `func (in *ProfileInput) Normalize() error`; `type Patch map[string]json.RawMessage`; `func (p Patch) Apply(current Profile) (ProfileInput, error)`.
  - Ошибки: `ErrNotFound`, `ErrAvatarNotFound`, `ErrForbidden`, `ErrConflict`, `type ValidationError struct{ Message string }`, `func invalid(string) error`.

- [ ] **Step 1: Write failing tests.** `TestProfileInputNormalize` (таблица): пустой ввод → `SearchStatus=="hidden"`, `ExperienceMonths==0`, `WorkFormatIDs` непустой срез нулевой длины (не `nil`); `" "` в `headline` → `nil`; ошибки для: headline 201 символ, summary 10001, city 201, timezone `Local` и `Mars/Base`, `Europe/Moscow` допустим; `experience_months` −1 и 601; `salary_min_rub` −1 и 1 000 000 001; `search_status:"public"`; символ `\x00` в любом тексте; `work_format_ids` с дублем, нулём, 11 элементами. `TestPatchApply`: отсутствие поля сохраняет значение; `null` очищает headline/summary/city/timezone/salary_min_rub; `null` для `experience_months` и `search_status` → ошибка; поля `user_id`, `id`, `avatar_file_id`, `updated_at` → ошибка «Неизвестное или недоступное для изменения поле»; пустой PATCH → ошибка; `work_format_ids:[]` очищает, `[2,3]` заменяет.
- [ ] **Step 2: Run** `cd apps/api && go test ./internal/candidate/entity -v`. Expected: FAIL (пакета нет).
- [ ] **Step 3: Implement** по образцу `internal/company/entity/need.go` и `profile.go` (`Patch.Apply` через `json.Unmarshal` в указатели на поля, `time.LoadLocation` + `_ "time/tzdata"`, диапазоны и длины из спецификации).
- [ ] **Step 4: Run** тот же тест. Expected: PASS.
- [ ] **Step 5: Commit** `git commit --no-verify -m "feat: модель и валидация профиля кандидата"`.

### Task 3: Цель файла `candidate_avatar`

**Files:**
- Modify: `apps/api/internal/files/files.go` (`Prepare`, константы, текст `ErrType`)
- Test: `apps/api/internal/files/files_test.go`

**Interfaces:**
- Produces: `const PurposeCandidateAvatar = "candidate_avatar"`; `Prepare(name, purpose string, data []byte)` принимает эту цель с правилами логотипа (JPEG/PNG, `MaxLogoSize`, до 4 Мп) и ключом `candidates/<hex>`.

- [ ] **Step 1: Write failing test** `TestPrepareCandidateAvatar`: PNG 1×1 → `Purpose=="candidate_avatar"`, `MediaType=="image/png"`, ключ с префиксом `candidates/`, `Status=="pending"`; JPEG принимается; PDF → `ErrType`; файл `a.png` с содержимым-текстом → `ErrType`; `2<<20+1` нулевых байт → `ErrSize`; пустой → `ErrInvalid`; PNG 2001×2001 → `ErrInvalid`. Существующие тесты для `company_*` остаются зелёными.
- [ ] **Step 2: Run** `cd apps/api && go test ./internal/files -run TestPrepareCandidateAvatar -v`. Expected: FAIL.
- [ ] **Step 3: Modify `Prepare`:** допустимые цели расширяются; «только изображения и лимит 2 МиБ» применяется к `company_logo` и `candidate_avatar`; префикс ключа выбирается по цели; текст `ErrType` дополнить словом «аватара». Если какой-то существующий тест проверяет старый текст ошибки, поправить его.
- [ ] **Step 4: Run** `go test ./internal/files -v`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit --no-verify -m "feat: цель файла candidate_avatar"`.

### Task 4: Репозиторий и сервис профиля

**Files:**
- Create: `apps/api/internal/candidate/repository/repository.go`, `profile.go`; `apps/api/internal/candidate/service/profile.go`
- Test: `apps/api/internal/candidate/service/profile_test.go`; `apps/api/internal/httpapi/candidate_repository_integration_test.go` (тег `integration`, использует `companyTestDB`)

**Interfaces:**
- Consumes: `entity.ProfileInput`, `entity.Profile`, `entity.Patch`, ошибки из Task 2.
- Produces:
  - `type Repository struct{ db *pgxpool.Pool }`, `func NewRepository(db *pgxpool.Pool) *Repository`.
  - `type ProfileStore interface { Create(ctx, userID string, in entity.ProfileInput) (entity.Profile, error); Get(ctx, userID string) (entity.Profile, error); Update(ctx, userID string, patch entity.Patch) (entity.Profile, error) }` (контекст — первым аргументом; `Repository` его реализует).
  - `type ProfileService struct{...}`, `func NewProfileService(store ProfileStore) *ProfileService` с методами `Create(ctx, userID, in)`, `Get(ctx, userID)`, `Update(ctx, userID, patch)`.

- [ ] **Step 1: Write failing tests.** Сервис (юнит, поддельное хранилище): `Create` вызывает `Normalize` до хранилища (ввод с `search_status:"public"` не доходит до хранилища); `Get` и `Update` пробрасывают результат и ошибки хранилища без изменений. Репозиторий (интеграция) `TestCandidateRepositoryProfile`: Create → Get возвращает то же, `search_status` `hidden`, `work_format_ids` непустой срез; повторный Create → `ErrConflict`; пользователь с ролью `employer` и со статусом `blocked` → `ErrForbidden`; неизвестный `work_format_id` → `*entity.ValidationError`; Get несуществующего → `ErrNotFound`; Update частично меняет поля, `work_format_ids` заменяется целиком, Update без профиля → `ErrNotFound`; 20 параллельных Create одного пользователя → ровно один `nil`, остальные `ErrConflict`; два параллельных Update (headline и city) → оба значения сохранены.
- [ ] **Step 2: Run** юнит-тесты сервиса и интеграционный тест. Expected: FAIL (нет пакетов).
- [ ] **Step 3: Implement.** Репозиторий повторяет приёмы `internal/company/repository`: Create в транзакции с `SELECT true FROM users WHERE id=$1 AND role='candidate' AND status='active' FOR SHARE` (иначе `ErrForbidden`), вставка профиля и форматов; `23505` на `candidate_profiles_user_id_key` → `ErrConflict`, `23503` на форматах → `ValidationError{"Неизвестный формат работы"}`; Update: `SELECT … FOR UPDATE` профиля, `patch.Apply(current)`, запись и пересоздание форматов в той же транзакции, обновление `updated_at`. Сервис: тонкая обёртка, `Create` вызывает `in.Normalize()`.
- [ ] **Step 4: Run** те же тесты. Expected: PASS.
- [ ] **Step 5: Commit** `git commit --no-verify -m "feat: репозиторий и сервис профиля кандидата"`.

### Task 5: HTTP-методы профиля

**Files:**
- Create: `apps/api/internal/candidate/web/routes.go`, `profile.go`, `errors.go`
- Modify: `apps/api/internal/httpapi/router.go` (поля `Options`, вызов `Register`), `apps/api/cmd/api/main.go`
- Test: `apps/api/internal/httpapi/candidate_test.go` (без тега; поддельное хранилище)

**Interfaces:**
- Consumes: `service.ProfileService`, `middleware.CurrentUser/RequireRole/UserFrom`, `request.JSON`.
- Produces: `candidateweb.Options{ Users *user.Service; Profiles *service.ProfileService }`; `candidateweb.Register(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, opts Options)`; в `httpapi.Options` поле `Candidates *candidateservice.ProfileService` (импорт сервиса кандидата с алиасом, чтобы не конфликтовать с `company/service`).

- [ ] **Step 1: Write failing test** `TestCandidateProfileRoutes` через `newAuthEnvWithOptions`, роли и пользователей кладём в `e.store.users`. Утверждения: без токена 401; роль `employer` → 403 `forbidden`; `blocked` → 403 `user_inactive`; POST с `{` → 400 `validation_error`; POST с полем `user_id` или `avatar_file_id` → 400; POST `{}` → 201, заголовок `Location: /api/v1/me/profile`, `search_status:"hidden"`; второй POST → 409 `profile_exists`; GET → 200 с тем же `id`; GET другого кандидата без профиля → 404 `profile_not_found`; PATCH `{"headline":null}` очищает; PATCH `{}` → 400; `Content-Type` не JSON → 400; сервис не передан (`nil`) → 503 `candidate_unavailable`.
- [ ] **Step 2: Run** `cd apps/api && go test ./internal/httpapi -run TestCandidateProfileRoutes -v`. Expected: FAIL.
- [ ] **Step 3: Implement** группу `api.Group("/me/profile", auth.Middleware(verifier), middleware.CurrentUser(log, opts.Users), middleware.RequireRole(user.RoleCandidate))` с проверкой `nil`-сервиса, обработчики `create` (201 + `Location`), `get`, `update` и `fail(c, err)` (`ValidationError`/`request.ValidationError` → 400 `validation_error`, `ErrNotFound` → 404 `profile_not_found`, `ErrAvatarNotFound` → 404 `avatar_not_found`, `ErrForbidden` → 403 `forbidden`, `ErrConflict` → 409 `profile_exists`, `files`/хранилище — как в Task 7, прочее → 500 `internal_error` с логом). Подключить `candidateweb.Register` в `router.go` рядом с `companyweb.Register`; в `main.go` создать `candidaterepo := candidaterepository.NewRepository(deps.DB)` и передать `Candidates: candidateservice.NewProfileService(candidaterepo)`.
- [ ] **Step 4: Run** тест и `go build ./...`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit --no-verify -m "feat: методы профиля кандидата"`.

### Task 6: Сервис и репозиторий аватара

**Files:**
- Create: `apps/api/internal/candidate/repository/avatar.go`, `apps/api/internal/candidate/service/avatar.go`
- Test: `apps/api/internal/httpapi/candidate_avatar_integration_test.go` (тег `integration`; S3 и `faultyObjects` как в `companies_integration_test.go`)

**Interfaces:**
- Consumes: `files.Prepare`, `files.Objects`, `files.File`, `entity.Profile`.
- Produces:
  - `type AvatarStore interface { ReserveAvatar(ctx, userID string, f files.File) (files.File, error); CompleteAvatar(ctx, userID, fileID string) (replaced *files.File, p entity.Profile, err error); Avatar(ctx, userID string) (files.File, error); DetachAvatar(ctx, userID string) (files.File, error); DiscardFile(ctx, fileID string) error; FinishDelete(ctx, fileID string) error }` (`Repository` реализует; все методы, кроме `DiscardFile` и `FinishDelete`, проверяют в SQL роль `candidate`, статус `active` и наличие профиля).
  - `var ErrStorage = errors.New("хранилище файлов временно недоступно")`.
  - `func NewAvatarService(store AvatarStore, objects files.Objects, bucket string, log *slog.Logger) *AvatarService` с методами `Upload(ctx, userID, name string, data []byte) (entity.Profile, error)`, `Download(ctx, userID string) (files.File, io.ReadCloser, error)`, `Delete(ctx, userID string) error`.

- [ ] **Step 1: Write failing test** `TestCandidateAvatarService` (пропускается без `TEST_DATABASE_URL`, требует `TEST_S3_*`): загрузка PNG → `AvatarFileID` задан, строка `files` со статусом `ready`, целью `candidate_avatar`, владельцем-кандидатом, `visibility='private'`; замена → старая строка `deleted`, старого объекта в S3 нет, `AvatarFileID` указывает на новый; `failPut` → профиль не изменён, новая строка `deleted`; `failDelete` старого при замене → старая строка остаётся `deleting`, профиль уже указывает на новый; `Download` возвращает те же байты; `Download` и `Delete` другого кандидата → `ErrNotFound`/`ErrAvatarNotFound`, у заблокированного → `ErrForbidden`; `Upload` без профиля → `ErrNotFound` и нет строки в `files`; `Delete` → `AvatarFileID` пуст, строка `deleted`, повторный `Delete` → `ErrAvatarNotFound`.
- [ ] **Step 2: Run** `cd apps/api && TEST_DATABASE_URL=… TEST_S3_ENDPOINT=… TEST_S3_BUCKET=… TEST_S3_ACCESS_KEY=… TEST_S3_SECRET_KEY=… go test -race -tags=integration ./internal/httpapi -run TestCandidateAvatarService -v`. Expected: FAIL.
- [ ] **Step 3: Implement.** Репозиторий по образцу `internal/company/repository/documents.go`: `ReserveAvatar` вставляет строку в `files` (`owner_user_id`, `visibility` по умолчанию) после проверки профиля; `CompleteAvatar` в одной транзакции переводит новую запись `pending→ready`, читает прежний `avatar_file_id` `FOR UPDATE`, ставит `avatar_file_id=новый`, прежнюю запись `ready→deleting` и возвращает её; `Avatar` отдаёт файл только в статусе `ready`; `DetachAvatar` обнуляет колонку и ставит `deleting`. Сервис: `Prepare` → `ReserveAvatar` → `objects.Put` → `CompleteAvatar` → удаление прежнего объекта и `FinishDelete` (ошибка только логируется); при сбое после `ReserveAvatar` — `DiscardFile`, удаление объекта, `FinishDelete` в контексте с таймаутом 10 с; ошибки S3 оборачиваются в `ErrStorage`.
- [ ] **Step 4: Run** тот же тест. Expected: PASS.
- [ ] **Step 5: Commit** `git commit --no-verify -m "feat: сервис и репозиторий аватара кандидата"`.

### Task 7: HTTP-методы аватара

**Files:**
- Create: `apps/api/internal/candidate/web/avatar.go`
- Modify: `apps/api/internal/candidate/web/routes.go`, `apps/api/internal/candidate/web/errors.go`, `apps/api/internal/httpapi/router.go` (лимит тела), `apps/api/cmd/api/main.go`
- Test: `apps/api/internal/httpapi/candidate_avatar_test.go` (без тега; поддельные `AvatarStore` и `files.Objects` в памяти)

**Interfaces:**
- Consumes: `service.AvatarService`, `files.MaxLogoSize`.
- Produces: поле `Avatars *service.AvatarService` в `candidateweb.Options` и `Avatars *candidateservice.AvatarService` в `httpapi.Options`; маршруты `PUT|GET|DELETE /api/v1/me/profile/avatar`; в `main.go` `Avatars: candidateservice.NewAvatarService(candidaterepo, files.NewS3(deps.Objects), deps.Bucket, log)`.

- [ ] **Step 1: Write failing test** `TestCandidateAvatarRoutes`: PUT без файла → 400 `invalid_file`; PUT с PNG (поле `file`) → 200, в ответе `avatar_file_id`; GET → 200, `Content-Type: image/png`, `Cache-Control: private, no-store`, те же байты; GET без аватара → 404 `avatar_not_found`; PUT файла `a.png` с текстом → 415 `unsupported_file_type`; PUT тела больше `MaxLogoSize + 64 КиБ` → 413 `file_too_large`; DELETE → 204, затем GET → 404; роль `employer` на любом из трёх → 403; PUT без профиля → 404 `profile_not_found`; сервис `nil` → 503 `avatar_unavailable`.
- [ ] **Step 2: Run** `go test ./internal/httpapi -run TestCandidateAvatarRoutes -v`. Expected: FAIL.
- [ ] **Step 3: Implement** обработчики по образцу `upload`/`download` из `internal/company/web/documents.go`: семафор на 2 одновременные загрузки (`503 upload_busy` с `Retry-After`), таймаут 45 с, `ParseMultipartForm(1<<20)`, ровно один файл `file` и никаких полей, чтение с `LimitReader(MaxLogoSize+1)`; GET отдаёт `Content-Disposition: inline`. В `router.go` для `PUT /api/v1/me/profile/avatar` лимит тела `files.MaxLogoSize + 64<<10` (рядом с существующей веткой для файлов компаний); `fail` дополнить кодами `file_too_large` (413), `unsupported_file_type` (415), `invalid_file` (400), `storage_unavailable` (503).
- [ ] **Step 4: Run** тест, `go build ./...`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit --no-verify -m "feat: методы аватара кандидата"`.

### Task 8: OpenAPI

**Files:**
- Modify: `api/openapi.yaml`, `apps/api/internal/httpapi/docs/openapi.yaml`

**Interfaces:**
- Consumes: ответы и коды ошибок из Tasks 5 и 7.
- Produces: описание шести методов и схем `CandidateProfile`, `CandidateProfileInput`, `CandidateProfilePatch` в стиле существующих компонентов.

- [ ] **Step 1: Write the failing check:** `sh scripts/check-openapi.sh` сейчас зелёный, поэтому сначала изменить только `api/openapi.yaml` и убедиться, что скрипт падает (копии расходятся).
- [ ] **Step 2: Describe** методы `POST|GET|PATCH /api/v1/me/profile` и `PUT|GET|DELETE /api/v1/me/profile/avatar` (security `bearerAuth` и `keycloakOAuth`, коды ответов из спецификации, `multipart/form-data` с полем `file`, ответ GET — `image/png` и `image/jpeg`), enum `search_status`, диапазоны и длины из спецификации.
- [ ] **Step 3: Copy** `cp api/openapi.yaml apps/api/internal/httpapi/docs/openapi.yaml`.
- [ ] **Step 4: Run** `sh scripts/check-openapi.sh && python3 -c "import yaml;yaml.safe_load(open('api/openapi.yaml'))"`. Expected: без ошибок.
- [ ] **Step 5: Commit** `git commit --no-verify -m "docs: OpenAPI профиля кандидата"`.

### Task 9: Итоговая проверка

**Files:** (изменения только при найденных ошибках)

- [ ] **Step 1: Run** `make check`. Expected: код 0 (при устаревшей папке `apps/web/dist` сначала удалить её).
- [ ] **Step 2: Run** все интеграционные тесты `go test -race -count=1 -tags=integration ./internal/httpapi ./internal/platform ./internal/user` с `TEST_DATABASE_URL` (контейнерный Postgres, порт 5433) и `TEST_S3_*` (S3 на `localhost:8333`, ключи из `.env`). Expected: PASS, в БД не остаётся тестовых данных.
- [ ] **Step 3: Run вручную на локальном стеке** (`docker compose … --profile app up -d --build`, затем `make auth-smoke`): с токеном тестового пользователя `POST /api/v1/me/profile`, `GET`, `PATCH` с `null`, `PUT` аватара через `curl -F file=@…`, `GET` аватара (сравнить байты), `DELETE`. Expected: коды как в спецификации.
- [ ] **Step 4: Проверить** `git status` и `git log main..HEAD`: нет лишних файлов, нет `Co-Authored-By`.
- [ ] **Step 5: Сообщить** пользователю результат и спросить, отправлять ли ветку и оставлять ли `docs/superpowers/*` в PR.
