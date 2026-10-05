//go:build integration

package user

import (
	"context"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestRepository(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("Необходимо указать DATABASE_URL")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	repo := NewRepository(db)
	issuer := "https://integration.test/realms/" + fmt.Sprint(time.Now().UnixNano())
	t.Cleanup(func() {
		_, _ = db.Exec(context.Background(), `DELETE FROM users WHERE id IN (SELECT user_id FROM external_identities WHERE issuer = $1)`, issuer)
	})

	if _, err := repo.FindByIdentity(ctx, issuer, "sub-1"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("ожидали ErrNotFound, получили %v", err)
	}
	created, err := repo.Create(ctx, issuer, "sub-1", RoleEmployer)
	if err != nil {
		t.Fatal(err)
	}
	if created.ID == "" || created.Role != RoleEmployer || created.Status != StatusActive {
		t.Fatalf("неверный пользователь: %+v", created)
	}
	found, err := repo.FindByIdentity(ctx, issuer, "sub-1")
	if err != nil || found != created {
		t.Fatalf("ожидали %+v, получили %+v, %v", created, found, err)
	}
	if _, err := repo.Create(ctx, issuer, "sub-1", RoleCandidate); !errors.Is(err, ErrExists) {
		t.Fatalf("ожидали ErrExists, получили %v", err)
	}
	// Неудачная вставка не должна оставлять «осиротевшего» пользователя.
	var count int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM users u JOIN external_identities e ON e.user_id = u.id WHERE e.issuer = $1`, issuer).Scan(&count); err != nil || count != 1 {
		t.Fatalf("ожидали одного пользователя, получили %d (%v)", count, err)
	}
	if _, err := db.Exec(ctx, `UPDATE users SET role = 'hacker' WHERE id = $1`, created.ID); err == nil {
		t.Fatal("CHECK по роли не сработал")
	}
}
