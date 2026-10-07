//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
	"strings"
	"testing"
)

func TestCandidateMatchingSkillsCategoryAndPrivacy(t *testing.T) {
	f := newOfferFixture(t)
	ctx := context.Background()
	repo := repository.New(f.db)
	spec, grade := pairIDs(t, f.db, "backend", "junior")
	var need string
	if err := f.db.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,grade_id,title,description,status) VALUES($1,$2,$3,$4,'Go','Команда','active') RETURNING id::text`, f.company, f.ids["owner"], spec, grade).Scan(&need); err != nil {
		t.Fatal(err)
	}
	f.exec(t, `INSERT INTO need_skills(need_id,skill_id,required,weight) VALUES($1,$2,true,1)`, need, goSkill)
	read := func(want int64) entity.RecommendationPage {
		t.Helper()
		p, err := repo.Recommend(ctx, f.ids["owner"], f.company, need, entity.Filter{Limit: 20})
		if err != nil || p.Total != want || int64(len(p.Items)) != want {
			t.Fatalf("Подборка: %+v, %v", p, err)
		}
		return p
	}
	// Публичный профиль и самооценка не заменяют успешный тест.
	read(0)
	confirmBankCandidate(t, f, "candidate")
	p := read(1)
	if p.Items[0].SkillMatchScore == nil || *p.Items[0].SkillMatchScore != 100 || p.Items[0].Skills[0].Source != "test" {
		t.Fatalf("Подтверждённый стек: %+v", p)
	}
	confirmBankCandidate(t, f, "other_candidate")
	// Синтетический успешный результат для проверки второго ключа сортировки.
	var lowerResult string
	if err := f.db.QueryRow(ctx, `INSERT INTO assessment_attempts(candidate_id,template_id,specialization_id,grade_id,status,started_at,deadline_at,finished_at,time_limit_sec,pass_score,score_percent)
 SELECT candidate_id,template_id,specialization_id,grade_id,'passed',started_at,deadline_at,finished_at,time_limit_sec,pass_score,90
 FROM assessment_attempts WHERE id=(SELECT attempt_id FROM candidate_categories WHERE candidate_id=$1) RETURNING id::text`, f.profiles["other_candidate"]).Scan(&lowerResult); err != nil {
		t.Fatal(err)
	}
	f.exec(t, `UPDATE candidate_categories SET attempt_id=$2 WHERE candidate_id=$1`, f.profiles["other_candidate"], lowerResult)
	p = read(2)
	if p.Items[0].ID != f.profiles["candidate"] || p.Items[1].TestScorePercent != 90 {
		t.Fatalf("Ранжирование по тесту: %+v", p)
	}

	// Категория сохраняется, но конкретный навык у второго кандидата теперь только заявленный.
	f.exec(t, `DELETE FROM skill_evidence WHERE candidate_id=$1 AND skill_id=$2`, f.profiles["other_candidate"], goSkill)
	f.exec(t, `UPDATE candidate_skills SET claimed_level=3 WHERE candidate_id=$1 AND skill_id=$2`, f.profiles["other_candidate"], goSkill)
	p = read(2)
	if p.Items[0].ID != f.profiles["candidate"] || *p.Items[1].SkillMatchScore != 50 || p.Items[1].Skills[0].Source != "claimed" || p.Items[1].Skills[0].VerifiedLevel != nil {
		t.Fatalf("Самооценка приравнена к тесту: %+v", p)
	}
	// Пагинация идёт после ранжирования; total сохраняется.
	page, err := repo.Recommend(ctx, f.ids["owner"], f.company, need, entity.Filter{Limit: 1, Offset: 1})
	if err != nil || page.Total != 2 || len(page.Items) != 1 || page.Items[0].ID != f.profiles["other_candidate"] {
		t.Fatalf("Пагинация: %+v, %v", page, err)
	}
	var optional string
	if err := f.db.QueryRow(ctx, `INSERT INTO skills(code,name,moderation_status) VALUES('matching_optional','Дополнительный навык','approved') RETURNING id::text`).Scan(&optional); err != nil {
		t.Fatal(err)
	}
	f.exec(t, `INSERT INTO need_skills(need_id,skill_id,required,weight) VALUES($1,$2,false,3)`, need, optional)
	p = read(2)
	if *p.Items[0].SkillMatchScore != 25 || *p.Items[1].SkillMatchScore != 12.5 || len(p.Items[0].UnknownConditions) != 5 {
		t.Fatalf("Веса или неизвестные навыки: %+v", p)
	}
	f.exec(t, `DELETE FROM candidate_skills WHERE candidate_id=$1 AND skill_id=$2`, f.profiles["other_candidate"], goSkill)
	read(1)
	f.exec(t, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1 AND kind='publication'`, f.ids["candidate"])
	read(0)
	bankPage, err := repo.List(ctx, f.ids["owner"], f.company, entity.Filter{Limit: 20})
	if err != nil || bankPage.Total != 1 {
		t.Fatalf("Банк после отзыва согласия: %+v, %v", bankPage, err)
	}
	if _, err := repo.Get(ctx, f.ids["owner"], f.company, f.profiles["candidate"]); err == nil {
		t.Fatal("Карточка доступна после отзыва согласия")
	}
	grantConsentRows(t, f.db, f.ids["candidate"], "publication")
	f.exec(t, `UPDATE employer_needs SET specialization_id=(SELECT id FROM specializations WHERE code='frontend') WHERE id=$1`, need)
	read(0)
	f.exec(t, `UPDATE employer_needs SET specialization_id=$2,grade_id=(SELECT id FROM grades WHERE code='middle') WHERE id=$1`, need, spec)
	read(0)
	f.exec(t, `UPDATE employer_needs SET grade_id=$2 WHERE id=$1`, need, grade)
	p = read(1)
	// Грейд в потребности необязателен: NULL не должен превращаться в 500.
	f.exec(t, `UPDATE employer_needs SET grade_id=NULL WHERE id=$1`, need)
	p = read(1)
	explanation := strings.Join(p.Items[0].Reasons, " ")
	if !strings.Contains(explanation, "грейд потребностью не ограничен") {
		t.Fatal("Не объяснено отсутствие ограничения грейда")
	}
	if strings.Contains(explanation, "Совпадают специализация и подтверждённый грейд") {
		t.Fatal("Заявлено совпадение неуказанного грейда")
	}
	body, _ := json.Marshal(p)
	for _, secret := range []string{"user_id", "grading_snapshot", "prompt_snapshot", "email", "phone", "answer"} {
		if strings.Contains(string(body), secret) {
			t.Fatalf("Лишние данные в подборке: %s", body)
		}
	}
}
