package repository

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
)

func (r *Repository) CandidateGet(ctx context.Context, user, id string) (entity.Offer, error) {
	return scan(r.db.QueryRow(ctx, `SELECT `+columns+candidateAccess+` AND o.id=$2`, user, id))
}
func (r *Repository) CandidateList(ctx context.Context, user, status string, limit, offset int) ([]entity.Offer, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	if err = lockCandidateUser(ctx, tx, user); err != nil {
		return nil, err
	}
	var exists bool
	err = tx.QueryRow(ctx, `SELECT true FROM candidate_profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1 AND u.role='candidate' AND u.status='active' FOR SHARE OF p,u`, user).Scan(&exists)
	if err != nil {
		return nil, dbError(err)
	}
	rows, err := tx.Query(ctx, `SELECT `+columns+candidateAccess+` AND ($2='' OR o.status=$2) ORDER BY o.created_at DESC,o.id DESC LIMIT $3 OFFSET $4`, user, status, limit, offset)
	if err != nil {
		return nil, err
	}
	items, err := collect(rows)
	if err != nil {
		return nil, err
	}
	return items, tx.Commit(ctx)
}

func (r *Repository) View(ctx context.Context, user, id string) (entity.Offer, error) {
	return r.action(ctx, user, id, entity.StatusViewed)
}
func (r *Repository) Respond(ctx context.Context, user, id, status string) (entity.Offer, error) {
	return r.action(ctx, user, id, status)
}

// Блокировка предложения сериализует просмотр и ответы: второй ответ не перетирает первый.
func (r *Repository) action(ctx context.Context, user, id, status string) (entity.Offer, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Offer{}, err
	}
	defer tx.Rollback(ctx)
	if err = lockCandidateUser(ctx, tx, user); err != nil {
		return entity.Offer{}, err
	}
	o, err := scan(tx.QueryRow(ctx, `SELECT `+columns+candidateAccess+` AND o.id=$2 FOR UPDATE OF o FOR SHARE OF p,u`, user, id))
	if err != nil {
		return o, err
	}
	if status == entity.StatusViewed {
		if o.Status != entity.StatusSent {
			return o, tx.Commit(ctx)
		}
		o, err = scan(tx.QueryRow(ctx, `UPDATE candidate_offers AS o SET status='viewed',viewed_at=GREATEST(statement_timestamp(),created_at) WHERE id=$1 RETURNING `+columns, id))
	} else {
		if err = entity.ValidateResponse(o.Status, status); err != nil {
			return o, err
		}
		if o.Status == status {
			return o, tx.Commit(ctx)
		}
		o, err = scan(tx.QueryRow(ctx, `UPDATE candidate_offers AS o SET status=$2,
 viewed_at=COALESCE(viewed_at,GREATEST(statement_timestamp(),created_at)),
 responded_at=GREATEST(statement_timestamp(),created_at,viewed_at) WHERE id=$1 RETURNING `+columns, id, status))
	}
	if err != nil {
		return o, err
	}
	return o, tx.Commit(ctx)
}
