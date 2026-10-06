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

type memSkills struct {
	profiles map[string]bool
	skills   map[string]map[string]entity.Skill
}

func (m *memSkills) ListSkills(_ context.Context, userID string) ([]entity.Skill, error) {
	if !m.profiles[userID] {
		return nil, entity.ErrNotFound
	}
	items := []entity.Skill{}
	for _, s := range m.skills[userID] {
		items = append(items, s)
	}
	return items, nil
}
func (m *memSkills) PutSkill(_ context.Context, userID, skillID string, in entity.SkillInput) (entity.Skill, error) {
	if !m.profiles[userID] {
		return entity.Skill{}, entity.ErrNotFound
	}
	if m.skills[userID] == nil {
		m.skills[userID] = map[string]entity.Skill{}
	}
	s := entity.Skill{SkillID: skillID, Code: "go", Name: "Go", ClaimedLevel: in.ClaimedLevel, Source: entity.SourceClaimed, Confidence: entity.Confidence(entity.SourceClaimed), UpdatedAt: time.Now()}
	m.skills[userID][skillID] = s
	return s, nil
}
func (m *memSkills) DeleteSkill(_ context.Context, userID, skillID string) error {
	if !m.profiles[userID] {
		return entity.ErrNotFound
	}
	if _, ok := m.skills[userID][skillID]; !ok {
		return entity.ErrSkillNotFound
	}
	delete(m.skills[userID], skillID)
	return nil
}

func TestCandidateSkillsRoutes(t *testing.T) {
	store := &memSkills{profiles: map[string]bool{"u-cand1": true, "u-cand2": true}, skills: map[string]map[string]entity.Skill{}}
	e := newAuthEnvWithOptions(t, Options{CandidateSkills: candidateservice.NewSkillsService(store)})
	for sub, u := range map[string]user.User{
		"cand1":     {ID: "u-cand1", Role: "candidate", Status: "active"},
		"cand2":     {ID: "u-cand2", Role: "candidate", Status: "active"},
		"noprofile": {ID: "u-none", Role: "candidate", Status: "active"},
		"emp":       {ID: "u-emp", Role: "employer", Status: "active"},
		"blk":       {ID: "u-blk", Role: "candidate", Status: "blocked"},
	} {
		e.store.users[testIssuer+"|"+sub] = u
	}
	const skill = "/api/v1/me/skills/00000000-0000-4000-8000-000000000001"
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
	do("GET", "/api/v1/me/skills", "", ``, 401)
	code(do("GET", "/api/v1/me/skills", "emp", ``, 403), "forbidden")
	code(do("PUT", skill, "emp", `{"claimed_level":3}`, 403), "forbidden")
	code(do("DELETE", skill, "emp", ``, 403), "forbidden")
	code(do("GET", "/api/v1/me/skills", "blk", ``, 403), "user_inactive")
	code(do("GET", "/api/v1/me/skills", "noprofile", ``, 404), "profile_not_found")
	code(do("PUT", skill, "noprofile", `{"claimed_level":3}`, 404), "profile_not_found")

	for name, body := range map[string]string{
		"битый JSON": `{`, "уровень 0": `{"claimed_level":0}`, "уровень 6": `{"claimed_level":6}`, "уровень строкой": `{"claimed_level":"3"}`,
		"дробный уровень": `{"claimed_level":3.5}`, "уровень null": `{"claimed_level":null}`, "нет уровня": `{}`,
		"поле skill_id": `{"claimed_level":3,"skill_id":"x"}`, "поле source": `{"claimed_level":3,"source":"fsp"}`, "поле confidence": `{"claimed_level":3,"confidence":1}`,
	} {
		code(do("PUT", skill, "cand1", body, 400), "validation_error")
		_ = name
	}
	code(do("PUT", "/api/v1/me/skills/abc", "cand1", `{"claimed_level":3}`, 400), "validation_error")
	code(do("DELETE", "/api/v1/me/skills/abc", "cand1", ``, 400), "validation_error")
	big := `{"claimed_level":3,"note":"` + strings.Repeat("a", 3<<20) + `"}`
	code(do("PUT", skill, "cand1", big, 413), "request_too_large")

	if got := do("GET", "/api/v1/me/skills", "cand1", ``, 200); strings.TrimSpace(got.Body.String()) != `{"items":[]}` {
		t.Fatalf("пустой список: %s", got.Body)
	}
	put := do("PUT", skill, "cand1", `{"claimed_level":4}`, 200)
	var sk map[string]any
	if err := json.Unmarshal(put.Body.Bytes(), &sk); err != nil || sk["claimed_level"] != float64(4) || sk["source"] != "claimed" || sk["confidence"] != 0.3 || sk["skill_id"] != "00000000-0000-4000-8000-000000000001" {
		t.Fatalf("PUT: %v %v", sk, err)
	}
	do("PUT", skill, "cand1", `{"claimed_level":2}`, 200)
	var list struct{ Items []map[string]any }
	if err := json.Unmarshal(do("GET", "/api/v1/me/skills", "cand1", ``, 200).Body.Bytes(), &list); err != nil || len(list.Items) != 1 || list.Items[0]["claimed_level"] != float64(2) {
		t.Fatalf("список после смены уровня: %+v %v", list, err)
	}
	if got := do("GET", "/api/v1/me/skills", "cand2", ``, 200); strings.TrimSpace(got.Body.String()) != `{"items":[]}` {
		t.Fatalf("чужой кандидат видит навыки: %s", got.Body)
	}
	code(do("DELETE", skill, "cand2", ``, 404), "skill_not_found")
	do("DELETE", skill, "cand1", ``, 204)
	code(do("DELETE", skill, "cand1", ``, 404), "skill_not_found")
}

func TestCandidateSkillsUnavailable(t *testing.T) {
	e := newAuthEnvWithOptions(t, Options{})
	e.store.users[testIssuer+"|cand"] = user.User{ID: "u-cand", Role: "candidate", Status: "active"}
	w := e.do(t, "GET", "/api/v1/me/skills", e.token(t, "cand"), "")
	if w.Code != 503 || errorCode(t, w) != "candidate_unavailable" {
		t.Fatalf("без сервиса ожидали 503 candidate_unavailable: %d %s", w.Code, w.Body)
	}
}
