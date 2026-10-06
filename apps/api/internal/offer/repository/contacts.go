package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/audit"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
)

// CandidateContacts выдаёт контакты кандидата активному owner или recruiter компании-отправителя
// по принятому предложению. Выдача и запись в журнал выполняются в одной транзакции.
// Чужая компания, роль viewer и предложение не в статусе accepted дают ErrNotFound: существование не раскрываем.
func (r *Repository) CandidateContacts(ctx context.Context, user, company, offerID string) (entity.CandidateContacts, error) {
	var c entity.CandidateContacts
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return c, err
	}
	defer tx.Rollback(ctx)
	var candidateUser string
	err = tx.QueryRow(ctx, `SELECT p.user_id::text FROM candidate_offers o
 JOIN company_members m ON m.company_id=o.company_id JOIN users u ON u.id=m.user_id JOIN candidate_profiles p ON p.id=o.candidate_id
 WHERE o.id=$3 AND o.company_id=$2 AND o.status='accepted' AND m.user_id=$1 AND m.status='active' AND m.role IN ('owner','recruiter')
 AND u.status='active' AND u.role='employer' FOR SHARE OF o,m,u`, user, company, offerID).Scan(&candidateUser)
	if err != nil {
		return c, dbError(err)
	}
	// Строка кандидата блокируется FOR SHARE: отзыв согласия (FOR UPDATE) дождётся окончания выдачи.
	var active bool
	err = tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='candidate' AND status='active' FOR SHARE`, candidateUser).Scan(&active)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, entity.ErrContactsUnavailable
	}
	if err != nil {
		return c, err
	}
	var consent bool
	err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM candidate_consents WHERE user_id=$1 AND kind='processing' AND company_id IS NULL AND revoked_at IS NULL)`, candidateUser).Scan(&consent)
	if err != nil {
		return c, err
	}
	if !consent {
		return c, entity.ErrContactsUnavailable
	}
	err = tx.QueryRow(ctx, `SELECT full_name,email,phone,telegram FROM candidate_contacts WHERE user_id=$1`, candidateUser).Scan(&c.FullName, &c.Email, &c.Phone, &c.Telegram)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.CandidateContacts{}, entity.ErrContactsUnavailable
	}
	if err != nil {
		return entity.CandidateContacts{}, err
	}
	// В журнал идут только идентификаторы, без самих контактов.
	if err = audit.Record(ctx, tx, audit.Event{ActorUserID: &user, Action: "contacts.disclosed", EntityType: "candidate_offers", EntityID: &offerID, Metadata: map[string]any{"company_id": company, "offer_id": offerID}}); err != nil {
		return entity.CandidateContacts{}, err
	}
	return c, tx.Commit(ctx)
}
