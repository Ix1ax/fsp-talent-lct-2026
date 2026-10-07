// Пакет repository хранит банк заданий и шаблоны тестов в PostgreSQL.
package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
)

type Repository struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

type querier interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
	QueryRow(context.Context, string, ...any) pgx.Row
}

// isInvalidUUID — идентификатор не разобрался как uuid (SQLSTATE 22P02): такой записи точно нет.
func isInvalidUUID(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "22P02"
}

func dbError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrNotFound
	}
	return err
}

// recordEvent пишет действие администратора в той же транзакции. Тексты заданий и правила в журнал не попадают.
func recordEvent(ctx context.Context, tx pgx.Tx, actorID, action, entityType, entityID string) error {
	_, err := tx.Exec(ctx, `INSERT INTO assessment_events(actor_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)`, actorID, action, entityType, entityID)
	return err
}
