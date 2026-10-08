package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	candidateentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
)

// lockCandidate берёт блокировки в общем порядке: пользователь (FOR SHARE), профиль (FOR SHARE), затем
// advisory-блокировка кандидата, которая сериализует старт, ответы и завершение его попыток.
// Не активный кандидат получает ErrForbidden, кандидат без профиля — ErrNotFound кандидатского модуля.
func lockCandidate(ctx context.Context, tx pgx.Tx, userID string) (string, error) {
	// Общая блокировка изменений навыков берётся первой, как в PutSkill: итоги теста пишут навыки кандидата,
	// и модерация (слияние, отклонение) не должна пересекаться с этим.
	if err := catalog.LockSkillChanges(ctx, tx); err != nil {
		return "", err
	}
	var ok bool
	err := tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='candidate' AND status='active' FOR SHARE`, userID).Scan(&ok)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", candidateentity.ErrForbidden
	}
	if err != nil {
		return "", err
	}
	var profileID string
	err = tx.QueryRow(ctx, `SELECT id::text FROM candidate_profiles WHERE user_id=$1 FOR SHARE`, userID).Scan(&profileID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", candidateentity.ErrNotFound
	}
	if err != nil {
		return "", err
	}
	_, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended('assessment_attempt:'||$1::text,0))`, profileID)
	return profileID, err
}

func hasProcessingConsent(ctx context.Context, q querier, userID string) (bool, error) {
	var active bool
	err := q.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM candidate_consents WHERE user_id=$1 AND kind='processing' AND company_id IS NULL AND revoked_at IS NULL)`, userID).Scan(&active)
	return active, err
}

func requireProcessingConsent(ctx context.Context, tx pgx.Tx, userID string) error {
	active, err := hasProcessingConsent(ctx, tx, userID)
	if err == nil && !active {
		return candidateentity.ErrConsentRequired
	}
	return err
}

// closeExpired закрывает просроченную активную попытку кандидата. Вызывается под advisory-блокировкой.
func closeExpired(ctx context.Context, tx pgx.Tx, profileID string) error {
	var id string
	err := tx.QueryRow(ctx, `SELECT id::text FROM assessment_attempts WHERE candidate_id=$1 AND status='active' AND deadline_at<=clock_timestamp() FOR UPDATE`, profileID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	return finalizeLocked(ctx, tx, profileID, id, true)
}

func (r *Repository) StartAttempt(ctx context.Context, userID string, specializationID, gradeID int16, retakeDays int, stackSkillID string) (entity.Attempt, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Attempt{}, err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockCandidate(ctx, tx, userID)
	if err != nil {
		return entity.Attempt{}, err
	}
	if err = requireProcessingConsent(ctx, tx, userID); err != nil {
		return entity.Attempt{}, err
	}
	if err = closeExpired(ctx, tx, profileID); err != nil {
		return entity.Attempt{}, err
	}
	// Отказ в старте не должен откатывать ленивое закрытие просроченной попытки: иначе брошенный тест
	// продолжит блокировать пару, а его итоги не сохранятся.
	reject := func(reason error) (entity.Attempt, error) {
		if err := tx.Commit(ctx); err != nil {
			return entity.Attempt{}, err
		}
		return entity.Attempt{}, reason
	}
	var activeID string
	err = tx.QueryRow(ctx, `SELECT id::text FROM assessment_attempts WHERE candidate_id=$1 AND status='active'`, profileID).Scan(&activeID)
	if err == nil {
		return reject(&entity.ActiveError{AttemptID: activeID})
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return entity.Attempt{}, err
	}
	var known bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM specializations s,grades g WHERE s.id=$1 AND g.id=$2 AND s.active AND g.active FOR SHARE OF s,g)`, specializationID, gradeID).Scan(&known); err != nil {
		return entity.Attempt{}, err
	}
	if !known {
		return reject(entity.ErrUnavailable)
	}
	state, err := pairState(ctx, tx, profileID, retakeDays)
	if err != nil {
		return entity.Attempt{}, err
	}
	switch st := state(specializationID, gradeID, stackSkillID); st.Reason {
	case entity.ReasonConfirmed:
		return reject(entity.ErrAlreadyConfirmed)
	case entity.ReasonGradeChange:
		return reject(&entity.GradeChangeError{RetryAt: *st.RetryAt})
	case entity.ReasonCooldown:
		return reject(&entity.RetakeError{RetryAt: *st.RetryAt})
	}

	var templateID string
	var limit int
	var passScore float64
	var stackName string
	err = tx.QueryRow(ctx, `SELECT t.id::text,t.time_limit_sec,t.pass_score,s.name FROM assessment_templates t JOIN skills s ON s.id=t.stack_skill_id AND s.active AND s.moderation_status='approved' WHERE t.specialization_id=$1 AND t.grade_id=$2 AND t.stack_skill_id=$3 AND t.status='published' FOR SHARE OF t,s`, specializationID, gradeID, stackSkillID).Scan(&templateID, &limit, &passScore, &stackName)
	if errors.Is(err, pgx.ErrNoRows) {
		return reject(entity.ErrUnavailable)
	}
	if err != nil {
		return entity.Attempt{}, err
	}
	picked, err := pickQuestions(ctx, tx, templateID)
	if errors.Is(err, entity.ErrUnavailable) {
		return reject(err)
	}
	if err != nil {
		return entity.Attempt{}, err
	}
	var attemptID string
	err = tx.QueryRow(ctx, `INSERT INTO assessment_attempts(candidate_id,template_id,specialization_id,grade_id,status,deadline_at,time_limit_sec,pass_score,stack_skill_id,stack_name)
 VALUES($1,$2,$3,$4,'active',clock_timestamp()+make_interval(secs=>$5::int),$5::int,$6,$7,$8) RETURNING id::text`, profileID, templateID, specializationID, gradeID, limit, passScore, stackSkillID, stackName).Scan(&attemptID)
	if err != nil {
		return entity.Attempt{}, err
	}
	for i, p := range picked {
		_, err = tx.Exec(ctx, `INSERT INTO attempt_questions(attempt_id,position,question_version_id,skill_id,difficulty,points,prompt_snapshot,grading_snapshot)
 SELECT $1,$2,v.id,$4,$5,$6,v.prompt,v.grading_spec FROM assessment_question_versions v WHERE v.id=$3`, attemptID, i+1, p.versionID, p.skillID, p.difficulty, p.points)
		if err != nil {
			return entity.Attempt{}, err
		}
	}
	attempt, err := loadAttempt(ctx, tx, attemptID, retakeDays)
	if err != nil {
		return attempt, err
	}
	return attempt, tx.Commit(ctx)
}

type pickedQuestion struct {
	versionID, skillID string
	difficulty         int16
	points             float64
}

// pickQuestions выбирает случайные активные задания с опубликованной версией по строкам состава и блокирует их FOR SHARE,
// чтобы администратор не архивировал их в момент выдачи. Нехватка даёт ErrUnavailable.
func pickQuestions(ctx context.Context, tx pgx.Tx, templateID string) ([]pickedQuestion, error) {
	type row struct {
		skillID    string
		difficulty int16
		count      int
		weight     float64
	}
	rows, err := tx.Query(ctx, `SELECT skill_id::text,difficulty,question_count,weight::float8 FROM assessment_blueprints WHERE template_id=$1 ORDER BY skill_id,difficulty`, templateID)
	if err != nil {
		return nil, err
	}
	var blueprint []row
	for rows.Next() {
		var b row
		if err = rows.Scan(&b.skillID, &b.difficulty, &b.count, &b.weight); err != nil {
			rows.Close()
			return nil, err
		}
		blueprint = append(blueprint, b)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return nil, err
	}
	var picked []pickedQuestion
	for _, b := range blueprint {
		versions, err := tx.Query(ctx, `SELECT v.id::text FROM assessment_questions q JOIN assessment_question_versions v ON v.question_id=q.id AND v.status='published'
 JOIN skills s ON s.id=q.skill_id AND s.active AND s.moderation_status='approved'
 WHERE q.skill_id=$1 AND q.difficulty=$2 AND q.active ORDER BY random() LIMIT $3 FOR SHARE OF q, v, s`, b.skillID, b.difficulty, b.count)
		if err != nil {
			return nil, err
		}
		n := 0
		for versions.Next() {
			var id string
			if err = versions.Scan(&id); err != nil {
				versions.Close()
				return nil, err
			}
			picked = append(picked, pickedQuestion{versionID: id, skillID: b.skillID, difficulty: b.difficulty, points: entity.QuestionPoints(b.weight, b.count)})
			n++
		}
		versions.Close()
		if err = versions.Err(); err != nil {
			return nil, err
		}
		if n < b.count {
			return nil, entity.ErrUnavailable
		}
	}
	return picked, nil
}

// pairState возвращает функцию, которая по паре (специализация, грейд) говорит, можно ли начать тест.
// Подтверждённым считается грейд не выше уже пройденного в той же специализации; срок пересдачи считается
// от последней неудачной или просроченной попытки пары.
func pairState(ctx context.Context, q querier, profileID string, retakeDays int) (func(spec, grade int16, stack string) entity.AvailableTemplate, error) {
	type scope struct {
		spec  int16
		stack string
	}
	ranks := map[scope]int16{}
	rows, err := q.Query(ctx, `SELECT h.specialization_id,coalesce(a.stack_skill_id::text,''),max(g.rank) FROM grade_history h JOIN grades g ON g.id=h.grade_id JOIN assessment_attempts a ON a.id=h.attempt_id WHERE h.candidate_id=$1 GROUP BY h.specialization_id,a.stack_skill_id`, profileID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var spec, rank int16
		var stack string
		if err = rows.Scan(&spec, &stack, &rank); err != nil {
			rows.Close()
			return nil, err
		}
		ranks[scope{spec, stack}] = rank
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return nil, err
	}
	gradeRank := map[int16]int16{}
	rows, err = q.Query(ctx, `SELECT id,rank FROM grades`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id, rank int16
		if err = rows.Scan(&id, &rank); err != nil {
			rows.Close()
			return nil, err
		}
		gradeRank[id] = rank
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return nil, err
	}
	type pair struct {
		spec, grade int16
		stack       string
	}
	last := map[pair]time.Time{}
	rows, err = q.Query(ctx, `SELECT specialization_id,grade_id,coalesce(stack_skill_id::text,''),max(finished_at) FROM assessment_attempts WHERE candidate_id=$1 AND status IN ('failed','expired') GROUP BY specialization_id,grade_id,stack_skill_id`, profileID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var p pair
		var at time.Time
		if err = rows.Scan(&p.spec, &p.grade, &p.stack, &at); err != nil {
			rows.Close()
			return nil, err
		}
		last[p] = at
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return nil, err
	}
	var now time.Time
	if err = q.QueryRow(ctx, `SELECT clock_timestamp()`).Scan(&now); err != nil {
		return nil, err
	}
	var lastSuccess *time.Time
	var latestSpec, latestGrade int16
	if err = q.QueryRow(ctx, `SELECT coalesce((SELECT specialization_id FROM grade_history WHERE candidate_id=$1 ORDER BY achieved_at DESC,id DESC LIMIT 1),0),coalesce((SELECT grade_id FROM grade_history WHERE candidate_id=$1 ORDER BY achieved_at DESC,id DESC LIMIT 1),0)`, profileID).Scan(&latestSpec, &latestGrade); err != nil {
		return nil, err
	}
	if err = q.QueryRow(ctx, `SELECT max(achieved_at) FROM grade_history WHERE candidate_id=$1`, profileID).Scan(&lastSuccess); err != nil {
		return nil, err
	}
	return func(spec, grade int16, stack string) entity.AvailableTemplate {
		out := entity.AvailableTemplate{StackSkillID: stack, SpecializationID: spec, GradeID: grade, CanStart: true, Reason: entity.ReasonOK}
		if target, known := gradeRank[grade]; known && entity.Confirmed(ranks[scope{spec, stack}], target) && ranks[scope{spec, stack}] > 0 {
			out.CanStart, out.Reason, out.Confirmed = false, entity.ReasonConfirmed, true
			return out
		}
		if lastSuccess != nil && (latestSpec != spec || latestGrade != grade) {
			retry := lastSuccess.Add(entity.GradeChangeDays * 24 * time.Hour)
			if now.Before(retry) {
				out.CanStart, out.Reason, out.RetryAt = false, entity.ReasonGradeChange, &retry
				return out
			}
		}
		if at, ok := last[pair{spec, grade, stack}]; ok {
			if allowed, retryAt := entity.CheckRetake(now, &at, retakeDays); !allowed {
				out.CanStart, out.Reason, out.RetryAt = false, entity.ReasonCooldown, &retryAt
			}
		}
		return out
	}, nil
}

func (r *Repository) Available(ctx context.Context, userID string, retakeDays int) ([]entity.AvailableTemplate, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockCandidate(ctx, tx, userID)
	if err != nil {
		return nil, err
	}
	if err = closeExpired(ctx, tx, profileID); err != nil {
		return nil, err
	}
	var active bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM assessment_attempts WHERE candidate_id=$1 AND status='active')`, profileID).Scan(&active); err != nil {
		return nil, err
	}
	consent, err := hasProcessingConsent(ctx, tx, userID)
	if err != nil {
		return nil, err
	}
	state, err := pairState(ctx, tx, profileID, retakeDays)
	if err != nil {
		return nil, err
	}
	rows, err := tx.Query(ctx, `SELECT t.stack_skill_id::text,sk.name,t.specialization_id,t.grade_id,t.time_limit_sec,t.pass_score::float8,
 (SELECT coalesce(sum(b.question_count),0) FROM assessment_blueprints b WHERE b.template_id=t.id)::int,
 NOT EXISTS (SELECT 1 FROM assessment_blueprints b WHERE b.template_id=t.id AND `+availableExpr+` < b.question_count)
 FROM assessment_templates t JOIN skills sk ON sk.id=t.stack_skill_id AND sk.active AND sk.moderation_status='approved' JOIN grades g ON g.id=t.grade_id JOIN specializations s ON s.id=t.specialization_id WHERE t.status='published' AND s.active AND g.active ORDER BY t.specialization_id,g.rank`)
	if err != nil {
		return nil, err
	}
	items := []entity.AvailableTemplate{}
	for rows.Next() {
		var spec, grade int16
		var stack, stackName string
		var limit, count int
		var pass float64
		var enough bool
		if err = rows.Scan(&stack, &stackName, &spec, &grade, &limit, &pass, &count, &enough); err != nil {
			rows.Close()
			return nil, err
		}
		item := state(spec, grade, stack)
		item.StackName = stackName
		item.TimeLimitSec, item.PassScore, item.QuestionCount = limit, pass, count
		switch {
		case active:
			item.CanStart, item.Reason, item.RetryAt = false, entity.ReasonActive, nil
		case !consent && item.CanStart:
			item.CanStart, item.Reason = false, entity.ReasonConsent
		case item.CanStart && (!enough || count == 0):
			item.CanStart, item.Reason = false, entity.ReasonUnavailable
		}
		items = append(items, item)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return nil, err
	}
	// Фиксируем ленивое закрытие просроченной попытки.
	return items, tx.Commit(ctx)
}

// GetAttempt возвращает попытку кандидата. Просроченная активная попытка сначала закрывается.
func (r *Repository) GetAttempt(ctx context.Context, userID, attemptID string, retakeDays int) (entity.Attempt, error) {
	return r.readAttempt(ctx, userID, retakeDays, `id=$2`, attemptID)
}

// CurrentAttempt возвращает активную попытку кандидата или ErrAttemptNotFound.
func (r *Repository) CurrentAttempt(ctx context.Context, userID string, retakeDays int) (entity.Attempt, error) {
	return r.readAttempt(ctx, userID, retakeDays, `status='active' AND $2::text IS NOT NULL`, "")
}

func (r *Repository) readAttempt(ctx context.Context, userID string, retakeDays int, where, arg string) (entity.Attempt, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Attempt{}, err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockCandidate(ctx, tx, userID)
	if err != nil {
		return entity.Attempt{}, err
	}
	if err = closeExpired(ctx, tx, profileID); err != nil {
		return entity.Attempt{}, err
	}
	var id string
	err = tx.QueryRow(ctx, `SELECT id::text FROM assessment_attempts WHERE candidate_id=$1 AND `+where, profileID, arg).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		// Просроченная попытка могла быть закрыта только что: сохраняем это даже при ответе «не найдено».
		if err = tx.Commit(ctx); err != nil {
			return entity.Attempt{}, err
		}
		return entity.Attempt{}, entity.ErrAttemptNotFound
	}
	if isInvalidUUID(err) {
		return entity.Attempt{}, entity.ErrAttemptNotFound
	}
	if err != nil {
		return entity.Attempt{}, err
	}
	attempt, err := loadAttempt(ctx, tx, id, retakeDays)
	if err != nil {
		return attempt, err
	}
	return attempt, tx.Commit(ctx)
}

// loadAttempt собирает попытку. Пока она активна, отдаются задания без правил проверки и сохранённые ответы;
// после завершения — только итог. Правильные ответы кандидату не раскрываются никогда.
func loadAttempt(ctx context.Context, q querier, id string, retakeDays int) (entity.Attempt, error) {
	a := entity.Attempt{Questions: []entity.AttemptQuestion{}}
	var score *float64
	var passScore float64
	err := q.QueryRow(ctx, `SELECT id::text,status,specialization_id,grade_id,started_at,deadline_at,finished_at,time_limit_sec,score_percent::float8,pass_score::float8,stack_skill_id::text,stack_name
 FROM assessment_attempts WHERE id=$1`, id).Scan(&a.ID, &a.Status, &a.SpecializationID, &a.GradeID, &a.StartedAt, &a.DeadlineAt, &a.FinishedAt, &a.TimeLimitSec, &score, &passScore, &a.StackSkillID, &a.StackName)
	if err != nil {
		return a, dbError(err)
	}
	if a.Status == entity.AttemptActive {
		rows, err := q.Query(ctx, `SELECT q.id::text,q.position,q.skill_id::text,q.difficulty,coalesce((q.grading_snapshot->>'multiple')::boolean,false),q.prompt_snapshot,a.answer
 FROM attempt_questions q LEFT JOIN attempt_answers a ON a.attempt_question_id=q.id WHERE q.attempt_id=$1 ORDER BY q.position`, id)
		if err != nil {
			return a, err
		}
		defer rows.Close()
		for rows.Next() {
			var item entity.AttemptQuestion
			var prompt, answer []byte
			if err = rows.Scan(&item.ID, &item.Position, &item.SkillID, &item.Difficulty, &item.Multiple, &prompt, &answer); err != nil {
				return a, err
			}
			if err = json.Unmarshal(prompt, &item.Prompt); err != nil {
				return a, err
			}
			if answer != nil {
				item.Answer = &entity.Answer{}
				if err = json.Unmarshal(answer, item.Answer); err != nil {
					return a, err
				}
			}
			a.Questions = append(a.Questions, item)
		}
		return a, rows.Err()
	}
	result, err := loadResult(ctx, q, a, *score, passScore, retakeDays)
	a.Result = &result
	return a, err
}

func loadResult(ctx context.Context, q querier, a entity.Attempt, score, passScore float64, retakeDays int) (entity.AttemptResult, error) {
	res := entity.AttemptResult{Passed: a.Status == entity.AttemptPassed, ScorePercent: score, PassScore: passScore, Skills: []entity.SkillResult{}}
	// История вопросов неизменна, подтверждение и отображаемый ID следуют за объединённым навыком.
	rows, err := q.Query(ctx, `SELECT target.id::text,target.name,sum(q.points)::float8,sum(coalesce(an.awarded,0))::float8,
 (target.active AND target.moderation_status='approved' AND EXISTS(SELECT 1 FROM grade_history h WHERE h.attempt_id=$1))
 FROM attempt_questions q JOIN skills original ON original.id=q.skill_id
 JOIN skills target ON target.id=coalesce(original.merged_into,original.id)
 LEFT JOIN attempt_answers an ON an.attempt_question_id=q.id
 WHERE q.attempt_id=$1 GROUP BY target.id,target.name,target.active,target.moderation_status ORDER BY min(q.position)`, a.ID)
	if err != nil {
		return res, err
	}
	defer rows.Close()
	for rows.Next() {
		var sk entity.SkillResult
		var possible, earned float64
		var recorded bool
		if err = rows.Scan(&sk.SkillID, &sk.Name, &possible, &earned, &recorded); err != nil {
			return res, err
		}
		sk.Percent = entity.SkillScore{Earned: earned, Possible: possible}.Percent()
		if res.Passed && recorded && sk.Percent >= passScore {
			level := entity.SkillLevel(sk.Percent)
			sk.Confirmed, sk.Level = true, &level
		}
		res.Skills = append(res.Skills, sk)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return res, err
	}
	if res.Passed {
		var c entity.CategoryRef
		err = q.QueryRow(ctx, `SELECT h.specialization_id,sp.name,h.grade_id,g.name,h.achieved_at FROM grade_history h
 JOIN specializations sp ON sp.id=h.specialization_id JOIN grades g ON g.id=h.grade_id WHERE h.attempt_id=$1`, a.ID).Scan(&c.SpecializationID, &c.Specialization, &c.GradeID, &c.Grade, &c.ConfirmedAt)
		switch {
		case err == nil:
			c.StackSkillID, c.StackName = a.StackSkillID, a.StackName
			res.Category = &c
		case !errors.Is(err, pgx.ErrNoRows): // нет записи, если итоги не писались (согласие отозвано)
			return res, err
		}
	} else if a.FinishedAt != nil {
		retryAt := a.FinishedAt.Add(time.Duration(retakeDays) * 24 * time.Hour)
		res.RetryAt = &retryAt
	}
	var latest *time.Time
	if err = q.QueryRow(ctx, `SELECT max(achieved_at) FROM grade_history WHERE candidate_id=(SELECT candidate_id FROM assessment_attempts WHERE id=$1)`, a.ID).Scan(&latest); err != nil {
		return res, err
	}
	if latest != nil {
		next := latest.Add(entity.GradeChangeDays * 24 * time.Hour)
		res.NextGradeChangeAt = &next
	}
	return res, nil
}
