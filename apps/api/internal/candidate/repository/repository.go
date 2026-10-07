// Пакет repository хранит профили кандидатов и их аватары в Postgres.
package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db} }

type querier interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

const profileColumns = `p.id::text,p.avatar_file_id::text,p.headline,p.summary,p.city,p.timezone,p.experience_months,p.salary_min_rub,p.search_status,p.updated_at`

// Доступ к профилю имеет только активный кандидат; проверка выполняется в самом запросе.
const ownerFilter = ` FROM candidate_profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1 AND u.role='candidate' AND u.status='active'`

func scanProfile(ctx context.Context, q querier, row pgx.Row) (entity.Profile, error) {
	var p entity.Profile
	if err := row.Scan(&p.ID, &p.AvatarFileID, &p.Headline, &p.Summary, &p.City, &p.Timezone, &p.ExperienceMonths, &p.SalaryMinRUB, &p.SearchStatus, &p.UpdatedAt); err != nil {
		return p, dbError(err)
	}
	rows, err := q.Query(ctx, `SELECT work_format_id FROM candidate_work_formats WHERE candidate_id=$1 ORDER BY work_format_id`, p.ID)
	if err != nil {
		return p, err
	}
	defer rows.Close()
	p.WorkFormatIDs = []int16{}
	for rows.Next() {
		var id int16
		if err := rows.Scan(&id); err != nil {
			return p, err
		}
		p.WorkFormatIDs = append(p.WorkFormatIDs, id)
	}
	return p, rows.Err()
}

func setWorkFormats(ctx context.Context, tx pgx.Tx, profileID string, ids []int16) error {
	rows, err := tx.Query(ctx, `SELECT f.id FROM work_formats f WHERE f.id=ANY($2::smallint[])
 AND (f.active OR EXISTS(SELECT 1 FROM candidate_work_formats c WHERE c.candidate_id=$1 AND c.work_format_id=f.id)) FOR SHARE OF f`, profileID, ids)
	if err != nil {
		return err
	}
	count := 0
	for rows.Next() {
		count++
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if count != len(ids) {
		return &entity.ValidationError{Message: "Формат работы не существует или архивирован"}
	}

	if _, err := tx.Exec(ctx, `DELETE FROM candidate_work_formats WHERE candidate_id=$1`, profileID); err != nil {
		return err
	}
	if len(ids) == 0 {
		return nil
	}
	_, err = tx.Exec(ctx, `INSERT INTO candidate_work_formats(candidate_id,work_format_id) SELECT $1, unnest($2::smallint[])`, profileID, ids)
	return dbError(err)
}

func dbError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch {
		case pgErr.Code == "23505" && pgErr.ConstraintName == "candidate_profiles_user_id_key":
			return entity.ErrConflict
		case pgErr.Code == "23503" && pgErr.TableName == "candidate_work_formats":
			return &entity.ValidationError{Message: "Неизвестный формат работы: выберите ID из справочника"}
		}
	}
	return err
}
