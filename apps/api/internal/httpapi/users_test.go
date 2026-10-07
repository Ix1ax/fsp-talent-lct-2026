package httpapi_test

import (
	"encoding/json"
	"strings"
	"testing"

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
	e.Store.Users[testutil.Issuer+"|eve"] = user.User{ID: "1", Role: "candidate", Status: "blocked"}
	w := e.Do(t, "GET", "/api/v1/me", e.Token(t, "eve"), "")
	if w.Code != 403 || testutil.ErrorCode(t, w) != "user_inactive" {
		t.Fatalf("заблокированный пользователь: %d %s", w.Code, w.Body)
	}
}
