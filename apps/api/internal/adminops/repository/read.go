package repository

import (
	"context"
	"strconv"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

const companyJSON = `jsonb_build_object('id',c.id,'name',c.name,'description',c.description,'inn',c.inn,'contact_email',c.contact_email,'contact_url',c.contact_url,'logo_file_id',c.logo_file_id,'verification_status',c.verification_status,'verification_version',c.verification_version,'verification_requested_at',c.verification_requested_at,'verification_reviewed_at',c.verification_reviewed_at,'verification_reviewed_by',c.verification_reviewed_by,'verification_reason',c.verification_reason,'verification_document_ids',c.verification_file_ids,'created_at',c.created_at,'status',c.status,'blocked_reason',c.blocked_reason,'blocked_at',c.blocked_at)`
const userJSON = `jsonb_build_object('id',u.id,'role',u.role,'status',u.status,'created_at',u.created_at,'updated_at',u.updated_at,'candidate_profile_id',p.id,'search_status',p.search_status,'blocked_reason',u.blocked_reason,'blocked_at',u.blocked_at)`

// plan использует закрытый набор SQL-фрагментов; значения фильтров всегда параметры.
func plan(kind string) (value, from, where, id, order string) {
	switch kind {
	case "companies":
		return companyJSON, ` FROM companies c `, `WHERE ($1='all' OR c.verification_status=$1) AND ($2='' OR strpos(lower(c.name),lower($2))>0 OR strpos(COALESCE(c.inn,''),$2)>0) AND ($3='all' OR c.status=$3)`, `c.id`, `CASE WHEN c.verification_status='pending' THEN 0 ELSE 1 END,c.verification_requested_at ASC NULLS LAST,c.created_at DESC,c.id DESC`
	case "users":
		return userJSON, ` FROM users u LEFT JOIN candidate_profiles p ON p.user_id=u.id `, `WHERE ($1='all' OR u.status=$1) AND ($2='' OR u.role=$2)`, `u.id`, `u.created_at DESC,u.id DESC`
	case "needs":
		return `to_jsonb(n)||jsonb_build_object('company_name',c.name,'skills',COALESCE((SELECT jsonb_agg(jsonb_build_object('skill_id',s.skill_id,'required',s.required,'weight',s.weight) ORDER BY s.skill_id) FROM need_skills s WHERE s.need_id=n.id),'[]'::jsonb),'work_format_ids',COALESCE((SELECT jsonb_agg(w.work_format_id ORDER BY w.work_format_id) FROM need_work_formats w WHERE w.need_id=n.id),'[]'::jsonb))`, ` FROM employer_needs n JOIN companies c ON c.id=n.company_id `, `WHERE ($1='all' OR n.status=$1) AND ($2='' OR strpos(lower(n.title||' '||n.description),lower($2))>0) AND ($3::uuid IS NULL OR n.company_id=$3) AND ($4::smallint IS NULL OR n.specialization_id=$4) AND ($5::smallint IS NULL OR n.grade_id=$5)`, `n.id`, `n.created_at DESC,n.id DESC`
	case "offers":
		return `to_jsonb(o)-'contact_email'-'contact_url'`, ` FROM candidate_offers o `, `WHERE ($1='all' OR o.status=$1) AND ($2::uuid IS NULL OR o.company_id=$2) AND ($3::uuid IS NULL OR o.candidate_id=$3)`, `o.id`, `o.created_at DESC,o.id DESC`
	case "tasks":
		return `(to_jsonb(t)-'file_id')||jsonb_build_object('status',CASE WHEN t.status='closed' OR t.deadline_at<=transaction_timestamp() THEN 'closed' ELSE 'open' END,'company_name',c.name,'file',` + fileJSON + `,'submissions_count',(SELECT count(*) FROM company_task_submissions WHERE task_id=t.id))`, ` FROM company_daily_tasks t JOIN companies c ON c.id=t.company_id JOIN files f ON f.id=t.file_id `, `WHERE ($1='all' OR t.moderation_status=$1) AND ($2='' OR strpos(lower(t.title||' '||t.description),lower($2))>0) AND ($3::uuid IS NULL OR t.company_id=$3) AND ($4::smallint IS NULL OR t.specialization_id=$4) AND ($5::smallint IS NULL OR t.grade_id=$5)`, `t.id`, `t.published_at DESC,t.id DESC`
	case "attempts":
		return `to_jsonb(a)`, ` FROM assessment_attempts a `, `WHERE ($1='all' OR a.status=$1) AND ($2::uuid IS NULL OR a.candidate_id=$2) AND ($3::smallint IS NULL OR a.specialization_id=$3) AND ($4::smallint IS NULL OR a.grade_id=$4)`, `a.id`, `a.started_at DESC,a.id DESC`
	}
	return "", "", "", "", ""
}
func args(kind string, f entity.Filter) []any {
	switch kind {
	case "companies":
		accessStatus := f.AccessStatus
		if accessStatus == "" {
			accessStatus = "all"
		}
		return []any{f.Status, f.Query, accessStatus}
	case "users":
		return []any{f.Status, f.Role}
	case "needs", "tasks":
		return []any{f.Status, f.Query, f.CompanyID, f.SpecializationID, f.GradeID}
	case "offers":
		return []any{f.Status, f.CompanyID, f.CandidateID}
	case "attempts":
		return []any{f.Status, f.CandidateID, f.SpecializationID, f.GradeID}
	}
	return nil
}
func (r *Repository) List(ctx context.Context, actor, kind string, f entity.Filter) (entity.Page, error) {
	p := entity.Page{Items: []any{}, Limit: f.Limit, Offset: f.Offset}
	value, from, where, _, order := plan(kind)
	if value == "" {
		return p, entity.ErrNotFound
	}
	tx, _, err := r.begin(ctx, actor, true)
	if err != nil {
		return p, err
	}
	defer tx.Rollback(ctx)
	a := args(kind, f)
	if err = tx.QueryRow(ctx, `SELECT count(*)`+from+where, a...).Scan(&p.Total); err != nil {
		return p, err
	}
	// Числовые позиции задаются кодом по длине фиксированного списка аргументов.
	rows, err := tx.Query(ctx, `SELECT `+value+from+where+` ORDER BY `+order+` LIMIT $`+pos(len(a)+1)+` OFFSET $`+pos(len(a)+2), append(a, f.Limit, f.Offset)...)
	if err != nil {
		return p, err
	}
	for rows.Next() {
		var item map[string]any
		if err = rows.Scan(&item); err != nil {
			rows.Close()
			return p, err
		}
		p.Items = append(p.Items, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return p, err
	}
	return p, tx.Commit(ctx)
}
func (r *Repository) Get(ctx context.Context, actor, kind, id string) (map[string]any, error) {
	value, from, _, column, _ := plan(kind)
	if value == "" {
		return nil, entity.ErrNotFound
	}
	tx, _, err := r.begin(ctx, actor, true)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var result map[string]any
	err = tx.QueryRow(ctx, `SELECT `+value+from+` WHERE `+column+`=$1`, id).Scan(&result)
	if err != nil {
		return nil, dbError(err)
	}
	return result, tx.Commit(ctx)
}
func (r *Repository) CompanyRelated(ctx context.Context, actor, company, kind string, f entity.Filter) (entity.Page, error) {
	p := entity.Page{Items: []any{}, Limit: f.Limit, Offset: f.Offset}
	tx, _, err := r.begin(ctx, actor, true)
	if err != nil {
		return p, err
	}
	defer tx.Rollback(ctx)
	var id string
	if err = tx.QueryRow(ctx, `SELECT id::text FROM companies WHERE id=$1 FOR SHARE`, company).Scan(&id); err != nil {
		return p, dbError(err)
	}
	from, value, order := ` FROM company_members m JOIN users u ON u.id=m.user_id WHERE m.company_id=$1`, `to_jsonb(m)||jsonb_build_object('user_status',u.status)`, `m.joined_at,m.user_id`
	if kind == "files" {
		from = ` FROM company_documents d JOIN files f ON f.id=d.file_id WHERE d.company_id=$1 AND f.status<>'deleted'`
		value = fileJSON
		order = `f.created_at DESC,f.id DESC`
	}
	if err = tx.QueryRow(ctx, `SELECT count(*)`+from, company).Scan(&p.Total); err != nil {
		return p, err
	}
	rows, err := tx.Query(ctx, `SELECT `+value+from+` ORDER BY `+order+` LIMIT $2 OFFSET $3`, company, f.Limit, f.Offset)
	if err != nil {
		return p, err
	}
	for rows.Next() {
		var item map[string]any
		if err = rows.Scan(&item); err != nil {
			rows.Close()
			return p, err
		}
		p.Items = append(p.Items, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return p, err
	}
	return p, tx.Commit(ctx)
}
func (r *Repository) File(ctx context.Context, actor, kind, id, fileID string) (files.File, error) {
	tx, _, err := r.begin(ctx, actor, true)
	if err != nil {
		return files.File{}, err
	}
	defer tx.Rollback(ctx)
	from := ` FROM files f JOIN company_documents d ON d.file_id=f.id WHERE d.company_id=$1 AND f.id=$2 AND f.status='ready'`
	a := []any{id, fileID}
	if kind == "task" {
		from = ` FROM files f JOIN company_daily_tasks t ON t.file_id=f.id WHERE t.id=$1 AND f.status='ready'`
		a = []any{id}
	}
	file, err := scanFile(tx.QueryRow(ctx, `SELECT `+fileColumns+from, a...))
	if err != nil {
		return file, err
	}
	return file, tx.Commit(ctx)
}

func pos(n int) string { return strconv.Itoa(n) }
