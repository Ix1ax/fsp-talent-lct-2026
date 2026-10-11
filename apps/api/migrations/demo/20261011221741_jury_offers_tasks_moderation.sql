-- +goose Up
-- Метаданные сначала pending. demoseed загружает настоящие объекты в S3 и ставит ready.
INSERT INTO files(id,owner_user_id,bucket,object_key,purpose,original_name,media_type,size_bytes)
SELECT ('de000005-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       'de000001-0000-4000-8000-000000000002','fsp-private',
       'demo/jury-v1/document-'||n||'.pdf','company_document','Демо-документ компании '||n||'.pdf','application/pdf',1
FROM generate_series(1,4) n;
INSERT INTO company_documents(company_id,file_id)
SELECT ('de000003-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       ('de000005-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid FROM generate_series(1,4) n;
UPDATE companies SET verification_file_ids=ARRAY[('de000005-0000-4000-8000-'||right(id::text,12))::uuid]
WHERE id::text LIKE 'de000003-%' AND verification_status IN ('pending','verified','rejected');

INSERT INTO files(id,owner_user_id,bucket,object_key,purpose,original_name,media_type,size_bytes) VALUES
('de000005-0000-4000-8000-000000000010','de000001-0000-4000-8000-000000000002','fsp-private','demo/jury-v1/company-logo.png','company_logo','Демо-логотип.png','image/png',1),
('de000005-0000-4000-8000-000000000011','de000001-0000-4000-8000-000000000001','fsp-private','demo/jury-v1/candidate-avatar.png','candidate_avatar','Демо-аватар.png','image/png',1);
UPDATE companies SET logo_file_id='de000005-0000-4000-8000-000000000010' WHERE id='de000003-0000-4000-8000-000000000001';
UPDATE candidate_profiles SET avatar_file_id='de000005-0000-4000-8000-000000000011' WHERE id='de000002-0000-4000-8000-000000000001';

INSERT INTO files(id,owner_user_id,bucket,object_key,purpose,original_name,media_type,size_bytes)
SELECT ('de000005-0000-4000-8000-'||lpad((100+n)::text,12,'0'))::uuid,
       'de000001-0000-4000-8000-000000000002','fsp-private',
       'demo/jury-v1/task-'||n||'.md','company_task','Условие демо-задания '||n||'.md','text/plain; charset=utf-8',1
FROM generate_series(1,4) n;
INSERT INTO company_daily_tasks(id,company_id,created_by,title,description,specialization_id,grade_id,file_id,status,published_at,deadline_at,moderation_status)
SELECT ('de000006-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       'de000003-0000-4000-8000-000000000001','de000001-0000-4000-8000-000000000002',
       (ARRAY['Демо · API списка кандидатов — можно отправить решение','Демо · Кеширование — есть оценённое решение','Демо · Закрытое задание — история решений','Демо · Скрыто модератором'])[n],
       'Реализуйте сервис на Go с пагинацией, обработкой ошибок и тестами. Полное условие доступно в файле. Демонстрационное задание для жюри.',
       (SELECT id FROM specializations WHERE code='backend'),(SELECT id FROM grades WHERE code='junior'),
       ('de000005-0000-4000-8000-'||lpad((100+n)::text,12,'0'))::uuid,
       CASE WHEN n<=2 THEN 'open' ELSE 'closed' END,
       now()-make_interval(days=>n-1),now()+interval '14 days',
       CASE WHEN n=4 THEN 'hidden' ELSE 'published' END
FROM generate_series(1,4) n;

INSERT INTO files(id,owner_user_id,bucket,object_key,purpose,original_name,media_type,size_bytes)
SELECT ('de000005-0000-4000-8000-'||lpad((200+n)::text,12,'0'))::uuid,
       ('de000001-0000-4000-8000-'||lpad((CASE WHEN n<=10 THEN n+4 ELSE 1 END)::text,12,'0'))::uuid,
       'fsp-private','demo/jury-v1/solution-'||n||'.md','task_solution','Демо-решение '||n||'.md','text/plain; charset=utf-8',1
FROM generate_series(1,12) n;
INSERT INTO company_task_submissions(id,task_id,candidate_id,file_id,status,submitted_at,score,feedback,reviewed_at,reviewed_by)
SELECT ('de000007-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       ('de000006-0000-4000-8000-'||lpad((CASE WHEN n<=10 THEN 1 ELSE n-9 END)::text,12,'0'))::uuid,
       ('de000002-0000-4000-8000-'||lpad((CASE WHEN n<=10 THEN n+4 ELSE 1 END)::text,12,'0'))::uuid,
       ('de000005-0000-4000-8000-'||lpad((200+n)::text,12,'0'))::uuid,
       CASE WHEN n<=10 THEN 'submitted' ELSE 'reviewed' END,
       now()-interval '12 hours',
       CASE WHEN n=11 THEN 92 WHEN n=12 THEN 80 END,
       CASE WHEN n>10 THEN 'Демо: хорошая обработка ошибок и тесты. Рекомендуем добавить проверку конкурентного доступа.' END,
       CASE WHEN n>10 THEN now()-interval '1 hour' END,
       CASE WHEN n>10 THEN 'de000001-0000-4000-8000-000000000002'::uuid END
FROM generate_series(1,12) n;

INSERT INTO candidate_offers(id,company_id,candidate_id,created_by,need_id,company_name,title,description,salary_from_rub,salary_to_rub,contact_email,contact_url,status,created_at,viewed_at,responded_at)
SELECT ('de000008-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       'de000003-0000-4000-8000-000000000001',
       ('de000002-0000-4000-8000-'||lpad((CASE WHEN n<=5 THEN 1 ELSE n-1 END)::text,12,'0'))::uuid,
       'de000001-0000-4000-8000-000000000002','de000004-0000-4000-8000-000000000001',
       'Демо · Скаут Технологии',
       (CASE WHEN n<=5 THEN (ARRAY['Можно принять или отклонить','Просмотрено · давно без ответа','Принято · контакты доступны','Отклонено кандидатом','Истекло · кандидат не отвечал'])[n]
             ELSE 'Предложение демо-кандидату '||n END),
       'Демонстрационное предложение: разработка API на Go, удалённая работа, наставник, гибкое начало рабочего дня.',
       100000,170000,'employer@demo.fsp.test','https://example.org',
       CASE WHEN n=3 THEN 'accepted' WHEN n=4 THEN 'rejected' WHEN n=2 THEN 'viewed'
            WHEN n>5 AND n%4=0 THEN 'accepted' WHEN n>5 AND n%4=1 THEN 'rejected' WHEN n>5 AND n%4=2 THEN 'viewed' ELSE 'sent' END,
       now()-make_interval(days=>CASE WHEN n=3 THEN 45 WHEN n=5 THEN 20 WHEN n=2 THEN 8 ELSE 1 END),
       CASE WHEN n=3 THEN now()-interval '44 days' WHEN n IN (2,4) OR (n>5 AND n%4 IN (0,1,2)) THEN now()-interval '20 hours' END,
       CASE WHEN n=3 THEN now()-interval '44 days'+interval '1 hour' WHEN n=4 OR (n>5 AND n%4 IN (0,1)) THEN now()-interval '18 hours' END
FROM generate_series(1,32) n;
INSERT INTO company_candidate_interactions(company_id,candidate_id,last_viewed_at,last_offered_at)
SELECT company_id,candidate_id,max(created_at),max(created_at)
FROM candidate_offers WHERE id::text LIKE 'de000008-%' GROUP BY company_id,candidate_id;

-- Очереди и закрытые состояния для проверки модерации и блокировок.
UPDATE users SET status='blocked',blocked_reason='Демо: пример блокировки пользователя' WHERE id='de000001-0000-4000-8000-000000000036';
UPDATE companies SET status='blocked',blocked_reason='Демо: пример блокировки компании',blocked_at=now() WHERE id='de000003-0000-4000-8000-000000000004';
UPDATE employer_needs SET moderation_status='hidden' WHERE id='de000004-0000-4000-8000-000000000024';
INSERT INTO skills(id,code,name,active,moderation_status,submitted_by,submitted_at) VALUES
('de000012-0000-4000-8000-000000000001','demo-grpc','Демо · gRPC',false,'pending','de000001-0000-4000-8000-000000000001',now()),
('de000012-0000-4000-8000-000000000002','demo-observability','Демо · Observability',false,'pending','de000001-0000-4000-8000-000000000001',now()),
('de000012-0000-4000-8000-000000000003','demo-rejected-skill','Демо · Отклонённый навык',false,'rejected','de000001-0000-4000-8000-000000000001',now());
UPDATE skills SET moderated_by='de000010-0000-4000-8000-000000000001',moderated_at=now(),moderation_reason='Демо: уточните название навыка'
WHERE id='de000012-0000-4000-8000-000000000003';

INSERT INTO admin_operation_events(actor_admin_id,action,entity_type,entity_id,new_status,reason)
SELECT 'de000010-0000-4000-8000-000000000001','demo.seeded','company',id,verification_status,
       'Создана синтетическая демонстрационная компания для жюри'
FROM companies WHERE id::text LIKE 'de000003-%';
INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id,metadata)
SELECT user_id,'demo.seeded','candidate',id,'{"synthetic":true,"dataset":"jury-v1"}'::jsonb
FROM candidate_profiles WHERE id::text LIKE 'de000002-%';

-- +goose Down
DELETE FROM audit_events WHERE action='demo.seeded' AND entity_id::text LIKE 'de000002-%';
DELETE FROM admin_operation_events WHERE action='demo.seeded' AND entity_id::text LIKE 'de000003-%';
DELETE FROM admin_catalog_events WHERE item_id LIKE 'de000012-%';
DELETE FROM skills WHERE id::text LIKE 'de000012-%';
DELETE FROM company_candidate_interactions WHERE company_id::text LIKE 'de000003-%';
DELETE FROM candidate_offers WHERE id::text LIKE 'de000008-%';
DELETE FROM company_task_submissions WHERE id::text LIKE 'de000007-%';
DELETE FROM company_daily_tasks WHERE id::text LIKE 'de000006-%';
DELETE FROM company_documents WHERE file_id::text LIKE 'de000005-%';
UPDATE companies SET logo_file_id=NULL,verification_file_ids='{}' WHERE id::text LIKE 'de000003-%';
UPDATE candidate_profiles SET avatar_file_id=NULL WHERE id::text LIKE 'de000002-%';
DELETE FROM files WHERE id::text LIKE 'de000005-%';
