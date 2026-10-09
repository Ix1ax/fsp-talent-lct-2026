package httpapi_test

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

func TestRegistrationFlow(t *testing.T) {
	e := testutil.NewAuthEnv(t)
	token := e.Token(t, "alice")

	if w := e.Do(t, "GET", "/api/v1/me", token, ""); w.Code != 404 || testutil.ErrorCode(t, w) != "not_registered" {
		t.Fatalf("до регистрации ожидали 404 not_registered: %d %s", w.Code, w.Body)
	}
	w := e.Do(t, "POST", "/api/v1/me/register", token, `{"role":"employer"}`)
	if w.Code != 201 {
		t.Fatalf("регистрация: %d %s", w.Code, w.Body)
	}
	var created map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &created)
	if created["role"] != "employer" || created["status"] != "active" || created["email"] != "alice@example.test" || created["id"] == "" {
		t.Fatalf("неверный ответ: %v", created)
	}
	w = e.Do(t, "GET", "/api/v1/me", token, "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"role":"employer"`) {
		t.Fatalf("после регистрации: %d %s", w.Code, w.Body)
	}
	if w := e.Do(t, "POST", "/api/v1/me/register", token, `{"role":"candidate"}`); w.Code != 409 || testutil.ErrorCode(t, w) != "already_registered" {
		t.Fatalf("повторная регистрация: %d %s", w.Code, w.Body)
	}
	if e.Store.Users[testutil.Issuer+"|alice"].Role != "employer" {
		t.Fatal("повторная регистрация изменила роль")
	}
}

func TestRegistrationValidation(t *testing.T) {
	e := testutil.NewAuthEnv(t)
	token := e.Token(t, "bob")
	for name, body := range map[string]string{"admin": `{"role":"admin"}`, "пустая роль": `{"role":""}`, "нет поля": `{}`, "не JSON": `oops`, "чужая роль": `{"role":"root"}`} {
		w := e.Do(t, "POST", "/api/v1/me/register", token, body)
		if w.Code != 400 {
			t.Fatalf("%s: ожидали 400, получили %d %s", name, w.Code, w.Body)
		}
		testutil.ErrorCode(t, w)
	}
	if len(e.Store.Users) != 0 {
		t.Fatal("при ошибке валидации пользователь не должен создаваться")
	}
	if w := e.Do(t, "POST", "/api/v1/me/register", "", `{"role":"candidate"}`); w.Code != 401 {
		t.Fatalf("без токена ожидали 401, получили %d", w.Code)
	}
}

func TestBlockedUser(t *testing.T) {
	e := testutil.NewAuthEnv(t)
	reason := "Нарушение правил платформы"
	date := time.Now().UTC()
	for _, role := range []string{"candidate", "employer"} {
		e.Store.Users[testutil.Issuer+"|eve"] = user.User{ID: "1", Role: role, Status: "blocked", BlockedReason: &reason, BlockedAt: &date}
		token := e.Token(t, "eve")
		w := e.Do(t, "GET", "/api/v1/me", token, "")
		if w.Code != 200 || !strings.Contains(w.Body.String(), reason) || w.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatalf("Причина блокировки: %d %s", w.Code, w.Body)
		}
		for _, route := range e.Router.Routes() {
			if !strings.HasPrefix(route.Path, "/api/v1/me") || route.Path == "/api/v1/me/register" || route.Path == "/api/v1/me" {
				continue
			}
			w = e.Do(t, route.Method, route.Path, token, `{}`)
			if w.Code != 403 || testutil.ErrorCode(t, w) != "user_inactive" || !strings.Contains(w.Body.String(), reason) {
				t.Fatalf("Обход блокировки: %s %s %d %s", route.Method, route.Path, w.Code, w.Body)
			}
		}
		w = e.Do(t, "POST", "/api/v1/me/register", token, `{"role":"candidate"}`)
		if w.Code != 409 {
			t.Fatalf("Повторная регистрация: %d %s", w.Code, w.Body)
		}
	}
	e.Store.Users[testutil.Issuer+"|eve"] = user.User{ID: "1", Role: "candidate", Status: "deleted"}
	w := e.Do(t, "GET", "/api/v1/me", e.Token(t, "eve"), "")
	if w.Code != 403 || testutil.ErrorCode(t, w) != "user_inactive" {
		t.Fatalf("Удалённый аккаунт: %d %s", w.Code, w.Body)
	}
}

func TestCompanyBlockCoversEveryCompanyRoute(t *testing.T) {
	e := testutil.NewAuthEnv(t)
	id := "a0000000-0000-4000-8000-000000000001"
	reason := "Нарушение правил компании"
	e.Store.Users[testutil.Issuer+"|owner"] = user.User{ID: "1", Role: "employer", Status: "active", BlockedCompanies: []user.CompanyBlock{{ID: id, Name: "Компания", Reason: reason, BlockedAt: time.Now().UTC()}}}
	token := e.Token(t, "owner")
	checked := 0
	for _, route := range e.Router.Routes() {
		if !strings.HasPrefix(route.Path, "/api/v1/companies/:company_id") || route.Method == "GET" && route.Path == "/api/v1/companies/:company_id" {
			continue
		}
		path := strings.ReplaceAll(route.Path, ":company_id", id)
		w := e.Do(t, route.Method, path, token, `{}`)
		if w.Code != 403 || testutil.ErrorCode(t, w) != "company_blocked" || !strings.Contains(w.Body.String(), reason) {
			t.Fatalf("Обход блокировки компании: %s %s %d %s", route.Method, path, w.Code, w.Body)
		}
		checked++
	}
	if checked < 25 {
		t.Fatalf("Проверено слишком мало маршрутов: %d", checked)
	}
	wUpper := e.Do(t, "GET", "/api/v1/companies/"+strings.ToUpper(id)+"/tasks", token, "")
	if wUpper.Code != 403 || testutil.ErrorCode(t, wUpper) != "company_blocked" {
		t.Fatal("Регистр UUID обошёл блокировку", wUpper.Body)
	}
	w := e.Do(t, "GET", "/api/v1/me", token, "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), reason) {
		t.Fatalf("Статус компании в профиле: %d %s", w.Code, w.Body)
	}
}
