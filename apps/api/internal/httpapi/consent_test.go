package httpapi

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
	consentservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

const knownCompany = "0b7d3b1e-8f3a-4c58-9d3e-5a1f2c3d4e5f"

type memConsents struct{ byUser map[string][]entity.Consent }

func (m *memConsents) List(_ context.Context, userID string) ([]entity.Consent, error) {
	return append([]entity.Consent{}, m.byUser[userID]...), nil
}
func (m *memConsents) Grant(_ context.Context, userID string, in entity.GrantInput) (entity.Consent, error) {
	for _, c := range m.byUser[userID] {
		if c.RevokedAt == nil && c.Kind == in.Kind && (c.CompanyID == nil) == (in.CompanyID == nil) && (in.CompanyID == nil || *c.CompanyID == *in.CompanyID) {
			return entity.Consent{}, entity.ErrConsentExists
		}
	}
	if in.CompanyID != nil && *in.CompanyID != knownCompany {
		return entity.Consent{}, entity.ErrCompanyNotFound
	}
	c := entity.Consent{ID: "consent-" + in.Kind, Kind: in.Kind, PolicyVersion: in.PolicyVersion, CompanyID: in.CompanyID, GrantedAt: time.Now()}
	m.byUser[userID] = append(m.byUser[userID], c)
	return c, nil
}
func (m *memConsents) Revoke(_ context.Context, userID, kind string, companyID *string) error {
	for i, c := range m.byUser[userID] {
		if c.RevokedAt == nil && c.Kind == kind && (c.CompanyID == nil) == (companyID == nil) {
			now := time.Now()
			m.byUser[userID][i].RevokedAt = &now
			return nil
		}
	}
	return entity.ErrNotFound
}

func consentEnv(t *testing.T) *authEnv {
	t.Helper()
	svc := consentservice.NewService(&memConsents{byUser: map[string][]entity.Consent{}}, "v1")
	e := newAuthEnvWithOptions(t, Options{Consents: svc})
	for sub, u := range map[string]user.User{
		"cand":  {ID: "u-cand", Role: "candidate", Status: "active"},
		"emp":   {ID: "u-emp", Role: "employer", Status: "active"},
		"block": {ID: "u-block", Role: "candidate", Status: "blocked"},
	} {
		e.store.users[testIssuer+"|"+sub] = u
	}
	return e
}

func TestConsentRoutes(t *testing.T) {
	e := consentEnv(t)
	do := func(method, path, sub, body string, status int) *httptest.ResponseRecorder {
		t.Helper()
		token := ""
		if sub != "" {
			token = e.token(t, sub)
		}
		w := e.do(t, method, path, token, body)
		if w.Code != status {
			t.Fatalf("%s %s (%s) %s: %d %s, ожидали %d", method, path, sub, body, w.Code, w.Body, status)
		}
		return w
	}
	code := func(w *httptest.ResponseRecorder, want string) {
		t.Helper()
		if got := errorCode(t, w); got != want {
			t.Fatalf("код ошибки %q, ожидали %q: %s", got, want, w.Body)
		}
	}
	const path = "/api/v1/me/consents"
	do("GET", path, "", ``, 401)
	code(do("GET", path, "emp", ``, 403), "forbidden")
	code(do("POST", path, "block", `{"kind":"processing","policy_version":"v1"}`, 403), "user_inactive")

	for name, body := range map[string]string{"битый JSON": `{`, "лишнее поле": `{"kind":"processing","policy_version":"v1","user_id":"x"}`, "неизвестный вид": `{"kind":"other","policy_version":"v1"}`, "processing с компанией": `{"kind":"processing","policy_version":"v1","company_id":"` + knownCompany + `"}`, "ats без компании": `{"kind":"ats_transfer","policy_version":"v1"}`} {
		if w := do("POST", path, "cand", body, 400); errorCode(t, w) != "validation_error" {
			t.Fatalf("%s: %s", name, w.Body)
		}
	}
	code(do("POST", path, "cand", `{"kind":"processing","policy_version":"v0"}`, 409), "policy_outdated")
	created := do("POST", path, "cand", `{"kind":"processing","policy_version":"v1"}`, 201)
	if created.Header().Get("Location") != path || !strings.Contains(created.Body.String(), `"kind":"processing"`) {
		t.Fatalf("создание: %v %s", created.Header(), created.Body)
	}
	code(do("POST", path, "cand", `{"kind":"processing","policy_version":"v1"}`, 409), "consent_exists")
	code(do("POST", path, "cand", `{"kind":"ats_transfer","policy_version":"v1","company_id":"11111111-1111-4111-8111-111111111111"}`, 404), "company_not_found")
	do("POST", path, "cand", `{"kind":"ats_transfer","policy_version":"v1","company_id":"`+knownCompany+`"}`, 201)

	var list struct {
		Current string           `json:"current_policy_version"`
		Items   []map[string]any `json:"items"`
	}
	listed := do("GET", path, "cand", ``, 200)
	if err := json.Unmarshal(listed.Body.Bytes(), &list); err != nil || list.Current != "v1" || len(list.Items) != 2 {
		t.Fatalf("список: %+v %v", list, err)
	}
	if listed.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("история согласий — персональные данные, ответ не должен кешироваться: %q", listed.Header().Get("Cache-Control"))
	}
	if w := do("GET", path, "emp", ``, 403); w.Code != 403 {
		t.Fatal("работодатель не должен видеть согласия")
	}

	code(do("DELETE", path+"/other", "cand", ``, 400), "validation_error")
	code(do("DELETE", path+"/ats_transfer", "cand", ``, 400), "validation_error")
	code(do("DELETE", path+"/ats_transfer?company_id=bad", "cand", ``, 400), "validation_error")
	code(do("DELETE", path+"/processing?company_id="+knownCompany, "cand", ``, 400), "validation_error")
	do("DELETE", path+"/ats_transfer?company_id="+knownCompany, "cand", ``, 204)
	do("DELETE", path+"/processing", "cand", ``, 204)
	code(do("DELETE", path+"/processing", "cand", ``, 404), "consent_not_found")
	code(do("DELETE", path+"/publication", "emp", ``, 403), "forbidden")
}

func TestConsentUnavailable(t *testing.T) {
	e := newAuthEnvWithOptions(t, Options{})
	e.store.users[testIssuer+"|cand"] = user.User{ID: "u-cand", Role: "candidate", Status: "active"}
	w := e.do(t, "GET", "/api/v1/me/consents", e.token(t, "cand"), "")
	if w.Code != 503 || errorCode(t, w) != "consent_unavailable" {
		t.Fatalf("без сервиса ожидали 503 consent_unavailable: %d %s", w.Code, w.Body)
	}
}
