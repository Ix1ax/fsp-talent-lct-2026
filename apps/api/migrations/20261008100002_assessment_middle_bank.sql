-- +goose Up

-- Дополнительные задания и опубликованные шаблоны Middle; старые версии и попытки не изменяются.

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000101', (SELECT id FROM skills WHERE code = 'go'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000101', 1, '{"text": "Как остановить работу нескольких goroutine по завершению запроса?", "options": [{"id": "a", "text": "Передать общий context и проверять ctx.Done()"}, {"id": "b", "text": "Вызвать runtime.GC()"}, {"id": "c", "text": "Закрыть любой канал из получателя"}, {"id": "d", "text": "Использовать time.Sleep без проверки"}]}'::jsonb, '{"type": "choice", "correct": ["a"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000102', (SELECT id FROM skills WHERE code = 'go'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000102', 1, '{"text": "Что гарантирует отправка значения по каналу в Go?", "options": [{"id": "a", "text": "Полную блокировку всех goroutine"}, {"id": "b", "text": "Записи до отправки видны получателю после соответствующего получения"}, {"id": "c", "text": "Автоматическую защиту любого map"}, {"id": "d", "text": "Получение значений строго одним потоком ОС"}]}'::jsonb, '{"type": "choice", "correct": ["b"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000103', (SELECT id FROM skills WHERE code = 'go'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000103', 1, '{"text": "Что верно для интерфейса error, содержащего типизированный nil указатель?", "options": [{"id": "a", "text": "Он всегда равен nil"}, {"id": "b", "text": "Он вызывает panic при сравнении"}, {"id": "c", "text": "Он не равен nil, поскольку содержит конкретный тип"}, {"id": "d", "text": "Он автоматически превращается в пустой интерфейс"}]}'::jsonb, '{"type": "choice", "correct": ["c"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000104', (SELECT id FROM skills WHERE code = 'sql'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000104', 1, '{"text": "Какой снимок использует PostgreSQL в транзакции REPEATABLE READ?", "options": [{"id": "a", "text": "Новый снимок для каждой строки"}, {"id": "b", "text": "Один снимок с начала первого оператора, читающего данные"}, {"id": "c", "text": "Только закоммиченные данные на момент каждого SELECT"}, {"id": "d", "text": "Всегда актуальные данные без изоляции"}]}'::jsonb, '{"type": "choice", "correct": ["b"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000105', (SELECT id FROM skills WHERE code = 'sql'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000105', 1, '{"text": "Как сохранить все строки левой таблицы при фильтре правой таблицы в LEFT JOIN?", "options": [{"id": "a", "text": "Перенести условие на правую таблицу в ON"}, {"id": "b", "text": "Всегда использовать условие в WHERE"}, {"id": "c", "text": "Заменить LEFT JOIN на INNER JOIN"}, {"id": "d", "text": "Добавить DISTINCT независимо от условия"}]}'::jsonb, '{"type": "choice", "correct": ["a"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000106', (SELECT id FROM skills WHERE code = 'sql'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000106', 1, '{"text": "Чем отличается COUNT(column) от COUNT(*)?", "options": [{"id": "a", "text": "COUNT(column) всегда считает больше строк"}, {"id": "b", "text": "COUNT(*) игнорирует NULL"}, {"id": "c", "text": "Они всегда одинаковы"}, {"id": "d", "text": "COUNT(column) не считает строки с NULL в этом столбце"}]}'::jsonb, '{"type": "choice", "correct": ["d"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000107', (SELECT id FROM skills WHERE code = 'typescript'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000107', 1, '{"text": "Как безопасно обратиться к свойству значения типа unknown?", "options": [{"id": "a", "text": "Привести его к any без проверки"}, {"id": "b", "text": "Сначала сузить тип проверкой структуры значения"}, {"id": "c", "text": "Включить noImplicitAny=false"}, {"id": "d", "text": "Заменить unknown на never"}]}'::jsonb, '{"type": "choice", "correct": ["b"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000108', (SELECT id FROM skills WHERE code = 'typescript'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000108', 1, '{"text": "Обеспечивает ли readonly в TypeScript неизменяемость объекта во время выполнения?", "options": [{"id": "a", "text": "Да, объект автоматически замораживается"}, {"id": "b", "text": "Нет, это ограничение проверки типов, не Object.freeze"}, {"id": "c", "text": "Да, каждое изменение вызывает исключение"}, {"id": "d", "text": "Только при strictNullChecks"}]}'::jsonb, '{"type": "choice", "correct": ["b"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000109', (SELECT id FROM skills WHERE code = 'typescript'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000109', 1, '{"text": "Зачем нужен discriminated union с общим полем kind?", "options": [{"id": "a", "text": "Чтобы убрать все проверки типов"}, {"id": "b", "text": "Чтобы сделать все поля необязательными"}, {"id": "c", "text": "Чтобы сузить вариант объединения по значению kind"}, {"id": "d", "text": "Чтобы заменить интерфейсы глобальными переменными"}]}'::jsonb, '{"type": "choice", "correct": ["c"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000110', (SELECT id FROM skills WHERE code = 'react'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000110', 1, '{"text": "Как дважды увеличить счётчик в одном обработчике, не используя устаревшее значение state?", "options": [{"id": "a", "text": "Дважды вызвать setCount(count + 1)"}, {"id": "b", "text": "Дважды вызвать setCount(c => c + 1)"}, {"id": "c", "text": "Изменить count напрямую"}, {"id": "d", "text": "Обязательно вызвать setTimeout"}]}'::jsonb, '{"type": "choice", "correct": ["b"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000111', (SELECT id FROM skills WHERE code = 'react'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000111', 1, '{"text": "Когда выполняется cleanup функции useEffect при изменении зависимостей?", "options": [{"id": "a", "text": "Только при закрытии браузера"}, {"id": "b", "text": "Сразу после каждого setState независимо от зависимостей"}, {"id": "c", "text": "Перед запуском следующего эффекта и при размонтировании"}, {"id": "d", "text": "Никогда в production"}]}'::jsonb, '{"type": "choice", "correct": ["c"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000112', (SELECT id FROM skills WHERE code = 'react'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000112', 1, '{"text": "Почему индекс массива опасен как key списка, элементы которого переставляются?", "options": [{"id": "a", "text": "Индекс всегда вызывает ошибку компиляции"}, {"id": "b", "text": "React не допускает числовые ключи"}, {"id": "c", "text": "Все элементы будут обязательно удалены"}, {"id": "d", "text": "Состояние компонента может оказаться связано с другим элементом"}]}'::jsonb, '{"type": "choice", "correct": ["d"], "multiple": false}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_templates (id, specialization_id, grade_id, version, time_limit_sec, pass_score, status)
SELECT 'b0000000-0000-4000-8000-000000000101', s.id, g.id, 1, 1800, 75, 'draft'
FROM specializations s, grades g
WHERE s.code = 'backend' AND g.code = 'middle'
  AND NOT EXISTS (SELECT 1 FROM assessment_templates t WHERE t.specialization_id = s.id AND t.grade_id = g.id);
INSERT INTO assessment_blueprints (template_id, skill_id, difficulty, question_count, weight)
SELECT t.id, s.id, 2, 2, 2.00
FROM assessment_templates t, skills s
WHERE t.id = 'b0000000-0000-4000-8000-000000000101' AND s.code = 'go';
INSERT INTO assessment_blueprints (template_id, skill_id, difficulty, question_count, weight)
SELECT t.id, s.id, 2, 2, 2.00
FROM assessment_templates t, skills s
WHERE t.id = 'b0000000-0000-4000-8000-000000000101' AND s.code = 'sql';
UPDATE assessment_templates SET status = 'published', published_at = clock_timestamp() WHERE id = 'b0000000-0000-4000-8000-000000000101';

INSERT INTO assessment_templates (id, specialization_id, grade_id, version, time_limit_sec, pass_score, status)
SELECT 'b0000000-0000-4000-8000-000000000102', s.id, g.id, 1, 1800, 75, 'draft'
FROM specializations s, grades g
WHERE s.code = 'frontend' AND g.code = 'middle'
  AND NOT EXISTS (SELECT 1 FROM assessment_templates t WHERE t.specialization_id = s.id AND t.grade_id = g.id);
INSERT INTO assessment_blueprints (template_id, skill_id, difficulty, question_count, weight)
SELECT t.id, s.id, 2, 2, 2.00
FROM assessment_templates t, skills s
WHERE t.id = 'b0000000-0000-4000-8000-000000000102' AND s.code = 'javascript';
INSERT INTO assessment_blueprints (template_id, skill_id, difficulty, question_count, weight)
SELECT t.id, s.id, 2, 2, 2.00
FROM assessment_templates t, skills s
WHERE t.id = 'b0000000-0000-4000-8000-000000000102' AND s.code = 'typescript';
INSERT INTO assessment_blueprints (template_id, skill_id, difficulty, question_count, weight)
SELECT t.id, s.id, 2, 2, 2.00
FROM assessment_templates t, skills s
WHERE t.id = 'b0000000-0000-4000-8000-000000000102' AND s.code = 'react';
UPDATE assessment_templates SET status = 'published', published_at = clock_timestamp() WHERE id = 'b0000000-0000-4000-8000-000000000102';

-- +goose Down

DELETE FROM assessment_templates WHERE id IN ('b0000000-0000-4000-8000-000000000101', 'b0000000-0000-4000-8000-000000000102');
DELETE FROM assessment_questions WHERE id IN ('a0000000-0000-4000-8000-000000000101', 'a0000000-0000-4000-8000-000000000102', 'a0000000-0000-4000-8000-000000000103', 'a0000000-0000-4000-8000-000000000104', 'a0000000-0000-4000-8000-000000000105', 'a0000000-0000-4000-8000-000000000106', 'a0000000-0000-4000-8000-000000000107', 'a0000000-0000-4000-8000-000000000108', 'a0000000-0000-4000-8000-000000000109', 'a0000000-0000-4000-8000-000000000110', 'a0000000-0000-4000-8000-000000000111', 'a0000000-0000-4000-8000-000000000112');
