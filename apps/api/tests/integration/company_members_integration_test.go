//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

func TestCompanyMembers(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	repo := repository.NewRepository(db)
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Companies: service.NewCompanyService(repo), Members: service.NewMemberService(repo), Needs: service.NewNeedsService(repo), Documents: service.NewDocumentService(repo, nil, "", log)})
	ids, tokens := map[string]string{}, map[string]string{}
	for _, name := range []string{"owner", "staff", "viewer", "other", "candidate", "blocked"} {
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
		e.Store.Users[testutil.Issuer+"|"+name] = user.User{ID: id, Role: role, Status: status}
		tokens[name] = e.Token(t, name)
	}
	a, err := repo.Create(ctx, ids["owner"], entity.Input{Name: "Компания", ContactEmail: "owner@example.test"})
	if err != nil {
		t.Fatal(err)
	}
	b, err := repo.Create(ctx, ids["other"], entity.Input{Name: "Другая", ContactEmail: "other@example.test"})
	if err != nil {
		t.Fatal(err)
	}
	request := func(method, path, who, body string, status int) *httptest.ResponseRecorder {
		t.Helper()
		w := e.Do(t, method, path, tokens[who], body)
		if w.Code != status {
			t.Fatalf("%s %s (%s): %d %s, ожидали %d", method, path, who, w.Code, w.Body, status)
		}
		return w
	}
	base := "/api/v1/companies/" + a.ID
	invite := func(email, role string) entity.Invitation {
		t.Helper()
		w := request("POST", base+"/invitations", "owner", `{"email":"`+email+`","role":"`+role+`"}`, 201)
		var i entity.Invitation
		if err := json.Unmarshal(w.Body.Bytes(), &i); err != nil {
			t.Fatal(err)
		}
		if len(i.Token) != 64 || w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("Токен не выдан безопасным ответом")
		}
		return i
	}
	accept := func(i entity.Invitation, who string, status int) *httptest.ResponseRecorder {
		return request("POST", "/api/v1/company-invitations/accept", who, `{"token":"`+i.Token+`"}`, status)
	}
	request("GET", base+"/members", "", "", 401)
	request("GET", base+"/members", "candidate", "", 403)
	request("GET", base+"/members", "blocked", "", 403)
	request("GET", base+"/members", "other", "", 404)
	request("GET", base+"/members?limit=101", "owner", "", 400)
	request("POST", base+"/invitations", "owner", `{"email":"bad","role":"viewer"}`, 400)
	request("POST", base+"/invitations", "owner", `{"email":"staff@example.test","role":"owner"}`, 400)
	i := invite(" STAFF@example.test ", "recruiter")
	var hash string
	if err = db.QueryRow(ctx, `SELECT token_hash FROM company_invitations WHERE id=$1`, i.ID).Scan(&hash); err != nil {
		t.Fatal(err)
	}
	if hash == i.Token {
		t.Fatal("В БД сохранён исходный токен")
	}
	request("POST", base+"/invitations", "owner", `{"email":"staff@example.test","role":"viewer"}`, 409)
	listed := request("GET", base+"/invitations", "owner", "", 200)
	if strings.Contains(listed.Body.String(), i.Token) || strings.Contains(listed.Body.String(), hash) {
		t.Fatal("Список раскрывает токен")
	}
	accept(i, "other", 400)
	accept(i, "candidate", 403)
	accept(i, "blocked", 403)
	// Повторные и параллельные запросы не создают дубли и не меняют роль.
	var wg sync.WaitGroup
	results := make(chan *httptest.ResponseRecorder, 2)
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			results <- e.Do(t, "POST", "/api/v1/company-invitations/accept", tokens["staff"], `{"token":"`+i.Token+`"}`)
		}()
	}
	wg.Wait()
	close(results)
	for w := range results {
		if w.Code != 200 {
			t.Fatalf("Параллельное принятие: %d %s", w.Code, w.Body)
		}
	}
	var count int
	if err = db.QueryRow(ctx, `SELECT count(*) FROM company_members WHERE company_id=$1 AND user_id=$2`, a.ID, ids["staff"]).Scan(&count); err != nil || count != 1 {
		t.Fatalf("Дубли участников: %d %v", count, err)
	}
	request("GET", base+"/members", "staff", "", 200)
	request("GET", base+"/invitations", "staff", "", 403)
	request("POST", base+"/invitations", "staff", `{"email":"viewer@example.test","role":"viewer"}`, 403)
	request("PATCH", base, "staff", `{"name":"Взлом"}`, 403)
	request("DELETE", base+"/files/00000000-0000-4000-8000-000000000099", "staff", "", 403)
	request("GET", "/api/v1/companies/"+b.ID, "staff", "", 404)
	request("GET", base+"/files", "staff", "", 200)
	request("PATCH", base+"/members/"+ids["owner"], "owner", `{"role":"viewer"}`, 403)
	request("DELETE", base+"/members/"+ids["owner"], "owner", "", 403)
	request("PATCH", base+"/members/"+ids["staff"], "staff", `{"role":"viewer"}`, 403)
	request("PATCH", base+"/members/"+ids["staff"], "owner", `{"role":"admin"}`, 400)
	request("PATCH", base+"/members/"+ids["staff"], "owner", `{"role":"viewer"}`, 200)
	need := `{"specialization_id":1,"title":"Разработчик","description":"Команда","status":"draft"}`
	request("POST", base+"/needs", "staff", need, 403)
	request("PATCH", base+"/members/"+ids["staff"], "owner", `{"role":"recruiter"}`, 200)
	request("POST", base+"/needs", "staff", need, 201)
	request("DELETE", base+"/members/"+ids["staff"], "owner", "", 204)
	request("DELETE", base+"/members/"+ids["staff"], "owner", "", 204)
	request("GET", base, "staff", "", 404)
	request("GET", base+"/members", "staff", "", 404)
	request("GET", base+"/files", "staff", "", 404)
	request("GET", base+"/needs", "staff", "", 404)
	accept(i, "staff", 400)
	request("PATCH", base+"/members/"+ids["staff"], "owner", `{"role":"viewer"}`, 400)
	newInvite := invite("staff@example.test", "viewer")
	accept(newInvite, "staff", 200)
	request("GET", base, "staff", "", 200)
	// Принятие нового приглашения активным участником не повышает его роль.
	duplicate := invite("staff@example.test", "recruiter")
	accept(duplicate, "staff", 409)
	request("DELETE", base+"/invitations/"+duplicate.ID, "owner", "", 204)
	accept(duplicate, "staff", 400)
	v := invite("viewer@example.test", "viewer")
	request("DELETE", "/api/v1/companies/"+b.ID+"/invitations/"+v.ID, "other", "", 404)
	if _, err = db.Exec(ctx, `UPDATE company_invitations SET created_at=now()-interval '8 days',expires_at=now()-interval '1 day' WHERE id=$1`, v.ID); err != nil {
		t.Fatal(err)
	}
	accept(v, "viewer", 400)
	if w := request("GET", base+"/invitations", "owner", "", 200); !strings.Contains(w.Body.String(), `"expired"`) {
		t.Fatal("Срок приглашения не отражён")
	}
	v = invite("viewer@example.test", "viewer")
	request("DELETE", base+"/invitations/"+v.ID, "owner", "", 204)
	accept(v, "viewer", 400)
	request("DELETE", base+"/invitations/"+i.ID, "owner", "", 409)
	request("GET", base+"/members/not-a-uuid", "owner", "", 404)
	request("PATCH", base+"/members/not-a-uuid", "owner", `{"role":"viewer"}`, 400)
}
