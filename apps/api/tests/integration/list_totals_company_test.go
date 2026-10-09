//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

// listPage разбирает постраничный ответ и требует, чтобы в нём было поле total.
type listPage struct {
	Items  []json.RawMessage `json:"items"`
	Total  *int64            `json:"total"`
	Limit  int               `json:"limit"`
	Offset int               `json:"offset"`
}

func decodePage(t *testing.T, w *httptest.ResponseRecorder) listPage {
	t.Helper()
	var p listPage
	if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil {
		t.Fatalf("ответ не JSON: %v %s", err, w.Body)
	}
	if p.Total == nil {
		t.Fatalf("в ответе нет поля total: %s", w.Body)
	}
	return p
}

// wantPage проверяет число записей на странице, общее число, limit и offset.
func wantPage(t *testing.T, what string, w *httptest.ResponseRecorder, items int, total int64, limit, offset int) {
	t.Helper()
	p := decodePage(t, w)
	if len(p.Items) != items || *p.Total != total || p.Limit != limit || p.Offset != offset {
		t.Errorf("%s: записей %d, total %d, limit %d, offset %d; ожидали %d, %d, %d, %d (%s)", what, len(p.Items), *p.Total, p.Limit, p.Offset, items, total, limit, offset, w.Body)
	}
}

func TestListTotalsCompanyAndCatalog(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	repo := repository.NewRepository(db)
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{
		Companies: service.NewCompanyService(repo), Needs: service.NewNeedsService(repo), Members: service.NewMemberService(repo),
		Documents: service.NewDocumentService(repo, nil, "", log), Catalogs: catalog.NewService(catalog.NewRepository(db)),
	})
	ids, tokens := map[string]string{}, map[string]string{}
	for _, name := range []string{"owner", "recruiter", "viewer", "other"} {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES('employer','active') RETURNING id::text`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		ids[name] = id
		e.Store.Users[testutil.Issuer+"|"+name] = user.User{ID: id, Role: "employer", Status: "active"}
		tokens[name] = e.Token(t, name)
	}
	get := func(path, who string) *httptest.ResponseRecorder {
		t.Helper()
		w := e.Do(t, "GET", path, tokens[who], "")
		if w.Code != 200 {
			t.Fatalf("GET %s (%s): %d %s", path, who, w.Code, w.Body)
		}
		return w
	}
	post := func(path, who, body string, status int) *httptest.ResponseRecorder {
		t.Helper()
		w := e.Do(t, "POST", path, tokens[who], body)
		if w.Code != status {
			t.Fatalf("POST %s (%s): %d %s", path, who, w.Code, w.Body)
		}
		return w
	}

	// Компании: у владельца три, у другого пользователя одна, чужие не попадают в число.
	var a entity.Company
	for i, name := range []string{"Первая", "Вторая", "Третья"} {
		c, err := repo.Create(ctx, ids["owner"], entity.Input{Name: name, ContactEmail: "hr@example.test"})
		if err != nil {
			t.Fatal(err)
		}
		if i == 0 {
			a = c
		}
	}
	if _, err := repo.Create(ctx, ids["other"], entity.Input{Name: "Чужая", ContactEmail: "other@example.test"}); err != nil {
		t.Fatal(err)
	}
	wantPage(t, "компании", get("/api/v1/companies", "owner"), 3, 3, 20, 0)
	wantPage(t, "компании, limit 2", get("/api/v1/companies?limit=2", "owner"), 2, 3, 2, 0)
	wantPage(t, "компании, offset за пределами", get("/api/v1/companies?offset=10", "owner"), 0, 3, 20, 10)
	wantPage(t, "компании другого пользователя", get("/api/v1/companies", "other"), 1, 1, 20, 0)

	// Участники: владелец и ещё двое; приглашения с разным составом.
	for _, role := range []string{"recruiter", "viewer"} {
		if _, err := db.Exec(ctx, `INSERT INTO company_members(company_id,user_id,role) VALUES($1,$2,$3)`, a.ID, ids[role], role); err != nil {
			t.Fatal(err)
		}
	}
	base := "/api/v1/companies/" + a.ID
	wantPage(t, "участники", get(base+"/members", "owner"), 3, 3, 20, 0)
	wantPage(t, "участники, limit 1", get(base+"/members?limit=1", "owner"), 1, 3, 1, 0)
	wantPage(t, "участники, offset за пределами", get(base+"/members?offset=50", "owner"), 0, 3, 20, 50)
	for _, email := range []string{"one@example.test", "two@example.test", "three@example.test", "four@example.test"} {
		post(base+"/invitations", "owner", `{"email":"`+email+`","role":"viewer"}`, 201)
	}
	wantPage(t, "приглашения", get(base+"/invitations", "owner"), 4, 4, 20, 0)
	wantPage(t, "приглашения, limit 3 offset 3", get(base+"/invitations?limit=3&offset=3", "owner"), 1, 4, 3, 3)

	// Потребности: фильтр по статусу влияет на total.
	need := `{"specialization_id":1,"grade_id":3,"title":"Go-разработчик","description":"Разработка сервисов и описание команды","salary_from_rub":150000,"salary_to_rub":250000,"city":"Москва","timezone":"Europe/Moscow","status":"active","skills":[{"skill_id":"00000000-0000-4000-8000-000000000001","required":true,"weight":1.25}],"work_format_ids":[3]}`
	for i := 0; i < 3; i++ {
		post(base+"/needs", "owner", need, 201)
	}
	for i := 0; i < 2; i++ {
		post(base+"/needs", "owner", strings.Replace(need, `"status":"active"`, `"status":"draft"`, 1), 201)
	}
	wantPage(t, "потребности", get(base+"/needs", "owner"), 5, 5, 20, 0)
	wantPage(t, "активные потребности, limit 1", get(base+"/needs?status=active&limit=1", "owner"), 1, 3, 1, 0)
	wantPage(t, "черновики", get(base+"/needs?status=draft", "owner"), 2, 2, 20, 0)

	// Документы компании: только неудалённые файлы этой компании.
	for i, status := range []string{"ready", "ready", "pending", "deleted"} {
		var fileID string
		if err := db.QueryRow(ctx, `INSERT INTO files(owner_user_id,bucket,object_key,purpose,original_name,media_type,size_bytes,checksum_sha256,status) VALUES($1,'b',$2,'company_document','d.pdf','application/pdf',10,repeat('0',64),$3) RETURNING id::text`,
			ids["owner"], "companies/test-"+string(rune('a'+i)), status).Scan(&fileID); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(ctx, `INSERT INTO company_documents(company_id,file_id) VALUES($1,$2)`, a.ID, fileID); err != nil {
			t.Fatal(err)
		}
	}
	wantPage(t, "документы", get(base+"/files", "owner"), 3, 3, 20, 0)
	wantPage(t, "документы, limit 2", get(base+"/files?limit=2", "owner"), 2, 3, 2, 0)

	// Поиск навыков: total считается по тому же запросу, что и список.
	all := decodePage(t, get("/api/v1/catalogs/skills?limit=1", "owner"))
	if *all.Total < 5 || len(all.Items) != 1 {
		t.Errorf("все навыки: записей %d, total %d", len(all.Items), *all.Total)
	}
	wantPage(t, "навыки по запросу", get("/api/v1/catalogs/skills?q=golang", "owner"), 1, 1, 20, 0)
	wantPage(t, "навыки без совпадений", get("/api/v1/catalogs/skills?q=zzzнетзатакого", "owner"), 0, 0, 20, 0)
}
