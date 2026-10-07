package repository

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
)

const questionColumns = `q.id::text,q.skill_id::text,s.name,q.difficulty,q.kind,q.active,q.created_at,
 COALESCE((SELECT max(v.version) FROM assessment_question_versions v WHERE v.question_id=q.id),0),
 (SELECT v.version FROM assessment_question_versions v WHERE v.question_id=q.id AND v.status='published')`
const questionFrom = ` FROM assessment_questions q JOIN skills s ON s.id=q.skill_id`

func scanQuestion(row pgx.Row) (entity.Question, error) {
	var q entity.Question
	err := row.Scan(&q.ID, &q.SkillID, &q.SkillName, &q.Difficulty, &q.Kind, &q.Active, &q.CreatedAt, &q.LatestVersion, &q.PublishedVersion)
	return q, dbError(err)
}

const versionColumns = `version,status,prompt,grading_spec,created_at,published_at`

func scanVersion(row pgx.Row) (entity.QuestionVersion, error) {
	var v entity.QuestionVersion
	var prompt, spec []byte
	if err := row.Scan(&v.Version, &v.Status, &prompt, &spec, &v.CreatedAt, &v.PublishedAt); err != nil {
		return v, dbError(err)
	}
	if err := json.Unmarshal(prompt, &v.Prompt); err != nil {
		return v, err
	}
	return v, json.Unmarshal(spec, &v.GradingSpec)
}

func getQuestion(ctx context.Context, q querier, id string) (entity.Question, error) {
	question, err := scanQuestion(q.QueryRow(ctx, `SELECT `+questionColumns+questionFrom+` WHERE q.id=$1`, id))
	if err != nil {
		return question, err
	}
	rows, err := q.Query(ctx, `SELECT `+versionColumns+` FROM assessment_question_versions WHERE question_id=$1 ORDER BY version DESC`, id)
	if err != nil {
		return question, err
	}
	defer rows.Close()
	question.Versions = []entity.QuestionVersion{}
	for rows.Next() {
		v, err := scanVersion(rows)
		if err != nil {
			return question, err
		}
		question.Versions = append(question.Versions, v)
	}
	return question, rows.Err()
}

func (r *Repository) GetQuestion(ctx context.Context, id string) (entity.Question, error) {
	return getQuestion(ctx, r.db, id)
}

func (r *Repository) CreateQuestion(ctx context.Context, actorID string, in entity.QuestionInput) (entity.Question, error) {
	prompt, err := json.Marshal(in.Prompt)
	if err != nil {
		return entity.Question{}, err
	}
	spec, err := json.Marshal(in.GradingSpec)
	if err != nil {
		return entity.Question{}, err
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Question{}, err
	}
	defer tx.Rollback(ctx)
	var usable bool
	err = tx.QueryRow(ctx, `SELECT true FROM skills WHERE id=$1 AND active AND moderation_status='approved' FOR SHARE`, in.SkillID).Scan(&usable)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.Question{}, &entity.ValidationError{Message: "Неизвестный навык: выберите активный навык из справочника"}
	}
	if err != nil {
		return entity.Question{}, err
	}
	var id string
	if err = tx.QueryRow(ctx, `INSERT INTO assessment_questions(skill_id,difficulty,kind,created_by) VALUES($1,$2,$3,$4) RETURNING id::text`, in.SkillID, in.Difficulty, in.Kind, actorID).Scan(&id); err != nil {
		return entity.Question{}, err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO assessment_question_versions(question_id,version,prompt,grading_spec,created_by) VALUES($1,1,$2::jsonb,$3::jsonb,$4)`, id, string(prompt), string(spec), actorID); err != nil {
		return entity.Question{}, err
	}
	if err = recordEvent(ctx, tx, actorID, "question.created", "assessment_questions", id); err != nil {
		return entity.Question{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return entity.Question{}, err
	}
	return r.GetQuestion(ctx, id)
}

// lockQuestion блокирует задание: публикации версий одного задания выполняются по очереди.
func lockQuestion(ctx context.Context, tx pgx.Tx, id string) (active bool, err error) {
	err = tx.QueryRow(ctx, `SELECT active FROM assessment_questions WHERE id=$1 FOR UPDATE`, id).Scan(&active)
	return active, dbError(err)
}

func (r *Repository) CreateVersion(ctx context.Context, actorID, questionID string, in entity.VersionInput) (entity.QuestionVersion, error) {
	prompt, err := json.Marshal(in.Prompt)
	if err != nil {
		return entity.QuestionVersion{}, err
	}
	spec, err := json.Marshal(in.GradingSpec)
	if err != nil {
		return entity.QuestionVersion{}, err
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.QuestionVersion{}, err
	}
	defer tx.Rollback(ctx)
	active, err := lockQuestion(ctx, tx, questionID)
	if err != nil {
		return entity.QuestionVersion{}, err
	}
	if !active {
		return entity.QuestionVersion{}, entity.ErrConflict
	}
	v, err := scanVersion(tx.QueryRow(ctx, `INSERT INTO assessment_question_versions(question_id,version,prompt,grading_spec,created_by)
 VALUES($1,(SELECT COALESCE(max(version),0)+1 FROM assessment_question_versions WHERE question_id=$1),$2::jsonb,$3::jsonb,$4) RETURNING `+versionColumns, questionID, string(prompt), string(spec), actorID))
	if err != nil {
		return v, err
	}
	if err = recordEvent(ctx, tx, actorID, "question.version_created", "assessment_questions", questionID); err != nil {
		return v, err
	}
	return v, tx.Commit(ctx)
}

func (r *Repository) PublishVersion(ctx context.Context, actorID, questionID string, version int) (entity.QuestionVersion, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.QuestionVersion{}, err
	}
	defer tx.Rollback(ctx)
	active, err := lockQuestion(ctx, tx, questionID)
	if err != nil {
		return entity.QuestionVersion{}, err
	}
	if !active {
		return entity.QuestionVersion{}, entity.ErrConflict
	}
	var status string
	if err = tx.QueryRow(ctx, `SELECT status FROM assessment_question_versions WHERE question_id=$1 AND version=$2 FOR UPDATE`, questionID, version).Scan(&status); err != nil {
		return entity.QuestionVersion{}, dbError(err)
	}
	if status != entity.StatusDraft {
		return entity.QuestionVersion{}, entity.ErrConflict
	}
	if _, err = tx.Exec(ctx, `UPDATE assessment_question_versions SET status='archived' WHERE question_id=$1 AND status='published'`, questionID); err != nil {
		return entity.QuestionVersion{}, err
	}
	v, err := scanVersion(tx.QueryRow(ctx, `UPDATE assessment_question_versions SET status='published',published_at=clock_timestamp() WHERE question_id=$1 AND version=$2 RETURNING `+versionColumns, questionID, version))
	if err != nil {
		return v, err
	}
	if err = recordEvent(ctx, tx, actorID, "question.version_published", "assessment_questions", questionID); err != nil {
		return v, err
	}
	return v, tx.Commit(ctx)
}

func (r *Repository) ArchiveQuestion(ctx context.Context, actorID, questionID string) (entity.Question, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Question{}, err
	}
	defer tx.Rollback(ctx)
	active, err := lockQuestion(ctx, tx, questionID)
	if err != nil {
		return entity.Question{}, err
	}
	if !active {
		return entity.Question{}, entity.ErrConflict
	}
	if _, err = tx.Exec(ctx, `UPDATE assessment_questions SET active=false WHERE id=$1`, questionID); err != nil {
		return entity.Question{}, err
	}
	if err = recordEvent(ctx, tx, actorID, "question.archived", "assessment_questions", questionID); err != nil {
		return entity.Question{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return entity.Question{}, err
	}
	return r.GetQuestion(ctx, questionID)
}

func (r *Repository) ListQuestions(ctx context.Context, f entity.QuestionFilter) (entity.QuestionPage, error) {
	page := entity.QuestionPage{Items: []entity.Question{}, Limit: f.Limit, Offset: f.Offset}
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return page, err
	}
	defer tx.Rollback(ctx)
	const where = ` WHERE ($1='' OR q.skill_id::text=$1) AND ($2::int=0 OR q.difficulty=$2::int) AND ($3='' OR q.kind=$3)
 AND ($4::boolean IS NULL OR q.active=$4) AND ($5='' OR EXISTS(SELECT 1 FROM assessment_question_versions v WHERE v.question_id=q.id AND v.status=$5))`
	args := []any{f.SkillID, int(f.Difficulty), f.Kind, f.Active, f.Status}
	if err = tx.QueryRow(ctx, `SELECT count(*)`+questionFrom+where, args...).Scan(&page.Total); err != nil {
		return page, err
	}
	rows, err := tx.Query(ctx, `SELECT `+questionColumns+questionFrom+where+` ORDER BY q.created_at DESC,q.id LIMIT $6 OFFSET $7`, append(args, f.Limit, f.Offset)...)
	if err != nil {
		return page, err
	}
	for rows.Next() {
		q, err := scanQuestion(rows)
		if err != nil {
			rows.Close()
			return page, err
		}
		page.Items = append(page.Items, q)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return page, err
	}
	return page, tx.Commit(ctx)
}
