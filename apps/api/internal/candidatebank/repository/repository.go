// Пакет repository читает банк кандидатов, не изменяя их профили.
package repository

import (
	"context"
	"errors"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

const visible = ` FROM candidate_profiles p JOIN users u ON u.id=p.user_id
 WHERE u.role='candidate' AND u.status='active' AND p.search_status IN ('open','passive')`
const columns = `p.id::text,p.city,p.timezone,p.experience_months,p.salary_min_rub,p.search_status,
 ARRAY(SELECT work_format_id FROM candidate_work_formats WHERE candidate_id=p.id ORDER BY work_format_id)`

func scan(row pgx.Row) (entity.Card, error) {
	var c entity.Card
	err := row.Scan(&c.ID, &c.City, &c.Timezone, &c.ExperienceMonths, &c.SalaryMinRUB, &c.SearchStatus, &c.WorkFormatIDs)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, entity.ErrNotFound
	}
	return c, err
}

func authorize(ctx context.Context, tx pgx.Tx, userID, companyID string) error {
	var ok bool
	// Проверяем членство в БД, даже если middleware уже разрешил роль работодателя.
	err := tx.QueryRow(ctx, `SELECT true FROM companies c
 JOIN company_members m ON m.company_id=c.id JOIN users u ON u.id=m.user_id
 WHERE c.id=$2 AND m.user_id=$1 AND m.status='active'
 AND m.role IN ('owner','recruiter','viewer') AND u.role='employer' AND u.status='active'
 FOR SHARE OF c,m,u`, userID, companyID).Scan(&ok)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrNotFound
	}
	return err
}

func (r *Repository) List(ctx context.Context, userID, companyID string, limit, offset int) (entity.Page, error) {
	page := entity.Page{Items: []entity.Card{}, Limit: limit, Offset: offset}
	// Список и total читаем из одного снимка, чтобы они не расходились при изменении профилей.
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead})
	if err != nil {
		return page, err
	}
	defer tx.Rollback(ctx)
	if err = authorize(ctx, tx, userID, companyID); err != nil {
		return page, err
	}
	if err = tx.QueryRow(ctx, `SELECT count(*)`+visible).Scan(&page.Total); err != nil {
		return page, err
	}
	// На первом этапе это каталог, а не рейтинг: порядок по UUID стабилен и не обещает релевантность.
	rows, err := tx.Query(ctx, `SELECT `+columns+visible+` ORDER BY p.id LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return page, err
	}
	for rows.Next() {
		c, e := scan(rows)
		if e != nil {
			rows.Close()
			return page, e
		}
		page.Items = append(page.Items, c)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return page, err
	}
	return page, tx.Commit(ctx)
}

func (r *Repository) Get(ctx context.Context, userID, companyID, candidateID string) (entity.Card, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Card{}, err
	}
	defer tx.Rollback(ctx)
	if err = authorize(ctx, tx, userID, companyID); err != nil {
		return entity.Card{}, err
	}
	c, err := scan(tx.QueryRow(ctx, `SELECT `+columns+visible+` AND p.id=$1`, candidateID))
	if err != nil {
		return c, err
	}
	return c, tx.Commit(ctx)
}
