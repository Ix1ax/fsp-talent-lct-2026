package repository

import (
	"context"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

func (r *Repository) PutSurvey(ctx context.Context, userID string, in entity.SurveyInput) (entity.Survey, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Survey{}, err
	}
	defer tx.Rollback(ctx)
	if err = lockActiveCandidate(ctx, tx, userID); err != nil {
		return entity.Survey{}, err
	}
	if err = requireConsents(ctx, tx, userID, "processing"); err != nil {
		return entity.Survey{}, err
	}
	var profileID string
	if err = tx.QueryRow(ctx, `SELECT id::text FROM candidate_profiles WHERE user_id=$1 FOR UPDATE`, userID).Scan(&profileID); err != nil {
		return entity.Survey{}, dbError(err)
	}
	var valid bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM specializations s,grades g WHERE s.id=$1 AND g.id=$2 AND s.active AND g.active FOR SHARE OF s,g)`, in.SpecializationID, in.GradeID).Scan(&valid); err != nil {
		return entity.Survey{}, err
	}
	if !valid {
		return entity.Survey{}, &entity.ValidationError{Message: "Специализация или грейд не существуют или архивированы"}
	}
	var out entity.Survey
	err = tx.QueryRow(ctx, `INSERT INTO candidate_onboarding(candidate_id,industry,specialization_id,grade_id,soft_skills) VALUES($1,$2,$3,$4,$5)
 ON CONFLICT(candidate_id) DO UPDATE SET industry=EXCLUDED.industry,specialization_id=EXCLUDED.specialization_id,grade_id=EXCLUDED.grade_id,soft_skills=EXCLUDED.soft_skills,updated_at=clock_timestamp()
 RETURNING industry,specialization_id,grade_id,soft_skills,updated_at`, profileID, in.Industry, in.SpecializationID, in.GradeID, in.SoftSkills).Scan(&out.Industry, &out.SpecializationID, &out.GradeID, &out.SoftSkills, &out.UpdatedAt)
	if err != nil {
		return out, err
	}
	return out, tx.Commit(ctx)
}
