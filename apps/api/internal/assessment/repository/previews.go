package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	"github.com/jackc/pgx/v5"
)

// cleanupPreviews ограничивает объём ленивой очистки на один запрос.
func cleanupPreviews(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, `DELETE FROM assessment_previews WHERE id IN
 (SELECT id FROM assessment_previews WHERE retain_until<=clock_timestamp() ORDER BY retain_until LIMIT 100)`)
	return err
}

// beginPreview проверяет права в БД и удерживает аккаунт активным до завершения операции.
func (r *Repository) beginPreview(ctx context.Context, actor string) (pgx.Tx, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	var allowed bool
	err = tx.QueryRow(ctx, `SELECT true FROM admin_accounts WHERE id=$1 AND status='active' AND role IN ('admin','superadmin') FOR SHARE`, actor).Scan(&allowed)
	if err != nil {
		tx.Rollback(ctx)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, entity.ErrPreviewForbidden
		}
		return nil, err
	}
	return tx, nil
}

func (r *Repository) StartPreview(ctx context.Context, actor, templateID, key string) (entity.Preview, error) {
	tx, err := r.beginPreview(ctx, actor)
	if err != nil {
		return entity.Preview{}, err
	}
	defer tx.Rollback(ctx)
	// Сериализуем запуски одного администратора: лимит и ключ проверяются атомарно.
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended('assessment_preview:'||$1::text,0))`, actor); err != nil {
		return entity.Preview{}, err
	}
	if err = cleanupPreviews(ctx, tx); err != nil {
		return entity.Preview{}, err
	}
	if key != "" {
		if _, err = tx.Exec(ctx, `DELETE FROM assessment_previews WHERE admin_id=$1 AND idempotency_key=$2 AND retain_until<=clock_timestamp()`, actor, key); err != nil {
			return entity.Preview{}, err
		}
		var existing, template string
		err = tx.QueryRow(ctx, `SELECT id::text,template_id::text FROM assessment_previews WHERE admin_id=$1 AND idempotency_key=$2 AND retain_until>clock_timestamp()`, actor, key).Scan(&existing, &template)
		if err == nil {
			if template != templateID {
				return entity.Preview{}, entity.ErrPreviewKeyConflict
			}
			return previewTransaction(ctx, tx, actor, existing, false)
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return entity.Preview{}, err
		}
	}
	var count int
	if err = tx.QueryRow(ctx, `SELECT count(*) FROM assessment_previews WHERE admin_id=$1 AND status='in_progress' AND expires_at>clock_timestamp()`, actor).Scan(&count); err != nil {
		return entity.Preview{}, err
	}
	if count >= entity.PreviewActiveLimit {
		return entity.Preview{}, entity.ErrPreviewLimit
	}
	var version, limit int
	var status, stack string
	var pass float64
	err = tx.QueryRow(ctx, `SELECT version,status,time_limit_sec,pass_score::float8,coalesce(stack_skill_id::text,'') FROM assessment_templates WHERE id=$1 FOR SHARE`, templateID).Scan(&version, &status, &limit, &pass, &stack)
	if err != nil {
		return entity.Preview{}, dbError(err)
	}
	if status == entity.StatusArchived {
		return entity.Preview{}, entity.ErrConflict
	}
	if stack == "" {
		return entity.Preview{}, &entity.ValidationError{Message: "Выберите шаблон с основным навыком"}
	}
	picked, err := pickQuestionsDetailed(ctx, tx, templateID)
	if err != nil {
		return entity.Preview{}, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO assessment_previews(admin_id,template_id,template_version,stack_skill_id,started_at,expires_at,time_limit_sec,pass_score,idempotency_key,retain_until)
 VALUES($1,$2,$3,$4,clock_timestamp(),clock_timestamp()+make_interval(secs=>$5),$5,$6,NULLIF($7,''),clock_timestamp()+make_interval(days=>$8)) RETURNING id::text`, actor, templateID, version, stack, limit, pass, key, entity.PreviewRetentionDays).Scan(&id)
	if err != nil {
		return entity.Preview{}, err
	}
	for i, p := range picked {
		_, err = tx.Exec(ctx, `INSERT INTO assessment_preview_questions(preview_id,question_id,version,position,skill_id,skill_name,difficulty,weight,kind,prompt,grading_spec)
 SELECT $1,q.id,v.version,$2,q.skill_id,s.name,q.difficulty,$3,q.kind,v.prompt,v.grading_spec
 FROM assessment_question_versions v JOIN assessment_questions q ON q.id=v.question_id JOIN skills s ON s.id=q.skill_id WHERE v.id=$4`, id, i+1, p.points, p.versionID)
		if err != nil {
			return entity.Preview{}, err
		}
	}
	return previewTransaction(ctx, tx, actor, id, false)
}

// lockPreview проверяет владельца и срок хранения до чтения снимков.
func lockPreview(ctx context.Context, tx pgx.Tx, actor, id string) (string, bool, error) {
	var status string
	var expired bool
	err := tx.QueryRow(ctx, `SELECT status,expires_at<=clock_timestamp() FROM assessment_previews WHERE id=$1 AND admin_id=$2 AND retain_until>clock_timestamp() FOR UPDATE`, id, actor).Scan(&status, &expired)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, entity.ErrPreviewNotFound
	}
	return status, expired, err
}

func previewTransaction(ctx context.Context, tx pgx.Tx, actor, id string, submit bool) (entity.Preview, error) {
	status, expired, err := lockPreview(ctx, tx, actor, id)
	if errors.Is(err, entity.ErrPreviewNotFound) {
		if commitErr := tx.Commit(ctx); commitErr != nil {
			return entity.Preview{}, commitErr
		}
		return entity.Preview{}, err
	}
	if err != nil {
		return entity.Preview{}, err
	}
	if status == "in_progress" && (expired || submit) {
		if err = finalizePreview(ctx, tx, id, expired); err != nil {
			return entity.Preview{}, err
		}
	}
	preview, err := loadPreview(ctx, tx, id)
	if err != nil {
		return preview, err
	}
	return preview, tx.Commit(ctx)
}

func (r *Repository) GetPreview(ctx context.Context, actor, id string, submit bool) (entity.Preview, error) {
	tx, err := r.beginPreview(ctx, actor)
	if err != nil {
		return entity.Preview{}, err
	}
	defer tx.Rollback(ctx)
	if err = cleanupPreviews(ctx, tx); err != nil {
		return entity.Preview{}, err
	}
	return previewTransaction(ctx, tx, actor, id, submit)
}

func (r *Repository) SavePreviewAnswer(ctx context.Context, actor, id, questionID string, a entity.Answer) error {
	tx, err := r.beginPreview(ctx, actor)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	status, expired, err := lockPreview(ctx, tx, actor, id)
	if err != nil {
		return err
	}
	if status != "in_progress" {
		if status == "expired" {
			return entity.ErrPreviewExpired
		}
		return entity.ErrPreviewClosed
	}
	if expired {
		if err = finalizePreview(ctx, tx, id, true); err != nil {
			return err
		}
		if err = tx.Commit(ctx); err != nil {
			return err
		}
		return entity.ErrPreviewExpired
	}
	var promptBytes, specBytes []byte
	err = tx.QueryRow(ctx, `SELECT prompt,grading_spec FROM assessment_preview_questions WHERE id=$1 AND preview_id=$2`, questionID, id).Scan(&promptBytes, &specBytes)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrPreviewNotFound
	}
	if err != nil {
		return err
	}
	var prompt entity.Prompt
	var spec entity.GradingSpec
	if err = json.Unmarshal(promptBytes, &prompt); err != nil {
		return err
	}
	if err = json.Unmarshal(specBytes, &spec); err != nil {
		return err
	}
	if err = entity.ValidateAnswer(prompt, spec, a); err != nil {
		return err
	}
	data, err := json.Marshal(a)
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE assessment_preview_questions SET answer=$2 WHERE id=$1`, questionID, data); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repository) DeletePreview(ctx context.Context, actor, id string) error {
	tx, err := r.beginPreview(ctx, actor)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = cleanupPreviews(ctx, tx); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM assessment_previews WHERE id=$1 AND admin_id=$2`, id, actor); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func loadPreview(ctx context.Context, tx pgx.Tx, id string) (entity.Preview, error) {
	p := entity.Preview{Questions: []entity.PreviewQuestion{}}
	var result []byte
	err := tx.QueryRow(ctx, `SELECT id::text,template_id::text,template_version,status,started_at,expires_at,clock_timestamp(),finished_at,retain_until,time_limit_sec,pass_score::float8,result FROM assessment_previews WHERE id=$1`, id).Scan(&p.ID, &p.TemplateID, &p.TemplateVersion, &p.Status, &p.StartedAt, &p.ExpiresAt, &p.ServerTime, &p.FinishedAt, &p.RetainUntil, &p.TimeLimitSec, &p.PassScore, &result)
	if err != nil {
		return p, err
	}
	if result != nil {
		p.Result = &entity.PreviewResult{}
		if err = json.Unmarshal(result, p.Result); err != nil {
			return p, err
		}
	}
	rows, err := tx.Query(ctx, `SELECT id::text,question_id::text,position,version,skill_id::text,skill_name,difficulty,weight,kind,prompt,grading_spec,answer FROM assessment_preview_questions WHERE preview_id=$1 ORDER BY position`, id)
	if err != nil {
		return p, err
	}
	defer rows.Close()
	for rows.Next() {
		var q entity.PreviewQuestion
		var prompt, spec, answer []byte
		if err = rows.Scan(&q.ID, &q.QuestionID, &q.Position, &q.Version, &q.SkillID, &q.SkillName, &q.Difficulty, &q.Weight, &q.Kind, &prompt, &spec, &answer); err != nil {
			return p, err
		}
		if err = json.Unmarshal(prompt, &q.Prompt); err != nil {
			return p, err
		}
		var g entity.GradingSpec
		if err = json.Unmarshal(spec, &g); err != nil {
			return p, err
		}
		q.AnswerForm = entity.PreviewAnswerForm{Type: g.Type, Multiple: g.Multiple}
		if answer != nil {
			q.Answer = &entity.Answer{}
			if err = json.Unmarshal(answer, q.Answer); err != nil {
				return p, err
			}
		}
		p.Questions = append(p.Questions, q)
	}
	return p, rows.Err()
}

// finalizePreview использует те же GradeAnswer, Score и порог основного навыка, что кандидат.
// Итог сохраняется один раз; снимки не обращаются к изменяемому банку.
func finalizePreview(ctx context.Context, tx pgx.Tx, id string, expired bool) error {
	var stack string
	var pass float64
	if err := tx.QueryRow(ctx, `SELECT stack_skill_id::text,pass_score::float8 FROM assessment_previews WHERE id=$1`, id).Scan(&stack, &pass); err != nil {
		return err
	}
	rows, err := tx.Query(ctx, `SELECT id::text,skill_id::text,weight,grading_spec,answer FROM assessment_preview_questions WHERE preview_id=$1 ORDER BY position`, id)
	if err != nil {
		return err
	}
	result := entity.PreviewResult{PassScore: pass, Questions: []entity.PreviewReview{}, Skills: []entity.PreviewSkillScore{}}
	var items []entity.ScoredItem
	for rows.Next() {
		var review entity.PreviewReview
		var skill string
		var weight float64
		var spec, answer []byte
		if err = rows.Scan(&review.ID, &skill, &weight, &spec, &answer); err != nil {
			rows.Close()
			return err
		}
		if err = json.Unmarshal(spec, &review.CorrectAnswer); err != nil {
			rows.Close()
			return err
		}
		review.Answered = answer != nil
		if answer != nil {
			var a entity.Answer
			if err = json.Unmarshal(answer, &a); err != nil {
				rows.Close()
				return err
			}
			review.Correct = entity.GradeAnswer(review.CorrectAnswer, a)
		} else {
			result.UnansweredCount++
		}
		if review.Correct {
			result.CorrectCount++
		}
		items = append(items, entity.ScoredItem{SkillID: skill, Points: weight, Correct: review.Correct})
		result.Questions = append(result.Questions, review)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return err
	}
	result.QuestionCount = len(items)
	percent, skills := entity.Score(items)
	result.ScorePercent = percent
	stackPassed := false
	for _, sk := range skills {
		result.Skills = append(result.Skills, entity.PreviewSkillScore{SkillID: sk.SkillID, Percent: sk.Percent()})
		if sk.SkillID == stack && sk.Percent() >= pass {
			stackPassed = true
		}
	}
	result.Passed = percent >= pass && stackPassed
	data, err := json.Marshal(result)
	if err != nil {
		return err
	}
	status := "submitted"
	if expired {
		status = "expired"
	}
	_, err = tx.Exec(ctx, `UPDATE assessment_previews SET status=$2,result=$3,finished_at=CASE WHEN $4 THEN expires_at ELSE clock_timestamp() END WHERE id=$1`, id, status, data, expired)
	return err
}
