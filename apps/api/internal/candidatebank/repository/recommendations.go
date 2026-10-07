package repository

import (
	"context"
	"errors"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/jackc/pgx/v5"
)

// Recommend ранжирует по сходству с потребностью. Исключают только явные фильтры и приватность.
// TODO: подключить подтверждённые достижения ФСП к ранжированию внутри категории.
func (r *Repository) Recommend(ctx context.Context, userID, companyID, needID string, filter entity.Filter) (entity.RecommendationPage, error) {
	page := entity.RecommendationPage{Items: []entity.Recommendation{}, Limit: filter.Limit, Offset: filter.Offset, NeedID: needID, MatchingMode: "similarity", UnassessedCriteria: []string{"fsp_achievements"}}
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead})
	if err != nil {
		return page, err
	}
	defer tx.Rollback(ctx)
	if err = authorize(ctx, tx, userID, companyID); err != nil {
		return page, err
	}
	var salary *int64
	var city, timezone *string
	var formats []int16
	var specialization int16
	var grade *int16
	err = tx.QueryRow(ctx, `SELECT n.salary_to_rub,n.city,n.timezone,n.specialization_id,n.grade_id,
 ARRAY(SELECT work_format_id FROM need_work_formats WHERE need_id=n.id ORDER BY work_format_id)
 FROM employer_needs n WHERE n.id=$1 AND n.company_id=$2 AND n.status='active' FOR SHARE OF n`, needID, companyID).Scan(&salary, &city, &timezone, &specialization, &grade, &formats)
	if errors.Is(err, pgx.ErrNoRows) {
		return page, entity.ErrNotFound
	}
	if err != nil {
		return page, err
	}
	if err = validateFilter(ctx, tx, filter); err != nil {
		return page, err
	}
	selected := filter.WorkFormatIDs
	if selected == nil {
		selected = []int16{}
	}
	args := []any{filter.ExperienceMinMonths, filter.ExperienceMaxMonths, filter.SalaryMaxRUB, selected}
	extra, extraArgs := qualificationConditions(filter, len(args))
	conditions := visible + filterConditions + extra
	args = append(args, extraArgs...)
	if err = tx.QueryRow(ctx, `SELECT count(*)`+conditions, args...).Scan(&page.Total); err != nil {
		return page, err
	}
	// Параметры потребности участвуют только в оценке, а не в WHERE.
	args = append(args, needID, formats, salary, specialization, grade, city, timezone, filter.Limit, filter.Offset)
	signals := `CASE WHEN cardinality($11::smallint[])>0 AND EXISTS(SELECT 1 FROM candidate_work_formats w WHERE w.candidate_id=p.id) THEN EXISTS(SELECT 1 FROM candidate_work_formats w WHERE w.candidate_id=p.id AND w.work_format_id=ANY($11::smallint[])) END AS format_match,
 CASE WHEN $12::bigint IS NOT NULL THEN p.salary_min_rub <= $12 END AS salary_match,
 CASE WHEN $15::text IS NOT NULL THEN lower(trim(p.city))=lower(trim($15)) END AS city_match,
 CASE WHEN $16::text IS NOT NULL THEN p.timezone=$16 END AS timezone_match,
 COALESCE(category.specialization_id,declared.specialization_id)=$13::smallint AS specialization_match,
 CASE WHEN $14::smallint IS NOT NULL THEN COALESCE(category.grade_id,declared.grade_id)=$14 END AS grade_match`
	query := `WITH matched AS (SELECT ` + columns + `,` + signals + `,category.score_percent::float8 AS test_score,` + skillMatches + ` AS skills ` + conditions + `),
 scored AS (SELECT matched.*,` + weightedSkillScore + ` AS skill_score FROM matched),
 ranked AS (SELECT scored.*,` + similarityScore + ` AS match_score,` + similarityCriteria + ` AS criteria FROM scored)
 SELECT * FROM ranked ORDER BY (grade_status='confirmed') DESC,match_score DESC,test_score DESC NULLS LAST,id
 LIMIT $17 OFFSET $18`
	rows, err := tx.Query(ctx, query, args...)
	if err != nil {
		return page, err
	}
	for rows.Next() {
		var card entity.Card
		var fm, sm, cm, tm, specMatch, gradeMatch *bool
		var skills []entity.SkillMatch
		var score, testScore *float64
		var matchScore float64
		var criteria []entity.MatchCriterion
		err = rows.Scan(&card.ID, &card.City, &card.Timezone, &card.ExperienceMonths, &card.SalaryMinRUB, &card.SearchStatus, &card.WorkFormatIDs, &card.Category, &card.DeclaredCategory, &card.GradeStatus,
			&fm, &sm, &cm, &tm, &specMatch, &gradeMatch, &testScore, &skills, &score, &matchScore, &criteria)
		if err != nil {
			rows.Close()
			return page, err
		}
		item := entity.Explain(card, fm, sm, cm, tm)
		item.Skills, item.SkillMatchScore, item.TestScorePercent, item.MatchScore, item.Criteria = skills, score, testScore, matchScore, criteria
		item.ExplainQualification(specMatch, gradeMatch, grade != nil)
		page.Items = append(page.Items, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return page, err
	}
	return page, tx.Commit(ctx)
}
