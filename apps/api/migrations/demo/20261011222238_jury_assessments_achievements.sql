-- +goose Up
-- История синтетических попыток: действующие опубликованные вопросы копируются как в обычном тесте.
INSERT INTO assessment_attempts(id,candidate_id,template_id,specialization_id,grade_id,status,started_at,deadline_at,time_limit_sec,pass_score,stack_skill_id,stack_name)
SELECT ('de000009-0000-4000-8000-'||right(p.id::text,12))::uuid,p.id,t.id,t.specialization_id,t.grade_id,
       'active',now()-interval '15 days',now()-interval '15 days'+make_interval(secs=>t.time_limit_sec),t.time_limit_sec,t.pass_score,t.stack_skill_id,k.name
FROM candidate_profiles p JOIN candidate_onboarding o ON o.candidate_id=p.id
JOIN assessment_templates t ON t.specialization_id=o.specialization_id AND t.grade_id=o.grade_id AND t.stack_skill_id=o.stack_skill_id AND t.status='published'
JOIN skills k ON k.id=t.stack_skill_id WHERE p.id::text LIKE 'de000002-%';
WITH selected AS (
 SELECT a.id attempt_id,b.skill_id,b.difficulty,b.weight/b.question_count points,v.id version_id,v.prompt,v.grading_spec,
        row_number() OVER(PARTITION BY a.id,b.id ORDER BY v.id) bucket_position,b.question_count
 FROM assessment_attempts a JOIN assessment_blueprints b ON b.template_id=a.template_id
 JOIN assessment_questions q ON q.skill_id=b.skill_id AND q.difficulty=b.difficulty AND q.active
 JOIN assessment_question_versions v ON v.question_id=q.id AND v.status='published'
 WHERE a.id::text LIKE 'de000009-%'
)
INSERT INTO attempt_questions(attempt_id,position,question_version_id,skill_id,difficulty,points,prompt_snapshot,grading_snapshot)
SELECT attempt_id,row_number() OVER(PARTITION BY attempt_id ORDER BY skill_id,difficulty,version_id),version_id,skill_id,difficulty,points,prompt,grading_spec
FROM selected WHERE bucket_position<=question_count;
-- Для неуспешных попыток ответы отсутствуют: итог 0%, без ложных подтверждений навыков.
INSERT INTO attempt_answers(attempt_question_id,answer,answered_at,is_correct,awarded)
SELECT q.id,CASE WHEN q.grading_snapshot->>'type'='choice' THEN jsonb_build_object('selected',q.grading_snapshot->'correct')
 ELSE jsonb_build_object('text',q.grading_snapshot->'accepted'->>0) END,a.started_at+interval '5 minutes',true,q.points
FROM attempt_questions q JOIN assessment_attempts a ON a.id=q.attempt_id
WHERE a.id::text LIKE 'de000009-%' AND right(a.id::text,12)::int%6<>0;
UPDATE assessment_attempts SET status=CASE WHEN right(id::text,12)::int%6=0 THEN 'failed' ELSE 'passed' END,
 finished_at=started_at+interval '10 minutes',score_percent=CASE WHEN right(id::text,12)::int%6=0 THEN 0 ELSE 100 END
WHERE id::text LIKE 'de000009-%';
INSERT INTO skill_evidence(candidate_id,skill_id,source,level,attempt_id,updated_at)
SELECT DISTINCT a.candidate_id,q.skill_id,'test',5,a.id,a.finished_at
FROM assessment_attempts a JOIN attempt_questions q ON q.attempt_id=a.id WHERE a.id::text LIKE 'de000009-%' AND a.status='passed';
INSERT INTO grade_history(candidate_id,specialization_id,grade_id,attempt_id,achieved_at)
SELECT candidate_id,specialization_id,grade_id,id,finished_at FROM assessment_attempts WHERE id::text LIKE 'de000009-%' AND status='passed';
INSERT INTO candidate_categories(candidate_id,specialization_id,grade_id,attempt_id,confirmed_at)
SELECT candidate_id,specialization_id,grade_id,id,finished_at FROM assessment_attempts WHERE id::text LIKE 'de000009-%' AND status='passed';

-- Это явно демонстрационный снимок mock-реестра, не настоящие спортивные результаты.
INSERT INTO fsp_links(candidate_id,participant_id,source,synced_at,sync_status)
SELECT id,'jury-demo-'||right(id::text,12),'fsp_mock',now(),'ready' FROM candidate_profiles
WHERE id::text LIKE 'de000002-%' AND (right(id::text,12)::int%4=0 OR right(id::text,12)::int=1);
INSERT INTO fsp_achievements(candidate_id,external_id,event_id,event_name,discipline,occurred_on,result,place,source)
SELECT candidate_id,'jury-demo-achievement','jury-demo-cup','Демо · Кубок ФСП — синтетический пример','Продуктовое программирование',date '2026-09-10','Демонстрационный призёр',2,'fsp_mock'
FROM fsp_links WHERE participant_id LIKE 'jury-demo-%';

-- Черновик доступен администратору для проверки редактирования и публикации.
INSERT INTO assessment_questions(id,skill_id,difficulty,kind,created_by)
VALUES('de000013-0000-4000-8000-000000000001',(SELECT id FROM skills WHERE code='go'),1,'short_answer','de000010-0000-4000-8000-000000000001');
INSERT INTO assessment_question_versions(question_id,version,prompt,grading_spec,created_by)
VALUES('de000013-0000-4000-8000-000000000001',1,'{"text":"Демо: каким ключевым словом объявляется функция в Go?"}',
 '{"type":"text","accepted":["func"]}','de000010-0000-4000-8000-000000000001');

-- +goose Down
DELETE FROM assessment_events WHERE entity_id::text LIKE 'de000013-%';
DELETE FROM assessment_questions WHERE id::text LIKE 'de000013-%';
DELETE FROM fsp_links WHERE candidate_id::text LIKE 'de000002-%';
DELETE FROM assessment_attempts WHERE id::text LIKE 'de000009-%';
