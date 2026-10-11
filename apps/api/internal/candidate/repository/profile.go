package repository

import (
	"context"
	"errors"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

func (r *Repository) Create(ctx context.Context, userID string, in entity.ProfileInput) (entity.Profile, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Profile{}, err
	}
	defer tx.Rollback(ctx)
	var active bool
	if err = tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='candidate' AND status='active' FOR SHARE`, userID).Scan(&active); err != nil {
		if errors.Is(dbError(err), entity.ErrNotFound) {
			return entity.Profile{}, entity.ErrForbidden
		}
		return entity.Profile{}, err
	}
	// Создание требует processing, а сразу публичный профиль — ещё и publication.
	required := []string{"processing"}
	if in.SearchStatus != "hidden" {
		required = append(required, "publication")
	}
	if err = requireConsents(ctx, tx, userID, required...); err != nil {
		return entity.Profile{}, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO candidate_profiles(user_id,headline,summary,city,timezone,experience_months,salary_min_rub,search_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text`,
		userID, in.Headline, in.Summary, in.City, in.Timezone, in.ExperienceMonths, in.SalaryMinRUB, in.SearchStatus).Scan(&id)
	if err != nil {
		return entity.Profile{}, dbError(err)
	}
	if err = setWorkFormats(ctx, tx, id, in.WorkFormatIDs); err != nil {
		return entity.Profile{}, err
	}
	p, err := scanProfile(ctx, tx, tx.QueryRow(ctx, `SELECT `+profileColumns+ownerFilter, userID))
	if err != nil {
		return p, err
	}
	return p, tx.Commit(ctx)
}

func (r *Repository) Get(ctx context.Context, userID string) (entity.Profile, error) {
	return scanProfile(ctx, r.db, r.db.QueryRow(ctx, `SELECT `+profileColumns+ownerFilter, userID))
}

// Изменения профиля сериализуем: параллельные PATCH не затирают поля друг друга.
func (r *Repository) Update(ctx context.Context, userID string, patch entity.Patch) (entity.Profile, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Profile{}, err
	}
	defer tx.Rollback(ctx)
	// Порядок блокировок: пользователь, затем профиль, как в отзыве согласия; иначе возможна взаимная блокировка.
	if err = lockActiveCandidate(ctx, tx, userID); err != nil {
		return entity.Profile{}, err
	}
	current, err := scanProfile(ctx, tx, tx.QueryRow(ctx, `SELECT `+profileColumns+ownerFilter+` FOR UPDATE OF p FOR SHARE OF u`, userID))
	if err != nil {
		return current, err
	}
	in, err := patch.Apply(current)
	if err != nil {
		return current, err
	}
	// Публичный профиль (open или passive) возможен только при активных processing и publication.
	if in.SearchStatus != "hidden" {
		if err = requireConsents(ctx, tx, userID, "processing", "publication"); err != nil {
			return current, err
		}
	}
	if _, err = tx.Exec(ctx, `UPDATE candidate_profiles SET headline=$2,summary=$3,city=$4,timezone=$5,experience_months=$6,salary_min_rub=$7,search_status=$8,updated_at=now() WHERE id=$1`,
		current.ID, in.Headline, in.Summary, in.City, in.Timezone, in.ExperienceMonths, in.SalaryMinRUB, in.SearchStatus); err != nil {
		return current, dbError(err)
	}
	if err = setWorkFormats(ctx, tx, current.ID, in.WorkFormatIDs); err != nil {
		return current, err
	}
	p, err := scanProfile(ctx, tx, tx.QueryRow(ctx, `SELECT `+profileColumns+ownerFilter, userID))
	if err != nil {
		return p, err
	}
	return p, tx.Commit(ctx)
}
