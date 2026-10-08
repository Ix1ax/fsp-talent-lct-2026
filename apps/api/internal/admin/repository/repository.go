// Пакет repository хранит отдельные аккаунты и сессии администраторов.
package repository

import (
	"context"
	"errors"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/entity"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"time"
)

type Repository struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

const columns = `a.id::text,a.email,a.role,a.status,a.created_at`

func scan(row pgx.Row) (entity.Account, error) {
	var a entity.Account
	err := row.Scan(&a.ID, &a.Email, &a.Role, &a.Status, &a.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return a, entity.ErrUnauthorized
	}
	return a, err
}

func (r *Repository) Lookup(ctx context.Context, email string) (entity.Account, string, error) {
	var a entity.Account
	var hash *string
	err := r.db.QueryRow(ctx, `SELECT `+columns+`,a.password_hash FROM admin_accounts a WHERE email=$1`, email).Scan(&a.ID, &a.Email, &a.Role, &a.Status, &a.CreatedAt, &hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return a, "", entity.ErrUnauthorized
	}
	if err != nil {
		return a, "", err
	}
	if hash == nil {
		return a, "", nil
	}
	return a, *hash, nil
}

func (r *Repository) AllowLogin(ctx context.Context, key []byte, max int) error {
	var attempts int
	err := r.db.QueryRow(ctx, `INSERT INTO admin_login_limits(key_hash,attempts,window_end) VALUES($1,1,clock_timestamp()+interval '15 minutes')
 ON CONFLICT(key_hash) DO UPDATE SET
 attempts=CASE WHEN admin_login_limits.window_end<=clock_timestamp() THEN 1 ELSE admin_login_limits.attempts+1 END,
 window_end=CASE WHEN admin_login_limits.window_end<=clock_timestamp() THEN clock_timestamp()+interval '15 minutes' ELSE admin_login_limits.window_end END
 RETURNING attempts`, key).Scan(&attempts)
	if err != nil {
		return err
	}
	if attempts > max {
		return entity.ErrRateLimited
	}
	return nil
}

func (r *Repository) IssueSession(ctx context.Context, id, expectedHash string, tokenHash []byte, expires time.Time) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var ok bool
	err = tx.QueryRow(ctx, `SELECT true FROM admin_accounts WHERE id=$1 AND status='active' AND password_hash=$2 FOR SHARE`, id, expectedHash).Scan(&ok)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrUnauthorized
	}
	if err != nil {
		return err
	}
	// Просроченные сессии и старые окна не накапливаются при регулярных входах.
	if _, err = tx.Exec(ctx, `DELETE FROM admin_sessions WHERE expires_at<=now()`); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM admin_login_limits WHERE window_end<now()-interval '1 day'`); err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO admin_sessions(admin_id,token_hash,expires_at) VALUES($1,$2,$3)`, id, tokenHash, expires); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repository) Resolve(ctx context.Context, hash []byte) (entity.Account, error) {
	return scan(r.db.QueryRow(ctx, `SELECT `+columns+` FROM admin_sessions s JOIN admin_accounts a ON a.id=s.admin_id WHERE s.token_hash=$1 AND s.expires_at>now() AND a.status='active'`, hash))
}
func (r *Repository) Logout(ctx context.Context, hash []byte) error {
	_, err := r.db.Exec(ctx, `DELETE FROM admin_sessions WHERE token_hash=$1`, hash)
	return err
}

func (r *Repository) Create(ctx context.Context, actor, email, hash string) (entity.Account, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Account{}, err
	}
	defer tx.Rollback(ctx)
	var ok bool
	err = tx.QueryRow(ctx, `SELECT true FROM admin_accounts WHERE id=$1 AND role='superadmin' AND status='active' FOR SHARE`, actor).Scan(&ok)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.Account{}, entity.ErrForbidden
	}
	if err != nil {
		return entity.Account{}, err
	}
	a, err := scan(tx.QueryRow(ctx, `INSERT INTO admin_accounts AS a(email,password_hash,role,created_by) VALUES($1,$2,'admin',$3) RETURNING `+columns, email, hash, actor))
	var pgerr *pgconn.PgError
	if errors.As(err, &pgerr) && pgerr.Code == "23505" {
		return a, entity.ErrConflict
	}
	if err != nil {
		return a, err
	}
	return a, tx.Commit(ctx)
}

// Bootstrap активирует только созданного миграцией суперадмина без пароля. Повторный запуск пароль не меняет.
func (r *Repository) Bootstrap(ctx context.Context, email, hash string) error {
	_, err := r.db.Exec(ctx, `UPDATE admin_accounts SET email=$1,password_hash=$2 WHERE role='superadmin' AND password_hash IS NULL`, email, hash)
	return err
}

// List возвращает список только действующему суперадмину, без хешей паролей.
func (r *Repository) List(ctx context.Context, actor string, limit, offset int) ([]entity.Account, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var ok bool
	err = tx.QueryRow(ctx, `SELECT true FROM admin_accounts WHERE id=$1 AND role='superadmin' AND status='active' FOR SHARE`, actor).Scan(&ok)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, entity.ErrForbidden
	}
	if err != nil {
		return nil, err
	}
	rows, err := tx.Query(ctx, `SELECT `+columns+` FROM admin_accounts a ORDER BY a.created_at,a.id LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	items := []entity.Account{}
	for rows.Next() {
		a, e := scan(rows)
		if e != nil {
			rows.Close()
			return nil, e
		}
		items = append(items, a)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	return items, tx.Commit(ctx)
}

// UpdateStatus блокирует аккаунт до смены статуса и отзыва всех сессий.
// IssueSession использует FOR SHARE той же записи, поэтому вход не может обойти блокировку.
func (r *Repository) UpdateStatus(ctx context.Context, actor, id, status string) (entity.Account, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Account{}, err
	}
	defer tx.Rollback(ctx)
	var allowed bool
	err = tx.QueryRow(ctx, `SELECT true FROM admin_accounts WHERE id=$1 AND role='superadmin' AND status='active' FOR SHARE`, actor).Scan(&allowed)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.Account{}, entity.ErrForbidden
	}
	if err != nil {
		return entity.Account{}, err
	}
	if actor == id {
		return entity.Account{}, entity.ErrStatusChangeForbidden
	}
	a, err := scan(tx.QueryRow(ctx, `SELECT `+columns+` FROM admin_accounts a WHERE id=$1 FOR UPDATE`, id))
	if errors.Is(err, entity.ErrUnauthorized) {
		return a, entity.ErrNotFound
	}
	if err != nil {
		return a, err
	}
	if a.Role != "admin" {
		return a, entity.ErrStatusChangeForbidden
	}
	old := a.Status
	if _, err = tx.Exec(ctx, `UPDATE admin_accounts SET status=$2 WHERE id=$1`, id, status); err != nil {
		return a, err
	}
	if status == "blocked" {
		if _, err = tx.Exec(ctx, `DELETE FROM admin_sessions WHERE admin_id=$1`, id); err != nil {
			return a, err
		}
	}
	if old != status {
		if _, err = tx.Exec(ctx, `INSERT INTO admin_status_events(actor_id,admin_id,old_status,new_status) VALUES($1,$2,$3,$4)`, actor, id, old, status); err != nil {
			return a, err
		}
	}
	a.Status = status
	return a, tx.Commit(ctx)
}
