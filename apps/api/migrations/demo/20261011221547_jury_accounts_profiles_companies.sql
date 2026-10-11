-- +goose Up
-- Синтетические данные для жюри. UUID выделены в отдельное пространство de0000xx.
-- Пароли Keycloak и привязку реальных sub создаёт demoseed после SQL-миграций.

INSERT INTO users(id,role)
SELECT ('de000001-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
       CASE WHEN n BETWEEN 2 AND 4 THEN 'employer' ELSE 'candidate' END
FROM generate_series(1,37) n;

-- Админка отделена от Keycloak. Хеш пароля устанавливает demoseed перед открытием API.
INSERT INTO admin_accounts(id,email,password_hash,role)
VALUES('de000010-0000-4000-8000-000000000001','admin@demo.fsp.test','demo-account-not-activated','admin');

INSERT INTO candidate_profiles(id,user_id,headline,summary,city,timezone,experience_months,salary_min_rub,search_status,created_at)
SELECT ('de000002-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
       ('de000001-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
       CASE WHEN n=1 THEN 'Go-разработчик · демо-профиль для жюри'
            WHEN n%3=0 THEN 'Frontend-разработчик · React и TypeScript'
            ELSE 'Backend-разработчик · Go и PostgreSQL' END,
       'Демонстрационный профиль с вымышленными данными. Разрабатываю сервисы, покрываю код тестами, работаю с командой и документацией.',
       (ARRAY['Москва','Санкт-Петербург','Казань','Тверь'])[1+n%4], 'Europe/Moscow',
       12+(n%8)*6,70000+(n%8)*15000,
       CASE WHEN n=35 THEN 'hidden' WHEN n%7=0 THEN 'passive' ELSE 'open' END,
       now()-make_interval(days=>n)
FROM generate_series(1,36) n WHERE n NOT BETWEEN 2 AND 4;

INSERT INTO candidate_consents(user_id,kind,policy_version)
SELECT user_id,kind,'v1' FROM candidate_profiles,
unnest(ARRAY['processing','publication']) kind WHERE id::text LIKE 'de000002-%';

INSERT INTO candidate_contacts(user_id,full_name,email,phone,telegram)
SELECT user_id,
       CASE WHEN right(user_id::text,12)::int=1 THEN 'Алексей Демо'
            ELSE 'Демо-кандидат '||right(user_id::text,12)::int END,
       CASE WHEN right(user_id::text,12)::int=1 THEN 'candidate@demo.fsp.test'
            ELSE 'candidate'||right(user_id::text,12)::int||'@demo.fsp.test' END,
       '+7000000'||lpad(right(user_id::text,12)::int::text,4,'0'),
       'fsp_demo_'||right(user_id::text,12)::int
FROM candidate_profiles WHERE id::text LIKE 'de000002-%';

INSERT INTO candidate_work_formats(candidate_id,work_format_id)
SELECT p.id,w.id FROM candidate_profiles p,work_formats w
WHERE p.id::text LIKE 'de000002-%' AND w.code IN ('remote','hybrid');

INSERT INTO candidate_onboarding(candidate_id,industry,specialization_id,grade_id,stack_skill_id,soft_skills)
SELECT p.id,'Информационные технологии',s.id,g.id,k.id,ARRAY['Командная работа','Ответственность','Коммуникация']
FROM candidate_profiles p
JOIN specializations s ON s.code=CASE WHEN right(p.id::text,12)::int%3=0 THEN 'frontend' ELSE 'backend' END
JOIN grades g ON g.code='junior'
JOIN skills k ON k.code=CASE WHEN s.code='frontend' THEN 'javascript' ELSE 'go' END
WHERE p.id::text LIKE 'de000002-%';

INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level)
SELECT p.id,s.id,2+(right(p.id::text,12)::int%3)
FROM candidate_profiles p,skills s
WHERE p.id::text LIKE 'de000002-%'
AND (s.code IN ('git','sql','postgresql','docker')
 OR (right(p.id::text,12)::int%3=0 AND s.code IN ('javascript','typescript','react'))
 OR (right(p.id::text,12)::int%3<>0 AND s.code IN ('go','redis')));

INSERT INTO candidate_experiences(candidate_id,company,position,started_on,description)
SELECT id,'Демо · Технологии роста','Разработчик',date_trunc('month',now()-interval '2 years')::date,
       'Создание API, работа с базами данных, автоматические тесты, участие в код-ревью. Все сведения вымышлены.'
FROM candidate_profiles WHERE id::text LIKE 'de000002-%';
INSERT INTO candidate_education(candidate_id,level,institution,specialty,graduation_year)
SELECT id,'bachelor','Демонстрационный технический университет','Программная инженерия',2024
FROM candidate_profiles WHERE id::text LIKE 'de000002-%';

INSERT INTO companies(id,name,description,contact_email,contact_url,verification_status,verification_version,verification_requested_at,verification_reviewed_at,verification_reason)
SELECT ('de000003-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       (ARRAY['Демо · Скаут Технологии','Демо · На проверке','Демо · Новая компания','Демо · Требуются документы'])[n],
       'Демонстрационная компания для проверки кабинета работодателя. Все данные вымышлены.',
       'employer@demo.fsp.test','https://example.org',
       (ARRAY['verified','pending','unverified','rejected'])[n],
       CASE WHEN n=3 THEN 0 ELSE 1 END,
       CASE WHEN n<>3 THEN now()-interval '2 days' END,
       CASE WHEN n IN (1,4) THEN now()-interval '1 day' END,
       CASE WHEN n=4 THEN 'Демо: загрузите документ с полным названием компании.' END
FROM generate_series(1,4) n;

INSERT INTO company_members(company_id,user_id,role)
SELECT id,'de000001-0000-4000-8000-000000000002','owner'
FROM companies WHERE id::text LIKE 'de000003-%';
INSERT INTO company_members(company_id,user_id,role) VALUES
('de000003-0000-4000-8000-000000000001','de000001-0000-4000-8000-000000000003','recruiter'),
('de000003-0000-4000-8000-000000000001','de000001-0000-4000-8000-000000000004','viewer');

INSERT INTO company_invitations(id,company_id,created_by,email,role,token_hash,status,expires_at,accepted_by,accepted_at)
SELECT ('de000011-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       'de000003-0000-4000-8000-000000000001','de000001-0000-4000-8000-000000000002',
       (ARRAY['invite@demo.fsp.test','recruiter@demo.fsp.test','viewer@demo.fsp.test','revoked@demo.fsp.test'])[n],
       CASE WHEN n=3 THEN 'viewer' ELSE 'recruiter' END,
       repeat(md5('fsp-jury-invite-'||n),2),
       CASE WHEN n IN (2,3) THEN 'accepted' WHEN n=4 THEN 'revoked' ELSE 'pending' END,
       now()+interval '7 days',
       CASE WHEN n IN (2,3) THEN ('de000001-0000-4000-8000-'||lpad((n+1)::text,12,'0'))::uuid END,
       CASE WHEN n IN (2,3) THEN now() END
FROM generate_series(1,4) n;

INSERT INTO employer_needs(id,company_id,created_by,specialization_id,grade_id,title,description,salary_from_rub,salary_to_rub,city,timezone,status)
SELECT ('de000004-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       'de000003-0000-4000-8000-000000000001','de000001-0000-4000-8000-000000000002',s.id,g.id,
       CASE WHEN n%3=0 THEN 'React-разработчик · демо ' ELSE 'Go-разработчик · демо ' END||n,
       'Разработка продукта ФСП Скаут: API, поиск, автоматические тесты и взаимодействие с командой. Демо-потребность для проверки подбора.',
       90000+n*1000,160000+n*1000,'Москва','Europe/Moscow',
       CASE WHEN n>24 THEN 'draft' WHEN n>20 THEN 'archived' ELSE 'active' END
FROM generate_series(1,28) n
JOIN specializations s ON s.code=CASE WHEN n%3=0 THEN 'frontend' ELSE 'backend' END
JOIN grades g ON g.code='junior';
INSERT INTO need_skills(need_id,skill_id,required,weight)
SELECT n.id,k.id,true,2 FROM employer_needs n JOIN specializations s ON s.id=n.specialization_id
JOIN skills k ON k.code=CASE WHEN s.code='frontend' THEN 'javascript' ELSE 'go' END
WHERE n.id::text LIKE 'de000004-%';
INSERT INTO need_skills(need_id,skill_id,required,weight)
SELECT n.id,k.id,false,1 FROM employer_needs n,skills k
WHERE n.id::text LIKE 'de000004-%' AND k.code IN ('git','sql');
INSERT INTO need_work_formats(need_id,work_format_id)
SELECT n.id,w.id FROM employer_needs n,work_formats w
WHERE n.id::text LIKE 'de000004-%' AND w.code IN ('remote','hybrid');

-- +goose Down
DELETE FROM employer_needs WHERE id::text LIKE 'de000004-%';
DELETE FROM company_invitations WHERE id::text LIKE 'de000011-%';
DELETE FROM company_members WHERE company_id::text LIKE 'de000003-%';
DELETE FROM companies WHERE id::text LIKE 'de000003-%';
DELETE FROM candidate_profiles WHERE id::text LIKE 'de000002-%';
DELETE FROM users WHERE id::text LIKE 'de000001-%';
DELETE FROM admin_accounts WHERE id='de000010-0000-4000-8000-000000000001';
