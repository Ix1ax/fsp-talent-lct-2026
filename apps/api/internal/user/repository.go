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
	return r.create(ctx, issuer, subject, role, IdentityProfile{})
}

func (r *Repository) CreateWithIdentityProfile(ctx context.Context, issuer, subject, role string, profile IdentityProfile) (User, error) {
	var err error
	profile, err = profile.normalized()
	if err != nil {
		return User{}, err
	}
	return r.create(ctx, issuer, subject, role, profile)
}

func (r *Repository) create(ctx context.Context, issuer, subject, role string, profile IdentityProfile) (User, error) {
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
	if _, err := tx.Exec(ctx, `INSERT INTO external_identities (user_id, issuer, subject,email,display_name,profile_updated_at,profile_token_issued_at)
VALUES ($1,$2,$3,NULLIF($4,''),NULLIF($5,''),CASE WHEN $4<>'' OR $5<>'' THEN clock_timestamp() END,$6)`, u.ID, issuer, subject, profile.Email, profile.DisplayName, profileIssuedAt(profile)); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return User{}, ErrExists
		}
		return User{}, err
	}
	return u, tx.Commit(ctx)
}

func profileIssuedAt(profile IdentityProfile) any {
	if profile.IssuedAt.IsZero() {
		return nil
	}
	return profile.IssuedAt
}

// Повтор того же токена не переписывает строку; старый токен не откатывает новое имя/почту.
func (r *Repository) SyncIdentityProfile(ctx context.Context, issuer, subject string, profile IdentityProfile) error {
	var err error
	profile, err = profile.normalized()
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, syncIdentityProfileSQL, issuer, subject, profile.Email, profile.DisplayName, profileIssuedAt(profile))
	return err
}

const syncIdentityProfileSQL = `UPDATE external_identities e SET email=NULLIF($3,''),display_name=NULLIF($4,''),
profile_updated_at=clock_timestamp(),profile_token_issued_at=$5
FROM users u WHERE e.user_id=u.id AND e.issuer=$1 AND e.subject=$2 AND u.status<>'deleted'
AND (e.profile_token_issued_at IS NULL OR ($5::timestamptz IS NOT NULL AND $5>=e.profile_token_issued_at))
AND (e.email IS DISTINCT FROM NULLIF($3,'') OR e.display_name IS DISTINCT FROM NULLIF($4,'') OR e.profile_token_issued_at IS DISTINCT FROM $5::timestamptz)`
