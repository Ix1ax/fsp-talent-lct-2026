//go:build integration

package httpapi

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

func TestCompanyNeeds(t *testing.T) {
	db := companyTestDB(t)
	ctx := context.Background()
	repo := repository.NewRepository(db)
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	e := newAuthEnvWithOptions(t, Options{Companies: service.NewCompanyService(repo), Needs: service.NewNeedsService(repo), Documents: service.NewDocumentService(repo, nil, "", log), Catalogs: catalog.NewService(catalog.NewRepository(db))})
	ids, tokens := map[string]string{}, map[string]string{}
	for _, name := range []string{"owner", "recruiter", "viewer", "other", "candidate", "blocked"} {
		role, status := "employer", "active"
		if name == "candidate" {
			role = "candidate"
		}
		if name == "blocked" {
			status = "blocked"
		}
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES($1,$2) RETURNING id::text`, role, status).Scan(&id); err != nil {
			t.Fatal(err)
		}
		ids[name] = id
		e.store.users[testIssuer+"|"+name] = user.User{ID: id, Role: role, Status: status}
		tokens[name] = e.token(t, name)
	}
	a, err := repo.Create(ctx, ids["owner"], entity.Input{Name: "Компания", ContactEmail: "hr@example.test"})
	if err != nil {
		t.Fatal(err)
	}
	b, err := repo.Create(ctx, ids["other"], entity.Input{Name: "Другая", ContactEmail: "other@example.test"})
	if err != nil {
		t.Fatal(err)
	}
	for _, role := range []string{"recruiter", "viewer"} {
		if _, err := db.Exec(ctx, `INSERT INTO company_members(company_id,user_id,role) VALUES($1,$2,$3)`, a.ID, ids[role], role); err != nil {
			t.Fatal(err)
		}
	}
	request := func(method, path, who, body string, status int) *httptest.ResponseRecorder {
		t.Helper()
		w := e.do(t, method, path, tokens[who], body)
		if w.Code != status {
			t.Fatalf("%s %s (%s): %d %s, ожидали %d", method, path, who, w.Code, w.Body, status)
		}
		return w
	}
	catalog := request("GET", "/api/v1/catalogs", "", "", 200)
	if !strings.Contains(catalog.Body.String(), "backend") || !strings.Contains(catalog.Body.String(), "remote") {
		t.Fatal("пустые справочники")
	}
	skills := request("GET", "/api/v1/catalogs/skills?q=golang", "", "", 200)
	if !strings.Contains(skills.Body.String(), `"code":"go"`) {
		t.Fatal("не ищет по синониму")
	}
	request("GET", "/api/v1/catalogs/skills?limit=101", "", "", 400)
	base := "/api/v1/companies/" + a.ID + "/needs"
	body := `{"specialization_id":1,"grade_id":3,"title":"Go-разработчик","description":"Разработка сервисов и описание команды","salary_from_rub":150000,"salary_to_rub":250000,"city":"Москва","timezone":"Europe/Moscow","status":"active","skills":[{"skill_id":"00000000-0000-4000-8000-000000000001","required":true,"weight":1.25}],"work_format_ids":[3]}`
	request("POST", base, "", body, 401)
	request("POST", base, "candidate", body, 403)
	request("POST", base, "blocked", body, 403)
	request("POST", base, "viewer", body, 403)
	request("POST", base, "other", body, 404)
	request("POST", base, "owner", strings.Replace(body, `"specialization_id":1`, `"specialization_id":99`, 1), 400)
	request("POST", base, "owner", strings.Replace(body, "000000000001", "000000000099", 1), 400)
	request("POST", base, "owner", strings.Replace(body, `"work_format_ids":[3]`, `"work_format_ids":[99]`, 1), 400)
	request("POST", base, "owner", strings.Replace(body, `"salary_to_rub":250000`, `"salary_to_rub":1`, 1), 400)
	request("POST", base, "owner", strings.Replace(body, `"required":true`, `"required":true,"forbidden":1`, 1), 400)
	created := request("POST", base, "recruiter", body, 201)
	var need entity.Need
	if err = json.Unmarshal(created.Body.Bytes(), &need); err != nil {
		t.Fatal(err)
	}
	if need.CreatedBy != ids["recruiter"] || len(need.Skills) != 1 || need.Skills[0].Weight != 1.25 || need.Status != "active" {
		t.Fatalf("неверная потребность: %+v", need)
	}
	path := base + "/" + need.ID
	request("GET", path, "viewer", "", 200)
	request("GET", path, "other", "", 404)
	request("GET", "/api/v1/companies/"+b.ID+"/needs/"+need.ID, "other", "", 404)
	request("PATCH", path, "viewer", `{"title":"Взлом"}`, 403)
	request("PATCH", path, "owner", `{"company_id":"`+b.ID+`"}`, 400)
	request("PATCH", path, "owner", `{"created_by":"`+ids["other"]+`"}`, 400)
	request("PATCH", path, "owner", `{"skills":[{"skill_id":"00000000-0000-4000-8000-000000000099","required":true,"weight":1}]}`, 400)
	unchanged := request("GET", path, "owner", "", 200)
	if !strings.Contains(unchanged.Body.String(), "000000000001") {
		t.Fatal("неудачный PATCH изменил навыки")
	}
	var wg sync.WaitGroup
	errs := make(chan string, 2)
	for _, patch := range []string{`{"title":"Новое название"}`, `{"description":"Новая команда"}`} {
		wg.Add(1)
		go func(patch string) {
			defer wg.Done()
			w := e.do(t, "PATCH", path, tokens["owner"], patch)
			if w.Code != 200 {
				errs <- w.Body.String()
			}
		}(patch)
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Fatal(err)
	}
	merged := request("GET", path, "owner", "", 200)
	if !strings.Contains(merged.Body.String(), "Новое название") || !strings.Contains(merged.Body.String(), "Новая команда") {
		t.Fatal("PATCH потерял изменения")
	}
	request("PATCH", path, "owner", `{"skills":[{"skill_id":"00000000-0000-4000-8000-000000000007","required":false,"weight":2}],"work_format_ids":[1,2],"grade_id":null,"city":null}`, 200)
	updated := request("GET", path, "owner", "", 200)
	if strings.Contains(updated.Body.String(), "000000000001") || !strings.Contains(updated.Body.String(), "000000000007") {
		t.Fatal("навыки не заменились")
	}
	request("GET", base+"?status=wrong", "owner", "", 400)
	request("DELETE", path, "viewer", "", 403)
	request("DELETE", path, "recruiter", "", 204)
	request("DELETE", path, "owner", "", 204)
	active := request("GET", base+"?status=active", "owner", "", 200)
	if strings.Contains(active.Body.String(), need.ID) {
		t.Fatal("архив попал в активный список")
	}
	archived := request("GET", base+"?status=archived", "viewer", "", 200)
	if !strings.Contains(archived.Body.String(), need.ID) {
		t.Fatal("архив удалился физически")
	}
	request("PATCH", path, "owner", `{"status":"active"}`, 200)
	if _, err := db.Exec(ctx, `UPDATE company_members SET status='inactive' WHERE user_id=$1 AND company_id=$2`, ids["recruiter"], a.ID); err != nil {
		t.Fatal(err)
	}
	request("GET", path, "recruiter", "", 404)
	request("PATCH", path, "recruiter", `{"title":"Нет"}`, 404)
}
