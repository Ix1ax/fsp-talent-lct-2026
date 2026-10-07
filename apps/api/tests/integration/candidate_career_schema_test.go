//go:build integration

package integration

import (
	"context"
	"strings"
	"testing"
)

func TestCareerSchemaConstraints(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	var user, profile string
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1) RETURNING id::text`, user).Scan(&profile); err != nil {
		t.Fatal(err)
	}
	experience := func(company string, started, ended any, description string) error {
		_, err := db.Exec(ctx, `INSERT INTO candidate_experiences(candidate_id,company,position,started_on,ended_on,description) VALUES($1,$2,'Разработчик',$3,$4,$5)`, profile, company, started, ended, description)
		return err
	}
	education := func(level string, year int) error {
		_, err := db.Exec(ctx, `INSERT INTO candidate_education(candidate_id,level,institution,graduation_year) VALUES($1,$2,'Университет',$3)`, profile, level, year)
		return err
	}

	if err := experience("Компания", "2022-11-01", nil, ""); err != nil {
		t.Fatalf("текущая работа: %v", err)
	}
	if err := experience("Компания", "2020-01-01", "2021-06-01", "Описание"); err != nil {
		t.Fatalf("законченная работа: %v", err)
	}
	for name, err := range map[string]error{
		"конец раньше начала":   experience("К", "2022-05-01", "2022-04-01", ""),
		"не первое число":       experience("К", "2022-05-15", nil, ""),
		"не первое число конца": experience("К", "2022-05-01", "2022-06-10", ""),
		"пустая компания":       experience("", "2022-05-01", nil, ""),
		"длинная компания":      experience(strings.Repeat("я", 201), "2022-05-01", nil, ""),
		"длинное описание":      experience("К", "2022-05-01", nil, strings.Repeat("я", 2001)),
		"неизвестный уровень":   education("bogus", 2020),
		"год раньше 1950":       education("higher", 1949),
		"год позже 2100":        education("higher", 2101),
	} {
		if pgCode(err) != "23514" {
			t.Errorf("%s: %v", name, err)
		}
	}
	for _, level := range []string{"secondary", "vocational", "incomplete_higher", "higher", "bachelor", "master", "phd", "doctor"} {
		if err := education(level, 2020); err != nil {
			t.Fatalf("уровень %s: %v", level, err)
		}
	}

	if _, err := db.Exec(ctx, `DELETE FROM candidate_profiles WHERE id=$1`, profile); err != nil {
		t.Fatal(err)
	}
	var left int
	if err := db.QueryRow(ctx, `SELECT (SELECT count(*) FROM candidate_experiences)+(SELECT count(*) FROM candidate_education)`).Scan(&left); err != nil || left != 0 {
		t.Fatalf("после удаления профиля осталось %d строк (%v)", left, err)
	}
}
