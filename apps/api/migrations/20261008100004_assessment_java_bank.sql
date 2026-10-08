-- +goose Up
-- Java использует отдельные вопросы; SQL и Git переиспользуются из общего банка.

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000201', (SELECT id FROM skills WHERE code = 'java'), 1, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000201', 1, '{"text": "Какое сравнение проверяет содержимое строк Java?", "options": [{"id": "a", "text": "equals"}, {"id": "b", "text": "=="}, {"id": "c", "text": "!="}]}'::jsonb, '{"type": "choice", "correct": ["a"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000202', (SELECT id FROM skills WHERE code = 'java'), 1, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000202', 1, '{"text": "Что происходит при вызове метода через null-ссылку?", "options": [{"id": "a", "text": "Возвращается null"}, {"id": "b", "text": "Возникает NullPointerException"}, {"id": "c", "text": "Метод игнорируется"}]}'::jsonb, '{"type": "choice", "correct": ["b"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000203', (SELECT id FROM skills WHERE code = 'java'), 1, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000203', 1, '{"text": "Какой интерфейс описывает коллекцию уникальных элементов?", "options": [{"id": "a", "text": "List"}, {"id": "b", "text": "Map"}, {"id": "c", "text": "Set"}]}'::jsonb, '{"type": "choice", "correct": ["c"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000204', (SELECT id FROM skills WHERE code = 'java'), 1, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000204', 1, '{"text": "Для чего используется try-with-resources?", "options": [{"id": "a", "text": "Для автоматического закрытия AutoCloseable"}, {"id": "b", "text": "Для запуска потоков"}, {"id": "c", "text": "Для отключения исключений"}]}'::jsonb, '{"type": "choice", "correct": ["a"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000205', (SELECT id FROM skills WHERE code = 'java'), 1, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000205', 1, '{"text": "Что позволяет переопределение метода?", "options": [{"id": "a", "text": "Изменять любую private-переменную родителя"}, {"id": "b", "text": "Выбирать реализацию по фактическому типу объекта"}, {"id": "c", "text": "Создавать несколько классов с одним именем"}]}'::jsonb, '{"type": "choice", "correct": ["b"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000206', (SELECT id FROM skills WHERE code = 'java'), 1, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000206', 1, '{"text": "Где нельзя использовать null как значение?", "options": [{"id": "a", "text": "String"}, {"id": "b", "text": "Integer"}, {"id": "c", "text": "int"}]}'::jsonb, '{"type": "choice", "correct": ["c"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000207', (SELECT id FROM skills WHERE code = 'java'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000207', 1, '{"text": "Что обязан гарантировать hashCode для двух равных по equals объектов?", "options": [{"id": "a", "text": "Одинаковый hashCode"}, {"id": "b", "text": "Всегда разные hashCode"}, {"id": "c", "text": "hashCode равен нулю"}]}'::jsonb, '{"type": "choice", "correct": ["a"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000208', (SELECT id FROM skills WHERE code = 'java'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000208', 1, '{"text": "Какой эффект даёт volatile для поля Java?", "options": [{"id": "a", "text": "Все операции становятся атомарными"}, {"id": "b", "text": "Видимость записи другим потокам и ограничения переупорядочивания"}, {"id": "c", "text": "Все обращения блокируют монитор"}]}'::jsonb, '{"type": "choice", "correct": ["b"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000209', (SELECT id FROM skills WHERE code = 'java'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000209', 1, '{"text": "Что верно для volatile int count и операции count++?", "options": [{"id": "a", "text": "Она всегда атомарна"}, {"id": "b", "text": "Она запрещена компилятором"}, {"id": "c", "text": "Она не атомарна: нужны синхронизация или AtomicInteger"}]}'::jsonb, '{"type": "choice", "correct": ["c"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000210', (SELECT id FROM skills WHERE code = 'java'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000210', 1, '{"text": "Что может произойти после изменения полей ключа HashMap, участвующих в equals/hashCode?", "options": [{"id": "a", "text": "Поиск ранее добавленного ключа может перестать работать"}, {"id": "b", "text": "HashMap автоматически перестроится"}, {"id": "c", "text": "Компилятор запретит изменение"}]}'::jsonb, '{"type": "choice", "correct": ["a"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000211', (SELECT id FROM skills WHERE code = 'java'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000211', 1, '{"text": "Что верно для List<? extends Number>?", "options": [{"id": "a", "text": "В него можно добавлять любой Integer"}, {"id": "b", "text": "Можно читать Number, но нельзя безопасно добавить произвольный Number"}, {"id": "c", "text": "Можно читать только Object"}]}'::jsonb, '{"type": "choice", "correct": ["b"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_questions (id, skill_id, difficulty, kind)
VALUES ('a0000000-0000-4000-8000-000000000212', (SELECT id FROM skills WHERE code = 'java'), 2, 'choice');
INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at)
VALUES ('a0000000-0000-4000-8000-000000000212', 1, '{"text": "Почему предпочтительно использовать ExecutorService вместо создания потока на каждый запрос?", "options": [{"id": "a", "text": "Он отключает сборку мусора"}, {"id": "b", "text": "Он делает код автоматически потокобезопасным"}, {"id": "c", "text": "Позволяет управлять количеством потоков и очередью задач"}]}'::jsonb, '{"type": "choice", "correct": ["c"]}'::jsonb, 'published', clock_timestamp());

INSERT INTO assessment_templates (id, specialization_id, grade_id, stack_skill_id, version, time_limit_sec, pass_score)
SELECT 'b0000000-0000-4000-8000-000000000201', sp.id, g.id, sk.id, 1, 1800, 60
FROM specializations sp, grades g, skills sk
WHERE sp.code = 'backend' AND g.code = 'junior' AND sk.code = 'java'
  AND NOT EXISTS (SELECT 1 FROM assessment_templates t WHERE t.specialization_id = sp.id AND t.grade_id = g.id AND t.stack_skill_id = sk.id);
INSERT INTO assessment_blueprints (template_id, skill_id, difficulty, question_count, weight)
SELECT t.id, sk.id, 1, 3, 3 FROM assessment_templates t, skills sk
WHERE t.id = 'b0000000-0000-4000-8000-000000000201' AND sk.code = 'java';
INSERT INTO assessment_blueprints (template_id, skill_id, difficulty, question_count, weight)
SELECT t.id, sk.id, 1, 2, 2 FROM assessment_templates t, skills sk
WHERE t.id = 'b0000000-0000-4000-8000-000000000201' AND sk.code = 'sql';
UPDATE assessment_templates SET status = 'published', published_at = clock_timestamp() WHERE id = 'b0000000-0000-4000-8000-000000000201';

INSERT INTO assessment_templates (id, specialization_id, grade_id, stack_skill_id, version, time_limit_sec, pass_score)
SELECT 'b0000000-0000-4000-8000-000000000202', sp.id, g.id, sk.id, 1, 1800, 75
FROM specializations sp, grades g, skills sk
WHERE sp.code = 'backend' AND g.code = 'middle' AND sk.code = 'java'
  AND NOT EXISTS (SELECT 1 FROM assessment_templates t WHERE t.specialization_id = sp.id AND t.grade_id = g.id AND t.stack_skill_id = sk.id);
INSERT INTO assessment_blueprints (template_id, skill_id, difficulty, question_count, weight)
SELECT t.id, sk.id, 2, 3, 3 FROM assessment_templates t, skills sk
WHERE t.id = 'b0000000-0000-4000-8000-000000000202' AND sk.code = 'java';
INSERT INTO assessment_blueprints (template_id, skill_id, difficulty, question_count, weight)
SELECT t.id, sk.id, 2, 2, 2 FROM assessment_templates t, skills sk
WHERE t.id = 'b0000000-0000-4000-8000-000000000202' AND sk.code = 'sql';
UPDATE assessment_templates SET status = 'published', published_at = clock_timestamp() WHERE id = 'b0000000-0000-4000-8000-000000000202';

-- +goose Down
DELETE FROM assessment_templates WHERE id IN ('b0000000-0000-4000-8000-000000000201', 'b0000000-0000-4000-8000-000000000202');
DELETE FROM assessment_questions WHERE id IN ('a0000000-0000-4000-8000-000000000201', 'a0000000-0000-4000-8000-000000000202', 'a0000000-0000-4000-8000-000000000203', 'a0000000-0000-4000-8000-000000000204', 'a0000000-0000-4000-8000-000000000205', 'a0000000-0000-4000-8000-000000000206', 'a0000000-0000-4000-8000-000000000207', 'a0000000-0000-4000-8000-000000000208', 'a0000000-0000-4000-8000-000000000209', 'a0000000-0000-4000-8000-000000000210', 'a0000000-0000-4000-8000-000000000211', 'a0000000-0000-4000-8000-000000000212');
