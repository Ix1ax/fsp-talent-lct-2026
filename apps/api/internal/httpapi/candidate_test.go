package httpapi

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type memProfiles struct{ byUser map[string]entity.Profile }

func (m *memProfiles) Create(_ context.Context, userID string, in entity.ProfileInput) (entity.Profile, error) {
	if _, ok := m.byUser[userID]; ok {
		return entity.Profile{}, entity.ErrConflict
	}
	p := entity.Profile{ID: "profile-" + userID, ProfileInput: in, UpdatedAt: time.Now()}
	m.byUser[userID] = p
	return p, nil
}
func (m *memProfiles) Get(_ context.Context, userID string) (entity.Profile, error) {
	if p, ok := m.byUser[userID]; ok {
		return p, nil
	}
	return entity.Profile{}, entity.ErrNotFound
}
func (m *memProfiles) Update(_ context.Context, userID string, patch entity.Patch) (entity.Profile, error) {
	p, ok := m.byUser[userID]
	if !ok {
		return entity.Profile{}, entity.ErrNotFound
	}
	in, err := patch.Apply(p)
	if err != nil {
		return p, err
	}
	p.ProfileInput = in
	m.byUser[userID] = p
	return p, nil
}

func candidateEnv(t *testing.T) (*authEnv, *memProfiles) {
	t.Helper()
	profiles := &memProfiles{byUser: map[string]entity.Profile{}}
	e := newAuthEnvWithOptions(t, Options{Candidates: candidateservice.NewProfileService(profiles)})
	for sub, u := range map[string]user.User{
		"cand1": {ID: "u-cand1", Role: "candidate", Status: "active"},
		"cand2": {ID: "u-cand2", Role: "candidate", Status: "active"},
		"emp":   {ID: "u-emp", Role: "employer", Status: "active"},
		"blk":   {ID: "u-blk", Role: "candidate", Status: "blocked"},
	} {
		e.store.users[testIssuer+"|"+sub] = u
	}
	return e, profiles
}

func TestCandidateProfileRoutes(t *testing.T) {
	e, _ := candidateEnv(t)
	do := func(method, sub, body string, status int) *httptest.ResponseRecorder {
		t.Helper()
		token := ""
		if sub != "" {
			token = e.token(t, sub)
		}
		w := e.do(t, method, "/api/v1/me/profile", token, body)
		if w.Code != status {
			t.Fatalf("%s /me/profile (%s) %s: %d %s, ожидали %d", method, sub, body, w.Code, w.Body, status)
		}
		return w
	}
	do("POST", "", `{}`, 401)
	if errorCode(t, do("POST", "emp", `{}`, 403)) != "forbidden" {
		t.Fatal("работодатель должен получить forbidden")
	}
	if errorCode(t, do("GET", "blk", ``, 403)) != "user_inactive" {
		t.Fatal("заблокированный должен получить user_inactive")
	}
	for name, body := range map[string]string{"битый JSON": `{`, "поле user_id": `{"user_id":"x"}`, "поле avatar_file_id": `{"avatar_file_id":"x"}`, "лишнее поле": `{"role":"admin"}`, "неверный статус": `{"search_status":"public"}`} {
		w := do("POST", "cand1", body, 400)
		if errorCode(t, w) != "validation_error" {
			t.Fatalf("%s: %s", name, w.Body)
		}
	}
	req := httptest.NewRequest("POST", "/api/v1/me/profile", strings.NewReader(`{}`))
	req.Header.Set("Authorization", "Bearer "+e.token(t, "cand1"))
	req.Header.Set("Content-Type", "text/plain")
	if w := httptest.NewRecorder(); func() bool { e.router.ServeHTTP(w, req); return w.Code != 400 }() {
		t.Fatal("Content-Type не JSON должен давать 400")
	}

	created := do("POST", "cand1", `{"headline":"Go","work_format_ids":[1,3]}`, 201)
	if created.Header().Get("Location") != "/api/v1/me/profile" {
		t.Fatalf("Location: %q", created.Header().Get("Location"))
	}
	var p map[string]any
	if err := json.Unmarshal(created.Body.Bytes(), &p); err != nil {
		t.Fatal(err)
	}
	if p["search_status"] != "hidden" || p["headline"] != "Go" || p["id"] == "" || p["avatar_file_id"] != nil {
		t.Fatalf("профиль: %v", p)
	}
	if _, leaked := p["user_id"]; leaked {
		t.Fatal("user_id не должен попадать в ответ")
	}
	if errorCode(t, do("POST", "cand1", `{}`, 409)) != "profile_exists" {
		t.Fatal("повторное создание должно дать profile_exists")
	}
	if got := do("GET", "cand1", ``, 200); !strings.Contains(got.Body.String(), `"headline":"Go"`) {
		t.Fatalf("GET: %s", got.Body)
	}
	if errorCode(t, do("GET", "cand2", ``, 404)) != "profile_not_found" {
		t.Fatal("чужой профиль не должен быть виден")
	}
	if errorCode(t, do("PATCH", "cand2", `{"city":"Казань"}`, 404)) != "profile_not_found" {
		t.Fatal("PATCH без профиля должен давать profile_not_found")
	}
	if cleared := do("PATCH", "cand1", `{"headline":null,"city":"Казань"}`, 200); !strings.Contains(cleared.Body.String(), `"headline":null`) || !strings.Contains(cleared.Body.String(), `"city":"Казань"`) {
		t.Fatalf("PATCH: %s", cleared.Body)
	}
	do("PATCH", "cand1", `{}`, 400)
	do("PATCH", "cand1", `{"user_id":"x"}`, 400)
	do("PATCH", "cand1", `{"search_status":null}`, 400)
}

func TestCandidateProfileUnavailable(t *testing.T) {
	e := newAuthEnvWithOptions(t, Options{})
	e.store.users[testIssuer+"|cand1"] = user.User{ID: "u-cand1", Role: "candidate", Status: "active"}
	w := e.do(t, "GET", "/api/v1/me/profile", e.token(t, "cand1"), "")
	if w.Code != 503 || errorCode(t, w) != "candidate_unavailable" {
		t.Fatalf("без сервиса ожидали 503 candidate_unavailable: %d %s", w.Code, w.Body)
	}
}
