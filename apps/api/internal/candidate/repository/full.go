package repository

import (
	"context"
	"errors"
	fsprepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/repository"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	consententity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
)

// FullSnapshot читает профиль, активные согласия, контакты и навыки одной транзакцией со снимком (REPEATABLE READ,
// только чтение), чтобы части ответа не расходились при параллельных изменениях. Нет профиля — Profile nil.
// Блокировки в транзакции только для чтения недопустимы, поэтому пользователь проверяется обычным запросом.
func (r *Repository) FullSnapshot(ctx context.Context, userID string) (entity.FullSnapshot, error) {
	var snapshot entity.FullSnapshot
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return snapshot, err
	}
	defer tx.Rollback(ctx)
	var active bool
	err = tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='candidate' AND status='active'`, userID).Scan(&active)
	if errors.Is(err, pgx.ErrNoRows) {
		return snapshot, entity.ErrForbidden
	}
	if err != nil {
		return snapshot, err
	}
	profile, err := scanProfile(ctx, tx, tx.QueryRow(ctx, `SELECT `+profileColumns+ownerFilter, userID))
	switch {
	case err == nil:
		snapshot.Profile = &profile
	case !errors.Is(err, entity.ErrNotFound):
		return snapshot, err
	}
	rows, err := tx.Query(ctx, `SELECT id::text,kind,policy_version,company_id::text,granted_at,revoked_at FROM candidate_consents WHERE user_id=$1 AND revoked_at IS NULL ORDER BY granted_at,id`, userID)
	if err != nil {
		return snapshot, err
	}
	snapshot.Consents = []consententity.Consent{}
	for rows.Next() {
		var c consententity.Consent
		if err = rows.Scan(&c.ID, &c.Kind, &c.PolicyVersion, &c.CompanyID, &c.GrantedAt, &c.RevokedAt); err != nil {
			rows.Close()
			return snapshot, err
		}
		snapshot.Consents = append(snapshot.Consents, c)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return snapshot, err
	}
	contacts, err := scanContacts(tx.QueryRow(ctx, `SELECT `+contactsColumns+` FROM candidate_contacts WHERE user_id=$1`, userID))
	switch {
	case err == nil:
		snapshot.Contacts = &contacts
	case !errors.Is(err, entity.ErrContactsNotFound):
		return snapshot, err
	}
	snapshot.Skills = []entity.Skill{}
	if snapshot.Profile != nil {
		if snapshot.Skills, err = queryCandidateSkills(ctx, tx, snapshot.Profile.ID); err != nil {
			return snapshot, err
		}
		if snapshot.Experience, err = queryExperience(ctx, tx, snapshot.Profile.ID); err != nil {
			return snapshot, err
		}
		if snapshot.Education, err = queryEducation(ctx, tx, snapshot.Profile.ID); err != nil {
			return snapshot, err
		}
	}
	if snapshot.Profile != nil {
		var c entity.Category
		err = tx.QueryRow(ctx, `SELECT c.specialization_id,sp.name,c.grade_id,g.name,c.confirmed_at FROM candidate_categories c
 JOIN specializations sp ON sp.id=c.specialization_id JOIN grades g ON g.id=c.grade_id WHERE c.candidate_id=$1`, snapshot.Profile.ID).
			Scan(&c.SpecializationID, &c.Specialization, &c.GradeID, &c.Grade, &c.ConfirmedAt)
		switch {
		case err == nil:
			snapshot.Category = &c
		case !errors.Is(err, pgx.ErrNoRows):
			return snapshot, err
		}
	}
	if snapshot.Profile != nil {
		snapshot.Achievements, err = fsprepo.Achievements(ctx, tx, snapshot.Profile.ID)
		if err != nil {
			return snapshot, err
		}
	}
	return snapshot, tx.Commit(ctx)
}
