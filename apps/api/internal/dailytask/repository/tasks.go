package repository

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/jackc/pgx/v5"
)

const taskStatus = `CASE WHEN t.status='closed' OR t.deadline_at<=transaction_timestamp() THEN 'closed' ELSE 'open' END`
const taskColumns = `t.id::text,t.company_id::text,c.name,t.title,t.description,t.specialization_id,t.grade_id,t.deadline_at,` + fileJSON + `,` + taskStatus + `,t.moderation_status,t.published_at,t.published_on::text,
 CASE WHEN mine.id IS NOT NULL THEN jsonb_build_object('id',mine.id::text,'status',mine.status) END`
const taskFrom = ` FROM company_daily_tasks t JOIN companies c ON c.id=t.company_id JOIN files f ON f.id=t.file_id
 LEFT JOIN company_task_submissions mine ON mine.task_id=t.id AND mine.candidate_id=(SELECT id FROM candidate_profiles WHERE user_id=$1)
 WHERE c.status='active' AND f.status='ready' AND (t.moderation_status='published' OR EXISTS(SELECT 1 FROM company_members cm JOIN users cu ON cu.id=cm.user_id WHERE cm.company_id=t.company_id AND cm.user_id=$1 AND cm.status='active' AND cu.role='employer' AND cu.status='active'))`

func scanTask(row pgx.Row) (entity.Task, error) {
	var t entity.Task
	err := row.Scan(&t.ID, &t.CompanyID, &t.CompanyName, &t.Title, &t.Description, &t.SpecializationID, &t.GradeID, &t.DeadlineAt, &t.File, &t.Status, &t.ModerationStatus, &t.PublishedAt, &t.PublishedOn, &t.MySubmission)
	return t, dbError(err)
}

func dailyLimit(ctx context.Context, tx pgx.Tx, company string) error {
	var exists bool
	err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM company_daily_tasks WHERE company_id=$1 AND published_on=(clock_timestamp() AT TIME ZONE 'Europe/Moscow')::date)`, company).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return entity.ErrDailyLimit
	}
	return nil
}

func (r *Repository) CanCreate(ctx context.Context, user, company string, in entity.Input) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = companyAccess(ctx, tx, user, company, true); err != nil {
		return err
	}
	if err = references(ctx, tx, in); err != nil {
		return err
	}
	if err = dailyLimit(ctx, tx, company); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repository) Create(ctx context.Context, user, company string, in entity.Input, file files.File) (entity.Task, error) {
	var result entity.Task
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)
	if err = companyAccess(ctx, tx, user, company, true); err != nil {
		return result, err
	}
	if err = references(ctx, tx, in); err != nil {
		return result, err
	}
	if err = dailyLimit(ctx, tx, company); err != nil {
		return result, err
	}
	// Повторяем проверку срока после загрузки и ожидания блокировок.
	var valid bool
	if err = tx.QueryRow(ctx, `SELECT $1::timestamptz IS NULL OR $1>clock_timestamp()`, in.DeadlineAt).Scan(&valid); err != nil {
		return result, err
	}
	if !valid {
		return result, &entity.ValidationError{Message: "Срок приёма решений уже истёк"}
	}
	file, err = insertFile(ctx, tx, user, file)
	if err != nil {
		return result, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO company_daily_tasks(company_id,created_by,title,description,specialization_id,grade_id,deadline_at,file_id,published_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,clock_timestamp()) RETURNING id::text`, company, user, in.Title, in.Description, in.SpecializationID, in.GradeID, in.DeadlineAt, file.ID).Scan(&id)
	if err != nil {
		return result, dbError(err)
	}
	result, err = scanTask(tx.QueryRow(ctx, `SELECT `+taskColumns+taskFrom+` AND t.id=$2`, user, id))
	if err != nil {
		return result, err
	}
	return result, tx.Commit(ctx)
}

func (r *Repository) List(ctx context.Context, user, company string, f entity.Filter) (entity.TaskPage, error) {
	p := entity.TaskPage{Items: []entity.Task{}, Limit: f.Limit, Offset: f.Offset}
	tx, err := r.readTx(ctx)
	if err != nil {
		return p, err
	}
	defer tx.Rollback(ctx)
	if company != "" {
		err = companyAccess(ctx, tx, user, company, false)
	} else {
		err = candidateAccess(ctx, tx, user)
	}
	if err != nil {
		return p, err
	}
	where := taskFrom + ` AND ($2::uuid IS NULL OR t.company_id=$2) AND ($3::uuid IS NULL OR t.company_id=$3)
 AND ($4::smallint IS NULL OR t.specialization_id=$4) AND ($5::smallint IS NULL OR t.grade_id=$5)
 AND ($6::text='' OR strpos(lower(t.title||' '||t.description),lower($6))>0)
 AND ($7::text='all' OR ` + taskStatus + `=$7)
 AND ($8::date IS NULL OR t.published_on>=$8) AND ($9::date IS NULL OR t.published_on<=$9)
 AND ($10::boolean IS NULL OR (mine.id IS NOT NULL)=$10)`
	var scope *string
	if company != "" {
		scope = &company
	}
	args := []any{user, scope, f.CompanyID, f.SpecializationID, f.GradeID, f.Query, f.Status, f.PublishedFrom, f.PublishedTo, f.Submitted}
	if err = tx.QueryRow(ctx, `SELECT count(*)`+where, args...).Scan(&p.Total); err != nil {
		return p, err
	}
	rows, err := tx.Query(ctx, `SELECT `+taskColumns+where+` ORDER BY t.published_at DESC,t.id DESC LIMIT $11 OFFSET $12`, append(args, f.Limit, f.Offset)...)
	if err != nil {
		return p, err
	}
	for rows.Next() {
		t, e := scanTask(rows)
		if e != nil {
			rows.Close()
			return p, e
		}
		p.Items = append(p.Items, t)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return p, err
	}
	return p, tx.Commit(ctx)
}

func (r *Repository) Get(ctx context.Context, user, company, id string) (entity.Task, error) {
	var result entity.Task
	tx, err := r.readTx(ctx)
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)
	if company != "" {
		err = companyAccess(ctx, tx, user, company, false)
	} else {
		err = candidateAccess(ctx, tx, user)
	}
	if err != nil {
		return result, err
	}
	var scope *string
	if company != "" {
		scope = &company
	}
	result, err = scanTask(tx.QueryRow(ctx, `SELECT `+taskColumns+taskFrom+` AND t.id=$2 AND ($3::uuid IS NULL OR t.company_id=$3)`, user, id, scope))
	if err != nil {
		return result, err
	}
	return result, tx.Commit(ctx)
}

func (r *Repository) Close(ctx context.Context, user, company, id string) (entity.Task, error) {
	var result entity.Task
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)
	if err = companyAccess(ctx, tx, user, company, true); err != nil {
		return result, err
	}
	var task string
	err = tx.QueryRow(ctx, `UPDATE company_daily_tasks SET status='closed' WHERE id=$1 AND company_id=$2 RETURNING id::text`, id, company).Scan(&task)
	if err != nil {
		return result, dbError(err)
	}
	result, err = scanTask(tx.QueryRow(ctx, `SELECT `+taskColumns+taskFrom+` AND t.id=$2`, user, task))
	if err != nil {
		return result, err
	}
	return result, tx.Commit(ctx)
}

func (r *Repository) TaskFile(ctx context.Context, user, company, id string) (files.File, error) {
	var file files.File
	tx, err := r.readTx(ctx)
	if err != nil {
		return file, err
	}
	defer tx.Rollback(ctx)
	if company != "" {
		err = companyAccess(ctx, tx, user, company, false)
	} else {
		err = candidateAccess(ctx, tx, user)
	}
	if err != nil {
		return file, err
	}
	var scope *string
	if company != "" {
		scope = &company
	}
	file, err = scanFile(tx.QueryRow(ctx, `SELECT `+fileColumns+` FROM files f JOIN company_daily_tasks t ON t.file_id=f.id JOIN companies c ON c.id=t.company_id WHERE t.id=$1 AND c.status='active' AND f.status='ready' AND ($2::uuid IS NULL OR t.company_id=$2) AND (t.moderation_status='published' OR $2::uuid IS NOT NULL) FOR SHARE OF c,t,f`, id, scope))
	if err != nil {
		return file, err
	}
	return file, tx.Commit(ctx)
}
