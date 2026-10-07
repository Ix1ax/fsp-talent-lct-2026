//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
)

func TestFullProfileCareer(t *testing.T) {
	db := testDB(t)
	repo := candidaterepo.NewRepository(db)
	full := candidateservice.NewFullProfileService(repo, "v1")
	ctx := context.Background()
	user, stranger := careerUser(t, db, "candidate", "active", true), careerUser(t, db, "candidate", "active", true)

	// Без записей: пустые массивы и null вместо оценки.
	empty, err := full.Get(ctx, user)
	if err != nil || empty.Experience == nil || empty.Education == nil || len(empty.Experience) != 0 || empty.ExperienceEstimatedMonths != nil {
		t.Fatalf("без записей: %+v (%v)", empty, err)
	}
	raw, _ := json.Marshal(empty)
	for _, want := range []string{`"experience":[]`, `"education":[]`, `"experience_estimated_months":null`} {
		if !strings.Contains(string(raw), want) {
			t.Fatalf("в ответе нет %s: %s", want, raw)
		}
	}

	for _, in := range []struct{ company, from, to string }{{"Старая", "2020-01", "2020-12"}, {"Пересечение", "2020-07", "2021-06"}, {"Текущая", "2026-08", ""}} {
		if _, err := repo.CreateExperience(ctx, user, exp(t, in.company, in.from, in.to)); err != nil {
			t.Fatal(err)
		}
	}
	for _, in := range []struct {
		name string
		year int
	}{{"Колледж", 2024}, {"Университет", 2027}} {
		if _, err := repo.CreateEducation(ctx, user, edu(in.name, in.year)); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := repo.CreateExperience(ctx, stranger, exp(t, "Чужая", "2010-01", "2019-12")); err != nil {
		t.Fatal(err)
	}

	got, err := full.Get(ctx, user)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Experience) != 3 || got.Experience[0].Company != "Текущая" || got.Experience[1].Company != "Пересечение" || got.Experience[2].Company != "Старая" {
		t.Fatalf("порядок опыта: %+v", got.Experience)
	}
	if len(got.Education) != 2 || got.Education[0].Institution != "Университет" {
		t.Fatalf("порядок образования: %+v", got.Education)
	}
	// 2020-01..2021-06 это 18 месяцев (пересечение не считается дважды) плюс текущая работа с 2026-08 до сегодняшнего месяца.
	if got.ExperienceEstimatedMonths == nil || *got.ExperienceEstimatedMonths < 18+1 {
		t.Fatalf("оценка стажа: %v", got.ExperienceEstimatedMonths)
	}
	for _, e := range got.Experience {
		if e.Company == "Чужая" {
			t.Fatal("чужая запись попала в профиль")
		}
	}

	// Без профиля: пустые массивы, не nil.
	noProfile := careerUser(t, db, "candidate", "active", false)
	none, err := full.Get(ctx, noProfile)
	if err != nil || none.Profile != nil || none.Experience == nil || none.Education == nil || none.ExperienceEstimatedMonths != nil {
		t.Fatalf("без профиля: %+v (%v)", none, err)
	}
}
