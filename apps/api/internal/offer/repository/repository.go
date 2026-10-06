// Пакет repository хранит предложения и проверяет доступ к ним в PostgreSQL.
package repository

import (
	"context"
	"errors"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

const columns = `o.id::text,o.company_id::text,o.candidate_id::text,o.created_by::text,o.need_id::text,o.company_name,o.title,o.description,o.salary_from_rub,o.salary_to_rub,o.contact_email,o.contact_url,o.status,o.created_at,o.viewed_at,o.responded_at`
const companyAccess = ` FROM candidate_offers o JOIN company_members m ON m.company_id=o.company_id JOIN users u ON u.id=m.user_id
 WHERE m.user_id=$1 AND o.company_id=$2 AND m.status='active' AND u.status='active' AND u.role='employer'`
const candidateAccess = ` FROM candidate_offers o JOIN candidate_profiles p ON p.id=o.candidate_id JOIN users u ON u.id=p.user_id
 WHERE p.user_id=$1 AND u.status='active' AND u.role='candidate'`

func scan(row pgx.Row) (entity.Offer, error) {
	var o entity.Offer
	err := row.Scan(&o.ID, &o.CompanyID, &o.CandidateID, &o.CreatedBy, &o.NeedID, &o.CompanyName, &o.Title, &o.Description, &o.SalaryFromRUB, &o.SalaryToRUB, &o.ContactEmail, &o.ContactURL, &o.Status, &o.CreatedAt, &o.ViewedAt, &o.RespondedAt)
	return o, dbError(err)
}
func dbError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrNotFound
	}
	return err
}
func collect(rows pgx.Rows) ([]entity.Offer, error) {
	defer rows.Close()
	items := []entity.Offer{}
	for rows.Next() {
		o, err := scan(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, o)
	}
	return items, rows.Err()
}

// Общий порядок блокировок совпадает с управлением командой компании.
func companyPermission(ctx context.Context, tx pgx.Tx, user, company string, write bool) (string, error) {
	lock := " FOR SHARE OF c,m,u"
	if write {
		lock = " FOR UPDATE OF c,m FOR SHARE OF u"
	}
	var name, role string
	err := tx.QueryRow(ctx, `SELECT c.name,m.role FROM companies c JOIN company_members m ON m.company_id=c.id JOIN users u ON u.id=m.user_id
 WHERE c.id=$2 AND m.user_id=$1 AND m.status='active' AND u.status='active' AND u.role='employer'`+lock, user, company).Scan(&name, &role)
	if err != nil {
		return "", dbError(err)
	}
	if write && role != "owner" && role != "recruiter" {
		return "", entity.ErrForbidden
	}
	return name, nil
}
