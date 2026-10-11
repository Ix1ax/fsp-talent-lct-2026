package web_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	consententity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type memFull struct {
	byUser map[string]entity.FullSnapshot
}

func (m memFull) FullSnapshot(_ context.Context, userID string) (entity.FullSnapshot, error) {
	return m.byUser[userID], nil
}

func TestCandidateFullProfileRoute(t *testing.T) {
	now := time.Now()
	store := memFull{byUser: map[string]entity.FullSnapshot{
		"u-full": {
			Profile:  &entity.Profile{ID: "p1", ProfileInput: entity.ProfileInput{Headline: new(string), SearchStatus: "hidden", WorkFormatIDs: []int16{1}}, UpdatedAt: now},
			Consents: []consententity.Consent{{ID: "c1", Kind: "processing", PolicyVersion: "v1", GrantedAt: now}, {ID: "c2", Kind: "publication", PolicyVersion: "v1", GrantedAt: now}},
			Contacts: &entity.Contacts{ContactsInput: entity.ContactsInput{FullName: "Иван Иванов", Email: "ivan@example.test"}, UpdatedAt: now},
			Skills:   []entity.Skill{{SkillID: "s1", Code: "go", Name: "Go", ModerationStatus: "pending"}},
		},
	}}
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{
		Candidates:    candidateservice.NewProfileService(&memProfiles{byUser: map[string]entity.Profile{}}),
		CandidateFull: candidateservice.NewFullProfileService(store, "v1"),
	})
	for sub, u := range map[string]user.User{
		"empty": {ID: "u-empty", Role: "candidate", Status: "active"},
		"full":  {ID: "u-full", Role: "candidate", Status: "active"},
		"emp":   {ID: "u-emp", Role: "employer", Status: "active"},
		"blk":   {ID: "u-blk", Role: "candidate", Status: "blocked"},
	} {
		e.Store.Users[testutil.Issuer+"|"+sub] = u
	}
	const path = "/api/v1/me/profile/full"
	if w := e.Do(t, "GET", path, "", ""); w.Code != 401 {
		t.Fatalf("без токена: %d", w.Code)
	}
	if w := e.Do(t, "GET", path, e.Token(t, "emp"), ""); w.Code != 403 || testutil.ErrorCode(t, w) != "forbidden" {
		t.Fatalf("работодатель: %d %s", w.Code, w.Body)
	}
	if w := e.Do(t, "GET", path, e.Token(t, "blk"), ""); w.Code != 403 || testutil.ErrorCode(t, w) != "user_inactive" {
		t.Fatalf("заблокированный: %d %s", w.Code, w.Body)
	}
	for _, method := range []string{"POST", "PUT", "PATCH", "DELETE"} {
		if w := e.Do(t, method, path, e.Token(t, "full"), `{}`); w.Code == 200 {
			t.Fatalf("%s %s не должен возвращать 200", method, path)
		}
	}

	// Кандидат без профиля: 200 с пустыми частями.
	w := e.Do(t, "GET", path, e.Token(t, "empty"), "")
	if w.Code != 200 || w.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("пустое состояние: %d, Cache-Control %q, %s", w.Code, w.Header().Get("Cache-Control"), w.Body)
	}
	body := w.Body.String()
	for _, want := range []string{`"profile":null`, `"contacts":null`, `"category":null`, `"skills":[]`, `"achievements":[]`, `"items":[]`, `"current_policy_version":"v1"`, `"percent":0`, `"ready_to_publish":false`} {
		if !strings.Contains(body, want) {
			t.Fatalf("в ответе нет %s: %s", want, body)
		}
	}
	var empty struct {
		Readiness struct {
			Items []struct{ Code string } `json:"items"`
		} `json:"readiness"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &empty); err != nil || len(empty.Readiness.Items) != 11 || empty.Readiness.Items[0].Code != "consent_processing" || empty.Readiness.Items[10].Code != "avatar" {
		t.Fatalf("пункты готовности: %+v %v", empty.Readiness.Items, err)
	}

	// Заполненный профиль.
	w = e.Do(t, "GET", path, e.Token(t, "full"), "")
	if w.Code != 200 {
		t.Fatalf("полный профиль: %d %s", w.Code, w.Body)
	}
	var got struct {
		Profile  map[string]any   `json:"profile"`
		Contacts map[string]any   `json:"contacts"`
		Skills   []map[string]any `json:"skills"`
		Consents struct {
			Items []map[string]any `json:"items"`
		} `json:"consents"`
		Readiness struct {
			Percent        int  `json:"percent"`
			ReadyToPublish bool `json:"ready_to_publish"`
		} `json:"readiness"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got.Profile["id"] != "p1" || got.Contacts["email"] != "ivan@example.test" || len(got.Skills) != 1 || got.Skills[0]["moderation_status"] != "pending" || len(got.Consents.Items) != 2 || !got.Readiness.ReadyToPublish || got.Readiness.Percent != 64 {
		t.Fatalf("полный профиль: %+v", got)
	}
}

func TestCandidateFullProfileUnavailable(t *testing.T) {
	// Сервис профилей настроен, а сервис полного профиля нет: ответ 503 даёт именно метод /full.
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Candidates: candidateservice.NewProfileService(&memProfiles{byUser: map[string]entity.Profile{}})})
	e.Store.Users[testutil.Issuer+"|cand"] = user.User{ID: "u-cand", Role: "candidate", Status: "active"}
	w := e.Do(t, "GET", "/api/v1/me/profile/full", e.Token(t, "cand"), "")
	if w.Code != 503 || testutil.ErrorCode(t, w) != "candidate_unavailable" {
		t.Fatalf("без сервиса ожидали 503 candidate_unavailable: %d %s", w.Code, w.Body)
	}
}
