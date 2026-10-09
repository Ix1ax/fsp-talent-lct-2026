package repository

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/entity"
	"github.com/jackc/pgx/v5"
)

const verificationColumns = `id::text,verification_status,verification_version,verification_requested_at,verification_reviewed_at,verification_reason,verification_file_ids::text[]`

func scanVerification(row pgx.Row) (entity.Verification, error) {
	var v entity.Verification
	err := row.Scan(&v.CompanyID, &v.Status, &v.Version, &v.RequestedAt, &v.ReviewedAt, &v.Reason, &v.DocumentIDs)
	if v.DocumentIDs == nil {
		v.DocumentIDs = []string{}
	}
	return v, dbError(err)
}
func companyAccess(ctx context.Context, tx pgx.Tx, user, company string, write bool) error {
	var role string
	lock := ` FOR SHARE OF c,m,u`
	if write {
		lock = ` FOR UPDATE OF c,m FOR SHARE OF u`
	}
	err := tx.QueryRow(ctx, `SELECT m.role FROM company_members m JOIN companies c ON c.id=m.company_id JOIN users u ON u.id=m.user_id WHERE c.id=$1 AND m.user_id=$2 AND m.status='active' AND u.role='employer' AND u.status='active'`+lock, company, user).Scan(&role)
	if err != nil {
		return dbError(err)
	}
	if write && role != "owner" {
		return entity.ErrForbidden
	}
	return nil
}
func (r *Repository) Verification(ctx context.Context, user, company string, submit bool) (entity.Verification, error) {
	var v entity.Verification
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return v, err
	}
	defer tx.Rollback(ctx)
	if err = companyAccess(ctx, tx, user, company, submit); err != nil {
		return v, err
	}
	v, err = scanVerification(tx.QueryRow(ctx, `SELECT `+verificationColumns+` FROM companies WHERE id=$1`, company))
	if err != nil {
		return v, err
	}
	if !submit || v.Status == "pending" || v.Status == "verified" {
		return v, tx.Commit(ctx)
	}
	var inn *string
	if err = tx.QueryRow(ctx, `SELECT inn FROM companies WHERE id=$1`, company).Scan(&inn); err != nil {
		return v, err
	}
	// Фиксируем документы заявки. Удаление любого из них инвалидирует версию триггером.
	rows, err := tx.Query(ctx, `SELECT f.id::text FROM files f JOIN company_documents d ON d.file_id=f.id WHERE d.company_id=$1 AND f.status='ready' AND f.purpose='company_document' ORDER BY f.id FOR SHARE OF f`, company)
	if err != nil {
		return v, err
	}
	docs := []string{}
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return v, err
		}
		docs = append(docs, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return v, err
	}
	if inn == nil || len(docs) == 0 {
		return v, entity.ErrEvidence
	}
	old := v.Status
	v, err = scanVerification(tx.QueryRow(ctx, `UPDATE companies SET verification_status='pending',verification_version=verification_version+1,verification_requested_at=clock_timestamp(),verification_reviewed_at=NULL,verification_reviewed_by=NULL,verification_reason=NULL,verification_file_ids=$2::uuid[] WHERE id=$1 RETURNING `+verificationColumns, company, docs))
	if err != nil {
		return v, err
	}
	if err = event(ctx, tx, "", user, "company.verification_requested", "company", company, old, "pending", ""); err != nil {
		return v, err
	}
	return v, tx.Commit(ctx)
}
func (r *Repository) Decide(ctx context.Context, actor, company string, in entity.Decision) (map[string]any, error) {
	tx, _, err := r.begin(ctx, actor, false)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	v, err := scanVerification(tx.QueryRow(ctx, `SELECT `+verificationColumns+` FROM companies WHERE id=$1 FOR UPDATE`, company))
	if err != nil {
		return nil, err
	}
	if v.Version != *in.ExpectedVersion {
		return nil, entity.ErrConflict
	}
	// Повтор того же решения не меняет дату/причину и не создаёт лишнее событие.
	if v.Status != in.Status {
		if in.Status == "unverified" {
			if v.Status != "verified" {
				return nil, entity.ErrConflict
			}
		} else if v.Status != "pending" {
			return nil, entity.ErrConflict
		}
		if in.Status == "verified" {
			var valid bool
			err = tx.QueryRow(ctx, `SELECT inn IS NOT NULL AND cardinality(verification_file_ids)>0 AND cardinality(verification_file_ids)=(SELECT count(*) FROM files WHERE id=ANY(c.verification_file_ids) AND status='ready' AND purpose='company_document') FROM companies c WHERE c.id=$1`, company).Scan(&valid)
			if err != nil {
				return nil, err
			}
			if !valid {
				return nil, entity.ErrEvidence
			}
		}
		// Версия увеличивается при каждой смене, включая решение: устаревший запрос не отменит новое.
		_, err = tx.Exec(ctx, `UPDATE companies SET verification_status=$2,verification_version=verification_version+1,verification_reviewed_at=clock_timestamp(),verification_reviewed_by=$3,verification_reason=NULLIF($4,'') WHERE id=$1`, company, in.Status, actor, in.Reason)
		if err != nil {
			return nil, err
		}
		if err = event(ctx, tx, actor, "", "company.verification_decided", "company", company, v.Status, in.Status, in.Reason); err != nil {
			return nil, err
		}
	}
	var result map[string]any
	if err = tx.QueryRow(ctx, `SELECT `+companyJSON+` FROM companies c WHERE c.id=$1`, company).Scan(&result); err != nil {
		return nil, err
	}
	return result, tx.Commit(ctx)
}
