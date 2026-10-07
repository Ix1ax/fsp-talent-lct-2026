package repository

// В выдаче остаются только одобренные названия навыков. Снимки вопросов и контакты не читаем.
const skillMatches = `COALESCE((SELECT jsonb_agg(jsonb_build_object(
 'id',s.id::text,'name',s.name,'required',n.required,'weight',n.weight,'effective_weight',n.weight*CASE WHEN n.required THEN 2 ELSE 1 END,
 'claimed_level',cs.claimed_level,'verified_level',e.level,
 'source',CASE WHEN e.level IS NOT NULL THEN 'test' WHEN cs.claimed_level IS NOT NULL THEN 'claimed' ELSE 'missing' END) ORDER BY s.id)
 FROM need_skills n JOIN skills s ON s.id=n.skill_id AND s.active AND s.moderation_status='approved'
 LEFT JOIN candidate_skills cs ON cs.candidate_id=p.id AND cs.skill_id=s.id
 LEFT JOIN skill_evidence e ON e.candidate_id=cs.candidate_id AND e.skill_id=cs.skill_id AND e.source='test'
 WHERE n.need_id=$10::uuid),'[]'::jsonb)`

// Это покрытие требований стека, а не вероятность найма. Подтверждение тестом весит больше самооценки.
// Если требований по навыкам нет, оценка отсутствует, а не становится искусственными 100%.
const weightedSkillScore = `(SELECT round((100 * SUM((skill->>'effective_weight')::numeric *
 CASE skill->>'source' WHEN 'test' THEN 1 WHEN 'claimed' THEN 0.5 ELSE 0 END)
 / NULLIF(SUM((skill->>'effective_weight')::numeric),0)),2)::float8 FROM jsonb_array_elements(skills) AS skill)`

// Вес критериев задаёт явное правило ранжирования, а не вероятность успешного найма.
// Неуказанные работодателем условия не участвуют в знаменателе; неизвестные данные дают ноль.
const similarityComponents = `VALUES
 ('specialization',30::numeric,CASE WHEN specialization_match THEN 1 ELSE 0 END::numeric,true,specialization_match IS NULL),
 ('grade',20,CASE WHEN grade_match THEN 1 ELSE 0 END,$14::smallint IS NOT NULL,grade_match IS NULL),
 ('skills',30,COALESCE(skill_score/100,0)::numeric,jsonb_array_length(skills)>0,false),
 ('work_format',10,CASE WHEN format_match THEN 1 ELSE 0 END,cardinality($11::smallint[])>0,format_match IS NULL),
 ('salary',5,CASE WHEN salary_match THEN 1 ELSE 0 END,$12::bigint IS NOT NULL,salary_match IS NULL),
 ('city',3,CASE WHEN city_match THEN 1 ELSE 0 END,$15::text IS NOT NULL,city_match IS NULL),
 ('timezone',2,CASE WHEN timezone_match THEN 1 ELSE 0 END,$16::text IS NOT NULL,timezone_match IS NULL)`
const similarityScore = `(SELECT round(100*SUM(weight*coefficient)/NULLIF(SUM(weight),0),2)::float8
 FROM (` + similarityComponents + `) factors(code,weight,coefficient,enabled,unknown) WHERE enabled)`
const similarityCriteria = `(SELECT jsonb_agg(jsonb_build_object('code',code,'weight',weight,'score',round(coefficient*100,2),
 'status',CASE WHEN unknown THEN 'unknown' WHEN coefficient=1 THEN 'matched' WHEN coefficient=0 THEN 'mismatched' ELSE 'partial' END) ORDER BY code)
 FROM (` + similarityComponents + `) factors(code,weight,coefficient,enabled,unknown) WHERE enabled)`
