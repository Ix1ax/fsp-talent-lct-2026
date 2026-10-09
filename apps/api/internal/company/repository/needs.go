package repository

import (
	"context"
	"encoding/json"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
)

const needColumns = `n.id::text,n.company_id::text,n.created_by::text,n.specialization_id,n.grade_id,n.title,n.description,n.salary_from_rub,n.salary_to_rub,n.city,n.timezone,n.status,n.created_at,n.moderation_status,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('skill_id',s.skill_id::text,'required',s.required,'weight',s.weight) ORDER BY s.skill_id) FROM need_skills s WHERE s.need_id=n.id),'[]'::jsonb),
 ARRAY(SELECT f.work_format_id FROM need_work_formats f WHERE f.need_id=n.id ORDER BY f.work_format_id)`
const needAccess = ` FROM employer_needs n JOIN company_members m ON m.company_id=n.company_id JOIN users u ON u.id=m.user_id
 WHERE m.user_id=$1 AND n.company_id=$2 AND m.status='active' AND u.status='active' AND u.role='employer'`

func scanNeed(row pgx.Row) (entity.Need, error) {
	var n entity.Need
	var skills []byte
	err := row.Scan(&n.ID, &n.CompanyID, &n.CreatedBy, &n.SpecializationID, &n.GradeID, &n.Title, &n.Description, &n.SalaryFromRUB, &n.SalaryToRUB, &n.City, &n.Timezone, &n.Status, &n.CreatedAt, &n.ModerationStatus, &skills, &n.WorkFormatIDs)
	if err != nil {
		return n, dbError(err)
	}
	if err = json.Unmarshal(skills, &n.Skills); err != nil {
		return n, err
	}
	return n, nil
}
func needWriter(ctx context.Context, tx pgx.Tx, user, company string) error {
	c, err := scanCompany(tx.QueryRow(ctx, `SELECT `+companyColumns+memberJoin+` AND c.id=$2 FOR UPDATE OF c,m FOR SHARE OF u`, user, company))
	if err != nil {
		return err
	}
	if c.MemberRole != "owner" && c.MemberRole != "recruiter" {
		return entity.ErrForbidden
	}
	return nil
}
func needReferences(ctx context.Context, tx pgx.Tx, in entity.NeedInput, currentID any) error {
	var found bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM specializations s WHERE id=$1 AND (active OR EXISTS(SELECT 1 FROM employer_needs n WHERE n.id=$2 AND n.specialization_id=s.id)) FOR SHARE OF s)`, in.SpecializationID, currentID).Scan(&found); err != nil {
		return err
	}
	if !found {
		return validationError("Специализация не существует или отключена")
	}
	if in.GradeID != nil {
		if err := tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM grades g WHERE id=$1 AND (active OR EXISTS(SELECT 1 FROM employer_needs n WHERE n.id=$2 AND n.grade_id=g.id)) FOR SHARE OF g)`, *in.GradeID, currentID).Scan(&found); err != nil {
			return err
		}
		if !found {
			return validationError("Грейд не существует")
		}
	}
	skillIDs := []string{}
	for _, s := range in.Skills {
		skillIDs = append(skillIDs, s.SkillID)
	}
	var count int
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM (SELECT s.id FROM skills s WHERE id=ANY($1::uuid[]) AND moderation_status='approved' AND (active OR EXISTS(SELECT 1 FROM need_skills ns WHERE ns.need_id=$2 AND ns.skill_id=s.id)) ORDER BY s.id FOR SHARE OF s) selected`, skillIDs, currentID).Scan(&count); err != nil {
		return err
	}
	if count != len(skillIDs) {
		return validationError("Один из навыков не существует или отключён")
	}
	if err := tx.QueryRow(ctx, `SELECT count(*) FROM (SELECT f.id FROM work_formats f WHERE id=ANY($1::smallint[]) AND (active OR EXISTS(SELECT 1 FROM need_work_formats nf WHERE nf.need_id=$2 AND nf.work_format_id=f.id)) ORDER BY f.id FOR SHARE OF f) selected`, in.WorkFormatIDs, currentID).Scan(&count); err != nil {
		return err
	}
	if count != len(in.WorkFormatIDs) {
		return validationError("Один из форматов работы не существует")
	}
	return nil
}
func replaceNeedLinks(ctx context.Context, tx pgx.Tx, id string, in entity.NeedInput) error {
	if _, err := tx.Exec(ctx, `DELETE FROM need_skills WHERE need_id=$1`, id); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM need_work_formats WHERE need_id=$1`, id); err != nil {
		return err
	}
	batch := &pgx.Batch{}
	for _, s := range in.Skills {
		batch.Queue(`INSERT INTO need_skills(need_id,skill_id,required,weight) VALUES($1,$2,$3,$4)`, id, s.SkillID, s.Required, s.Weight)
	}
	for _, f := range in.WorkFormatIDs {
		batch.Queue(`INSERT INTO need_work_formats(need_id,work_format_id) VALUES($1,$2)`, id, f)
	}
	if batch.Len() == 0 {
		return nil
	}
	return tx.SendBatch(ctx, batch).Close()
}
func (r *Repository) CreateNeed(ctx context.Context, user, company string, in entity.NeedInput) (entity.Need, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Need{}, err
	}
	defer tx.Rollback(ctx)
	if err = catalog.LockSkillChanges(ctx, tx); err != nil {
		return entity.Need{}, err
	}
	if err = needWriter(ctx, tx, user, company); err != nil {
		return entity.Need{}, err
	}
	if err = needReferences(ctx, tx, in, nil); err != nil {
		return entity.Need{}, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,grade_id,title,description,salary_from_rub,salary_to_rub,city,timezone,status)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id::text`, company, user, in.SpecializationID, in.GradeID, in.Title, in.Description, in.SalaryFromRUB, in.SalaryToRUB, in.City, in.Timezone, in.Status).Scan(&id)
	if err != nil {
		return entity.Need{}, err
	}
	if err = replaceNeedLinks(ctx, tx, id, in); err != nil {
		return entity.Need{}, err
	}
	n, err := scanNeed(tx.QueryRow(ctx, `SELECT `+needColumns+needAccess+` AND n.id=$3`, user, company, id))
	if err != nil {
		return n, err
	}
	return n, tx.Commit(ctx)
}
func (r *Repository) GetNeed(ctx context.Context, user, company, id string) (entity.Need, error) {
	return scanNeed(r.db.QueryRow(ctx, `SELECT `+needColumns+needAccess+` AND n.id=$3`, user, company, id))
}

// ListNeeds возвращает страницу потребностей компании и их общее число с учётом фильтра по статусу.
func (r *Repository) ListNeeds(ctx context.Context, user, company, status string, limit, offset int) ([]entity.Need, int64, error) {
	if _, err := r.Get(ctx, user, company); err != nil {
		return nil, 0, err
	}
	tx, err := r.readTx(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback(ctx)
	const filter = ` AND ($3='' OR n.status=$3)`
	var total int64
	if err = tx.QueryRow(ctx, `SELECT count(*)`+needAccess+filter, user, company, status).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := tx.Query(ctx, `SELECT `+needColumns+needAccess+filter+` ORDER BY n.created_at DESC,n.id DESC LIMIT $4 OFFSET $5`, user, company, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	result := []entity.Need{}
	for rows.Next() {
		n, err := scanNeed(rows)
		if err != nil {
			return nil, 0, err
		}
		result = append(result, n)
	}
	return result, total, rows.Err()
}
func (r *Repository) UpdateNeed(ctx context.Context, user, company, id string, patch map[string]json.RawMessage) (entity.Need, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Need{}, err
	}
	defer tx.Rollback(ctx)
	if err = catalog.LockSkillChanges(ctx, tx); err != nil {
		return entity.Need{}, err
	}
	if err = needWriter(ctx, tx, user, company); err != nil {
		return entity.Need{}, err
	}
	n, err := scanNeed(tx.QueryRow(ctx, `SELECT `+needColumns+needAccess+` AND n.id=$3 FOR UPDATE OF n`, user, company, id))
	if err != nil {
		return n, err
	}
	if n.ModerationStatus == "hidden" {
		return n, entity.ErrForbidden
	}
	in, err := entity.ApplyNeedPatch(n, patch)
	if err != nil {
		return n, err
	}
	if err = needReferences(ctx, tx, in, id); err != nil {
		return n, err
	}
	_, err = tx.Exec(ctx, `UPDATE employer_needs SET specialization_id=$2,grade_id=$3,title=$4,description=$5,salary_from_rub=$6,salary_to_rub=$7,city=$8,timezone=$9,status=$10 WHERE id=$1`, id, in.SpecializationID, in.GradeID, in.Title, in.Description, in.SalaryFromRUB, in.SalaryToRUB, in.City, in.Timezone, in.Status)
	if err != nil {
		return n, err
	}
	if err = replaceNeedLinks(ctx, tx, id, in); err != nil {
		return n, err
	}
	n, err = scanNeed(tx.QueryRow(ctx, `SELECT `+needColumns+needAccess+` AND n.id=$3`, user, company, id))
	if err != nil {
		return n, err
	}
	return n, tx.Commit(ctx)
}

// Архив сохраняет потребность для будущих подборок и ATS. Физически запись не удаляем.
func (r *Repository) ArchiveNeed(ctx context.Context, user, company, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = needWriter(ctx, tx, user, company); err != nil {
		return err
	}
	result, err := tx.Exec(ctx, `UPDATE employer_needs SET status='archived' WHERE id=$1 AND company_id=$2`, id, company)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return entity.ErrNotFound
	}
	return tx.Commit(ctx)
}
