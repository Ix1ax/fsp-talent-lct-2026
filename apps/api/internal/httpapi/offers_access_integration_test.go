//go:build integration

package httpapi

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	companyentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	companyrepository "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
	"github.com/jackc/pgx/v5/pgxpool"
)

type offerFixture struct {
	db                    *pgxpool.Pool
	auth                  *authEnv
	ids, tokens, profiles map[string]string
	company, otherCompany string
}

func newOfferFixture(t *testing.T) *offerFixture {
	t.Helper()
	db := companyTestDB(t)
	ctx := context.Background()
	f := &offerFixture{db: db, auth: newAuthEnvWithOptions(t, Options{Offers: service.New(repository.New(db))}), ids: map[string]string{}, tokens: map[string]string{}, profiles: map[string]string{}}
	for _, name := range []string{"owner", "recruiter", "viewer", "outsider", "candidate", "other_candidate", "no_profile", "blocked"} {
		role := "employer"
		if name == "candidate" || name == "other_candidate" || name == "no_profile" {
			role = "candidate"
		}
		status := "active"
		if name == "blocked" {
			status = "blocked"
		}
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES($1,$2) RETURNING id::text`, role, status).Scan(&id); err != nil {
			t.Fatal(err)
		}
		f.ids[name] = id
		f.auth.store.users[testIssuer+"|"+name] = user.User{ID: id, Role: role, Status: status}
		f.tokens[name] = f.auth.token(t, name)
		if role == "candidate" && name != "no_profile" {
			var profile string
			if err := db.QueryRow(ctx, `INSERT INTO candidate_profiles(user_id,search_status) VALUES($1,'open') RETURNING id::text`, id).Scan(&profile); err != nil {
				t.Fatal(err)
			}
			f.profiles[name] = profile
		}
	}
	r := companyrepository.NewRepository(db)
	for _, item := range []struct {
		owner  string
		target *string
	}{{"owner", &f.company}, {"outsider", &f.otherCompany}} {
		c, err := r.Create(ctx, f.ids[item.owner], companyentity.Input{Name: "Компания", ContactEmail: "hr@example.test"})
		if err != nil {
			t.Fatal(err)
		}
		*item.target = c.ID
	}
	for _, role := range []string{"recruiter", "viewer"} {
		if _, err := db.Exec(ctx, `INSERT INTO company_members(company_id,user_id,role) VALUES($1,$2,$3)`, f.company, f.ids[role], role); err != nil {
			t.Fatal(err)
		}
	}
	return f
}
func (f *offerFixture) base() string { return "/api/v1/companies/" + f.company + "/offers" }
func (f *offerFixture) body() string {
	return `{"candidate_id":"` + f.profiles["candidate"] + `","title":"Go-разработчик","description":"Команда сервисов","salary_from_rub":150000,"salary_to_rub":250000,"contact_email":"hr@example.test"}`
}
func (f *offerFixture) request(t *testing.T, method, path, who, body string, status int) *httptest.ResponseRecorder {
	t.Helper()
	w := f.auth.do(t, method, path, f.tokens[who], body)
	if w.Code != status {
		t.Fatalf("%s %s (%s): %d %s, ожидали %d", method, path, who, w.Code, w.Body, status)
	}
	return w
}
func (f *offerFixture) create(t *testing.T) entity.Offer {
	t.Helper()
	w := f.request(t, "POST", f.base(), "recruiter", f.body(), 201)
	var o entity.Offer
	if err := json.Unmarshal(w.Body.Bytes(), &o); err != nil {
		t.Fatal(err)
	}
	return o
}
func (f *offerFixture) exec(t *testing.T, sql string, args ...any) {
	t.Helper()
	if _, err := f.db.Exec(context.Background(), sql, args...); err != nil {
		t.Fatal(err)
	}
}

func TestOfferPermissions(t *testing.T) {
	f := newOfferFixture(t)
	base, body := f.base(), f.body()
	f.request(t, "POST", base, "viewer", body, 403)
	f.request(t, "POST", base, "outsider", body, 404)
	f.request(t, "POST", base, "blocked", body, 403)
	f.request(t, "GET", base, "candidate", "", 403)
	f.request(t, "GET", "/api/v1/me/offers", "owner", "", 403)
	f.request(t, "GET", "/api/v1/me/offers", "no_profile", "", 404)
	for _, extra := range []string{`"created_by":"` + f.ids["outsider"] + `"`, `"company_id":"` + f.otherCompany + `"`, `"company_name":"Подмена"`, `"status":"accepted"`} {
		f.request(t, "POST", base, "owner", strings.TrimSuffix(body, "}")+","+extra+"}", 400)
	}
	o := f.create(t)
	companyPath := base + "/" + o.ID
	candidatePath := "/api/v1/me/offers/" + o.ID
	for _, who := range []string{"owner", "recruiter", "viewer"} {
		f.request(t, "GET", companyPath, who, "", 200)
		f.request(t, "GET", base, who, "", 200)
	}
	f.request(t, "GET", base, "outsider", "", 404)
	f.request(t, "GET", companyPath, "outsider", "", 404)
	f.request(t, "GET", "/api/v1/companies/"+f.otherCompany+"/offers/"+o.ID, "outsider", "", 404)
	for _, method := range []struct{ verb, suffix, body string }{{"GET", "", ""}, {"POST", "/view", ""}, {"POST", "/respond", `{"status":"accepted"}`}} {
		f.request(t, method.verb, candidatePath+method.suffix, "other_candidate", method.body, 404)
		f.request(t, method.verb, candidatePath+method.suffix, "owner", method.body, 403)
	}
	w := f.request(t, "GET", "/api/v1/me/offers", "other_candidate", "", 200)
	if strings.Contains(w.Body.String(), o.ID) {
		t.Fatal("Чужой кандидат видит предложение в списке")
	}
	for _, path := range []string{base + "?limit=101", base + "?offset=-1", base + "?status=wrong", base + "/bad-uuid"} {
		f.request(t, "GET", path, "owner", "", 400)
	}
	f.request(t, "POST", candidatePath+"/respond", "candidate", `{"status":"accepted","user_id":"`+f.ids["other_candidate"]+`"}`, 400)
	// Переданные контакты относятся к работодателю; данные кандидата нигде не раскрываются.
	for _, who := range []string{"owner", "candidate"} {
		path := companyPath
		if who == "candidate" {
			path = candidatePath
		}
		w := f.request(t, "GET", path, who, "", 200)
		if strings.Contains(w.Body.String(), "candidate@example.test") || strings.Contains(w.Body.String(), `"candidate_contacts"`) || strings.Contains(w.Body.String(), `"phone"`) {
			t.Fatal("Ответ содержит контакты кандидата")
		}
	}
	// Проверяем SQL-защиту независимо от middleware: в тестовой идентичности пользователь ещё активен.
	f.exec(t, `UPDATE company_members SET status='inactive' WHERE company_id=$1 AND user_id=$2`, f.company, f.ids["recruiter"])
	f.request(t, "POST", base, "recruiter", body, 404)
	f.request(t, "GET", base, "recruiter", "", 404)
	f.request(t, "GET", companyPath, "recruiter", "", 404)
	f.exec(t, `UPDATE users SET status='blocked' WHERE id=$1`, f.ids["owner"])
	f.request(t, "GET", companyPath, "owner", "", 404)
	f.request(t, "POST", base, "owner", body, 404)
	f.exec(t, `UPDATE users SET status='active' WHERE id=$1`, f.ids["owner"])
	f.exec(t, `UPDATE users SET status='blocked' WHERE id=$1`, f.ids["candidate"])
	f.request(t, "POST", base, "owner", body, 404)
	f.request(t, "GET", candidatePath, "candidate", "", 404)
	f.request(t, "GET", "/api/v1/me/offers", "candidate", "", 404)
	f.request(t, "POST", candidatePath+"/respond", "candidate", `{"status":"accepted"}`, 404)
}

func TestOfferNeedScope(t *testing.T) {
	f := newOfferFixture(t)
	ctx := context.Background()
	for _, item := range []struct {
		company, status string
		code            int
	}{{f.company, "active", 201}, {f.company, "draft", 400}, {f.company, "archived", 400}, {f.otherCompany, "active", 400}} {
		var id string
		if err := f.db.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,title,description,status) VALUES($1,$2,1,'Потребность','Команда',$3) RETURNING id::text`, item.company, f.ids["owner"], item.status).Scan(&id); err != nil {
			t.Fatal(err)
		}
		body := strings.TrimSuffix(f.body(), "}") + `,"need_id":"` + id + `"}`
		f.request(t, "POST", f.base(), "owner", body, item.code)
	}
	f.request(t, "POST", f.base(), "owner", strings.TrimSuffix(f.body(), "}")+`,"need_id":"00000000-0000-4000-8000-000000000099"}`, 400)
	var count int
	if err := f.db.QueryRow(ctx, `SELECT count(*) FROM candidate_offers`).Scan(&count); err != nil || count != 1 {
		t.Fatalf("Неудачная отправка оставила оффер: %d %v", count, err)
	}
}

func TestOfferConcurrentResponses(t *testing.T) {
	f := newOfferFixture(t)
	for _, scenario := range []struct {
		name     string
		actions  []string
		conflict bool
		final    string
	}{
		{"противоположные ответы", []string{"accepted", "rejected"}, true, ""},
		{"повторное принятие", []string{"accepted", "accepted"}, false, "accepted"},
		{"просмотр и ответ", []string{"viewed", "accepted"}, false, "accepted"},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			o := f.create(t)
			path := "/api/v1/me/offers/" + o.ID
			start := make(chan struct{})
			results := make(chan *httptest.ResponseRecorder, len(scenario.actions))
			var wg sync.WaitGroup
			for _, status := range scenario.actions {
				wg.Add(1)
				go func(status string) {
					defer wg.Done()
					<-start
					suffix, body := "/respond", `{"status":"`+status+`"}`
					if status == "viewed" {
						suffix = "/view"
						body = ""
					}
					results <- f.auth.do(t, "POST", path+suffix, f.tokens["candidate"], body)
				}(status)
			}
			close(start)
			wg.Wait()
			close(results)
			ok, conflicts := 0, 0
			winner := ""
			for w := range results {
				switch w.Code {
				case 200:
					ok++
					var result entity.Offer
					if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
						t.Fatal(err)
					}
					if result.Status == "accepted" || result.Status == "rejected" {
						winner = result.Status
					}
				case 409:
					conflicts++
				default:
					t.Fatalf("Параллельный запрос: %d %s", w.Code, w.Body)
				}
			}
			if scenario.conflict {
				if ok != 1 || conflicts != 1 {
					t.Fatalf("Результаты ответов: успешных %d, конфликтов %d", ok, conflicts)
				}
			} else if ok != 2 || conflicts != 0 {
				t.Fatalf("Результаты повторов: успешных %d, конфликтов %d", ok, conflicts)
			}
			w := f.request(t, "GET", path, "candidate", "", 200)
			var final entity.Offer
			if err := json.Unmarshal(w.Body.Bytes(), &final); err != nil {
				t.Fatal(err)
			}
			if final.Status != winner || (scenario.final != "" && final.Status != scenario.final) || final.ViewedAt == nil || final.RespondedAt == nil || final.RespondedAt.Before(*final.ViewedAt) {
				t.Fatalf("Неверный результат: %+v", final)
			}
			// Поздний просмотр и повтор ответа не возвращают статус назад и не обновляют даты.
			view := f.request(t, "POST", path+"/view", "candidate", "", 200)
			repeat := f.request(t, "POST", path+"/respond", "candidate", `{"status":"`+final.Status+`"}`, 200)
			if w.Body.String() != view.Body.String() || w.Body.String() != repeat.Body.String() {
				t.Fatal("Повтор изменил статус или даты")
			}
			company := f.request(t, "GET", f.base()+"/"+o.ID, "owner", "", 200)
			if company.Body.String() != w.Body.String() {
				t.Fatal("Стороны видят разные результаты")
			}
		})
	}
}
