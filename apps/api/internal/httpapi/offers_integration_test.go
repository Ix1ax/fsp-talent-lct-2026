//go:build integration

package httpapi

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"

	companyentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	companyrepository "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

func TestOfferFlow(t *testing.T) {
	db := companyTestDB(t)
	ctx := context.Background()
	e := newAuthEnvWithOptions(t, Options{Offers: service.New(repository.New(db))})
	ids, tokens := map[string]string{}, map[string]string{}
	for _, name := range []string{"owner", "candidate", "other"} {
		role := "candidate"
		if name == "owner" {
			role = "employer"
		}
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES($1) RETURNING id::text`, role).Scan(&id); err != nil {
			t.Fatal(err)
		}
		ids[name] = id
		e.store.users[testIssuer+"|"+name] = user.User{ID: id, Role: role, Status: "active"}
		tokens[name] = e.token(t, name)
	}
	var profile string
	if err := db.QueryRow(ctx, `INSERT INTO candidate_profiles(user_id,search_status) VALUES($1,'open') RETURNING id::text`, ids["candidate"]).Scan(&profile); err != nil {
		t.Fatal(err)
	}
	c, err := companyrepository.NewRepository(db).Create(ctx, ids["owner"], companyentity.Input{Name: "Компания", ContactEmail: "hr@example.test"})
	if err != nil {
		t.Fatal(err)
	}
	base := "/api/v1/companies/" + c.ID + "/offers"
	request := func(method, path, who, body string, status int) *httptest.ResponseRecorder {
		t.Helper()
		w := e.do(t, method, path, tokens[who], body)
		if w.Code != status {
			t.Fatalf("%s %s (%s): %d %s, ожидали %d", method, path, who, w.Code, w.Body, status)
		}
		return w
	}
	body := `{"candidate_id":"` + profile + `","title":"Go-разработчик","description":"Разработка сервисов","salary_from_rub":150000,"salary_to_rub":250000,"contact_email":"hr@example.test"}`
	request("POST", base, "", body, 401)
	request("POST", base, "candidate", body, 403)
	request("POST", base, "owner", strings.Replace(body, `"salary_to_rub":250000,`, "", 1), 400)
	created := request("POST", base, "owner", body, 201)
	var offer entity.Offer
	if err := json.Unmarshal(created.Body.Bytes(), &offer); err != nil {
		t.Fatal(err)
	}
	if offer.Status != "sent" || offer.CompanyName != "Компания" || offer.CandidateID != profile || offer.CreatedBy != ids["owner"] || offer.NeedID != nil || offer.ViewedAt != nil {
		t.Fatalf("Неверное предложение: %+v", offer)
	}
	path := base + "/" + offer.ID
	incoming := "/api/v1/me/offers/" + offer.ID
	if created.Header().Get("Location") != path {
		t.Fatal("Некорректный Location")
	}
	request("GET", base, "owner", "", 200)
	request("GET", path, "owner", "", 200)
	request("GET", "/api/v1/me/offers", "candidate", "", 200)
	request("GET", incoming, "candidate", "", 200)
	request("GET", incoming, "other", "", 404)
	if w := request("GET", path, "owner", "", 200); !strings.Contains(w.Body.String(), `"status":"sent"`) {
		t.Fatal("GET изменил статус")
	}
	viewed := request("POST", incoming+"/view", "candidate", "", 200)
	request("POST", incoming+"/view", "candidate", "", 200)
	if !strings.Contains(viewed.Body.String(), `"status":"viewed"`) {
		t.Fatal("Просмотр не отмечен")
	}
	request("POST", incoming+"/respond", "other", `{"status":"accepted"}`, 404)
	request("POST", incoming+"/respond", "candidate", `{"status":"viewed"}`, 400)
	accepted := request("POST", incoming+"/respond", "candidate", `{"status":"accepted"}`, 200)
	repeated := request("POST", incoming+"/respond", "candidate", `{"status":"accepted"}`, 200)
	if accepted.Body.String() != repeated.Body.String() {
		t.Fatal("Повторный ответ изменил предложение")
	}
	request("POST", incoming+"/respond", "candidate", `{"status":"rejected"}`, 409)
	request("POST", incoming+"/view", "candidate", "", 200)
	if w := request("GET", path, "owner", "", 200); !strings.Contains(w.Body.String(), `"status":"accepted"`) {
		t.Fatal("Стороны видят разные статусы")
	}
	if _, err := db.Exec(ctx, `UPDATE companies SET name='Новое название' WHERE id=$1`, c.ID); err != nil {
		t.Fatal(err)
	}
	if w := request("GET", path, "owner", "", 200); !strings.Contains(w.Body.String(), `"company_name":"Компания"`) {
		t.Fatal("Условия старого предложения изменились")
	}
	if w := request("GET", "/api/v1/me/offers?status=sent", "candidate", "", 200); strings.Contains(w.Body.String(), offer.ID) {
		t.Fatal("Фильтр статуса не работает")
	}
	request("GET", base+"?status=bad", "owner", "", 400)
	// Отказ без отдельного просмотра выставляет обе даты и не требует лишнего запроса.
	var second entity.Offer
	w := request("POST", base, "owner", body, 201)
	if err := json.Unmarshal(w.Body.Bytes(), &second); err != nil {
		t.Fatal(err)
	}
	w = request("POST", "/api/v1/me/offers/"+second.ID+"/respond", "candidate", `{"status":"rejected"}`, 200)
	var rejected entity.Offer
	if err := json.Unmarshal(w.Body.Bytes(), &rejected); err != nil {
		t.Fatal(err)
	}
	if rejected.Status != "rejected" || rejected.ViewedAt == nil || rejected.RespondedAt == nil || rejected.RespondedAt.Before(*rejected.ViewedAt) {
		t.Fatal("Неверные даты отказа")
	}
	if _, err := db.Exec(ctx, `UPDATE candidate_profiles SET search_status='hidden' WHERE id=$1`, profile); err != nil {
		t.Fatal(err)
	}
	request("POST", base, "owner", body, 404)
	request("GET", incoming, "candidate", "", 200)
}
