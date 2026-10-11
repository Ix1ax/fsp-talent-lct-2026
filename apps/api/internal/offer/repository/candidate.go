package repository

import (
	"context"
	"errors"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/query"
)

func (r *Repository) CandidateGet(ctx context.Context, user, id string) (entity.Offer, error) {
	return scan(r.db.QueryRow(ctx, `SELECT `+columns+candidateAccess+` AND o.id=$2`, user, id))
}

// CandidateList возвращает страницу предложений кандидата и их общее число с учётом фильтра по статусу.
func (r *Repository) CandidateList(ctx context.Context, user, status string, limit, offset int) ([]entity.Offer, int64, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback(ctx)
	if err = lockCandidateUser(ctx, tx, user); err != nil {
		return nil, 0, err
	}
	var exists bool
	err = tx.QueryRow(ctx, `SELECT true FROM candidate_profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1 AND u.role='candidate' AND u.status='active' FOR SHARE OF p,u`, user).Scan(&exists)
	if err != nil {
		return nil, 0, dbError(err)
	}
	filter := ` AND ($2='' OR (` + effectiveStatus + `)=$2)`
	var total int64
	if err = tx.QueryRow(ctx, `SELECT count(*)`+candidateAccess+filter, user, status).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := tx.Query(ctx, `SELECT `+columns+candidateAccess+filter+` ORDER BY o.created_at DESC,o.id DESC LIMIT $3 OFFSET $4`, user, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	items, err := collect(rows)
	if err != nil {
		return nil, 0, err
	}
	return items, total, tx.Commit(ctx)
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
	// Для действий по предложению сначала компания, затем кандидат и само предложение.
	var company string
	if err = tx.QueryRow(ctx, `SELECT c.id::text`+candidateAccess+` AND o.id=$2 FOR SHARE OF c`, user, id).Scan(&company); err != nil {
		return entity.Offer{}, dbError(err)
	}
	if err = lockCandidateUser(ctx, tx, user); err != nil {
		return entity.Offer{}, err
	}
	o, err := scan(tx.QueryRow(ctx, `SELECT `+columns+candidateAccess+` AND o.id=$2 FOR UPDATE OF o FOR SHARE OF c,p,u`, user, id))
	if err != nil {
		return o, err
	}
	// Проверяем реальное время после ожидания блокировки, а не начало транзакции.
	var now time.Time
	if err = tx.QueryRow(ctx, `SELECT clock_timestamp()`).Scan(&now); err != nil {
		return o, err
	}
	o.Status = entity.EffectiveStatus(o.Status, o.CreatedAt, now)
	stillOpen := ` AND NOT ` + query.Expired("o", "clock_timestamp()")
	if status == entity.StatusViewed {
		if o.Status != entity.StatusSent {
			return o, tx.Commit(ctx)
		}
		o, err = scan(tx.QueryRow(ctx, `UPDATE candidate_offers AS o SET status='viewed',viewed_at=GREATEST(clock_timestamp(),created_at) WHERE id=$1`+stillOpen+` RETURNING `+columns, id))
	} else {
		if err = entity.ValidateResponse(o.Status, status); err != nil {
			return o, err
		}
		if o.Status == status {
			return o, tx.Commit(ctx)
		}
		o, err = scan(tx.QueryRow(ctx, `UPDATE candidate_offers AS o SET status=$2,
 viewed_at=COALESCE(viewed_at,GREATEST(clock_timestamp(),created_at)),
 responded_at=GREATEST(clock_timestamp(),created_at,viewed_at) WHERE id=$1`+stillOpen+` RETURNING `+columns, id, status))
	}
	// Дедлайн мог наступить между проверкой и UPDATE; не записываем поздний ответ.
	if errors.Is(err, entity.ErrNotFound) {
		if status != entity.StatusViewed {
			return entity.Offer{}, entity.ErrExpired
		}
		o, err = scan(tx.QueryRow(ctx, `SELECT `+columns+` FROM candidate_offers o WHERE o.id=$1`, id))
		o.Status = entity.StatusExpired
	}
	if err != nil {
		return o, err
	}
	return o, tx.Commit(ctx)
}
