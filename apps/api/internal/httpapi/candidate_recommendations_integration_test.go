//go:build integration

package httpapi

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/service"
)

func TestCandidateRecommendations(t *testing.T) {
	f := newOfferFixture(t)
	old := f.auth.store.users
	f.auth = newAuthEnvWithOptions(t, Options{CandidateBank: service.New(repository.New(f.db))})
	f.auth.store.users = old
	for who := range f.tokens {
		f.tokens[who] = f.auth.token(t, who)
	}
	ctx := context.Background()
	var need string
	if err := f.db.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,grade_id,title,description,status,salary_to_rub,city,timezone) VALUES($1,$2,1,3,'Go','Команда','active',200000,'Москва','Europe/Moscow') RETURNING id::text`, f.company, f.ids["owner"]).Scan(&need); err != nil {
		t.Fatal(err)
	}
	f.exec(t, `INSERT INTO need_work_formats(need_id,work_format_id) VALUES($1,3)`, need)
	f.exec(t, `INSERT INTO candidate_work_formats(candidate_id,work_format_id) SELECT id,3 FROM candidate_profiles`)
	f.exec(t, `UPDATE candidate_profiles SET salary_min_rub=180000,city='москва',timezone='Europe/Moscow' WHERE id=$1`, f.profiles["candidate"])
	path := "/api/v1/companies/" + f.company + "/needs/" + need + "/candidates"
	read := func(query string) entity.RecommendationPage {
		t.Helper()
		w := f.request(t, "GET", path+query, "viewer", "", 200)
		var page entity.RecommendationPage
		if err := json.Unmarshal(w.Body.Bytes(), &page); err != nil {
			t.Fatal(err)
		}
		return page
	}
	p := read("")
	if p.Total != 2 || len(p.Items) != 2 || p.NeedID != need || p.MatchingMode != "conditions_only" || len(p.UnassessedCriteria) != 5 {
		t.Fatalf("Неверная подборка: %+v", p)
	}
	if p.Items[0].ID != f.profiles["candidate"] || p.Items[0].MatchedConditions != 4 || len(p.Items[0].Reasons) != 4 {
		t.Fatalf("Объяснение и порядок не соответствуют условиям: %+v", p.Items)
	}
	if p.Items[1].MatchedConditions != 1 || len(p.Items[1].UnknownConditions) != 3 {
		t.Fatal("Неизвестные условия посчитаны совпадениями")
	}
	p = read("?limit=1&offset=1")
	if p.Total != 2 || len(p.Items) != 1 || p.Items[0].ID != f.profiles["other_candidate"] {
		t.Fatal("Пагинация должна применяться после ранжирования")
	}
	p = read("?salary_max_rub=180000")
	if p.Total != 1 {
		t.Fatal("Дополнительный фильтр бюджета должен исключать неизвестную зарплату")
	}
	if p = read("?work_format_ids=1"); p.Total != 0 {
		t.Fatal("Дополнительный формат не должен отменять условия потребности")
	}
	f.exec(t, `UPDATE candidate_profiles SET salary_min_rub=200001 WHERE id=$1`, f.profiles["candidate"])
	if p = read(""); p.Total != 1 || p.Items[0].ID != f.profiles["other_candidate"] {
		t.Fatal("Кандидат выше бюджета попал в подборку")
	}
	f.exec(t, `DELETE FROM candidate_work_formats WHERE candidate_id=$1`, f.profiles["other_candidate"])
	if p = read(""); p.Total != 0 || len(p.Items) != 0 {
		t.Fatal("Без совпадения форматов кандидат не должен попадать в подборку")
	}
	f.request(t, "GET", path, "outsider", "", 404)
	f.request(t, "GET", path, "candidate", "", 403)
	f.request(t, "GET", path, "", "", 401)
	f.request(t, "GET", path+"?limit=0", "owner", "", 400)
	f.request(t, "GET", strings.Replace(path, need, "bad-id", 1), "owner", "", 400)
	for _, status := range []string{"draft", "archived"} {
		f.exec(t, `UPDATE employer_needs SET status=$2 WHERE id=$1`, need, status)
		f.request(t, "GET", path, "owner", "", 404)
	}
	f.exec(t, `UPDATE employer_needs SET status='active',company_id=$2 WHERE id=$1`, need, f.otherCompany)
	f.request(t, "GET", path, "owner", "", 404)
}
