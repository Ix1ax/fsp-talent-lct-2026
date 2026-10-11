package repository

import (
	"context"
	"errors"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/query"
	"github.com/jackc/pgx/v5"
)

const lastInteraction = `GREATEST(interaction.last_viewed_at,interaction.last_offered_at)`

// Отправка автоматически записывает просмотр на ту же дату. Если последний оффер
// истёк, этот автоматический просмотр больше не удерживает кулдаун. Более поздний
// ручной просмотр и прежние принятые/отклонённые предложения сохраняют свой срок.
var cooldownInteraction = `CASE WHEN interaction.last_viewed_at<=interaction.last_offered_at
 AND EXISTS(SELECT 1 FROM candidate_offers o WHERE o.company_id=interaction.company_id
 AND o.candidate_id=interaction.candidate_id AND o.created_at=interaction.last_offered_at
 AND ` + query.Expired("o", "transaction_timestamp()") + `)
 THEN (SELECT max(o.created_at) FROM candidate_offers o WHERE o.company_id=interaction.company_id
 AND o.candidate_id=interaction.candidate_id AND o.created_at<=interaction.last_offered_at
 AND NOT ` + query.Expired("o", "transaction_timestamp()") + `)
 ELSE ` + lastInteraction + ` END`
var nextAvailable = `(` + cooldownInteraction + `) + interval '720 hours'`
var interactionColumns = `interaction.last_offered_at IS NOT NULL AS has_offer,
 interaction.last_viewed_at IS NOT NULL AS viewed,interaction.last_viewed_at,interaction.last_offered_at,` + nextAvailable + ` AS next_available_at`

const cardResultColumns = `id,city,timezone,experience_months,salary_min_rub,search_status,work_format_ids,category,declared_category,grade_status,achievements_count,fsp_bonus,
 has_offer,viewed,last_viewed_at,last_offered_at,next_available_at`

// View вызывается при открытии профиля. Чтение GET само по себе историю не меняет.
func (r *Repository) View(ctx context.Context, userID, companyID, candidateID string) (entity.Interaction, error) {
	var state entity.Interaction
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return state, err
	}
	defer tx.Rollback(ctx)
	if err = authorize(ctx, tx, userID, companyID); err != nil {
		return state, err
	}
	err = tx.QueryRow(ctx, `INSERT INTO company_candidate_interactions AS interaction(company_id,candidate_id,last_viewed_at)
 SELECT $2::uuid,p.id,statement_timestamp()`+visible+` AND p.id=$1
 ON CONFLICT(company_id,candidate_id) DO UPDATE
 SET last_viewed_at=GREATEST(interaction.last_viewed_at,EXCLUDED.last_viewed_at)
 RETURNING `+interactionColumns, candidateID, companyID).Scan(&state.HasOffer, &state.Viewed, &state.LastViewedAt, &state.LastOfferedAt, &state.NextAvailableAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return state, entity.ErrNotFound
	}
	if err != nil {
		return state, err
	}
	return state, tx.Commit(ctx)
}
