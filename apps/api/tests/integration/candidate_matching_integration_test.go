//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
)

func TestCandidateMatchingSkillsCategoryAndPrivacy(t *testing.T) {
	f := newOfferFixture(t)
	ctx := context.Background()
	repo := repository.New(f.db)
	spec, grade := pairIDs(t, f.db, "backend", "junior")
	var need string
	if err := f.db.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,grade_id,title,description,status,salary_to_rub) VALUES($1,$2,$3,$4,'Go','Команда','active',200000) RETURNING id::text`, f.company, f.ids["owner"], spec, grade).Scan(&need); err != nil {
		t.Fatal(err)
	}
	f.exec(t, `INSERT INTO need_skills(need_id,skill_id,required,weight) VALUES($1,$2,true,1)`, need, goSkill)
	read := func(filter entity.Filter, want int64) entity.RecommendationPage {
		t.Helper()
		if filter.Limit == 0 {
			filter.Limit = 20
		}
		p, err := repo.Recommend(ctx, f.ids["owner"], f.company, need, filter)
		if err != nil || p.Total != want {
			t.Fatalf("Подборка: %+v, %v", p, err)
		}
		return p
	}
	read(entity.Filter{}, 0)
	// Достаточно публичного профиля и согласий: категория может быть ещё не подтверждена.
	grantConsentRows(t, f.db, f.ids["other_candidate"], "processing", "publication")
	f.exec(t, `INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level) VALUES($1,$2,3)`, f.profiles["other_candidate"], goSkill)
	attempts := assessmentrepo.New(f.db)
	active, err := attempts.StartAttempt(ctx, f.ids["other_candidate"], spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	_ = active
	confirmBankCandidate(t, f, "candidate")
	p := read(entity.Filter{}, 2)
	if p.Items[0].ID != f.profiles["candidate"] || p.Items[1].Category != nil || p.Items[1].DeclaredCategory == nil || p.Items[1].GradeStatus != "unconfirmed" || p.Items[1].TestScorePercent != nil {
		t.Fatalf("Подтверждение и самооценка смешаны: %+v", p)
	}
	read(entity.Filter{GradeStatus: "confirmed"}, 1)
	read(entity.Filter{GradeStatus: "unconfirmed"}, 1)
	// При одинаковом сходстве подтверждение поднимает приоритет.
	f.exec(t, `DELETE FROM skill_evidence WHERE candidate_id=$1 AND skill_id=$2`, f.profiles["candidate"], goSkill)
	f.exec(t, `UPDATE candidate_skills SET claimed_level=3 WHERE candidate_id=$1 AND skill_id=$2`, f.profiles["candidate"], goSkill)
	p = read(entity.Filter{}, 2)
	if p.Items[0].MatchScore != p.Items[1].MatchScore || p.Items[0].GradeStatus != "confirmed" {
		t.Fatal("При равном сходстве не учтено подтверждение")
	}
	// Подтверждённая категория имеет основной приоритет даже при меньшем сходстве.
	f.exec(t, `UPDATE candidate_profiles SET salary_min_rub=300000 WHERE id=$1`, f.profiles["candidate"])
	f.exec(t, `UPDATE candidate_profiles SET salary_min_rub=150000 WHERE id=$1`, f.profiles["other_candidate"])
	p = read(entity.Filter{}, 2)
	if p.Items[0].ID != f.profiles["candidate"] || p.Items[0].MatchScore >= p.Items[1].MatchScore {
		t.Fatal("Не сохранён основной приоритет подтверждённой категории")
	}
	if len(p.Items[0].MismatchedConditions) == 0 {
		t.Fatal("Не объяснено несовпадение бюджета")
	}
	read(entity.Filter{SalaryMaxRUB: int64Pointer(200000)}, 1)
	// Недостающий обязательный навык снижает оценку, но не удаляет профиль.
	f.exec(t, `DELETE FROM candidate_skills WHERE candidate_id=$1 AND skill_id=$2`, f.profiles["candidate"], goSkill)
	p = read(entity.Filter{}, 2)
	if len(p.Items[0].MissingRequiredSkills) != 1 {
		t.Fatal("Не отмечен недостающий обязательный навык")
	}
	strict := goSkill
	read(entity.Filter{SkillID: &strict}, 1)
	// Категория и отсутствие теста доступны также в обычном банке и карточке.
	bank, err := repo.List(ctx, f.ids["owner"], f.company, entity.Filter{Limit: 20})
	if err != nil || bank.Total != 2 || bank.Items[0].GradeStatus != "confirmed" {
		t.Fatalf("Банк: %+v, %v", bank, err)
	}
	card, err := repo.Get(ctx, f.ids["owner"], f.company, f.profiles["other_candidate"])
	if err != nil || card.Category != nil || card.GradeStatus != "unconfirmed" {
		t.Fatalf("Карточка: %+v, %v", card, err)
	}
	page := read(entity.Filter{Limit: 1, Offset: 1}, 2)
	if len(page.Items) != 1 || page.Items[0].ID != f.profiles["other_candidate"] {
		t.Fatal("Неверная пагинация рейтинга")
	}
	f.exec(t, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1 AND kind='publication'`, f.ids["other_candidate"])
	read(entity.Filter{}, 1)
	if _, err := repo.Get(ctx, f.ids["owner"], f.company, f.profiles["other_candidate"]); err == nil {
		t.Fatal("Карточка доступна после отзыва согласия")
	}
	f.exec(t, `UPDATE employer_needs SET grade_id=NULL WHERE id=$1`, need)
	p = read(entity.Filter{}, 1)
	if !strings.Contains(strings.Join(p.Items[0].Reasons, " "), "Грейд потребностью не ограничен") {
		t.Fatal("Не объяснено отсутствие ограничения грейда")
	}
	body, _ := json.Marshal(p)
	for _, secret := range []string{"user_id", "grading_snapshot", "prompt_snapshot", "email", "phone", "answer"} {
		if strings.Contains(string(body), secret) {
			t.Fatalf("Лишние данные: %s", body)
		}
	}
}

func int64Pointer(n int64) *int64 { return &n }
