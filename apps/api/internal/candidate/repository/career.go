package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

const experienceColumns = `id::text,company,position,started_on,ended_on,description,created_at,updated_at`
const educationColumns = `id::text,level,institution,specialty,graduation_year,created_at,updated_at`

// Текущие места работы идут первыми, затем по началу от новых к старым.
const experienceOrder = ` ORDER BY (ended_on IS NOT NULL), started_on DESC, id`
const educationOrder = ` ORDER BY graduation_year DESC, id`

func monthOf(t time.Time) entity.Month { return entity.NewMonth(t.Year(), t.Month()) }

func scanExperience(row pgx.Row) (entity.Experience, error) {
	var e entity.Experience
	var started time.Time
	var ended *time.Time
	if err := row.Scan(&e.ID, &e.Company, &e.Position, &started, &ended, &e.Description, &e.CreatedAt, &e.UpdatedAt); err != nil {
		return e, err
	}
	e.StartedOn = monthOf(started)
	if ended != nil {
		m := monthOf(*ended)
		e.EndedOn = &m
	}
	return e, nil
}

func scanEducation(row pgx.Row) (entity.Education, error) {
	var e entity.Education
	err := row.Scan(&e.ID, &e.Level, &e.Institution, &e.Specialty, &e.GraduationYear, &e.CreatedAt, &e.UpdatedAt)
	return e, err
}

// queryExperience читает места работы профиля. Общий запрос для списка и полного профиля.
func queryExperience(ctx context.Context, q querier, profileID string) ([]entity.Experience, error) {
	rows, err := q.Query(ctx, `SELECT `+experienceColumns+` FROM candidate_experiences WHERE candidate_id=$1`+experienceOrder, profileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []entity.Experience{}
	for rows.Next() {
		e, err := scanExperience(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	return items, rows.Err()
}

func queryEducation(ctx context.Context, q querier, profileID string) ([]entity.Education, error) {
	rows, err := q.Query(ctx, `SELECT `+educationColumns+` FROM candidate_education WHERE candidate_id=$1`+educationOrder, profileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []entity.Education{}
	for rows.Next() {
		e, err := scanEducation(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, e)
	}
	return items, rows.Err()
}

// notFound превращает «нет строки» и неразобранный uuid (SQLSTATE 22P02) в ошибку отсутствия записи.
func notFound(err error, missing error) error {
	var pgErr *pgconn.PgError
	if errors.Is(err, pgx.ErrNoRows) || (errors.As(err, &pgErr) && pgErr.Code == "22P02") {
		return missing
	}
	return err
}

func endedParam(in entity.ExperienceInput) *time.Time {
	if in.EndedOn == nil {
		return nil
	}
	t := in.EndedOn.Time()
	return &t
}

func (r *Repository) ListExperience(ctx context.Context, userID string) ([]entity.Experience, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockedProfile(ctx, tx, userID, false)
	if err != nil {
		return nil, err
	}
	items, err := queryExperience(ctx, tx, profileID)
	if err != nil {
		return nil, err
	}
	return items, tx.Commit(ctx)
}

// CreateExperience проверяет лимит под блокировкой профиля FOR UPDATE: параллельные запросы его не обходят.
func (r *Repository) CreateExperience(ctx context.Context, userID string, in entity.ExperienceInput) (entity.Experience, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Experience{}, err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockedProfile(ctx, tx, userID, true)
	if err != nil {
		return entity.Experience{}, err
	}
	var count int
	if err = tx.QueryRow(ctx, `SELECT count(*) FROM candidate_experiences WHERE candidate_id=$1`, profileID).Scan(&count); err != nil {
		return entity.Experience{}, err
	}
	if count >= entity.MaxExperiences {
		return entity.Experience{}, entity.ErrLimitReached
	}
	e, err := scanExperience(tx.QueryRow(ctx, `INSERT INTO candidate_experiences(candidate_id,company,position,started_on,ended_on,description)
 VALUES($1,$2,$3,$4,$5,$6) RETURNING `+experienceColumns, profileID, in.Company, in.Position, in.StartedOn.Time(), endedParam(in), in.Description))
	if err != nil {
		return e, err
	}
	return e, tx.Commit(ctx)
}

func (r *Repository) ReplaceExperience(ctx context.Context, userID, id string, in entity.ExperienceInput) (entity.Experience, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Experience{}, err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockedProfile(ctx, tx, userID, true)
	if err != nil {
		return entity.Experience{}, err
	}
	e, err := scanExperience(tx.QueryRow(ctx, `UPDATE candidate_experiences SET company=$3,position=$4,started_on=$5,ended_on=$6,description=$7,updated_at=clock_timestamp()
 WHERE id=$1 AND candidate_id=$2 RETURNING `+experienceColumns, id, profileID, in.Company, in.Position, in.StartedOn.Time(), endedParam(in), in.Description))
	if err != nil {
		return e, notFound(err, entity.ErrExperienceNotFound)
	}
	return e, tx.Commit(ctx)
}

func (r *Repository) DeleteExperience(ctx context.Context, userID, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockedProfile(ctx, tx, userID, true)
	if err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `DELETE FROM candidate_experiences WHERE id=$1 AND candidate_id=$2`, id, profileID)
	if err != nil {
		return notFound(err, entity.ErrExperienceNotFound)
	}
	if tag.RowsAffected() == 0 {
		return entity.ErrExperienceNotFound
	}
	return tx.Commit(ctx)
}

func (r *Repository) ListEducation(ctx context.Context, userID string) ([]entity.Education, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockedProfile(ctx, tx, userID, false)
	if err != nil {
		return nil, err
	}
	items, err := queryEducation(ctx, tx, profileID)
	if err != nil {
		return nil, err
	}
	return items, tx.Commit(ctx)
}

func (r *Repository) CreateEducation(ctx context.Context, userID string, in entity.EducationInput) (entity.Education, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Education{}, err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockedProfile(ctx, tx, userID, true)
	if err != nil {
		return entity.Education{}, err
	}
	var count int
	if err = tx.QueryRow(ctx, `SELECT count(*) FROM candidate_education WHERE candidate_id=$1`, profileID).Scan(&count); err != nil {
		return entity.Education{}, err
	}
	if count >= entity.MaxEducation {
		return entity.Education{}, entity.ErrLimitReached
	}
	e, err := scanEducation(tx.QueryRow(ctx, `INSERT INTO candidate_education(candidate_id,level,institution,specialty,graduation_year)
 VALUES($1,$2,$3,$4,$5) RETURNING `+educationColumns, profileID, in.Level, in.Institution, in.Specialty, in.GraduationYear))
	if err != nil {
		return e, err
	}
	return e, tx.Commit(ctx)
}

func (r *Repository) ReplaceEducation(ctx context.Context, userID, id string, in entity.EducationInput) (entity.Education, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Education{}, err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockedProfile(ctx, tx, userID, true)
	if err != nil {
		return entity.Education{}, err
	}
	e, err := scanEducation(tx.QueryRow(ctx, `UPDATE candidate_education SET level=$3,institution=$4,specialty=$5,graduation_year=$6,updated_at=clock_timestamp()
 WHERE id=$1 AND candidate_id=$2 RETURNING `+educationColumns, id, profileID, in.Level, in.Institution, in.Specialty, in.GraduationYear))
	if err != nil {
		return e, notFound(err, entity.ErrEducationNotFound)
	}
	return e, tx.Commit(ctx)
}

func (r *Repository) DeleteEducation(ctx context.Context, userID, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockedProfile(ctx, tx, userID, true)
	if err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `DELETE FROM candidate_education WHERE id=$1 AND candidate_id=$2`, id, profileID)
	if err != nil {
		return notFound(err, entity.ErrEducationNotFound)
	}
	if tag.RowsAffected() == 0 {
		return entity.ErrEducationNotFound
	}
	return tx.Commit(ctx)
}
