package repository

import (
	"context"
	"errors"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/jackc/pgx/v5"
)

// Recommend использует только условия работы. Категорию и квалификацию подключим после тестирования.
// TODO: после согласования данных со вторым беком добавить специализацию, подтверждённый грейд
// и сравнение навыков с требованиями потребности. Результаты тестов и подтверждённые достижения
// ФСП учитывать при ранжировании внутри категории; достижения не должны повышать грейд.
// Обработать отсутствие этих данных, расширить объяснения и обновить matching_mode,
// unassessed_criteria и Swagger только по фактически реализованным критериям.
func (r *Repository) Recommend(ctx context.Context, userID, companyID, needID string, filter entity.Filter) (entity.RecommendationPage, error) {
	page := entity.RecommendationPage{Items: []entity.Recommendation{}, Limit: filter.Limit, Offset: filter.Offset, NeedID: needID, MatchingMode: "conditions_only", UnassessedCriteria: []string{"specialization", "confirmed_grade", "skills", "test_results", "fsp_achievements"}}
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
	err = tx.QueryRow(ctx, `SELECT n.salary_to_rub,n.city,n.timezone,
 ARRAY(SELECT work_format_id FROM need_work_formats WHERE need_id=n.id ORDER BY work_format_id)
 FROM employer_needs n WHERE n.id=$1 AND n.company_id=$2 AND n.status='active' FOR SHARE OF n`, needID, companyID).Scan(&salary, &city, &timezone, &formats)
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
	// Условия потребности и дополнительные фильтры пересекаются; запрос не расширяет доступ.
	conditions := visible + filterConditions + `
 AND (cardinality($5::smallint[])=0 OR EXISTS(SELECT 1 FROM candidate_work_formats w WHERE w.candidate_id=p.id AND w.work_format_id=ANY($5::smallint[])))
 AND ($6::bigint IS NULL OR p.salary_min_rub IS NULL OR p.salary_min_rub <= $6)`
	args := []any{filter.ExperienceMinMonths, filter.ExperienceMaxMonths, filter.SalaryMaxRUB, selected, formats, salary}
	extra, extraArgs := qualificationConditions(filter, len(args))
	conditions += extra
	countArgs := append(args, extraArgs...)
	if err = tx.QueryRow(ctx, `SELECT count(*)`+conditions, countArgs...).Scan(&page.Total); err != nil {
		return page, err
	}
	// Неизвестные значения дают NULL и не прибавляют совпадений. Город сравниваем без учёта регистра.
	signals := `CASE WHEN cardinality($5::smallint[])>0 THEN EXISTS(SELECT 1 FROM candidate_work_formats w WHERE w.candidate_id=p.id AND w.work_format_id=ANY($5::smallint[])) END AS format_match,
 CASE WHEN $6::bigint IS NOT NULL THEN p.salary_min_rub <= $6 END AS salary_match,
 CASE WHEN $11::text IS NOT NULL THEN lower(trim(p.city))=lower(trim($11)) END AS city_match,
 CASE WHEN $12::text IS NOT NULL THEN p.timezone=$12 END AS timezone_match`
	query := `SELECT * FROM (SELECT ` + columns + `,` + signals + conditions + `) matched
 ORDER BY (CASE WHEN format_match THEN 1 ELSE 0 END + CASE WHEN salary_match THEN 1 ELSE 0 END + CASE WHEN city_match THEN 1 ELSE 0 END + CASE WHEN timezone_match THEN 1 ELSE 0 END) DESC,id
 LIMIT $13 OFFSET $14`
	rows, err := tx.Query(ctx, query, append(countArgs, city, timezone, filter.Limit, filter.Offset)...)
	if err != nil {
		return page, err
	}
	for rows.Next() {
		var card entity.Card
		var fm, sm, cm, tm *bool
		err = rows.Scan(&card.ID, &card.City, &card.Timezone, &card.ExperienceMonths, &card.SalaryMinRUB, &card.SearchStatus, &card.WorkFormatIDs, &fm, &sm, &cm, &tm)
		if err != nil {
			rows.Close()
			return page, err
		}
		page.Items = append(page.Items, entity.Explain(card, fm, sm, cm, tm))
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return page, err
	}
	return page, tx.Commit(ctx)
}
