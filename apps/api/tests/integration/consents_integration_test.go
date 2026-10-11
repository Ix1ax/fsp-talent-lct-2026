//go:build integration

package integration

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/migrations"
)

// grantConsentRows выдаёт кандидату активные согласия напрямую в БД (для тестов других модулей).
func grantConsentRows(t *testing.T, db *pgxpool.Pool, userID string, kinds ...string) {
	t.Helper()
	for _, kind := range kinds {
		if _, err := db.Exec(context.Background(), `INSERT INTO candidate_consents(user_id,kind,policy_version) VALUES($1,$2,'test')`, userID, kind); err != nil {
			t.Fatal(err)
		}
	}
}

func TestConsentsSchemaConstraints(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	newUser := func() string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	newCompany := func() string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO companies(name,contact_email) VALUES('Компания','hr@example.test') RETURNING id::text`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	user, company, otherCompany := newUser(), newCompany(), newCompany()
	insert := func(userID, kind, version string, companyID any) error {
		_, err := db.Exec(ctx, `INSERT INTO candidate_consents(user_id,kind,policy_version,company_id) VALUES($1,$2,$3,$4)`, userID, kind, version, companyID)
		return err
	}
	for name, err := range map[string]error{
		"неизвестный вид":           insert(user, "other", "v1", nil),
		"ats_transfer без компании": insert(user, "ats_transfer", "v1", nil),
		"processing с компанией":    insert(user, "processing", "v1", company),
		"пустая версия политики":    insert(user, "processing", "", nil),
		"отзыв раньше выдачи": func() error {
			_, e := db.Exec(ctx, `INSERT INTO candidate_consents(user_id,kind,policy_version,granted_at,revoked_at) VALUES($1,'publication','v1',now(),now()-interval '1 day')`, user)
			return e
		}(),
		"пустое ФИО в контактах": func() error {
			_, e := db.Exec(ctx, `INSERT INTO candidate_contacts(user_id,full_name,email) VALUES($1,' ','a@b.ru')`, user)
			return e
		}(),
	} {
		if pgCode(err) != "23514" {
			t.Fatalf("%s: код %q, ожидали 23514 (%v)", name, pgCode(err), err)
		}
	}
	if err := insert(user, "processing", "v1", nil); err != nil {
		t.Fatal(err)
	}
	if err := insert(user, "processing", "v1", nil); pgCode(err) != "23505" {
		t.Fatalf("второе активное processing: код %q, ожидали 23505 (%v)", pgCode(err), err)
	}
	if _, err := db.Exec(ctx, `UPDATE candidate_consents SET revoked_at=now() WHERE user_id=$1 AND kind='processing'`, user); err != nil {
		t.Fatal(err)
	}
	if err := insert(user, "processing", "v2", nil); err != nil {
		t.Fatalf("выдача после отзыва должна проходить: %v", err)
	}
	if err := insert(user, "ats_transfer", "v1", company); err != nil {
		t.Fatal(err)
	}
	if err := insert(user, "ats_transfer", "v1", otherCompany); err != nil {
		t.Fatalf("согласие для другой компании: %v", err)
	}
	if err := insert(user, "ats_transfer", "v1", company); pgCode(err) != "23505" {
		t.Fatalf("второе активное ats_transfer для той же компании: код %q (%v)", pgCode(err), err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO candidate_contacts(user_id,full_name,email) VALUES($1,'Иван Иванов','ivan@example.test')`, user); err != nil {
		t.Fatal(err)
	}
	var metadata string
	if err := db.QueryRow(ctx, `INSERT INTO audit_events(action,entity_type) VALUES('test','test') RETURNING metadata::text`).Scan(&metadata); err != nil || metadata != "{}" {
		t.Fatalf("metadata по умолчанию: %q (%v)", metadata, err)
	}
	if _, err := db.Exec(ctx, `DELETE FROM users WHERE id=$1`, user); err != nil {
		t.Fatal(err)
	}
	var left int
	if err := db.QueryRow(ctx, `SELECT (SELECT count(*) FROM candidate_consents WHERE user_id=$1)+(SELECT count(*) FROM candidate_contacts WHERE user_id=$1)`, user).Scan(&left); err != nil || left != 0 {
		t.Fatalf("после удаления пользователя осталось %d строк (%v)", left, err)
	}
}

// Миграция скрывает профили, опубликованные до появления согласий.
func TestConsentsMigrationHidesPublishedProfiles(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("Нужен TEST_DATABASE_URL")
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(admin.Close)
	schema := fmt.Sprintf("consent_migration_%d", time.Now().UnixNano())
	if _, err = admin.Exec(ctx, `CREATE SCHEMA `+schema); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = admin.Exec(context.Background(), `DROP SCHEMA `+schema+` CASCADE`) })
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatal(err)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	db, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Close)
	sqlDB := stdlib.OpenDB(*cfg.ConnConfig)
	defer sqlDB.Close()
	provider, err := goose.NewProvider(goose.DialectPostgres, sqlDB, migrations.Files)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = provider.UpTo(ctx, 20261006141620); err != nil {
		t.Fatal(err)
	}
	for _, status := range []string{"open", "hidden", "passive"} {
		var user string
		if err = db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
			t.Fatal(err)
		}
		if _, err = db.Exec(ctx, `INSERT INTO candidate_profiles(user_id,search_status) VALUES($1,$2)`, user, status); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = provider.Up(ctx); err != nil {
		t.Fatal(err)
	}
	var notHidden int
	if err = db.QueryRow(ctx, `SELECT count(*) FROM candidate_profiles WHERE search_status<>'hidden'`).Scan(&notHidden); err != nil || notHidden != 0 {
		t.Fatalf("после миграции опубликованных профилей: %d (%v)", notHidden, err)
	}
}
