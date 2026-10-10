# Аудит согласованности веб-приложения

Область: весь `apps/web/src`: 980 TS/TSX/CSS-файлов (984 файла вместе с остальными форматами). Начальная проверка: 747 тестов в 130 файлах проходят.

## Единые правила

- Axios: `const { data } = await clientApi.get(...); return data;`. Нормализация страницы применяется к `data` отдельно. Тело fetch читается по контракту Response, а не как Axios.
- Функции — стрелочные; экспорт маршрута — именованная const с отдельным `export default`.
- `interface` — только props, имя `ComponentNameProps`; остальные типы — `type`.
- Общие запросы, состояния и компоненты используются через публичные barrels. Серверные barrels и `@x` — осознанные исключения, не нарушения.
- Обычные страницы кабинета: `container-page page-rhythm`, `PageHeader`, общие Button/Card/AsyncState. Лендинг и логин сохраняют отдельную композицию.
- Не унифицируем намеренно разные контракты пользовательской и административной авторизации.
- Не меняем обработку отказов, отмену запросов и таймеры ради синтаксиса.

## Порядок работ

| Партия                                         | Статус        | Проверка                                                           |
| ---------------------------------------------- | ------------- | ------------------------------------------------------------------ |
| API: 22 извлечения ответа в 7 файлах           | В работе      | Контрактные тесты и typecheck                                      |
| Функции: 23 объявления                         | Запланировано | Тесты маршрутов, typecheck                                         |
| Типы: 2 доменных interface и 1 имя props       | Запланировано | Typecheck                                                          |
| Условия: 37 вложенных выражений                | Выполнено     | Helpers, компоненты состояний, тесты сценариев и no-nested-ternary |
| UI: заголовки страниц и повторяющиеся паттерны | Запланировано | Браузерная проверка                                                |
| Состояния запросов                             | Выполнено     | RemoteState, AsyncState, тесты состояний и повторной загрузки      |
| Дубли и неиспользуемый код                     | Выполнено     | Проверка ссылок, графа модулей, typecheck, тесты и сборка          |
| Защита правил через lint и документацию        | Запланировано | Полный lint/test/build                                             |

## Результаты полного сканирования

Ниже приведён начальный снимок: строки относятся к коду до рефакторинга. Список кандидатов не равен списку дефектов. Нативный file/range input, SVG-цвет бренда, серверный импорт и явный fallback при недоступности localStorage могут быть корректными исключениями. Крупный файл сам по себе не требует разделения.

### Извлечение ответа API — 22

- `src/entities/catalog/api/client.ts:6` — (await clientApi.get<Catalogs>('/v1/catalogs', { signal })).data.
- `src/entities/catalog/api/client.ts:15` — ( await clientApi.get<SkillsPage>('/v1/catalogs/skills', { params: { q: q || undefined, limit: 1.
- `src/entities/company/api/management.ts:16` — (await clientApi.get<Company>(path(id), { signal })).data.
- `src/entities/company/api/management.ts:23` — ( await clientApi.get<Page<CompanyFile>>(${path(id)}/files, { params: { limit: 21, offset }, .
- `src/entities/company/api/management.ts:38` — ( await clientApi.post<CompanyFile>(${path(id)}/files, body, { timeout: 60_000, }) ).data.
- `src/entities/company/api/management.ts:49` — ( await clientApi.get<Blob>(${path(id)}/files/${fileId}/download, { responseType: 'blob', si.
- `src/entities/company/api/management.ts:64` — ( await clientApi.get<Page<CompanyMember>>(${path(id)}/members, { params: { limit: 21, offset .
- `src/entities/company/api/management.ts:76` — ( await clientApi.patch<CompanyMember>(${path(id)}/members/${userId}, { role, }) ).data.
- `src/entities/company/api/management.ts:90` — ( await clientApi.get<Page<CompanyInvitation>>(${path(id)}/invitations, { params: { limit: 21,.
- `src/entities/company/api/management.ts:101` — (await clientApi.post<CompanyInvitation>(${path(id)}/invitations, input)) .data.
- `src/entities/company/api/management.ts:110` — ( await clientApi.post<CompanyMember>('/v1/company-invitations/accept', { token, }) ).data.
- `src/entities/company/api/verification.ts:19` — (await clientApi.get<CompanyVerification>(path(companyId), { signal })) .data.
- `src/entities/company/api/verification.ts:28` — ( await clientApi.post<CompanyVerification>( ${path(companyId)}/request, undefined, { .
- `src/entities/company-task/api/employerTasks.ts:77` — ( await clientApi.get<CompanyTask>(taskPath(companyId, taskId), { signal }) ).data.
- `src/entities/company-task/api/employerTasks.ts:88` — ( await clientApi.post<CompanyTask>( ${taskPath(companyId, taskId)}/close, undefined, .
- `src/entities/company-task/api/employerTasks.ts:104` — ( await clientApi.get<Blob>(${taskPath(companyId, taskId)}/file, { responseType: 'blob', .
- `src/entities/company-task/api/tasks.ts:25` — (await clientApi.get<T>(path, { signal, params })).data.
- `src/entities/employer-bank/api/candidates.ts:63` — ( await clientApi.post<CandidateInteraction>( /v1/companies/${encodeURIComponent(companyId)}/candid.
- `src/entities/employer-bank/api/offers.ts:19` — ( await clientApi.get<Page<CandidateOffer>>( /v1/companies/${companyId}/offers, { para.
- `src/entities/employer-bank/api/offers.ts:31` — ( await clientApi.get<CandidateOffer>( /v1/companies/${companyId}/offers/${id}, { signal }, .
- `src/entities/employer-bank/api/offers.ts:41` — ( await clientApi.post<CandidateOffer>( /v1/companies/${companyId}/offers, input, ) )..
- `src/entities/employer-bank/api/offers.ts:52` — ( await clientApi.get<CandidateOfferContacts>( /v1/companies/${companyId}/offers/${offerId}/candida.

### Объявления функций — 23

- `src/app/(site)/cabinet/page.tsx:3` — Page.
- `src/app/(site)/candidate/(profile)/[section]/page.tsx:5` — CandidateProfileSectionPage.
- `src/app/(site)/candidate/(profile)/layout.tsx:13` — CandidateProfileLayout.
- `src/app/(site)/candidate/(profile)/page.tsx:7` — CandidateProfileIndexPage.
- `src/app/(site)/candidate/loading.tsx:3` — Loading.
- `src/app/(site)/candidate/offers/page.tsx:10` — CandidateOffersPage.
- `src/app/(site)/error.tsx:10` — SiteError.
- `src/app/(site)/guides/loading.tsx:3` — Loading.
- `src/app/(site)/guides/page.tsx:15` — Page.
- `src/app/(site)/layout.tsx:6` — SiteLayout.
- `src/app/(site)/legal/[slug]/page.tsx:25` — Page.
- `src/app/(site)/legal/page.tsx:5` — Page.
- `src/app/(site)/page.tsx:3` — Page.
- `src/app/(workspace)/employer/[section]/page.tsx:11` — Page.
- `src/app/(workspace)/employer/error.tsx:10` — EmployerError.
- `src/app/(workspace)/employer/layout.tsx:10` — EmployerLayout.
- `src/app/(workspace)/employer/page.tsx:8` — Page.
- `src/app/auth/callback/page.tsx:3` — Page.
- `src/app/error.tsx:10` — RootError.
- `src/app/login/layout.tsx:3` — LoginLayout.
- `src/app/login/page.tsx:5` — Page.
- `src/shared/lib/utils.ts:4` — cn.
- `src/widgets/api-status/ui/ApiStatus.tsx:3` — ApiStatus.

### Типы и props — 3

- `src/features/employer-search/lib/loadSearchNeeds.ts:6` — NeedsSearchApi.
- `src/screens/candidate/ui/ProfileStepItem.tsx:16` — ProfileStepItem.
- `src/shared/ui/SalaryRangeInput.tsx:5` — SalaryRange.

### Вложенные условные выражения — 37

- `src/entities/session/api/loadSession.ts:83` — error.code === 'timeout' ? 'Превышено время ожидания ответа сервиса. Попробуйте обнови.
- `src/features/admin/ui/PreviewQuestionBody.tsx:39` — grading.type === 'text' ? 'Введите ответ' : grading.multiple ?.
- `src/features/admin/ui/PreviewQuestionBody.tsx:55` — grading.multiple ? (answer.selected ?? []) .filter((id) .
- `src/features/admin/ui/PreviewResultSummary.tsx:47` — review.correct ? 'верно' : review.answered ? 'неверно' .
- `src/features/admin/ui/TemplatePreview.tsx:75` — busy ? 'Загружаем…' : error && !missing ? 'Повторить зап.
- `src/features/admin/ui/TemplatePreview.tsx:148` — dirty ? 'Изменения не сохранены' : question.answer .
- `src/features/company/ui/CompanyForm.tsx:149` — pending ? 'Сохраняем…' : create ? 'Создать к.
- `src/features/company/ui/CompanyProfileForm.tsx:178` — pending ? 'Сохраняем…' : create ? 'Создать к.
- `src/features/employer-bank/ui/CandidateFilters.tsx:82` — needsError ? ( <> <p role="alert" className="text-xs text-destructive"> .
- `src/features/employer-need/ui/NeedFlowEditor.tsx:278` — pending ? 'Сохраняем…' : step < LAST_STEP .
- `src/screens/employer/ui/CompanyProfileVacancies.tsx:61` — remote.loading ? ( <Skeleton className="h-48 rounded-xl" /> ) : remote.error ? ( .
- `src/screens/employer/ui/CompanyProfileVacancies.tsx:63` — remote.error ? ( <AsyncState error title="Не удалось загрузить потребнос.
- `src/screens/employer/ui/EmployerHomePage.tsx:131` — createCompany ? 'Создание компании' : section === 'overview' .
- `src/screens/employer/ui/EmployerHomePage.tsx:133` — section === 'overview' ? 'Компании' : section === 'invitation' .
- `src/screens/employer/ui/EmployerHomePage.tsx:167` — board.error ? ( <AsyncState error title="Не удалось открыть .
- `src/screens/employer/ui/EmployerHomePage.tsx:185` — section === 'invitation' ? ( <div className="grid w-full min-w-0 gap-4"> .
- `src/screens/employer/ui/EmployerHomePage.tsx:204` — createCompany ? ( <div className="grid w-full min-w-0 gap-4"> <But.
- `src/screens/employer/ui/EmployerNeedPane.tsx:71` — composer ? ( <NeedEditor key="new" initial={emptyNeed()} isNew.
- `src/screens/employer/ui/EmployerNeedPane.tsx:90` — board.detailLoading && detail ? ( <Skeleton className="h-96 rounded-none" /> ) : board.
- `src/screens/employer/ui/EmployerNeedPane.tsx:92` — board.selected ? ( <> <NeedEditor key={${board.selected.id}-${board.r.
- `src/screens/employer/ui/EmployerNeedPane.tsx:142` — !detail ? ( <section className="mx-auto my-8 max-w-xl space-y-5 rounded-lg border border-bor.
- `src/screens/employer/ui/VacancyBank.tsx:123` — composer ? ( <NeedFlowEditor active={active} key="new" .
- `src/screens/employer/ui/VacancyBank.tsx:140` — board.detailLoading ? ( <Skeleton className="h-96" /> ) : board.detailError ? ( .
- `src/screens/employer/ui/VacancyBank.tsx:142` — board.detailError ? ( <> <Button variant="ghost" onClick={onBack}> .
- `src/screens/employer/ui/VacancyBank.tsx:323` — loading ? ( <div role="status" aria-label="Загрузка потребностей" .
- `src/screens/employer/ui/VacancyBank.tsx:332` — error ? ( <AsyncState error title="Не удалось загрузить потребност.
- `src/screens/employer/ui/VacancyBank.tsx:355` — filtered ? 'Ничего не найдено' : board.status === 'archived' .
- `src/shared/utils/formatSalaryRange.ts:13` — from === null ? 'до ' : to === null ? 'от ' : ''.
- `src/shared/utils/formatSalaryRange.ts:13` — from === null ? fmt(to!) : to === null ? fmt(from) : ${fmt(from)}–${fmt(to)}.
- `src/widgets/app-header/ui/AppHeader.tsx:80` — session.kind === 'user' ? ( <UserMenu user={session.user} .
- `src/widgets/need-matches/ui/MatchTable.tsx:54` — error ? ( <div className="p-4"> <AsyncState error title="Н.
- `src/widgets/need-matches/ui/MatchTable.tsx:63` — !data ? ( <div className="grid gap-4 p-5" role="status" aria-l.
- `src/widgets/need-matches/ui/MatchTable.tsx:107` — data.matchingMode === 'similarity' ? 'Сходство с требованиями' : data.matchi.
- `src/widgets/needs-board/ui/NeedList.tsx:44` — list.loading ? ( <div className="grid gap-4 p-4" role="status" .
- `src/widgets/needs-board/ui/NeedList.tsx:54` — list.listError ? ( <div className="p-2"> <AsyncState error .
- `src/widgets/needs-board/ui/NeedList.tsx:77` — list.status === 'active' ? 'Нет активных потребностей' : list.status.
- `src/widgets/needs-board/ui/NeedList.tsx:84` — list.status === 'archived' ? 'Здесь появятся закрытые потребности.' .

### Импорты для ручной проверки — 40

- `src/app/(site)/candidate/(profile)/[section]/page.tsx:3` — @/screens/candidate/constants.
- `src/app/(site)/candidate/(profile)/layout.tsx:5` — @/entities/candidate/profile/api/server.
- `src/app/(site)/candidate/(profile)/layout.tsx:6` — @/entities/catalog/api/server.
- `src/app/(site)/candidate/(profile)/layout.tsx:8` — @/entities/session/api/server.
- `src/app/(site)/candidate/assessments/[attemptId]/page.tsx:5` — @/entities/session/api/server.
- `src/app/(site)/candidate/assessments/page.tsx:4` — @/entities/catalog/api/server.
- `src/app/(site)/candidate/assessments/page.tsx:6` — @/entities/session/api/server.
- `src/app/(site)/candidate/fsp/page.tsx:5` — @/entities/session/api/server.
- `src/app/(site)/candidate/offers/page.tsx:5` — @/entities/session/api/server.
- `src/app/(site)/candidate/survey/page.tsx:5` — @/entities/session/api/server.
- `src/app/(site)/candidate/task-submissions/[id]/page.tsx:5` — @/entities/session/api/server.
- `src/app/(site)/candidate/task-submissions/page.tsx:4` — @/entities/session/api/server.
- `src/app/(site)/candidate/tasks/[id]/page.tsx:5` — @/entities/session/api/server.
- `src/app/(site)/candidate/tasks/page.tsx:4` — @/entities/session/api/server.
- `src/app/(site)/guides/page.tsx:4` — @/entities/catalog/api/server.
- `src/app/(site)/layout.tsx:3` — @/widgets/app-header/server.
- `src/app/(workspace)/employer/[section]/page.tsx:4` — @/entities/session/api/server.
- `src/app/(workspace)/employer/layout.tsx:3` — @/entities/session/api/server.
- `src/app/(workspace)/employer/page.tsx:2` — @/entities/session/api/server.
- `src/app/admin/[section]/[...path]/page.tsx:4` — @/features/admin/server.
- `src/app/admin/[section]/page.tsx:4` — @/features/admin/server.
- `src/entities/assessment/model/history.ts:1` — @/entities/candidate/profile.
- `src/entities/employer-bank/api/candidates.ts:3` — @/entities/employer-need/@x/employer-bank.
- `src/features/candidate/fsp/model/useCandidateFSP.ts:6` — @/entities/candidate/consent.
- `src/features/candidate/fsp/model/useCandidateFSP.ts:7` — @/entities/candidate/fsp.
- `src/features/candidate/fsp/model/useCandidateFSP.ts:8` — @/entities/candidate/profile.
- `src/features/candidate/fsp/ui/FSPAchievements.tsx:4` — @/entities/candidate/fsp.
- `src/features/candidate/onboarding/lib/__tests__/onboarding.test.ts:3` — @/entities/candidate/profile.
- `src/features/candidate/onboarding/lib/getOnboardingAction.ts:2` — @/entities/candidate/profile.
- `src/features/candidate/onboarding/lib/loadCandidateOnboarding.ts:2` — @/entities/candidate/profile.
- `src/features/candidate/onboarding/ui/CandidateSurveyForm.tsx:19` — @/entities/candidate/profile.
- `src/features/candidate/resume-export/ui/CandidatePDFButton.tsx:12` — @/entities/candidate/profile.
- `src/screens/cabinet/ui/CabinetPage.tsx:5` — @/entities/session/api/server.
- `src/screens/candidate/ui/CandidateFSPPage.tsx:7` — @/features/candidate/fsp.
- `src/screens/candidate/ui/CandidateProfileOverview.tsx:8` — @/features/candidate/onboarding.
- `src/screens/candidate/ui/CandidateSurveyPage.tsx:10` — @/features/candidate/onboarding.
- `src/screens/candidate/ui/sections/CandidateReadinessSection.tsx:1` — @/features/candidate/resume-export.
- `src/screens/guides/model/query.ts:1` — @/entities/catalog/api.
- `src/widgets/app-header/ui/AppHeader.tsx:12` — @/entities/session/api/server.
- `src/widgets/session-status/ui/SessionStatus.tsx:6` — @/entities/session/api/server.

### Нативные элементы для ручной проверки — 26

- `src/features/assessment-runner/ui/QuestionAnswerForm.tsx:79` — input.
- `src/features/employer-search/ui/EmployerSearch.tsx:88` — input.
- `src/features/task-solution/ui/TaskSolutionForm.tsx:154` — input.
- `src/screens/employer/ui/EmployerOverview.tsx:146` — button.
- `src/screens/employer/ui/VacancyCard.tsx:65` — button.
- `src/screens/home/ui/DisciplineExplorer.tsx:54` — button.
- `src/screens/home/ui/DisciplineExplorer.tsx:62` — button.
- `src/screens/home/ui/DisciplineExplorer.tsx:82` — button.
- `src/screens/home/ui/Hero.tsx:143` — button.
- `src/screens/home/ui/ScoutSymbol.tsx:57` — button.
- `src/screens/home/ui/disciplines/AlgorithmVisual.tsx:55` — button.
- `src/screens/home/ui/disciplines/AlgorithmVisual.tsx:63` — button.
- `src/screens/home/ui/disciplines/DroneVisual.tsx:57` — button.
- `src/screens/home/ui/disciplines/DroneVisual.tsx:102` — button.
- `src/screens/home/ui/disciplines/DroneVisual.tsx:112` — button.
- `src/screens/home/ui/disciplines/ProductVisual.tsx:50` — button.
- `src/screens/home/ui/disciplines/RobotVisual.tsx:26` — input.
- `src/screens/home/ui/disciplines/RobotVisual.tsx:38` — input.
- `src/screens/home/ui/disciplines/SecurityVisual.tsx:31` — button.
- `src/shared/ui/BriefToken.tsx:40` — button.
- `src/shared/ui/FileInput.tsx:47` — input.
- `src/shared/ui/Input.tsx:7` — input.
- `src/shared/ui/OptionSelect.tsx:90` — input.
- `src/shared/ui/SectionTabs.tsx:41` — button.
- `src/shared/ui/Textarea.tsx:7` — textarea.
- `src/widgets/employer-shell/ui/EmployerShell.tsx:91` — button.

### Крупные файлы — 29

- `src/app/globals.css:1` — 259.
- `src/entities/admin/api/__tests__/catalogs.test.ts:1` — 305.
- `src/entities/admin/api/operationsSchemas.ts:1` — 271.
- `src/entities/candidate/profile/api/__tests__/fullProfile.test.ts:1` — 257.
- `src/entities/company-task/api/__tests__/employerSubmissions.test.ts:1` — 258.
- `src/features/admin/ui/Common.tsx:1` — 352.
- `src/features/admin/ui/QuestionEditor.tsx:1` — 352.
- `src/features/admin/ui/TemplateEditor.tsx:1` — 285.
- `src/features/assessment-runner/ui/AssessmentRunner.tsx:1` — 251.
- `src/features/candidate/avatar/ui/CandidateAvatar.tsx:1` — 361.
- `src/features/candidate/resume-import/ui/ResumeImportCard.tsx:1` — 361.
- `src/features/company/ui/CompanyDocuments.tsx:1` — 338.
- `src/features/company/ui/CompanyTeam.tsx:1` — 411.
- `src/features/company-task-review/ui/CompanyTaskCreateForm.tsx:1` — 253.
- `src/features/company-task-review/ui/CompanyTaskDetails.tsx:1` — 254.
- `src/features/employer-bank/ui/CandidateBank.tsx:1` — 304.
- `src/features/employer-bank/ui/CandidateFilters.tsx:1` — 315.
- `src/features/employer-bank/ui/CompanyOffers.tsx:1` — 252.
- `src/features/employer-need/ui/BriefPhrase.tsx:1` — 311.
- `src/features/employer-need/ui/NeedEditor.tsx:1` — 308.
- `src/features/employer-need/ui/NeedFlowEditor.tsx:1` — 334.
- `src/screens/admin/ui/CatalogsPage.tsx:1` — 283.
- `src/screens/admin/ui/StatisticsPage.tsx:1` — 467.
- `src/screens/employer/ui/EmployerHomePage.tsx:1` — 461.
- `src/screens/employer/ui/VacancyBank.tsx:1` — 399.
- `src/shared/contants/timezones.ts:1` — 446.
- `src/shared/hooks/__tests__/unsavedChangesGuard.test.ts:1` — 281.
- `src/shared/hooks/unsavedChangesGuard.ts:1` — 277.
- `src/shared/ui/DropdownMenu.tsx:1` — 274.

### Пустые catch для ручной проверки — 10

- `src/features/admin/lib/previewRecovery.ts:15` — empty catch.
- `src/features/candidate/fsp/model/useCandidateFSP.ts:35` — empty catch.
- `src/features/candidate/resume-export/ui/CandidatePDFButton.tsx:36` — empty catch.
- `src/features/candidate/resume-import/model/createResumeRecordSaver.ts:42` — empty catch.
- `src/features/company/ui/CompanyProfileForm.tsx:117` — empty catch.
- `src/features/employer-need/model/useNeedFlowEditor.ts:125` — empty catch.
- `src/screens/assessments/model/useAssessments.ts:105` — empty catch.
- `src/shared/auth/loginReturnPath.ts:14` — empty catch.
- `src/shared/auth/loginReturnPath.ts:31` — empty catch.
- `src/widgets/api-status/ui/ApiStatus.tsx:9` — empty catch.

### Литеральные цвета для ручной проверки — 21

- `src/features/candidate/avatar/lib/cropAvatar.ts:73` — #ffffff.
- `src/screens/home/ui/Hero.tsx:58` — pt-0 relative [min-height:max(760px,_100svh)] flex flex-col justify-center [background:#1b.
- `src/screens/home/ui/Hero.tsx:63` — absolute h-full [color:#efefef] [background:#1b1c21] [animation:enter_1.2s_cubic-bezier(0..
- `src/screens/home/ui/ScoutMark.tsx:39` — #F11933.
- `src/screens/home/ui/ScoutMark.tsx:43` — #F11933.
- `src/screens/home/ui/ScoutMark.tsx:45` — #F11933.
- `src/screens/home/ui/ScoutMark.tsx:46` — #F11933.
- `src/screens/home/ui/ScoutMark.tsx:47` — #F11933.
- `src/screens/home/ui/ScoutMark.tsx:57` — #EFEFEF.
- `src/screens/home/ui/ScoutMark.tsx:59` — #EFEFEF.
- `src/screens/home/ui/ScoutMark.tsx:60` — #EFEFEF.
- `src/screens/home/ui/ScoutMark.tsx:70` — #3729FB.
- `src/screens/home/ui/ScoutMark.tsx:72` — #3729FB.
- `src/screens/home/ui/ScoutMark.tsx:73` — #3729FB.
- `src/screens/home/ui/ScoutMark.tsx:81` — #3629FF.
- `src/screens/home/ui/ScoutMark.tsx:86` — #EFEFEF.
- `src/screens/home/ui/ScoutMark.tsx:96` — #EFEFEF.
- `src/screens/home/ui/ScoutSymbol.tsx:22` — flex h-full min-h-[580px] flex-col justify-between gap-6 p-8 text-[#efefef] max-md:p-6.
- `src/screens/home/ui/ScoutSymbol.tsx:63` — group flex min-h-[62px] flex-col items-start justify-center gap-1 rounded-md border border.
- `src/screens/home/ui/sections/FederationSection.tsx:69` — overflow-hidden rounded-xl bg-[#1b1c21].
- `src/widgets/app-header/ui/LandingHeader.tsx:25` — absolute inset-x-0 top-0 z-40 bg-[#1b1c21]/90 text-[#efefef].

## Выполнено: обработка ошибок

- Разобраны все 10 первоначальных кандидатов на пустые catch, а также пустые обработчики Promise.catch в исходниках и скриптах проверки.
- Для ошибок чтения хранилища задан явный fallback; ошибки действий и обновления данных отображаются в интерфейсе. Ошибка обновления после импорта не делает успешно сохранённую запись доступной для повторного POST.
- Повторяющийся разбор Blob-ошибок четырёх API вынесен в shared/api/normalizeApiError.ts. Статус, заголовки и backend details сохраняются; если Blob прочитать или разобрать нельзя, возвращается исходная ошибка.
- Ошибка серверной загрузки форматов работы в профиле кандидата больше не скрывается: доступна повторная загрузка.
- ESLint запрещает пустые catch, включая блоки только с комментариями, и пустые блоки обработчиков Promise.catch.

## Выполнено: контейнеры и композиция страниц

- Обычные страницы используют shared/ui/PageWrapper. Для лендинга, логина и рабочего пространства выделены отдельные варианты.
- В app вынесены разметка загрузки и общие состояния ошибки; страница предложений подключает экран, который владеет контейнером.
- Кабинет работодателя, редактор профиля, доступные тесты, страницы заданий, входа и документов разделены на самостоятельные блоки. Скрытые формы остаются смонтированными.
- PageHeader использует составной API: Row, Content, Title, Description, Actions. Все прежние вызовы PageHeader переведены на него, включая обёртку AdminPageHeader.
- Правила и примеры: docs/page-composition.md.

## Выполнено: импорты и публичные API

- Проверены все 40 исходных кандидатов: 23 серверных точки входа, 14 публичных подмодулей, один контракт `@x` и два исправленных обхода публичного API. Серверные точки входа `api/server`, `features/admin/server` и `widgets/app-header/server` сохранены отдельно от клиентских barrel-файлов.
- `entities/candidate/*` и `features/candidate/*` остаются самостоятельными публичными подмодулями. Контракт `employer-need/@x/employer-bank` сохранён.
- Маршрут раздела профиля и модель поиска справочника используют публичные API экранов и сущностей. Прямые импорты между внутренними сегментами заменены на их `index.ts`; внутри одного сегмента прямые импорты сохраняются.
- `SessionState` перенесён в модель сессии: UI импортирует тип из клиентского публичного API, а не вычисляет его через серверную функцию. Серверный barrel продолжает экспортировать этот тип для совместимости.
- ESLint запрещает обход barrel-файлов слайсов и сегментов, разрешая отдельный `api/server`. Тесты могут напрямую импортировать проверяемые внутренние функции. Повторные импорты из одного модуля объединяются.

## Выполнено: дубли и неиспользуемый код

Проверены импорты, реэкспорты и ссылки в исходниках, тестах и скриптах. Отдельно проверена достижимость модулей от маршрутов App Router и тестов: один реэкспорт из barrel-файла не считается использованием компонента.

- Удалён старый `CompanyForm`: актуальные сценарии создания и редактирования используют `CompanyProfileForm`. `useCompanyActions` и `MemberItem` используются и сохранены.
- Удалены `EmployerNeedPane` и его `EmployerNeedContent`, старый `needs-board`, `EmployerShell` и `EmployerBottomNav`. Текущие `VacancyBank`, `VacancyDetailContent`, `EmployerHeader` и `CompanySwitcher` сохранены.
- Удалены неиспользуемые `EmployerSearch`, загрузка всех статусов и фильтр этого поиска, а также четыре теста удалённого сценария. Тип запроса вынесен в `lib/types.ts`, потому что он нужен текущему `vacancyFeed`; его загрузка, фильтрация и тесты сохранены.
- Удалены старые `AssessmentQuestions`/`AssessmentQuestionCard`: прохождение теста использует `AssessmentRunner`.
- Удалены прежний `LandingHeader`, семь неиспользуемых компонентов анимации и `getGalleryOffset`, старые данные `milestones`/`careerSteps` и семь CSS keyframes без ссылок. Текущие `AppHeader`, `LandingMotion`, `RevealWords` и интерактивные элементы лендинга сохранены.
- Удалены отдельный `LogoutButton` и неподключённый `ConfirmDiscardDialog`. Выход через `UserMenu` и действующая защита несохранённых изменений сохранены.
- Удалены неподключённые диагностические `ApiStatus`, `SessionStatus` и их неиспользуемый запрос `getAPIInfo`. Проверка сессии в действующих маршрутах и хедере сохранена.
- Очищены соответствующие публичные экспорты и правило ESLint для удалённого `needs-board`. Общие UI-примитивы и используемые API не удалялись только из-за малого количества потребителей.
