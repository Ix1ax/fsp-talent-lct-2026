package catalog

import (
	"context"
	"github.com/jackc/pgx/v5"
)

// Обычные изменения стека выполняются параллельно. Модерация ждёт их завершения,
// чтобы перенос связей не пересёкся с добавлением навыка или сохранением потребности.
// Блокировку берём до блокировок профиля и компании; PostgreSQL освобождает её вместе с транзакцией.
func LockSkillChanges(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock_shared(2062026,1)`)
	return err
}
func LockSkillModeration(ctx context.Context, tx pgx.Tx) error {
	_, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(2062026,1)`)
	return err
}
