//go:build integration

package integration

import (
	"context"
	"testing"
)

const goSkill = "00000000-0000-4000-8000-000000000001"

func TestCandidateSkillsSchema(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	var user, profile string
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1) RETURNING id::text`, user).Scan(&profile); err != nil {
		t.Fatal(err)
	}
	insert := func(skill string, level any) error {
		_, err := db.Exec(ctx, `INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level) VALUES($1,$2,$3)`, profile, skill, level)
		return err
	}
	for _, level := range []int{0, 6, -1} {
		if err := insert(goSkill, level); pgCode(err) != "23514" {
			t.Fatalf("уровень %d: код %q, ожидали 23514 (%v)", level, pgCode(err), err)
		}
	}
	if err := insert(goSkill, 5); err != nil {
		t.Fatalf("допустимый уровень: %v", err)
	}
	if err := insert(goSkill, 3); pgCode(err) != "23505" {
		t.Fatalf("повторная пара кандидат-навык: код %q (%v)", pgCode(err), err)
	}
	if err := insert("00000000-0000-4000-8000-000000000002", nil); err != nil {
		t.Fatalf("NULL в claimed_level допустим (для навыков, созданных тестом или ФСП): %v", err)
	}
	if err := insert("11111111-1111-4111-8111-111111111111", 3); pgCode(err) != "23503" {
		t.Fatalf("неизвестный навык: код %q (%v)", pgCode(err), err)
	}
	// Выключенный навык вставляется: правило активности живёт в коде, чтобы уже добавленные навыки не пропадали.
	var inactive string
	if err := db.QueryRow(ctx, `INSERT INTO skills(code,name,active) VALUES('retired','Устаревший',false) RETURNING id::text`).Scan(&inactive); err != nil {
		t.Fatal(err)
	}
	if err := insert(inactive, 2); err != nil {
		t.Fatalf("выключенный навык: %v", err)
	}
	if _, err := db.Exec(ctx, `DELETE FROM users WHERE id=$1`, user); err != nil {
		t.Fatal(err)
	}
	var left int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM candidate_skills WHERE candidate_id=$1`, profile).Scan(&left); err != nil || left != 0 {
		t.Fatalf("после удаления пользователя осталось навыков: %d (%v)", left, err)
	}
}
