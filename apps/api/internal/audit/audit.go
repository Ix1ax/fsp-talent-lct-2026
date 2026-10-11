// Пакет audit записывает события доступа и важных действий в той же транзакции, что и изменение.
package audit

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
)

// Event описывает событие. В Metadata нельзя класть персональные данные: ФИО, телефоны, почты, тексты.
type Event struct {
	ActorUserID *string
	Action      string
	EntityType  string
	EntityID    *string
	Metadata    map[string]any
}

func Record(ctx context.Context, tx pgx.Tx, e Event) error {
	metadata := e.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}
	raw, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)`,
		e.ActorUserID, e.Action, e.EntityType, e.EntityID, raw)
	return err
}
