package repository

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/entity"
)

// UserCompanies показывает, к каким организациям относится аккаунт, без раскрытия файлов и секретов.
func (r *Repository) UserCompanies(ctx context.Context, actor, user string, f entity.Filter) (entity.Page, error) {
	p := entity.Page{Items: []any{}, Limit: f.Limit, Offset: f.Offset}
	tx, _, err := r.begin(ctx, actor, true)
	if err != nil {
		return p, err
	}
	defer tx.Rollback(ctx)
	var exists bool
	if err = tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1`, user).Scan(&exists); err != nil {
		return p, dbError(err)
	}
	from := ` FROM company_members m JOIN companies c ON c.id=m.company_id WHERE m.user_id=$1`
	if err = tx.QueryRow(ctx, `SELECT count(*)`+from, user).Scan(&p.Total); err != nil {
		return p, err
	}
	rows, err := tx.Query(ctx, `SELECT jsonb_build_object('company_id',c.id,'company_name',c.name,'company_status',c.status,
'verification_status',c.verification_status,'role',m.role,'status',m.status,'joined_at',m.joined_at)`+from+` ORDER BY m.joined_at DESC,c.id DESC LIMIT $2 OFFSET $3`, user, f.Limit, f.Offset)
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
