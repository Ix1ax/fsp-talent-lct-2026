// Пакет repository сохраняет справочники, не меняя их существующие связи.
package repository

import (
	"context"
	"errors"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/entity"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

// Имена таблиц берём только из закрытого списка, пользовательский ввод в SQL не попадает.
func columns(kind string) (string, error) {
	switch kind {
	case "skills":
		return "id::text, code, name, active, NULL::smallint, aliases", nil
	case "specializations":
		return "id::text, code, name, active, NULL::smallint, '{}'::text[]", nil
	case "grades":
		return "id::text, code, name, NULL::boolean, rank, '{}'::text[]", nil
	case "work_formats":
		return "id::text, code, name, NULL::boolean, NULL::smallint, '{}'::text[]", nil
	default:
		return "", entity.ErrNotFound
	}
}
func scan(row pgx.Row) (entity.Item, error) {
	var item entity.Item
	err := row.Scan(&item.ID, &item.Code, &item.Name, &item.Active, &item.Rank, &item.Aliases)
	if errors.Is(err, pgx.ErrNoRows) {
		return item, entity.ErrNotFound
	}
	var dbErr *pgconn.PgError
	if errors.As(err, &dbErr) && dbErr.Code == "23505" {
		return item, entity.ErrConflict
	}
	return item, err
}
func (r *Repository) begin(ctx context.Context, actor string) (pgx.Tx, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	var allowed bool
	err = tx.QueryRow(ctx, `SELECT true FROM admin_accounts WHERE id=$1 AND status='active' AND role IN ('admin','superadmin') FOR SHARE`, actor).Scan(&allowed)
	if err != nil {
		tx.Rollback(ctx)
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, entity.ErrForbidden
		}
		return nil, err
	}
	return tx, nil
}
func (r *Repository) List(ctx context.Context, actor, kind, q string, limit, offset int) ([]entity.Item, error) {
	cols, err := columns(kind)
	if err != nil {
		return nil, err
	}
	tx, err := r.begin(ctx, actor)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	order := "name,id"
	if kind == "grades" {
		order = "rank,id"
	}
	filter := `($1='' OR strpos(lower(code),lower($1))>0 OR strpos(lower(name),lower($1))>0)`
	if kind == "skills" {
		filter = `(` + filter + ` OR EXISTS(SELECT 1 FROM unnest(aliases) a WHERE strpos(lower(a),lower($1))>0))`
	}
	rows, err := tx.Query(ctx, `SELECT `+cols+` FROM `+kind+` WHERE `+filter+` ORDER BY `+order+` LIMIT $2 OFFSET $3`, q, limit, offset)
	if err != nil {
		return nil, err
	}
	items := []entity.Item{}
	for rows.Next() {
		item, e := scan(rows)
		if e != nil {
			rows.Close()
			return nil, e
		}
		items = append(items, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	return items, tx.Commit(ctx)
}
func (r *Repository) Create(ctx context.Context, actor, kind string, in entity.CreateInput) (entity.Item, error) {
	cols, err := columns(kind)
	if err != nil {
		return entity.Item{}, err
	}
	tx, err := r.begin(ctx, actor)
	if err != nil {
		return entity.Item{}, err
	}
	defer tx.Rollback(ctx)
	fields, values := "code,name", "$1,$2"
	args := []any{in.Code, in.Name}
	if kind == "skills" {
		fields += ",aliases"
		values += ",$3"
		args = append(args, in.Aliases)
	}
	if kind == "grades" {
		fields += ",rank"
		values += ",$3"
		args = append(args, in.Rank)
	}
	item, err := scan(tx.QueryRow(ctx, `INSERT INTO `+kind+` (`+fields+`) VALUES (`+values+`) RETURNING `+cols, args...))
	if err != nil {
		return item, err
	}
	return item, tx.Commit(ctx)
}
func (r *Repository) Update(ctx context.Context, actor, kind, id string, in entity.UpdateInput) (entity.Item, error) {
	cols, err := columns(kind)
	if err != nil {
		return entity.Item{}, err
	}
	tx, err := r.begin(ctx, actor)
	if err != nil {
		return entity.Item{}, err
	}
	defer tx.Rollback(ctx)
	set := "name=$2"
	args := []any{id, in.Name}
	switch kind {
	case "specializations":
		set += ",active=COALESCE($3,active)"
		args = append(args, in.Active)
	case "skills":
		set += ",active=COALESCE($3,active),aliases=COALESCE($4::text[],aliases)"
		args = append(args, in.Active, in.Aliases)
	}
	cast := "smallint"
	if kind == "skills" {
		cast = "uuid"
	}
	item, err := scan(tx.QueryRow(ctx, `UPDATE `+kind+` SET `+set+` WHERE id=$1::`+cast+` RETURNING `+cols, args...))
	if err != nil {
		return item, err
	}
	return item, tx.Commit(ctx)
}
