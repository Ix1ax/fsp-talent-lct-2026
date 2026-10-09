// Пакет repository хранит согласия кандидата. Проверки и журнал выполняются в одной транзакции с изменением.
package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/audit"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
)

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db} }

const columns = `id::text,kind,policy_version,company_id::text,granted_at,revoked_at`

func scan(row pgx.Row) (entity.Consent, error) {
	var c entity.Consent
	err := row.Scan(&c.ID, &c.Kind, &c.PolicyVersion, &c.CompanyID, &c.GrantedAt, &c.RevokedAt)
	return c, err
}

func (r *Repository) List(ctx context.Context, userID string) ([]entity.Consent, error) {
	rows, err := r.db.Query(ctx, `SELECT `+columns+` FROM candidate_consents WHERE user_id=$1 ORDER BY granted_at DESC,id`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []entity.Consent{}
	for rows.Next() {
		c, err := scan(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, c)
	}
	return items, rows.Err()
}

// lockCandidate блокирует строку пользователя. Отзыв берёт её FOR UPDATE, а выдача, профиль и контакты — FOR SHARE,
// поэтому отзыв не пересекается с записью, которая опирается на согласие.
func lockCandidate(ctx context.Context, tx pgx.Tx, userID, mode string) error {
	var ok bool
	err := tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='candidate' AND status='active' `+mode, userID).Scan(&ok)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrForbidden
	}
	return err
}

func (r *Repository) Grant(ctx context.Context, userID string, in entity.GrantInput) (entity.Consent, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Consent{}, err
	}
	defer tx.Rollback(ctx)
	if in.CompanyID != nil {
		var company string
		err = tx.QueryRow(ctx, `SELECT id::text FROM companies WHERE id=$1 AND status='active' FOR SHARE`, *in.CompanyID).Scan(&company)
		if errors.Is(err, pgx.ErrNoRows) {
			return entity.Consent{}, entity.ErrCompanyNotFound
		}
		if err != nil {
			return entity.Consent{}, err
		}
	}
	if err = lockCandidate(ctx, tx, userID, "FOR SHARE"); err != nil {
		return entity.Consent{}, err
	}
	c, err := scan(tx.QueryRow(ctx, `INSERT INTO candidate_consents(user_id,kind,policy_version,company_id) VALUES($1,$2,$3,$4) RETURNING `+columns,
		userID, in.Kind, in.PolicyVersion, in.CompanyID))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) {
			switch {
			case pgErr.Code == "23505" && pgErr.ConstraintName == "candidate_consents_active_idx":
				return entity.Consent{}, entity.ErrConsentExists
			case pgErr.Code == "23503" && pgErr.ConstraintName == "candidate_consents_company_id_fkey":
				return entity.Consent{}, entity.ErrCompanyNotFound
			}
		}
		return entity.Consent{}, err
	}
	meta := map[string]any{"kind": c.Kind, "policy_version": c.PolicyVersion}
	if c.CompanyID != nil {
		meta["company_id"] = *c.CompanyID
	}
	if err = audit.Record(ctx, tx, audit.Event{ActorUserID: &userID, Action: "consent.granted", EntityType: "candidate_consents", EntityID: &c.ID, Metadata: meta}); err != nil {
		return entity.Consent{}, err
	}
	return c, tx.Commit(ctx)
}

// Revoke отзывает активное согласие. Отзыв processing отзывает все активные согласия пользователя;
// отзыв processing или publication скрывает профиль. Время отзыва берём clock_timestamp(): оно не меньше
// времени выдачи, даже если транзакция отзыва началась раньше и ждала блокировку.
func (r *Repository) Revoke(ctx context.Context, userID, kind string, companyID *string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = lockCandidate(ctx, tx, userID, "FOR UPDATE"); err != nil {
		return err
	}
	revoked, err := revokeRows(ctx, tx, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1 AND kind=$2 AND company_id IS NOT DISTINCT FROM $3::uuid AND revoked_at IS NULL RETURNING id::text,kind`, userID, kind, companyID)
	if err != nil {
		return err
	}
	if len(revoked) == 0 {
		return entity.ErrNotFound
	}
	if kind == entity.KindProcessing {
		others, err := revokeRows(ctx, tx, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1 AND revoked_at IS NULL RETURNING id::text,kind`, userID)
		if err != nil {
			return err
		}
		revoked = append(revoked, others...)
	}
	if kind == entity.KindProcessing || kind == entity.KindPublication {
		if _, err = tx.Exec(ctx, `UPDATE candidate_profiles SET search_status='hidden',updated_at=now() WHERE user_id=$1 AND search_status<>'hidden'`, userID); err != nil {
			return err
		}
	}
	for _, item := range revoked {
		id := item[0]
		if err = audit.Record(ctx, tx, audit.Event{ActorUserID: &userID, Action: "consent.revoked", EntityType: "candidate_consents", EntityID: &id, Metadata: map[string]any{"kind": item[1]}}); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func revokeRows(ctx context.Context, tx pgx.Tx, query string, args ...any) ([][2]string, error) {
	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result [][2]string
	for rows.Next() {
		var item [2]string
		if err := rows.Scan(&item[0], &item[1]); err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}
