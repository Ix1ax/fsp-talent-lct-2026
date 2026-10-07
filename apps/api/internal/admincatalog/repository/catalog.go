// Пакет repository сохраняет справочники, не меняя их существующие связи.
package repository

import (
	"context"
	"errors"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"

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
		return "id::text, code, name, active, NULL::smallint, aliases, moderation_status, submitted_by::text, submitted_at, moderated_by::text, moderated_at, moderation_reason, merged_into::text", nil
	case "specializations":
		return "id::text, code, name, active, NULL::smallint, '{}'::text[], NULL::text, NULL::text, NULL::timestamptz, NULL::text, NULL::timestamptz, NULL::text, NULL::text", nil
	case "grades":
		return "id::text, code, name, active, rank, '{}'::text[], NULL::text, NULL::text, NULL::timestamptz, NULL::text, NULL::timestamptz, NULL::text, NULL::text", nil
	case "work_formats":
		return "id::text, code, name, active, NULL::smallint, '{}'::text[], NULL::text, NULL::text, NULL::timestamptz, NULL::text, NULL::timestamptz, NULL::text, NULL::text", nil
	default:
		return "", entity.ErrNotFound
	}
}
func scan(row pgx.Row) (entity.Item, error) {
	var item entity.Item
	err := row.Scan(&item.ID, &item.Code, &item.Name, &item.Active, &item.Rank, &item.Aliases, &item.ModerationStatus, &item.SubmittedBy, &item.SubmittedAt, &item.ModeratedBy, &item.ModeratedAt, &item.ModerationReason, &item.MergedInto)
	if errors.Is(err, pgx.ErrNoRows) {
		return item, entity.ErrNotFound
	}
	var dbErr *pgconn.PgError
	if errors.As(err, &dbErr) && dbErr.Code == "23503" {
		return item, entity.ErrInUse
	}
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
	if kind == "skills" {
		if err = catalog.LockSkillChanges(ctx, tx); err != nil {
			return entity.Item{}, err
		}
	}
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
	if err = record(ctx, tx, actor, "created", kind, item.ID); err != nil {
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
	if kind == "skills" {
		if err = catalog.LockSkillChanges(ctx, tx); err != nil {
			return entity.Item{}, err
		}
	}
	set := "name=COALESCE($2,name),active=COALESCE($3,active)"
	args := []any{id, in.Name, in.Active}
	if kind == "skills" {
		set += ",aliases=COALESCE($4::text[],aliases)"
		args = append(args, in.Aliases)
		if err = editableSkill(ctx, tx, id); err != nil {
			return entity.Item{}, err
		}
	}
	cast := "smallint"
	if kind == "skills" {
		cast = "uuid"
	}
	item, err := scan(tx.QueryRow(ctx, `UPDATE `+kind+` SET `+set+` WHERE id=$1::`+cast+` RETURNING `+cols, args...))
	if err != nil {
		return item, err
	}
	if err = record(ctx, tx, actor, "updated", kind, item.ID); err != nil {
		return item, err
	}
	return item, tx.Commit(ctx)
}

// Отдельная модерация не обходится обычным PATCH или удалением истории отклонения.
func editableSkill(ctx context.Context, tx pgx.Tx, id string) error {
	var status string
	err := tx.QueryRow(ctx, `SELECT moderation_status FROM skills WHERE id=$1 FOR UPDATE`, id).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrNotFound
	}
	if err != nil {
		return err
	}
	if status != "approved" {
		return entity.ErrModerationRequired
	}
	return nil
}
func record(ctx context.Context, tx pgx.Tx, actor, action, kind, id string) error {
	// Тексты навыков и персональные данные в журнал не копируем.
	_, err := tx.Exec(ctx, `INSERT INTO admin_catalog_events(actor_id,action,catalog,item_id) VALUES($1,$2,$3,$4)`, actor, action, kind, id)
	return err
}
func (r *Repository) Get(ctx context.Context, actor, kind, id string) (entity.Item, error) {
	cols, err := columns(kind)
	if err != nil {
		return entity.Item{}, err
	}
	tx, err := r.begin(ctx, actor)
	if err != nil {
		return entity.Item{}, err
	}
	defer tx.Rollback(ctx)
	cast := "smallint"
	if kind == "skills" {
		cast = "uuid"
	}
	item, err := scan(tx.QueryRow(ctx, `SELECT `+cols+` FROM `+kind+` WHERE id=$1::`+cast, id))
	if err != nil {
		return item, err
	}
	return item, tx.Commit(ctx)
}
func (r *Repository) Delete(ctx context.Context, actor, kind, id string) error {
	cols, err := columns(kind)
	if err != nil {
		return err
	}
	tx, err := r.begin(ctx, actor)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if kind == "skills" {
		if err = catalog.LockSkillChanges(ctx, tx); err != nil {
			return err
		}
	}
	cast := "smallint"
	if kind == "skills" {
		cast = "uuid"
		if err = editableSkill(ctx, tx, id); err != nil {
			return err
		}
	}
	// Внешние ключи проверяют использование атомарно, включая конкурентное добавление связи.
	_, err = scan(tx.QueryRow(ctx, `DELETE FROM `+kind+` WHERE id=$1::`+cast+` RETURNING `+cols, id))
	if err != nil {
		return err
	}
	if err = record(ctx, tx, actor, "deleted", kind, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
