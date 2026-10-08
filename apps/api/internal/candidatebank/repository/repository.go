// Пакет repository читает банк кандидатов, не изменяя их профили.
package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

const visible = ` FROM candidate_profiles p JOIN users u ON u.id=p.user_id
 LEFT JOIN LATERAL (
 SELECT c.specialization_id,c.grade_id,a.score_percent FROM candidate_categories c
 JOIN assessment_attempts a ON a.id=c.attempt_id AND a.candidate_id=c.candidate_id
 AND a.status='passed' AND a.specialization_id=c.specialization_id AND a.grade_id=c.grade_id
 WHERE c.candidate_id=p.id) category ON true
 LEFT JOIN LATERAL (
 SELECT choice.specialization_id,choice.grade_id FROM (
 SELECT o.specialization_id,o.grade_id,0 AS priority,o.updated_at AS chosen_at,o.candidate_id::text AS tie FROM candidate_onboarding o WHERE o.candidate_id=p.id
 UNION ALL SELECT a.specialization_id,a.grade_id,1,a.started_at,a.id::text FROM assessment_attempts a WHERE a.candidate_id=p.id
 ) choice ORDER BY choice.priority,choice.chosen_at DESC,choice.tie DESC LIMIT 1) declared ON true
 WHERE u.role='candidate' AND u.status='active' AND p.search_status IN ('open','passive')
 AND EXISTS(SELECT 1 FROM candidate_consents c WHERE c.user_id=p.user_id AND c.kind='processing' AND c.revoked_at IS NULL AND c.company_id IS NULL)
 AND EXISTS(SELECT 1 FROM candidate_consents c WHERE c.user_id=p.user_id AND c.kind='publication' AND c.revoked_at IS NULL AND c.company_id IS NULL)`
const columns = `p.id::text,p.city,p.timezone,p.experience_months,p.salary_min_rub,p.search_status,
 ARRAY(SELECT work_format_id FROM candidate_work_formats WHERE candidate_id=p.id ORDER BY work_format_id) AS work_format_ids,
 CASE WHEN category.grade_id IS NOT NULL THEN jsonb_build_object('specialization_id',category.specialization_id,'grade_id',category.grade_id) END AS category,
 CASE WHEN declared.grade_id IS NOT NULL THEN jsonb_build_object('specialization_id',declared.specialization_id,'grade_id',declared.grade_id) END AS declared_category,
 CASE WHEN category.grade_id IS NOT NULL THEN 'confirmed' ELSE 'unconfirmed' END AS grade_status,
 (SELECT count(*)::int FROM fsp_achievements fa WHERE fa.candidate_id=p.id) AS achievements_count,
 CASE WHEN category.grade_id IS NOT NULL THEN COALESCE((SELECT max(CASE WHEN place<=3 THEN 5 WHEN place IS NOT NULL THEN 3 ELSE 1 END)::float8 FROM fsp_achievements fa WHERE fa.candidate_id=p.id),0) ELSE 0 END AS fsp_bonus`

func scan(row pgx.Row) (entity.Card, error) {
	var c entity.Card
	err := row.Scan(&c.ID, &c.City, &c.Timezone, &c.ExperienceMonths, &c.SalaryMinRUB, &c.SearchStatus, &c.WorkFormatIDs, &c.Category, &c.DeclaredCategory, &c.GradeStatus, &c.AchievementsCount, &c.FSPBonus)
	if errors.Is(err, pgx.ErrNoRows) {
		return c, entity.ErrNotFound
	}
	return c, err
}

func authorize(ctx context.Context, tx pgx.Tx, userID, companyID string) error {
	var ok bool
	// Проверяем членство в БД, даже если middleware уже разрешил роль работодателя.
	err := tx.QueryRow(ctx, `SELECT true FROM companies c
 JOIN company_members m ON m.company_id=c.id JOIN users u ON u.id=m.user_id
 WHERE c.id=$2 AND m.user_id=$1 AND m.status='active'
 AND m.role IN ('owner','recruiter','viewer') AND u.role='employer' AND u.status='active'
 FOR SHARE OF c,m,u`, userID, companyID).Scan(&ok)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrNotFound
	}
	return err
}

func (r *Repository) List(ctx context.Context, userID, companyID string, filter entity.Filter) (entity.Page, error) {
	page := entity.Page{Items: []entity.Card{}, Limit: filter.Limit, Offset: filter.Offset}
	// Список и total читаем из одного снимка, чтобы они не расходились при изменении профилей.
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead})
	if err != nil {
		return page, err
	}
	defer tx.Rollback(ctx)
	if err = authorize(ctx, tx, userID, companyID); err != nil {
		return page, err
	}
	if err = validateFilter(ctx, tx, filter); err != nil {
		return page, err
	}
	conditions := visible + filterConditions
	// При фильтре зарплаты неизвестные ожидания исключаются: соответствие бюджету не подтверждено.
	formats := filter.WorkFormatIDs
	if formats == nil {
		formats = []int16{}
	}
	args := []any{filter.ExperienceMinMonths, filter.ExperienceMaxMonths, filter.SalaryMaxRUB, formats}
	extra, extraArgs := qualificationConditions(filter, len(args))
	conditions += extra
	args = append(args, extraArgs...)
	if err = tx.QueryRow(ctx, `SELECT count(*)`+conditions, args...).Scan(&page.Total); err != nil {
		return page, err
	}
	rows, err := tx.Query(ctx, `WITH ranked AS (SELECT `+columns+`,category.score_percent AS test_score`+conditions+`),
 positioned AS (SELECT ranked.*,row_number() OVER(ORDER BY (grade_status='confirmed') DESC,test_score DESC NULLS LAST,id) AS base_position FROM ranked),
 slots AS (SELECT positioned.*,
 array_agg(base_position) OVER(PARTITION BY CASE WHEN grade_status='confirmed' THEN category::text ELSE id END ORDER BY base_position ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS group_slots,
 row_number() OVER(PARTITION BY CASE WHEN grade_status='confirmed' THEN category::text ELSE id END ORDER BY test_score+fsp_bonus DESC NULLS LAST,id) AS group_position FROM positioned)
 SELECT id,city,timezone,experience_months,salary_min_rub,search_status,work_format_ids,category,declared_category,grade_status,achievements_count,fsp_bonus
 FROM slots ORDER BY group_slots[group_position::int]`+fmt.Sprintf(` LIMIT $%d OFFSET $%d`, len(args)+1, len(args)+2), append(args, filter.Limit, filter.Offset)...)

	if err != nil {
		return page, err
	}
	for rows.Next() {
		c, e := scan(rows)
		if e != nil {
			rows.Close()
			return page, e
		}
		page.Items = append(page.Items, c)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return page, err
	}
	return page, tx.Commit(ctx)
}

func (r *Repository) Get(ctx context.Context, userID, companyID, candidateID string) (entity.Card, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Card{}, err
	}
	defer tx.Rollback(ctx)
	if err = authorize(ctx, tx, userID, companyID); err != nil {
		return entity.Card{}, err
	}
	c, err := scan(tx.QueryRow(ctx, `SELECT `+columns+visible+` AND p.id=$1`, candidateID))
	if err != nil {
		return c, err
	}
	return c, tx.Commit(ctx)
}

const filterConditions = ` AND ($1::integer IS NULL OR p.experience_months >= $1)
 AND ($2::integer IS NULL OR p.experience_months <= $2)
 AND ($3::bigint IS NULL OR p.salary_min_rub <= $3)
 AND (cardinality($4::smallint[])=0 OR EXISTS (SELECT 1 FROM candidate_work_formats w WHERE w.candidate_id=p.id AND w.work_format_id=ANY($4::smallint[])))`

func validateFormats(ctx context.Context, tx pgx.Tx, ids []int16) error {
	if len(ids) == 0 {
		return nil
	}
	var count int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM work_formats WHERE id=ANY($1::smallint[])`, ids).Scan(&count); err != nil {
		return err
	}
	if count != len(ids) {
		return &entity.ValidationError{Message: "Неизвестный формат работы: выберите ID из справочника"}
	}
	return nil
}
