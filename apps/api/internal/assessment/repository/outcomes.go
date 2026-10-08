package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
)

// finalizeLocked оценивает активную попытку, закрывает её и при успехе записывает итоги в той же транзакции.
// Вызывается под advisory-блокировкой кандидата и блокировкой строки попытки FOR UPDATE.
// expired означает, что дедлайн прошёл: неудачная попытка получает статус expired вместо failed.
func finalizeLocked(ctx context.Context, tx pgx.Tx, profileID, attemptID string, expired bool) error {
	var specID, gradeID int16
	var passScore float64
	if err := tx.QueryRow(ctx, `SELECT specialization_id,grade_id,pass_score::float8 FROM assessment_attempts WHERE id=$1`, attemptID).Scan(&specID, &gradeID, &passScore); err != nil {
		return err
	}
	rows, err := tx.Query(ctx, `SELECT q.id::text,coalesce(s.merged_into,s.id)::text,q.points::float8,q.grading_snapshot,a.answer
 FROM attempt_questions q JOIN skills s ON s.id=q.skill_id LEFT JOIN attempt_answers a ON a.attempt_question_id=q.id WHERE q.attempt_id=$1 ORDER BY q.position`, attemptID)
	if err != nil {
		return err
	}
	type graded struct {
		id      string
		points  float64
		correct bool
	}
	var items []entity.ScoredItem
	var answered []graded
	for rows.Next() {
		var id, skill string
		var points float64
		var spec, answer []byte
		if err = rows.Scan(&id, &skill, &points, &spec, &answer); err != nil {
			rows.Close()
			return err
		}
		correct := false
		if answer != nil {
			var g entity.GradingSpec
			var a entity.Answer
			if err = json.Unmarshal(spec, &g); err != nil {
				rows.Close()
				return err
			}
			if err = json.Unmarshal(answer, &a); err != nil {
				rows.Close()
				return err
			}
			correct = entity.GradeAnswer(g, a)
			answered = append(answered, graded{id, points, correct})
		}
		items = append(items, entity.ScoredItem{SkillID: skill, Points: points, Correct: correct})
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return err
	}
	for _, g := range answered {
		awarded := 0.0
		if g.correct {
			awarded = g.points
		}
		if _, err = tx.Exec(ctx, `UPDATE attempt_answers SET is_correct=$2,awarded=$3 WHERE attempt_question_id=$1`, g.id, g.correct, awarded); err != nil {
			return err
		}
	}
	percent, skills := entity.Score(items)
	status := entity.AttemptFailed
	switch {
	case percent >= passScore:
		status = entity.AttemptPassed
	case expired:
		status = entity.AttemptExpired
	}
	// Просроченная попытка закрывается моментом дедлайна, а не обращения: срок пересдачи не должен
	// растягиваться на всё время, пока кандидат отсутствовал.
	if _, err = tx.Exec(ctx, `UPDATE assessment_attempts SET status=$2,finished_at=CASE WHEN $4 THEN LEAST(clock_timestamp(),deadline_at) ELSE clock_timestamp() END,score_percent=$3 WHERE id=$1`, attemptID, status, percent, expired); err != nil {
		return err
	}
	if status != entity.AttemptPassed {
		return nil
	}
	// После отзыва согласия processing итоги не записываются: данные кандидата больше не обрабатываются.
	var consent bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM candidate_consents c JOIN candidate_profiles p ON p.user_id=c.user_id
 WHERE p.id=$1 AND c.kind='processing' AND c.company_id IS NULL AND c.revoked_at IS NULL)`, profileID).Scan(&consent); err != nil || !consent {
		return err
	}
	approved := map[string]bool{}
	skillRows, err := tx.Query(ctx, `SELECT id::text FROM skills WHERE id=ANY($1::uuid[]) AND active AND moderation_status='approved'`, skillIDs(skills))
	if err != nil {
		return err
	}
	for skillRows.Next() {
		var id string
		if err = skillRows.Scan(&id); err != nil {
			skillRows.Close()
			return err
		}
		approved[id] = true
	}
	skillRows.Close()
	if err = skillRows.Err(); err != nil {
		return err
	}
	for _, sk := range skills {
		if sk.Percent() < passScore || !approved[sk.SkillID] {
			continue
		}
		if _, err = tx.Exec(ctx, `INSERT INTO candidate_skills(candidate_id,skill_id) VALUES($1,$2) ON CONFLICT (candidate_id,skill_id) DO NOTHING`, profileID, sk.SkillID); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `INSERT INTO skill_evidence(candidate_id,skill_id,source,level,attempt_id) VALUES($1,$2,'test',$3,$4)
 ON CONFLICT (candidate_id,skill_id,source) DO UPDATE SET level=EXCLUDED.level,attempt_id=EXCLUDED.attempt_id,updated_at=clock_timestamp()
 WHERE skill_evidence.level<=EXCLUDED.level`, profileID, sk.SkillID, entity.SkillLevel(sk.Percent()), attemptID); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, `INSERT INTO grade_history(candidate_id,specialization_id,grade_id,attempt_id) VALUES($1,$2,$3,$4)`, profileID, specID, gradeID, attemptID); err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO candidate_categories(candidate_id,specialization_id,grade_id,attempt_id) VALUES($1,$2,$3,$4)
 ON CONFLICT (candidate_id) DO UPDATE SET specialization_id=EXCLUDED.specialization_id,grade_id=EXCLUDED.grade_id,attempt_id=EXCLUDED.attempt_id,confirmed_at=clock_timestamp()`, profileID, specID, gradeID, attemptID)
	return err
}

func skillIDs(skills []entity.SkillScore) []string {
	ids := make([]string, len(skills))
	for i, sk := range skills {
		ids[i] = sk.SkillID
	}
	return ids
}

// lockAttempt блокирует попытку кандидата FOR UPDATE и сообщает, истёк ли её дедлайн.
func lockAttempt(ctx context.Context, tx pgx.Tx, profileID, attemptID string) (status string, expired bool, err error) {
	err = tx.QueryRow(ctx, `SELECT status,deadline_at<=clock_timestamp() FROM assessment_attempts WHERE id=$1 AND candidate_id=$2 FOR UPDATE`, attemptID, profileID).Scan(&status, &expired)
	if errors.Is(err, pgx.ErrNoRows) || isInvalidUUID(err) {
		return "", false, entity.ErrAttemptNotFound
	}
	return status, expired, err
}

// SaveAnswer сохраняет или заменяет ответ. После дедлайна попытка закрывается по уже сохранённым ответам,
// а сам ответ отклоняется с ErrAttemptClosed.
func (r *Repository) SaveAnswer(ctx context.Context, userID, attemptID, questionID string, a entity.Answer) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockCandidate(ctx, tx, userID)
	if err != nil {
		return err
	}
	status, expired, err := lockAttempt(ctx, tx, profileID, attemptID)
	if err != nil {
		return err
	}
	if status != entity.AttemptActive {
		return entity.ErrAttemptClosed
	}
	if expired {
		if err = finalizeLocked(ctx, tx, profileID, attemptID, true); err != nil {
			return err
		}
		if err = tx.Commit(ctx); err != nil {
			return err
		}
		return entity.ErrAttemptClosed
	}
	if err = requireProcessingConsent(ctx, tx, userID); err != nil {
		return err
	}
	var promptJSON, specJSON []byte
	err = tx.QueryRow(ctx, `SELECT prompt_snapshot,grading_snapshot FROM attempt_questions WHERE id=$1 AND attempt_id=$2`, questionID, attemptID).Scan(&promptJSON, &specJSON)
	if errors.Is(err, pgx.ErrNoRows) || isInvalidUUID(err) {
		return entity.ErrQuestionNotFound
	}
	if err != nil {
		return err
	}
	var prompt entity.Prompt
	var spec entity.GradingSpec
	if err = json.Unmarshal(promptJSON, &prompt); err != nil {
		return err
	}
	if err = json.Unmarshal(specJSON, &spec); err != nil {
		return err
	}
	if err = entity.ValidateAnswer(prompt, spec, a); err != nil {
		return err
	}
	stored, err := json.Marshal(a)
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO attempt_answers(attempt_question_id,answer) VALUES($1,$2)
 ON CONFLICT (attempt_question_id) DO UPDATE SET answer=EXCLUDED.answer,answered_at=clock_timestamp()`, questionID, stored); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// SubmitAttempt завершает и оценивает попытку. Повторный вызов возвращает тот же итог.
func (r *Repository) SubmitAttempt(ctx context.Context, userID, attemptID string, retakeDays int) (entity.Attempt, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Attempt{}, err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockCandidate(ctx, tx, userID)
	if err != nil {
		return entity.Attempt{}, err
	}
	status, expired, err := lockAttempt(ctx, tx, profileID, attemptID)
	if err != nil {
		return entity.Attempt{}, err
	}
	if status == entity.AttemptActive {
		if !expired {
			if err = requireProcessingConsent(ctx, tx, userID); err != nil {
				return entity.Attempt{}, err
			}
		}
		if err = finalizeLocked(ctx, tx, profileID, attemptID, expired); err != nil {
			return entity.Attempt{}, err
		}
	}
	attempt, err := loadAttempt(ctx, tx, attemptID, retakeDays)
	if err != nil {
		return attempt, err
	}
	return attempt, tx.Commit(ctx)
}
