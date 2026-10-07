package repository

// Дополнительные фильтры не обходят категорию, обязательные навыки и согласия.
const qualificationEligibility = `
 AND category.specialization_id=$12::smallint AND ($13::smallint IS NULL OR category.grade_id=$13::smallint)
 AND NOT EXISTS (
 SELECT 1 FROM need_skills n JOIN skills s ON s.id=n.skill_id
 WHERE n.need_id=$11::uuid AND n.required AND s.active AND s.moderation_status='approved'
 AND NOT EXISTS(SELECT 1 FROM candidate_skills cs WHERE cs.candidate_id=p.id AND cs.skill_id=n.skill_id
 AND (cs.claimed_level IS NOT NULL OR EXISTS(SELECT 1 FROM skill_evidence e WHERE e.candidate_id=p.id AND e.skill_id=n.skill_id AND e.source='test'))))`

// В выдаче остаются только одобренные названия навыков. Снимки вопросов и контакты не читаем.
const skillMatches = `COALESCE((SELECT jsonb_agg(jsonb_build_object(
 'id',s.id::text,'name',s.name,'required',n.required,'weight',n.weight,
 'claimed_level',cs.claimed_level,'verified_level',e.level,
 'source',CASE WHEN e.level IS NOT NULL THEN 'test' WHEN cs.claimed_level IS NOT NULL THEN 'claimed' ELSE 'missing' END) ORDER BY s.id)
 FROM need_skills n JOIN skills s ON s.id=n.skill_id AND s.active AND s.moderation_status='approved'
 LEFT JOIN candidate_skills cs ON cs.candidate_id=p.id AND cs.skill_id=s.id
 LEFT JOIN skill_evidence e ON e.candidate_id=cs.candidate_id AND e.skill_id=cs.skill_id AND e.source='test'
 WHERE n.need_id=$11::uuid),'[]'::jsonb)`

// Это покрытие требований стека, а не вероятность найма. Подтверждение тестом весит больше самооценки.
// Если требований по навыкам нет, оценка отсутствует, а не становится искусственными 100%.
const weightedSkillScore = `(SELECT (100 * SUM((skill->>'weight')::numeric *
 CASE skill->>'source' WHEN 'test' THEN 1 WHEN 'claimed' THEN 0.5 ELSE 0 END)
 / NULLIF(SUM((skill->>'weight')::numeric),0))::float8 FROM jsonb_array_elements(skills) AS skill)`
