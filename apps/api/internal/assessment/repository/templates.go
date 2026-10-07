package repository

import (
	"context"
	"sort"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
)

const templateColumns = `id::text,specialization_id,grade_id,version,time_limit_sec,pass_score::float8,status,created_at,published_at`

func scanTemplate(row pgx.Row) (entity.Template, error) {
	var t entity.Template
	err := row.Scan(&t.ID, &t.SpecializationID, &t.GradeID, &t.Version, &t.TimeLimitSec, &t.PassScore, &t.Status, &t.CreatedAt, &t.PublishedAt)
	return t, dbError(err)
}

// availableExpr считает активные задания с опубликованной версией для пары (навык, сложность) строки состава b.
const availableExpr = `(SELECT count(*) FROM assessment_questions q WHERE q.skill_id=b.skill_id AND q.difficulty=b.difficulty AND q.active
 AND EXISTS (SELECT 1 FROM assessment_question_versions v WHERE v.question_id=q.id AND v.status='published'))`

func getTemplate(ctx context.Context, q querier, id string) (entity.Template, error) {
	t, err := scanTemplate(q.QueryRow(ctx, `SELECT `+templateColumns+` FROM assessment_templates WHERE id=$1`, id))
	if err != nil {
		return t, err
	}
	rows, err := q.Query(ctx, `SELECT b.skill_id::text,b.difficulty,b.question_count,b.weight::float8,s.name,`+availableExpr+`
 FROM assessment_blueprints b JOIN skills s ON s.id=b.skill_id WHERE b.template_id=$1 ORDER BY s.name,b.difficulty`, id)
	if err != nil {
		return t, err
	}
	defer rows.Close()
	t.Blueprint = []entity.BlueprintRowView{}
	for rows.Next() {
		var row entity.BlueprintRowView
		if err := rows.Scan(&row.SkillID, &row.Difficulty, &row.QuestionCount, &row.Weight, &row.SkillName, &row.Available); err != nil {
			return t, err
		}
		t.Blueprint = append(t.Blueprint, row)
	}
	return t, rows.Err()
}

func (r *Repository) GetTemplate(ctx context.Context, id string) (entity.Template, error) {
	return getTemplate(ctx, r.db, id)
}

// lockPair сериализует создание и публикацию шаблонов одной пары (специализация, грейд).
func lockPair(ctx context.Context, tx pgx.Tx, specialization, grade int16) error {
	_, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtextextended('assessment_template:'||$1::int::text||':'||$2::int::text, 0))`, specialization, grade)
	return err
}

func (r *Repository) CreateTemplate(ctx context.Context, actorID string, in entity.TemplateInput) (entity.Template, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Template{}, err
	}
	defer tx.Rollback(ctx)
	var usable bool
	err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM specializations WHERE id=$1 AND active) AND EXISTS(SELECT 1 FROM grades WHERE id=$2 AND active)`, in.SpecializationID, in.GradeID).Scan(&usable)
	if err != nil {
		return entity.Template{}, err
	}
	if !usable {
		return entity.Template{}, &entity.ValidationError{Message: "Неизвестная или выключенная специализация или грейд: выберите значения из справочника"}
	}
	skills := make([]string, len(in.Blueprint))
	for i, row := range in.Blueprint {
		skills[i] = row.SkillID
	}
	var found int
	if err = tx.QueryRow(ctx, `SELECT count(DISTINCT id) FROM skills WHERE id=ANY($1::uuid[]) AND active AND moderation_status='approved'`, skills).Scan(&found); err != nil {
		return entity.Template{}, err
	}
	distinct := map[string]bool{}
	for _, id := range skills {
		distinct[id] = true
	}
	if found != len(distinct) {
		return entity.Template{}, &entity.ValidationError{Message: "Неизвестный или выключенный навык в составе: выберите активные навыки из справочника"}
	}
	if err = lockPair(ctx, tx, in.SpecializationID, in.GradeID); err != nil {
		return entity.Template{}, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO assessment_templates(specialization_id,grade_id,version,time_limit_sec,pass_score,created_by)
 VALUES($1,$2,(SELECT COALESCE(max(version),0)+1 FROM assessment_templates WHERE specialization_id=$1 AND grade_id=$2),$3,$4,$5) RETURNING id::text`,
		in.SpecializationID, in.GradeID, in.TimeLimitSec, in.PassScore, actorID).Scan(&id)
	if err != nil {
		return entity.Template{}, err
	}
	for _, row := range in.Blueprint {
		if _, err = tx.Exec(ctx, `INSERT INTO assessment_blueprints(template_id,skill_id,difficulty,question_count,weight) VALUES($1,$2,$3,$4,$5)`,
			id, row.SkillID, row.Difficulty, row.QuestionCount, row.Weight); err != nil {
			return entity.Template{}, err
		}
	}
	if err = recordEvent(ctx, tx, actorID, "template.created", "assessment_templates", id); err != nil {
		return entity.Template{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return entity.Template{}, err
	}
	return r.GetTemplate(ctx, id)
}

func (r *Repository) ListTemplates(ctx context.Context, f entity.TemplateFilter) (entity.TemplatePage, error) {
	page := entity.TemplatePage{Items: []entity.Template{}, Limit: f.Limit, Offset: f.Offset}
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return page, err
	}
	defer tx.Rollback(ctx)
	const where = ` WHERE ($1::int=0 OR specialization_id=$1::int) AND ($2::int=0 OR grade_id=$2::int) AND ($3='' OR status=$3)`
	args := []any{int(f.SpecializationID), int(f.GradeID), f.Status}
	if err = tx.QueryRow(ctx, `SELECT count(*) FROM assessment_templates`+where, args...).Scan(&page.Total); err != nil {
		return page, err
	}
	rows, err := tx.Query(ctx, `SELECT `+templateColumns+` FROM assessment_templates`+where+` ORDER BY specialization_id,grade_id,version DESC LIMIT $4 OFFSET $5`, append(args, f.Limit, f.Offset)...)
	if err != nil {
		return page, err
	}
	for rows.Next() {
		t, err := scanTemplate(rows)
		if err != nil {
			rows.Close()
			return page, err
		}
		page.Items = append(page.Items, t)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return page, err
	}
	return page, tx.Commit(ctx)
}

// lockTemplate берёт блокировку пары шаблона, затем строку шаблона: так публикации одной пары идут по очереди.
func lockTemplate(ctx context.Context, tx pgx.Tx, id string) (specialization, grade int16, status string, err error) {
	if err = tx.QueryRow(ctx, `SELECT specialization_id,grade_id FROM assessment_templates WHERE id=$1`, id).Scan(&specialization, &grade); err != nil {
		return 0, 0, "", dbError(err)
	}
	if err = lockPair(ctx, tx, specialization, grade); err != nil {
		return 0, 0, "", err
	}
	err = tx.QueryRow(ctx, `SELECT status FROM assessment_templates WHERE id=$1 FOR UPDATE`, id).Scan(&status)
	return specialization, grade, status, dbError(err)
}

func (r *Repository) PublishTemplate(ctx context.Context, actorID, id string) (entity.Template, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Template{}, err
	}
	defer tx.Rollback(ctx)
	specialization, grade, status, err := lockTemplate(ctx, tx, id)
	if err != nil {
		return entity.Template{}, err
	}
	if status != entity.StatusDraft {
		return entity.Template{}, entity.ErrConflict
	}
	rows, err := tx.Query(ctx, `SELECT b.skill_id::text,b.difficulty,b.question_count,`+availableExpr+` FROM assessment_blueprints b WHERE b.template_id=$1`, id)
	if err != nil {
		return entity.Template{}, err
	}
	var shortage []entity.Shortage
	for rows.Next() {
		var item entity.Shortage
		if err = rows.Scan(&item.SkillID, &item.Difficulty, &item.Required, &item.Available); err != nil {
			rows.Close()
			return entity.Template{}, err
		}
		if item.Available < item.Required {
			shortage = append(shortage, item)
		}
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return entity.Template{}, err
	}
	if len(shortage) > 0 {
		sort.Slice(shortage, func(i, j int) bool {
			if shortage[i].SkillID != shortage[j].SkillID {
				return shortage[i].SkillID < shortage[j].SkillID
			}
			return shortage[i].Difficulty < shortage[j].Difficulty
		})
		return entity.Template{}, &entity.InsufficientError{Items: shortage}
	}
	if _, err = tx.Exec(ctx, `UPDATE assessment_templates SET status='archived' WHERE specialization_id=$1 AND grade_id=$2 AND status='published'`, specialization, grade); err != nil {
		return entity.Template{}, err
	}
	if _, err = tx.Exec(ctx, `UPDATE assessment_templates SET status='published',published_at=clock_timestamp() WHERE id=$1`, id); err != nil {
		return entity.Template{}, err
	}
	if err = recordEvent(ctx, tx, actorID, "template.published", "assessment_templates", id); err != nil {
		return entity.Template{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return entity.Template{}, err
	}
	return r.GetTemplate(ctx, id)
}

func (r *Repository) ArchiveTemplate(ctx context.Context, actorID, id string) (entity.Template, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Template{}, err
	}
	defer tx.Rollback(ctx)
	_, _, status, err := lockTemplate(ctx, tx, id)
	if err != nil {
		return entity.Template{}, err
	}
	if status == entity.StatusArchived {
		return entity.Template{}, entity.ErrConflict
	}
	if _, err = tx.Exec(ctx, `UPDATE assessment_templates SET status='archived' WHERE id=$1`, id); err != nil {
		return entity.Template{}, err
	}
	if err = recordEvent(ctx, tx, actorID, "template.archived", "assessment_templates", id); err != nil {
		return entity.Template{}, err
	}
	if err = tx.Commit(ctx); err != nil {
		return entity.Template{}, err
	}
	return r.GetTemplate(ctx, id)
}
