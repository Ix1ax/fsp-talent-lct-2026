-- +goose Up

-- Демо-банк для двух шаблонов уровня Junior: backend и frontend. Задания проверяются автоматически (выбор ответа или короткий ответ).
-- Идентификаторы специализаций, грейдов и навыков берём по code, а не по числовым значениям.

INSERT INTO assessment_questions (id, skill_id, difficulty, kind) VALUES
    ('a0000000-0000-4000-8000-000000000001', (SELECT id FROM skills WHERE code = 'go'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000002', (SELECT id FROM skills WHERE code = 'go'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000003', (SELECT id FROM skills WHERE code = 'go'), 1, 'short_answer'),
    ('a0000000-0000-4000-8000-000000000004', (SELECT id FROM skills WHERE code = 'go'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000005', (SELECT id FROM skills WHERE code = 'go'), 1, 'code_reading'),
    ('a0000000-0000-4000-8000-000000000006', (SELECT id FROM skills WHERE code = 'go'), 2, 'code_reading'),
    ('a0000000-0000-4000-8000-000000000007', (SELECT id FROM skills WHERE code = 'go'), 2, 'choice'),
    ('a0000000-0000-4000-8000-000000000008', (SELECT id FROM skills WHERE code = 'go'), 2, 'choice'),
    ('a0000000-0000-4000-8000-000000000009', (SELECT id FROM skills WHERE code = 'sql'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000010', (SELECT id FROM skills WHERE code = 'sql'), 1, 'short_answer'),
    ('a0000000-0000-4000-8000-000000000011', (SELECT id FROM skills WHERE code = 'sql'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000012', (SELECT id FROM skills WHERE code = 'sql'), 1, 'code_reading'),
    ('a0000000-0000-4000-8000-000000000013', (SELECT id FROM skills WHERE code = 'sql'), 2, 'choice'),
    ('a0000000-0000-4000-8000-000000000014', (SELECT id FROM skills WHERE code = 'sql'), 2, 'choice'),
    ('a0000000-0000-4000-8000-000000000015', (SELECT id FROM skills WHERE code = 'git'), 1, 'short_answer'),
    ('a0000000-0000-4000-8000-000000000016', (SELECT id FROM skills WHERE code = 'git'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000017', (SELECT id FROM skills WHERE code = 'git'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000018', (SELECT id FROM skills WHERE code = 'javascript'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000019', (SELECT id FROM skills WHERE code = 'javascript'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000020', (SELECT id FROM skills WHERE code = 'javascript'), 1, 'short_answer'),
    ('a0000000-0000-4000-8000-000000000021', (SELECT id FROM skills WHERE code = 'javascript'), 1, 'code_reading'),
    ('a0000000-0000-4000-8000-000000000022', (SELECT id FROM skills WHERE code = 'javascript'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000023', (SELECT id FROM skills WHERE code = 'javascript'), 2, 'code_reading'),
    ('a0000000-0000-4000-8000-000000000024', (SELECT id FROM skills WHERE code = 'javascript'), 2, 'choice'),
    ('a0000000-0000-4000-8000-000000000025', (SELECT id FROM skills WHERE code = 'javascript'), 2, 'choice'),
    ('a0000000-0000-4000-8000-000000000026', (SELECT id FROM skills WHERE code = 'typescript'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000027', (SELECT id FROM skills WHERE code = 'typescript'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000028', (SELECT id FROM skills WHERE code = 'typescript'), 1, 'short_answer'),
    ('a0000000-0000-4000-8000-000000000029', (SELECT id FROM skills WHERE code = 'react'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000030', (SELECT id FROM skills WHERE code = 'react'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000031', (SELECT id FROM skills WHERE code = 'react'), 1, 'choice'),
    ('a0000000-0000-4000-8000-000000000032', (SELECT id FROM skills WHERE code = 'react'), 1, 'choice');

INSERT INTO assessment_question_versions (question_id, version, prompt, grading_spec, status, published_at) VALUES
    ('a0000000-0000-4000-8000-000000000001', 1, '{"text":"Какое ключевое слово запускает функцию в отдельной горутине?","options":[{"id":"a","text":"go"},{"id":"b","text":"async"},{"id":"c","text":"thread"},{"id":"d","text":"spawn"}]}'::jsonb, '{"type":"choice","correct":["a"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000002', 1, '{"text":"Что вернёт len(\"привет\") для строки на русском языке?","options":[{"id":"a","text":"6"},{"id":"b","text":"12"},{"id":"c","text":"3"},{"id":"d","text":"Ошибка компиляции"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000003', 1, '{"text":"Каким оператором внутри функции объявляется переменная с автоматическим выводом типа? Ответьте символами."}'::jsonb, '{"type":"text","accepted":[":="]}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000004', 1, '{"text":"Как в Go принято обрабатывать ошибку, которую вернула функция?","options":[{"id":"a","text":"Исключением try/catch"},{"id":"b","text":"Проверкой возвращаемого значения типа error"},{"id":"c","text":"Глобальным обработчиком"},{"id":"d","text":"Сигналом операционной системы"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000005', 1, '{"text":"Что выведет код?","code":"x := 5\ny := &x\n*y = 7\nfmt.Println(x)","language":"go"}'::jsonb, '{"type":"text","accepted":["7"]}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000006', 1, '{"text":"Что выведет код?","code":"s := []int{1, 2, 3}\nt := s[:2]\nt = append(t, 10)\nfmt.Println(s)","language":"go","options":[{"id":"a","text":"[1 2 3]"},{"id":"b","text":"[1 2 10]"},{"id":"c","text":"[1 2]"},{"id":"d","text":"[10]"}]}'::jsonb, '{"type":"choice","correct":["b"]}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000007', 1, '{"text":"Что произойдёт при отправке значения в закрытый канал?","options":[{"id":"a","text":"Горутина заблокируется навсегда"},{"id":"b","text":"Возникнет паника"},{"id":"c","text":"Значение будет проигнорировано"},{"id":"d","text":"Ошибка компиляции"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000008', 1, '{"text":"Для чего нужен defer?","options":[{"id":"a","text":"Для запуска горутины"},{"id":"b","text":"Чтобы отложить вызов функции до возврата из текущей функции"},{"id":"c","text":"Для объявления константы"},{"id":"d","text":"Для обработки паники только в main"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000009', 1, '{"text":"Какая команда выбирает строки из таблицы?","options":[{"id":"a","text":"SELECT"},{"id":"b","text":"GET"},{"id":"c","text":"FETCH"},{"id":"d","text":"PULL"}]}'::jsonb, '{"type":"choice","correct":["a"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000010', 1, '{"text":"Какое ключевое слово убирает дубликаты строк в результате SELECT? Одно слово."}'::jsonb, '{"type":"text","accepted":["DISTINCT"]}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000011', 1, '{"text":"Какой тип соединения возвращает только строки с совпадением в обеих таблицах?","options":[{"id":"a","text":"LEFT JOIN"},{"id":"b","text":"INNER JOIN"},{"id":"c","text":"CROSS JOIN"},{"id":"d","text":"FULL JOIN"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000012', 1, '{"text":"Что вернёт запрос?","code":"SELECT count(*) FROM users WHERE age > 18;","language":"sql","options":[{"id":"a","text":"Список пользователей"},{"id":"b","text":"Количество пользователей старше 18 лет"},{"id":"c","text":"Средний возраст"},{"id":"d","text":"Максимальный возраст"}]}'::jsonb, '{"type":"choice","correct":["b"]}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000013', 1, '{"text":"Что ускорит частые поиски по условию WHERE email = ''a@b.ru''?","options":[{"id":"a","text":"Индекс по столбцу email"},{"id":"b","text":"Индекс только по id"},{"id":"c","text":"Ничего не нужно"},{"id":"d","text":"Составной индекс по всем столбцам таблицы"}]}'::jsonb, '{"type":"choice","correct":["a"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000014', 1, '{"text":"Что делает GROUP BY?","options":[{"id":"a","text":"Сортирует строки"},{"id":"b","text":"Группирует строки для агрегатных функций"},{"id":"c","text":"Соединяет таблицы"},{"id":"d","text":"Навсегда удаляет дубликаты"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000015', 1, '{"text":"Какая команда показывает состояние рабочего каталога? Введите команду целиком."}'::jsonb, '{"type":"text","accepted":["git status"]}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000016', 1, '{"text":"Как создать новую ветку и сразу перейти на неё?","options":[{"id":"a","text":"git branch new"},{"id":"b","text":"git checkout -b new"},{"id":"c","text":"git new new"},{"id":"d","text":"git switch new"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000017', 1, '{"text":"Что делает git pull?","options":[{"id":"a","text":"Отправляет коммиты на сервер"},{"id":"b","text":"Получает изменения с сервера и объединяет их с текущей веткой"},{"id":"c","text":"Удаляет ветку"},{"id":"d","text":"Создаёт тег"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000018', 1, '{"text":"Какой оператор сравнивает значения строго, без приведения типов?","options":[{"id":"a","text":"=="},{"id":"b","text":"==="},{"id":"c","text":"="},{"id":"d","text":"!="}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000019', 1, '{"text":"Что выведет console.log(typeof null)?","options":[{"id":"a","text":"\"null\""},{"id":"b","text":"\"object\""},{"id":"c","text":"\"undefined\""},{"id":"d","text":"\"number\""}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000020', 1, '{"text":"Каким ключевым словом в современном JavaScript объявляется константа?"}'::jsonb, '{"type":"text","accepted":["const"]}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000021', 1, '{"text":"Что выведет код?","code":"console.log(1 + \"2\")","language":"javascript","options":[{"id":"a","text":"3"},{"id":"b","text":"12"},{"id":"c","text":"NaN"},{"id":"d","text":"Ошибку"}]}'::jsonb, '{"type":"choice","correct":["b"]}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000022', 1, '{"text":"Какой метод массива возвращает новый массив, преобразуя каждый элемент?","options":[{"id":"a","text":"forEach"},{"id":"b","text":"map"},{"id":"c","text":"push"},{"id":"d","text":"splice"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000023', 1, '{"text":"Что выведет код?","code":"let a = [1, 2, 3];\nlet b = a;\nb.push(4);\nconsole.log(a.length);","language":"javascript"}'::jsonb, '{"type":"text","accepted":["4"]}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000024', 1, '{"text":"Что такое замыкание (closure)?","options":[{"id":"a","text":"Функция вместе с доступом к переменным внешней области"},{"id":"b","text":"Цикл по массиву"},{"id":"c","text":"Способ создания класса"},{"id":"d","text":"Тип данных"}]}'::jsonb, '{"type":"choice","correct":["a"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000025', 1, '{"text":"Какое значение даст await для Promise.resolve(5).then(x => x * 2)?","options":[{"id":"a","text":"5"},{"id":"b","text":"10"},{"id":"c","text":"undefined"},{"id":"d","text":"Promise никогда не завершится"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000026', 1, '{"text":"Как объявить переменную числового типа в TypeScript?","options":[{"id":"a","text":"let x: number = 1"},{"id":"b","text":"let x = number(1)"},{"id":"c","text":"number x = 1"},{"id":"d","text":"let x as number = 1"}]}'::jsonb, '{"type":"choice","correct":["a"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000027', 1, '{"text":"Что означает тип unknown?","options":[{"id":"a","text":"Любой тип без проверок"},{"id":"b","text":"Значение неизвестного типа: перед использованием его нужно проверить"},{"id":"c","text":"То же, что never"},{"id":"d","text":"То же, что void"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000028', 1, '{"text":"Каким ключевым словом описывается форма объекта (кроме type)? Одно слово."}'::jsonb, '{"type":"text","accepted":["interface"]}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000029', 1, '{"text":"Какой хук хранит состояние компонента?","options":[{"id":"a","text":"useState"},{"id":"b","text":"useEffect"},{"id":"c","text":"useRef"},{"id":"d","text":"useMemo"}]}'::jsonb, '{"type":"choice","correct":["a"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000030', 1, '{"text":"Для чего нужен атрибут key в списках элементов?","options":[{"id":"a","text":"Для стилей"},{"id":"b","text":"Чтобы React мог идентифицировать элементы при перерисовке"},{"id":"c","text":"Для обработки событий"},{"id":"d","text":"Для доступности"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000031', 1, '{"text":"Когда срабатывает useEffect, если не передан массив зависимостей?","options":[{"id":"a","text":"Только при монтировании"},{"id":"b","text":"После каждого рендера"},{"id":"c","text":"Только при размонтировании"},{"id":"d","text":"Никогда"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now()),
    ('a0000000-0000-4000-8000-000000000032', 1, '{"text":"Что передать в setState, чтобы обновить состояние на основе предыдущего?","options":[{"id":"a","text":"Новое значение напрямую"},{"id":"b","text":"Функцию вида (prev) => новое значение"},{"id":"c","text":"Объект с ключом prev"},{"id":"d","text":"Ничего"}]}'::jsonb, '{"type":"choice","correct":["b"],"multiple":false}'::jsonb, 'published', now());

-- Шаблоны создаём черновиками: состав опубликованного шаблона менять нельзя, поэтому публикуем после вставки состава.
INSERT INTO assessment_templates (id, specialization_id, grade_id, version, time_limit_sec, pass_score, status) VALUES
    ('b0000000-0000-4000-8000-000000000001', (SELECT id FROM specializations WHERE code = 'backend'), (SELECT id FROM grades WHERE code = 'junior'), 1, 1800, 60, 'draft'),
    ('b0000000-0000-4000-8000-000000000002', (SELECT id FROM specializations WHERE code = 'frontend'), (SELECT id FROM grades WHERE code = 'junior'), 1, 1500, 60, 'draft');

INSERT INTO assessment_blueprints (template_id, skill_id, difficulty, question_count, weight) VALUES
    ('b0000000-0000-4000-8000-000000000001', (SELECT id FROM skills WHERE code = 'go'), 1, 4, 1.00),
    ('b0000000-0000-4000-8000-000000000001', (SELECT id FROM skills WHERE code = 'go'), 2, 2, 2.00),
    ('b0000000-0000-4000-8000-000000000001', (SELECT id FROM skills WHERE code = 'sql'), 1, 3, 1.00),
    ('b0000000-0000-4000-8000-000000000001', (SELECT id FROM skills WHERE code = 'sql'), 2, 1, 2.00),
    ('b0000000-0000-4000-8000-000000000001', (SELECT id FROM skills WHERE code = 'git'), 1, 2, 1.00),
    ('b0000000-0000-4000-8000-000000000002', (SELECT id FROM skills WHERE code = 'javascript'), 1, 4, 1.00),
    ('b0000000-0000-4000-8000-000000000002', (SELECT id FROM skills WHERE code = 'javascript'), 2, 2, 2.00),
    ('b0000000-0000-4000-8000-000000000002', (SELECT id FROM skills WHERE code = 'typescript'), 1, 2, 1.00),
    ('b0000000-0000-4000-8000-000000000002', (SELECT id FROM skills WHERE code = 'react'), 1, 3, 1.00);

UPDATE assessment_templates SET status = 'published', published_at = now() WHERE id IN ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002');

-- +goose Down

DELETE FROM assessment_templates WHERE id IN ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002');
DELETE FROM assessment_questions WHERE id IN ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000023', 'a0000000-0000-4000-8000-000000000024', 'a0000000-0000-4000-8000-000000000025', 'a0000000-0000-4000-8000-000000000026', 'a0000000-0000-4000-8000-000000000027', 'a0000000-0000-4000-8000-000000000028', 'a0000000-0000-4000-8000-000000000029', 'a0000000-0000-4000-8000-000000000030', 'a0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000032');
