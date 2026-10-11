package web_test

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type memContacts struct {
	byUser  map[string]entity.Contacts
	consent map[string]bool
}

func (m *memContacts) PutContacts(_ context.Context, userID string, in entity.ContactsInput) (entity.Contacts, error) {
	if !m.consent[userID] {
		return entity.Contacts{}, entity.ErrConsentRequired
	}
	c := entity.Contacts{ContactsInput: in, UpdatedAt: time.Now()}
	m.byUser[userID] = c
	return c, nil
}
func (m *memContacts) Contacts(_ context.Context, userID string) (entity.Contacts, error) {
	if !m.consent[userID] {
		return entity.Contacts{}, entity.ErrConsentRequired
	}
	if c, ok := m.byUser[userID]; ok {
		return c, nil
	}
	return entity.Contacts{}, entity.ErrContactsNotFound
}

func TestCandidateContactsRoutes(t *testing.T) {
	store := &memContacts{byUser: map[string]entity.Contacts{}, consent: map[string]bool{"u-cand1": false, "u-cand2": true}}
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{CandidateContacts: candidateservice.NewContactsService(store)})
	for sub, u := range map[string]user.User{
		"cand1": {ID: "u-cand1", Role: "candidate", Status: "active"},
		"cand2": {ID: "u-cand2", Role: "candidate", Status: "active"},
		"emp":   {ID: "u-emp", Role: "employer", Status: "active"},
	} {
		e.Store.Users[testutil.Issuer+"|"+sub] = u
	}
	do := func(method, sub, body string, status int) *httptest.ResponseRecorder {
		t.Helper()
		token := ""
		if sub != "" {
			token = e.Token(t, sub)
		}
		w := e.Do(t, method, "/api/v1/me/contacts", token, body)
		if w.Code != status {
			t.Fatalf("%s /me/contacts (%s) %s: %d %s, ожидали %d", method, sub, body, w.Code, w.Body, status)
		}
		return w
	}
	const valid = `{"full_name":"Иван Иванов","email":"ivan@example.test","phone":"+7 900 123-45-67","telegram":"@ivan_dev"}`
	do("PUT", "", valid, 401)
	if testutil.ErrorCode(t, do("PUT", "emp", valid, 403)) != "forbidden" {
		t.Fatal("работодатель должен получить forbidden")
	}
	for name, body := range map[string]string{"битый JSON": `{`, "поле user_id": `{"full_name":"Иван","email":"a@b.ru","user_id":"x"}`, "поле updated_at": `{"full_name":"Иван","email":"a@b.ru","updated_at":"2026-01-01T00:00:00Z"}`, "плохой email": `{"full_name":"Иван","email":"не-почта"}`, "нет ФИО": `{"email":"a@b.ru"}`} {
		if w := do("PUT", "cand2", body, 400); testutil.ErrorCode(t, w) != "validation_error" {
			t.Fatalf("%s: %s", name, w.Body)
		}
	}
	if testutil.ErrorCode(t, do("PUT", "cand1", valid, 409)) != "consent_required" || testutil.ErrorCode(t, do("GET", "cand1", ``, 409)) != "consent_required" {
		t.Fatal("без согласия нужен consent_required")
	}
	if testutil.ErrorCode(t, do("GET", "cand2", ``, 404)) != "contacts_not_found" {
		t.Fatal("контактов ещё нет")
	}
	put := do("PUT", "cand2", valid, 200)
	if !strings.Contains(put.Body.String(), `"full_name":"Иван Иванов"`) || !strings.Contains(put.Body.String(), `"telegram":"ivan_dev"`) || !strings.Contains(put.Body.String(), `"updated_at"`) {
		t.Fatalf("PUT: %s", put.Body)
	}
	if got := do("GET", "cand2", ``, 200); !strings.Contains(got.Body.String(), `"email":"ivan@example.test"`) {
		t.Fatalf("GET: %s", got.Body)
	}
}

func TestCandidateContactsUnavailable(t *testing.T) {
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{})
	e.Store.Users[testutil.Issuer+"|cand1"] = user.User{ID: "u-cand1", Role: "candidate", Status: "active"}
	w := e.Do(t, "GET", "/api/v1/me/contacts", e.Token(t, "cand1"), "")
	if w.Code != 503 || testutil.ErrorCode(t, w) != "contacts_unavailable" {
		t.Fatalf("без сервиса ожидали 503 contacts_unavailable: %d %s", w.Code, w.Body)
	}
}
