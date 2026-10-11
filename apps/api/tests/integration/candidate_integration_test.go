//go:build integration

package integration

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

func pgCode(err error) string {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return pgErr.Code
	}
	return ""
}

func TestCandidateSchemaConstraints(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	newUser := func() string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	user := newUser()
	var profile, status string
	var experience int
	if err := db.QueryRow(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1) RETURNING id::text, search_status, experience_months`, user).Scan(&profile, &status, &experience); err != nil {
		t.Fatal(err)
	}
	if status != "hidden" || experience != 0 {
		t.Fatalf("значения по умолчанию: search_status=%q experience_months=%d", status, experience)
	}
	if _, err := db.Exec(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1)`, user); pgCode(err) != "23505" {
		t.Fatalf("второй профиль пользователя: код %q, ожидали 23505 (%v)", pgCode(err), err)
	}
	for name, query := range map[string]string{
		"стаж больше 600":     `INSERT INTO candidate_profiles(user_id, experience_months) VALUES($1, 601)`,
		"отрицательная плата": `INSERT INTO candidate_profiles(user_id, salary_min_rub) VALUES($1, -1)`,
		"плата больше лимита": `INSERT INTO candidate_profiles(user_id, salary_min_rub) VALUES($1, 1000000001)`,
		"неизвестный статус":  `INSERT INTO candidate_profiles(user_id, search_status) VALUES($1, 'public')`,
		"длинный заголовок":   `INSERT INTO candidate_profiles(user_id, headline) VALUES($1, repeat('a', 201))`,
	} {
		if _, err := db.Exec(ctx, query, newUser()); pgCode(err) != "23514" {
			t.Fatalf("%s: код %q, ожидали 23514 (%v)", name, pgCode(err), err)
		}
	}
	if _, err := db.Exec(ctx, `INSERT INTO candidate_work_formats(candidate_id, work_format_id) VALUES($1, 999)`, profile); pgCode(err) != "23503" {
		t.Fatalf("неизвестный формат работы: код %q, ожидали 23503 (%v)", pgCode(err), err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO candidate_work_formats(candidate_id, work_format_id) VALUES($1, 3)`, profile); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `DELETE FROM users WHERE id=$1`, user); err != nil {
		t.Fatal(err)
	}
	var left int
	if err := db.QueryRow(ctx, `SELECT (SELECT count(*) FROM candidate_profiles WHERE id=$1) + (SELECT count(*) FROM candidate_work_formats WHERE candidate_id=$1)`, profile).Scan(&left); err != nil || left != 0 {
		t.Fatalf("после удаления пользователя осталось %d строк (%v)", left, err)
	}
}
