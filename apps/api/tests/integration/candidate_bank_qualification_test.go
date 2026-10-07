//go:build integration

package integration

import (
	"context"
	"fmt"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
	bankentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	bankrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
	"testing"
)

func TestCandidateBankQualificationFilters(t *testing.T) {
	f := newOfferFixture(t)
	ctx := context.Background()
	bank := bankrepo.New(f.db)
	spec, grade := pairIDs(t, f.db, "backend", "junior")
	grantConsentRows(t, f.db, f.ids["candidate"], "processing", "publication")
	// Самооценка сама по себе не подтверждает категорию или навык.
	f.exec(t, `INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level) VALUES ($1,$2,2)`, f.profiles["candidate"], goSkill)
	check := func(raw string, want int64) {
		t.Helper()
		filter, err := bankentity.ParseFilter(raw)
		if err != nil {
			t.Fatal(err)
		}
		page, err := bank.List(ctx, f.ids["owner"], f.company, filter)
		if err != nil || page.Total != want {
			t.Fatalf("%s: total=%d, ошибка=%v", raw, page.Total, err)
		}
	}
	category := fmt.Sprintf("specialization_id=%d&grade_id=%d", spec, grade)
	check(category, 0)
	check("skill_id="+goSkill, 0)
	check("skill_id="+goSkill+"&verified_skill_only=true", 0)
	repo := assessmentrepo.New(f.db)
	attempt, err := repo.StartAttempt(ctx, f.ids["candidate"], spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, f.db, repo, f.ids["candidate"], attempt, all)
	if _, err = repo.SubmitAttempt(ctx, f.ids["candidate"], attempt.ID, retakeDays); err != nil {
		t.Fatal(err)
	}
	check(category, 1)
	check(category+"&skill_id="+goSkill+"&verified_skill_only=true", 1)
	check(category+"&limit=1&offset=10", 1)
	check(category+"&experience_min_months=600", 0)
	var need string
	if err := f.db.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,grade_id,title,description,status) VALUES($1,$2,$3,$4,'Go','Команда','active') RETURNING id::text`, f.company, f.ids["owner"], spec, grade).Scan(&need); err != nil {
		t.Fatal(err)
	}
	filter, _ := bankentity.ParseFilter(category + "&skill_id=" + goSkill + "&verified_skill_only=true")
	recommended, err := bank.Recommend(ctx, f.ids["viewer"], f.company, need, filter)
	if err != nil || recommended.Total != 1 || len(recommended.Items) != 1 || recommended.Items[0].ID != f.profiles["candidate"] {
		t.Fatalf("Фильтр подборки: %+v, %v", recommended, err)
	}
	if _, err := bank.Recommend(ctx, f.ids["outsider"], f.company, need, filter); err == nil {
		t.Fatal("Посторонний получил подборку")
	}

	for _, raw := range []string{"specialization_id=32767", "grade_id=32767", "skill_id=00000000-0000-0000-0000-000000000000"} {
		filter, _ := bankentity.ParseFilter(raw)
		if _, err := bank.List(ctx, f.ids["owner"], f.company, filter); err == nil {
			t.Fatalf("Принят неизвестный справочник: %s", raw)
		}
	}
	// Архивированный навык недоступен для нового поиска.
	f.exec(t, `UPDATE skills SET active=false WHERE id=$1`, goSkill)
	filter, _ = bankentity.ParseFilter("skill_id=" + goSkill)
	if _, err := bank.List(ctx, f.ids["owner"], f.company, filter); err == nil {
		t.Fatal("Принят архивированный навык")
	}
}
