//go:build integration

package user

import (
	"context"
	"errors"
	"fmt"
	"os"
	"reflect"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/migrations"
)

func TestRepository(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("Необходимо указать TEST_DATABASE_URL")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	admin, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(admin.Close)
	schema := fmt.Sprintf("user_repository_test_%d", time.Now().UnixNano())
	if _, err = admin.Exec(ctx, `CREATE SCHEMA `+schema); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, err := admin.Exec(context.Background(), `DROP SCHEMA `+schema+` CASCADE`); err != nil {
			t.Error(err)
		}
	})
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	// Cleanup выполняется в обратном порядке: сначала удаление данных, потом закрытие пула.
	t.Cleanup(db.Close)
	sqlDB := stdlib.OpenDB(*cfg.ConnConfig)
	defer sqlDB.Close()
	provider, err := goose.NewProvider(goose.DialectPostgres, sqlDB, migrations.Files)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = provider.Up(ctx); err != nil {
		t.Fatal(err)
	}
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
	if err != nil || !reflect.DeepEqual(found, created) {
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
