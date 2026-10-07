package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	candidateentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

// lockCandidate берёт блокировки в общем порядке: пользователь (FOR SHARE), профиль (FOR SHARE), затем
// advisory-блокировка кандидата, которая сериализует старт, ответы и завершение его попыток.
// Не активный кандидат получает ErrForbidden, кандидат без профиля — ErrNotFound кандидатского модуля.
func lockCandidate(ctx context.Context, tx pgx.Tx, userID string) (string, error) {
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

func requireProcessingConsent(ctx context.Context, tx pgx.Tx, userID string) error {
	var active bool
	err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM candidate_consents WHERE user_id=$1 AND kind='processing' AND company_id IS NULL AND revoked_at IS NULL)`, userID).Scan(&active)
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

func (r *Repository) StartAttempt(ctx context.Context, userID string, specializationID, gradeID int16, retakeDays int) (entity.Attempt, error) {
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
	var activeID string
	err = tx.QueryRow(ctx, `SELECT id::text FROM assessment_attempts WHERE candidate_id=$1 AND status='active'`, profileID).Scan(&activeID)
	if err == nil {
		return entity.Attempt{}, &entity.ActiveError{AttemptID: activeID}
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return entity.Attempt{}, err
	}
	state, err := pairState(ctx, tx, profileID, retakeDays)
	if err != nil {
		return entity.Attempt{}, err
	}
	switch st := state(specializationID, gradeID); st.Reason {
	case entity.ReasonConfirmed:
		return entity.Attempt{}, entity.ErrAlreadyConfirmed
	case entity.ReasonCooldown:
		return entity.Attempt{}, &entity.RetakeError{RetryAt: *st.RetryAt}
	}

	var templateID string
	var limit int
	var passScore float64
	err = tx.QueryRow(ctx, `SELECT id::text,time_limit_sec,pass_score FROM assessment_templates WHERE specialization_id=$1 AND grade_id=$2 AND status='published' FOR SHARE`, specializationID, gradeID).Scan(&templateID, &limit, &passScore)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.Attempt{}, entity.ErrUnavailable
	}
	if err != nil {
		return entity.Attempt{}, err
	}
	picked, err := pickQuestions(ctx, tx, templateID)
	if err != nil {
		return entity.Attempt{}, err
	}
	var attemptID string
	err = tx.QueryRow(ctx, `INSERT INTO assessment_attempts(candidate_id,template_id,specialization_id,grade_id,status,deadline_at,time_limit_sec,pass_score)
 VALUES($1,$2,$3,$4,'active',clock_timestamp()+make_interval(secs=>$5::int),$5::int,$6) RETURNING id::text`, profileID, templateID, specializationID, gradeID, limit, passScore).Scan(&attemptID)
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
 WHERE q.skill_id=$1 AND q.difficulty=$2 AND q.active ORDER BY random() LIMIT $3 FOR SHARE OF q, v`, b.skillID, b.difficulty, b.count)
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
func pairState(ctx context.Context, q querier, profileID string, retakeDays int) (func(spec, grade int16) entity.AvailableTemplate, error) {
	ranks := map[int16]int16{}
	rows, err := q.Query(ctx, `SELECT h.specialization_id,max(g.rank) FROM grade_history h JOIN grades g ON g.id=h.grade_id WHERE h.candidate_id=$1 GROUP BY h.specialization_id`, profileID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var spec, rank int16
		if err = rows.Scan(&spec, &rank); err != nil {
			rows.Close()
			return nil, err
		}
		ranks[spec] = rank
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
	type pair struct{ spec, grade int16 }
	last := map[pair]time.Time{}
	rows, err = q.Query(ctx, `SELECT specialization_id,grade_id,max(finished_at) FROM assessment_attempts WHERE candidate_id=$1 AND status IN ('failed','expired') GROUP BY specialization_id,grade_id`, profileID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var p pair
		var at time.Time
		if err = rows.Scan(&p.spec, &p.grade, &at); err != nil {
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
	return func(spec, grade int16) entity.AvailableTemplate {
		out := entity.AvailableTemplate{SpecializationID: spec, GradeID: grade, CanStart: true, Reason: entity.ReasonOK}
		if rank, ok := ranks[spec]; ok && entity.Confirmed(rank, gradeRank[grade]) {
			out.CanStart, out.Reason, out.Confirmed = false, entity.ReasonConfirmed, true
			return out
		}
		if at, ok := last[pair{spec, grade}]; ok {
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
	state, err := pairState(ctx, tx, profileID, retakeDays)
	if err != nil {
		return nil, err
	}
	rows, err := tx.Query(ctx, `SELECT t.specialization_id,t.grade_id,t.time_limit_sec,t.pass_score::float8,
 (SELECT coalesce(sum(b.question_count),0) FROM assessment_blueprints b WHERE b.template_id=t.id)::int
 FROM assessment_templates t JOIN grades g ON g.id=t.grade_id WHERE t.status='published' ORDER BY t.specialization_id,g.rank`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []entity.AvailableTemplate{}
	for rows.Next() {
		var spec, grade int16
		var limit, count int
		var pass float64
		if err = rows.Scan(&spec, &grade, &limit, &pass, &count); err != nil {
			return nil, err
		}
		item := state(spec, grade)
		item.TimeLimitSec, item.PassScore, item.QuestionCount = limit, pass, count
		if active {
			item.CanStart, item.Reason, item.RetryAt = false, entity.ReasonActive, nil
		}
		items = append(items, item)
	}
	return items, rows.Err()
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
	if errors.Is(err, pgx.ErrNoRows) || isInvalidUUID(err) {
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
	err := q.QueryRow(ctx, `SELECT id::text,status,specialization_id,grade_id,started_at,deadline_at,finished_at,time_limit_sec,score_percent::float8,pass_score::float8
 FROM assessment_attempts WHERE id=$1`, id).Scan(&a.ID, &a.Status, &a.SpecializationID, &a.GradeID, &a.StartedAt, &a.DeadlineAt, &a.FinishedAt, &a.TimeLimitSec, &score, &passScore)
	if err != nil {
		return a, dbError(err)
	}
	if a.Status == entity.AttemptActive {
		rows, err := q.Query(ctx, `SELECT q.id::text,q.position,q.skill_id::text,q.difficulty,q.prompt_snapshot,a.answer
 FROM attempt_questions q LEFT JOIN attempt_answers a ON a.attempt_question_id=q.id WHERE q.attempt_id=$1 ORDER BY q.position`, id)
		if err != nil {
			return a, err
		}
		defer rows.Close()
		for rows.Next() {
			var item entity.AttemptQuestion
			var prompt, answer []byte
			if err = rows.Scan(&item.ID, &item.Position, &item.SkillID, &item.Difficulty, &prompt, &answer); err != nil {
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
	rows, err := q.Query(ctx, `SELECT q.skill_id::text,s.name,sum(q.points)::float8,sum(coalesce(an.awarded,0))::float8
 FROM attempt_questions q JOIN skills s ON s.id=q.skill_id LEFT JOIN attempt_answers an ON an.attempt_question_id=q.id
 WHERE q.attempt_id=$1 GROUP BY q.skill_id,s.name ORDER BY min(q.position)`, a.ID)
	if err != nil {
		return res, err
	}
	defer rows.Close()
	for rows.Next() {
		var sk entity.SkillResult
		var possible, earned float64
		if err = rows.Scan(&sk.SkillID, &sk.Name, &possible, &earned); err != nil {
			return res, err
		}
		sk.Percent = entity.SkillScore{Earned: earned, Possible: possible}.Percent()
		if res.Passed && sk.Percent >= passScore {
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
		if err != nil {
			return res, err
		}
		res.Category = &c
	} else if a.FinishedAt != nil {
		retryAt := a.FinishedAt.Add(time.Duration(retakeDays) * 24 * time.Hour)
		res.RetryAt = &retryAt
	}
	return res, nil
}
