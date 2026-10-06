package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/audit"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

const contactsColumns = `full_name,email,phone,telegram,updated_at`

func scanContacts(row pgx.Row) (entity.Contacts, error) {
	var c entity.Contacts
	err := row.Scan(&c.FullName, &c.Email, &c.Phone, &c.Telegram, &c.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, entity.ErrContactsNotFound
	}
	return c, err
}

// lockActiveCandidate блокирует строку пользователя FOR SHARE: отзыв согласия берёт её FOR UPDATE и ждёт нас.
func lockActiveCandidate(ctx context.Context, tx pgx.Tx, userID string) error {
	var ok bool
	err := tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='candidate' AND status='active' FOR SHARE`, userID).Scan(&ok)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrForbidden
	}
	return err
}

// requireConsents проверяет, что активны все перечисленные согласия (без привязки к компании).
func requireConsents(ctx context.Context, q querier, userID string, kinds ...string) error {
	var active int
	err := q.QueryRow(ctx, `SELECT count(DISTINCT kind) FROM candidate_consents WHERE user_id=$1 AND revoked_at IS NULL AND company_id IS NULL AND kind=ANY($2::text[])`, userID, kinds).Scan(&active)
	if err != nil {
		return err
	}
	if active != len(kinds) {
		return entity.ErrConsentRequired
	}
	return nil
}

func (r *Repository) PutContacts(ctx context.Context, userID string, in entity.ContactsInput) (entity.Contacts, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Contacts{}, err
	}
	defer tx.Rollback(ctx)
	if err = lockActiveCandidate(ctx, tx, userID); err != nil {
		return entity.Contacts{}, err
	}
	if err = requireConsents(ctx, tx, userID, "processing"); err != nil {
		return entity.Contacts{}, err
	}
	c, err := scanContacts(tx.QueryRow(ctx, `INSERT INTO candidate_contacts(user_id,full_name,email,phone,telegram) VALUES($1,$2,$3,$4,$5)
 ON CONFLICT (user_id) DO UPDATE SET full_name=EXCLUDED.full_name,email=EXCLUDED.email,phone=EXCLUDED.phone,telegram=EXCLUDED.telegram,updated_at=now()
 RETURNING `+contactsColumns, userID, in.FullName, in.Email, in.Phone, in.Telegram))
	if err != nil {
		return c, err
	}
	// В журнал идут только идентификаторы: ФИО, телефон, почта и Telegram туда не попадают.
	if err = audit.Record(ctx, tx, audit.Event{ActorUserID: &userID, Action: "contacts.updated", EntityType: "candidate_contacts", EntityID: &userID}); err != nil {
		return c, err
	}
	return c, tx.Commit(ctx)
}

func (r *Repository) Contacts(ctx context.Context, userID string) (entity.Contacts, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Contacts{}, err
	}
	defer tx.Rollback(ctx)
	if err = lockActiveCandidate(ctx, tx, userID); err != nil {
		return entity.Contacts{}, err
	}
	if err = requireConsents(ctx, tx, userID, "processing"); err != nil {
		return entity.Contacts{}, err
	}
	c, err := scanContacts(tx.QueryRow(ctx, `SELECT `+contactsColumns+` FROM candidate_contacts WHERE user_id=$1`, userID))
	if err != nil {
		return c, err
	}
	return c, tx.Commit(ctx)
}
