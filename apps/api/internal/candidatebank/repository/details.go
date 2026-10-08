package repository

import (
	"context"
	"errors"
	fsprepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/repository"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/jackc/pgx/v5"
)

// GetDetails читает все разделы из одного снимка, с теми же правами и согласиями, что и банк.
func (r *Repository) GetDetails(ctx context.Context, userID, companyID, candidateID string) (entity.Details, error) {
	d := entity.Details{Skills: []entity.DetailSkill{}, Experience: []entity.DetailExperience{}, Education: []entity.DetailEducation{}}
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead})
	if err != nil {
		return d, err
	}
	defer tx.Rollback(ctx)
	if err = authorize(ctx, tx, userID, companyID); err != nil {
		return d, err
	}
	if d.Card, err = scan(tx.QueryRow(ctx, `SELECT `+columns+visible+` AND p.id=$1`, candidateID)); err != nil {
		return d, err
	}
	rows, err := tx.Query(ctx, `SELECT s.id::text,s.code,s.name,cs.claimed_level,e.level,
 CASE WHEN e.level IS NOT NULL THEN 'test' ELSE 'claimed' END
 FROM candidate_skills cs JOIN skills s ON s.id=cs.skill_id
 LEFT JOIN skill_evidence e ON e.candidate_id=cs.candidate_id AND e.skill_id=cs.skill_id AND e.source='test'
 WHERE cs.candidate_id=$1 AND s.active AND s.moderation_status='approved'
 AND (cs.claimed_level IS NOT NULL OR e.level IS NOT NULL) ORDER BY s.name,s.id`, candidateID)
	if err != nil {
		return d, err
	}
	for rows.Next() {
		var s entity.DetailSkill
		if err = rows.Scan(&s.ID, &s.Code, &s.Name, &s.ClaimedLevel, &s.VerifiedLevel, &s.Source); err != nil {
			rows.Close()
			return d, err
		}
		d.Skills = append(d.Skills, s)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return d, err
	}
	var result entity.DetailAssessment
	err = tx.QueryRow(ctx, `SELECT a.score_percent,c.confirmed_at FROM candidate_categories c
 JOIN assessment_attempts a ON a.id=c.attempt_id AND a.candidate_id=c.candidate_id
 AND a.status='passed' AND a.specialization_id=c.specialization_id AND a.grade_id=c.grade_id
 WHERE c.candidate_id=$1`, candidateID).Scan(&result.ScorePercent, &result.ConfirmedAt)
	if err == nil {
		d.Assessment = &result
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return d, err
	}
	rows, err = tx.Query(ctx, `SELECT to_char(started_on,'YYYY-MM'),to_char(ended_on,'YYYY-MM')
 FROM candidate_experiences WHERE candidate_id=$1 ORDER BY (ended_on IS NOT NULL),started_on DESC,id`, candidateID)
	if err != nil {
		return d, err
	}
	for rows.Next() {
		var e entity.DetailExperience
		if err = rows.Scan(&e.StartedOn, &e.EndedOn); err != nil {
			rows.Close()
			return d, err
		}
		d.Experience = append(d.Experience, e)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return d, err
	}
	rows, err = tx.Query(ctx, `SELECT level,graduation_year FROM candidate_education WHERE candidate_id=$1 ORDER BY graduation_year DESC,id`, candidateID)
	if err != nil {
		return d, err
	}
	for rows.Next() {
		var e entity.DetailEducation
		if err = rows.Scan(&e.Level, &e.GraduationYear); err != nil {
			rows.Close()
			return d, err
		}
		d.Education = append(d.Education, e)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return d, err
	}
	d.Achievements, err = fsprepo.Achievements(ctx, tx, candidateID)
	if err != nil {
		return d, err
	}
	return d, tx.Commit(ctx)
}
