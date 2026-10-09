package repository

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
)

func (r *Repository) Create(ctx context.Context, user, company string, in entity.Input) (entity.Offer, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Offer{}, err
	}
	defer tx.Rollback(ctx)
	name, err := companyPermission(ctx, tx, user, company, true)
	if err != nil {
		return entity.Offer{}, err
	}
	// Скрытому профилю новые предложения не отправляем. Уже полученные остаются в истории.
	var candidateUser string
	if err = tx.QueryRow(ctx, `SELECT user_id::text FROM candidate_profiles WHERE id=$1`, in.CandidateID).Scan(&candidateUser); err != nil {
		return entity.Offer{}, dbError(err)
	}
	if err = lockCandidateUser(ctx, tx, candidateUser); err != nil {
		return entity.Offer{}, err
	}
	var visible bool
	err = tx.QueryRow(ctx, `SELECT true FROM candidate_profiles p JOIN users u ON u.id=p.user_id
 WHERE p.id=$1 AND p.search_status IN ('open','passive') AND u.role='candidate' AND u.status='active' FOR SHARE OF p,u`, in.CandidateID).Scan(&visible)
	if err != nil {
		return entity.Offer{}, dbError(err)
	}
	if in.NeedID != nil {
		var valid bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM employer_needs WHERE id=$1 AND company_id=$2 AND status='active')`, *in.NeedID, company).Scan(&valid); err != nil {
			return entity.Offer{}, err
		}
		if !valid {
			return entity.Offer{}, &entity.ValidationError{Message: "Выберите активную потребность этой компании или отправьте предложение без привязки"}
		}
	}
	o, err := scan(tx.QueryRow(ctx, `INSERT INTO candidate_offers AS o(company_id,candidate_id,created_by,need_id,company_name,title,description,salary_from_rub,salary_to_rub,contact_email,contact_url)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING `+columns, company, in.CandidateID, user, in.NeedID, name, in.Title, in.Description, *in.SalaryFromRUB, *in.SalaryToRUB, in.ContactEmail, in.ContactURL))
	if err != nil {
		return o, err
	}
	// Отправка считается просмотром и обновляет срок в той же транзакции, что и оффер.
	_, err = tx.Exec(ctx, `INSERT INTO company_candidate_interactions AS interaction(company_id,candidate_id,last_viewed_at,last_offered_at)
 VALUES($1,$2,$3,$3) ON CONFLICT(company_id,candidate_id) DO UPDATE
 SET last_viewed_at=GREATEST(interaction.last_viewed_at,EXCLUDED.last_viewed_at),
 last_offered_at=GREATEST(interaction.last_offered_at,EXCLUDED.last_offered_at)`, company, in.CandidateID, o.CreatedAt)
	if err != nil {
		return entity.Offer{}, err
	}
	return o, tx.Commit(ctx)
}
func (r *Repository) CompanyGet(ctx context.Context, user, company, id string) (entity.Offer, error) {
	return scan(r.db.QueryRow(ctx, `SELECT `+columns+companyAccess+` AND o.id=$3`, user, company, id))
}

// CompanyList возвращает страницу предложений компании и их общее число с учётом фильтра по статусу.
func (r *Repository) CompanyList(ctx context.Context, user, company, status string, limit, offset int) ([]entity.Offer, int64, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback(ctx)
	if _, err = companyPermission(ctx, tx, user, company, false); err != nil {
		return nil, 0, err
	}
	const filter = ` AND ($3='' OR o.status=$3)`
	var total int64
	if err = tx.QueryRow(ctx, `SELECT count(*)`+companyAccess+filter, user, company, status).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := tx.Query(ctx, `SELECT `+columns+companyAccess+filter+` ORDER BY o.created_at DESC,o.id DESC LIMIT $4 OFFSET $5`, user, company, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	items, err := collect(rows)
	if err != nil {
		return nil, 0, err
	}
	return items, total, tx.Commit(ctx)
}
