package user

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

func (r *Repository) FindByIdentity(ctx context.Context, issuer, subject string) (User, error) {
	var u User
	err := r.db.QueryRow(ctx, `SELECT u.id::text, u.role, u.status,u.blocked_reason,u.blocked_at,
COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'blocked_reason',c.blocked_reason,'blocked_at',c.blocked_at) ORDER BY c.id)
 FROM companies c JOIN company_members m ON m.company_id=c.id
 WHERE m.user_id=u.id AND m.status='active' AND c.status='blocked' AND u.role='employer'),'[]'::jsonb)
FROM users u JOIN external_identities e ON e.user_id = u.id
WHERE e.issuer = $1 AND e.subject = $2`, issuer, subject).Scan(&u.ID, &u.Role, &u.Status, &u.BlockedReason, &u.BlockedAt, &u.BlockedCompanies)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return u, err
}

// Create добавляет пользователя и его внешнюю идентичность в одной транзакции.
func (r *Repository) Create(ctx context.Context, issuer, subject, role string) (User, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return User{}, err
	}
	defer tx.Rollback(ctx)
	var u User
	u.BlockedCompanies = []CompanyBlock{}
	if err := tx.QueryRow(ctx, `INSERT INTO users (role) VALUES ($1) RETURNING id::text, role, status`, role).Scan(&u.ID, &u.Role, &u.Status); err != nil {
		return User{}, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO external_identities (user_id, issuer, subject) VALUES ($1, $2, $3)`, u.ID, issuer, subject); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return User{}, ErrExists
		}
		return User{}, err
	}
	return u, tx.Commit(ctx)
}
