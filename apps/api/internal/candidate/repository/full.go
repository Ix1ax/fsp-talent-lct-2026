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
		err = tx.QueryRow(ctx, `SELECT c.specialization_id,sp.name,c.grade_id,g.name,c.confirmed_at,g.rank,a.stack_skill_id::text,a.stack_name FROM candidate_categories c JOIN assessment_attempts a ON a.id=c.attempt_id
 JOIN specializations sp ON sp.id=c.specialization_id JOIN grades g ON g.id=c.grade_id WHERE c.candidate_id=$1`, snapshot.Profile.ID).
			Scan(&c.SpecializationID, &c.Specialization, &c.GradeID, &c.Grade, &c.ConfirmedAt, &c.GradeRank, &c.StackSkillID, &c.StackName)
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
	if snapshot.Profile != nil {
		var survey entity.Survey
		err = tx.QueryRow(ctx, `SELECT industry,specialization_id,grade_id,soft_skills,updated_at,coalesce(stack_skill_id::text,''),(SELECT rank FROM grades WHERE id=grade_id) FROM candidate_onboarding WHERE candidate_id=$1`, snapshot.Profile.ID).Scan(&survey.Industry, &survey.SpecializationID, &survey.GradeID, &survey.SoftSkills, &survey.UpdatedAt, &survey.StackSkillID, &survey.GradeRank)
		if err == nil {
			snapshot.Survey = &survey
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return snapshot, err
		}
		var attempt entity.OnboardingAttempt
		err = tx.QueryRow(ctx, `SELECT id::text,status,specialization_id,grade_id,deadline_at,stack_skill_id::text,stack_name FROM assessment_attempts WHERE candidate_id=$1 ORDER BY started_at DESC,id DESC LIMIT 1`, snapshot.Profile.ID).Scan(&attempt.ID, &attempt.Status, &attempt.SpecializationID, &attempt.GradeID, &attempt.DeadlineAt, &attempt.StackSkillID, &attempt.StackName)
		if err == nil {
			snapshot.LatestAttempt = &attempt
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return snapshot, err
		}
	}

	snapshot.Qualifications = []entity.Category{}
	if snapshot.Profile != nil {
		rows, err = tx.Query(ctx, `SELECT DISTINCT ON (h.specialization_id,a.stack_skill_id) h.specialization_id,sp.name,h.grade_id,g.name,h.achieved_at,g.rank,a.stack_skill_id::text,a.stack_name
 FROM grade_history h JOIN assessment_attempts a ON a.id=h.attempt_id JOIN specializations sp ON sp.id=h.specialization_id JOIN grades g ON g.id=h.grade_id
 WHERE h.candidate_id=$1 ORDER BY h.specialization_id,a.stack_skill_id,g.rank DESC,h.achieved_at DESC,h.id DESC`, snapshot.Profile.ID)
		if err != nil {
			return snapshot, err
		}
		for rows.Next() {
			var c entity.Category
			if err = rows.Scan(&c.SpecializationID, &c.Specialization, &c.GradeID, &c.Grade, &c.ConfirmedAt, &c.GradeRank, &c.StackSkillID, &c.StackName); err != nil {
				rows.Close()
				return snapshot, err
			}
			snapshot.Qualifications = append(snapshot.Qualifications, c)
		}
		rows.Close()
		if err = rows.Err(); err != nil {
			return snapshot, err
		}
	}
	snapshot.WorkFormatNames = []string{}
	if snapshot.Profile != nil {
		rows, err = tx.Query(ctx, `SELECT f.name FROM work_formats f JOIN candidate_work_formats c ON c.work_format_id=f.id WHERE c.candidate_id=$1 ORDER BY f.id`, snapshot.Profile.ID)
		if err != nil {
			return snapshot, err
		}
		for rows.Next() {
			var name string
			if err = rows.Scan(&name); err != nil {
				rows.Close()
				return snapshot, err
			}
			snapshot.WorkFormatNames = append(snapshot.WorkFormatNames, name)
		}
		rows.Close()
		if err = rows.Err(); err != nil {
			return snapshot, err
		}
	}

	return snapshot, tx.Commit(ctx)
}
