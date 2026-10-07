package repository

import (
	"context"
	"fmt"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/jackc/pgx/v5"
)

// Числовые фильтры сравнивают подтверждённую категорию, а при её отсутствии — выбор последней попытки.
// Если специализация или грейд ещё не выбраны, они не считаются совпадением.
func qualificationConditions(f entity.Filter, offset int) (string, []any) {
	args := []any{f.SpecializationID, f.GradeID, f.SkillID, f.VerifiedSkillOnly, f.GradeStatus}
	sql := fmt.Sprintf(`
 AND ($%d::smallint IS NULL OR COALESCE(category.specialization_id,declared.specialization_id)=$%d)
 AND ($%d::smallint IS NULL OR COALESCE(category.grade_id,declared.grade_id)=$%d)
 AND ($%d::uuid IS NULL OR EXISTS(SELECT 1 FROM candidate_skills cs JOIN skills s ON s.id=cs.skill_id
 WHERE cs.candidate_id=p.id AND s.id=$%d AND s.active AND s.moderation_status='approved'
 AND (cs.claimed_level IS NOT NULL OR EXISTS(SELECT 1 FROM skill_evidence e WHERE e.candidate_id=p.id AND e.skill_id=s.id AND e.source='test'))
 AND (NOT $%d::boolean OR EXISTS(SELECT 1 FROM skill_evidence e WHERE e.candidate_id=p.id AND e.skill_id=s.id AND e.source='test'))))
 AND (COALESCE(NULLIF($%d::text,''),'all')='all'
 OR ($%d='confirmed' AND category.grade_id IS NOT NULL)
 OR ($%d='unconfirmed' AND category.grade_id IS NULL))`, offset+1, offset+1, offset+2, offset+2, offset+3, offset+3, offset+4, offset+5, offset+5, offset+5)
	return sql, args
}

func validateFilter(ctx context.Context, tx pgx.Tx, f entity.Filter) error {
	if err := validateFormats(ctx, tx, f.WorkFormatIDs); err != nil {
		return err
	}
	for _, item := range []struct {
		table, label string
		id           *int16
	}{
		{"specializations", "специализация", f.SpecializationID}, {"grades", "грейд", f.GradeID},
	} {
		if item.id == nil {
			continue
		}
		var exists bool
		if err := tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM "+item.table+" WHERE id=$1)", *item.id).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return &entity.ValidationError{Message: "Неизвестный справочник: " + item.label}
		}
	}
	if f.SkillID != nil {
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM skills WHERE id=$1 AND active AND moderation_status='approved')`, *f.SkillID).Scan(&exists); err != nil {
			return err
		}
		if !exists {
			return &entity.ValidationError{Message: "Выберите активный одобренный навык из справочника"}
		}
	}
	return nil
}
