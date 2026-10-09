package repository

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/entity"
)

const auditUnion = `(
 SELECT 'operations'::text source,id,actor_admin_id actor_id,'admin'::text actor_kind,action,entity_type,entity_id::text,old_status,new_status,reason,created_at FROM admin_operation_events WHERE actor_admin_id IS NOT NULL
 UNION ALL SELECT 'operations',id,actor_user_id,CASE WHEN actor_user_id IS NULL THEN 'system' ELSE 'user' END,action,entity_type,entity_id::text,old_status,new_status,reason,created_at FROM admin_operation_events WHERE actor_admin_id IS NULL
 UNION ALL SELECT 'catalogs',id,actor_id,'admin','catalog.'||action,catalog,item_id,NULL,NULL,NULL,created_at FROM admin_catalog_events
 UNION ALL SELECT 'assessments',id,actor_id,'admin',action,entity_type,entity_id::text,NULL,NULL,NULL,created_at FROM assessment_events
 UNION ALL SELECT 'admins',id,actor_id,'admin','admin.status_changed','admin',admin_id::text,old_status,new_status,NULL,created_at FROM admin_status_events
 UNION ALL SELECT 'activity',id,actor_user_id,'user',action,entity_type,entity_id::text,NULL,NULL,NULL,created_at FROM audit_events
) e`

func (r *Repository) Audit(ctx context.Context, actor string, f entity.Filter) (entity.Page, error) {
	p := entity.Page{Items: []any{}, Limit: f.Limit, Offset: f.Offset}
	tx, _, err := r.begin(ctx, actor, true)
	if err != nil {
		return p, err
	}
	defer tx.Rollback(ctx)
	where := ` FROM ` + auditUnion + ` WHERE ($1='' OR e.source=$1) AND ($2='' OR e.action=$2) AND ($3='' OR e.entity_type=$3)
 AND ($4::text IS NULL OR e.entity_id=$4) AND ($5::uuid IS NULL OR e.actor_id=$5)
 AND ($6::timestamptz IS NULL OR e.created_at>=$6) AND ($7::timestamptz IS NULL OR e.created_at<=$7)`
	a := []any{f.Source, f.Action, f.EntityType, f.EntityID, f.ActorID, f.From, f.To}
	if err = tx.QueryRow(ctx, `SELECT count(*)`+where, a...).Scan(&p.Total); err != nil {
		return p, err
	}
	rows, err := tx.Query(ctx, `SELECT to_jsonb(e)`+where+` ORDER BY e.created_at DESC,e.source,e.id DESC LIMIT $8 OFFSET $9`, append(a, f.Limit, f.Offset)...)
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
func (r *Repository) Stats(ctx context.Context, actor string) (map[string]any, error) {
	tx, _, err := r.begin(ctx, actor, true)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	var result map[string]any
	err = tx.QueryRow(ctx, `SELECT jsonb_build_object('generated_at',transaction_timestamp(),
 'users',(SELECT jsonb_build_object('total',count(*),'active',count(*) FILTER(WHERE status='active'),'blocked',count(*) FILTER(WHERE status='blocked'),'deleted',count(*) FILTER(WHERE status='deleted'),'candidates',count(*) FILTER(WHERE role='candidate'),'employers',count(*) FILTER(WHERE role='employer')) FROM users),
 'companies',(SELECT jsonb_build_object('total',count(*),'pending',count(*) FILTER(WHERE verification_status='pending'),'verified',count(*) FILTER(WHERE verification_status='verified'),'rejected',count(*) FILTER(WHERE verification_status='rejected'),'active',count(*) FILTER(WHERE status='active'),'blocked',count(*) FILTER(WHERE status='blocked')) FROM companies),
 'needs',(SELECT jsonb_build_object('total',count(*),'active',count(*) FILTER(WHERE status='active'),'hidden',count(*) FILTER(WHERE moderation_status='hidden')) FROM employer_needs),
 'offers',(SELECT jsonb_build_object('total',count(*),'accepted',count(*) FILTER(WHERE status='accepted'),'rejected',count(*) FILTER(WHERE status='rejected')) FROM candidate_offers),
 'tasks',(SELECT jsonb_build_object('total',count(*),'hidden',count(*) FILTER(WHERE moderation_status='hidden'),'open',count(*) FILTER(WHERE status='open' AND (deadline_at IS NULL OR deadline_at>transaction_timestamp()))) FROM company_daily_tasks),
 'submissions',(SELECT jsonb_build_object('total',count(*),'reviewed',count(*) FILTER(WHERE status='reviewed')) FROM company_task_submissions),
 'attempts',(SELECT jsonb_build_object('total',count(*),'passed',count(*) FILTER(WHERE status='passed'),'failed',count(*) FILTER(WHERE status='failed'),'active',count(*) FILTER(WHERE status='active')) FROM assessment_attempts),
 'skills_pending',(SELECT count(*) FROM skills WHERE moderation_status='pending'))`).Scan(&result)
	if err != nil {
		return nil, err
	}
	return result, tx.Commit(ctx)
}
