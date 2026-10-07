package httpapi_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type scriptedCareer struct{ err error }

func (s scriptedCareer) ListExperience(context.Context, string) ([]entity.Experience, error) {
	return []entity.Experience{{ID: "e1", ExperienceInput: entity.ExperienceInput{Company: "К", Position: "Р", StartedOn: entity.NewMonth(2022, 11)}}}, s.err
}
func (s scriptedCareer) CreateExperience(_ context.Context, _ string, in entity.ExperienceInput) (entity.Experience, error) {
	return entity.Experience{ID: "e1", ExperienceInput: in}, s.err
}
func (s scriptedCareer) ReplaceExperience(_ context.Context, _, _ string, in entity.ExperienceInput) (entity.Experience, error) {
	return entity.Experience{ID: "e1", ExperienceInput: in}, s.err
}
func (s scriptedCareer) DeleteExperience(context.Context, string, string) error { return s.err }
func (s scriptedCareer) ListEducation(context.Context, string) ([]entity.Education, error) {
	return []entity.Education{{ID: "d1", EducationInput: entity.EducationInput{Level: "higher", Institution: "У", GraduationYear: 2020}}}, s.err
}
func (s scriptedCareer) CreateEducation(_ context.Context, _ string, in entity.EducationInput) (entity.Education, error) {
	return entity.Education{ID: "d1", EducationInput: in}, s.err
}
func (s scriptedCareer) ReplaceEducation(_ context.Context, _, _ string, in entity.EducationInput) (entity.Education, error) {
	return entity.Education{ID: "d1", EducationInput: in}, s.err
}
func (s scriptedCareer) DeleteEducation(context.Context, string, string) error { return s.err }

func careerEnv(t *testing.T, err error) *testutil.AuthEnv {
	t.Helper()
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{CandidateCareer: candidateservice.NewCareerService(scriptedCareer{err: err}, time.Now)})
	for sub, u := range map[string]user.User{
		"cand": {ID: "u-cand", Role: "candidate", Status: "active"},
		"emp":  {ID: "u-emp", Role: "employer", Status: "active"},
		"blk":  {ID: "u-blk", Role: "candidate", Status: "blocked"},
	} {
		e.Store.Users[testutil.Issuer+"|"+sub] = u
	}
	return e
}

const (
	expBody = `{"company":"Компания","position":"Разработчик","started_on":"2022-11","ended_on":null,"description":"Работа"}`
	eduBody = `{"level":"higher","institution":"Университет","specialty":"","graduation_year":2027}`
	someID  = "11111111-1111-4111-8111-111111111111"
	expPath = "/api/v1/me/experience"
	eduPath = "/api/v1/me/education"
)

func TestCareerRoutesAccessAndStatuses(t *testing.T) {
	e := careerEnv(t, nil)
	for _, tc := range []struct {
		method, path, body string
		status             int
	}{
		{"GET", expPath, "", 200},
		{"POST", expPath, expBody, 201},
		{"PUT", expPath + "/" + someID, expBody, 200},
		{"DELETE", expPath + "/" + someID, "", 204},
		{"GET", eduPath, "", 200},
		{"POST", eduPath, eduBody, 201},
		{"PUT", eduPath + "/" + someID, eduBody, 200},
		{"DELETE", eduPath + "/" + someID, "", 204},
	} {
		if w := e.Do(t, tc.method, tc.path, "", tc.body); w.Code != 401 {
			t.Errorf("%s %s без токена: %d", tc.method, tc.path, w.Code)
		}
		if w := e.Do(t, tc.method, tc.path, e.Token(t, "emp"), tc.body); w.Code != 403 || testutil.ErrorCode(t, w) != "forbidden" {
			t.Errorf("%s %s работодатель: %d %s", tc.method, tc.path, w.Code, w.Body)
		}
		if w := e.Do(t, tc.method, tc.path, e.Token(t, "blk"), tc.body); w.Code != 403 || testutil.ErrorCode(t, w) != "user_inactive" {
			t.Errorf("%s %s заблокированный: %d %s", tc.method, tc.path, w.Code, w.Body)
		}
		w := e.Do(t, tc.method, tc.path, e.Token(t, "cand"), tc.body)
		if w.Code != tc.status || w.Header().Get("Cache-Control") != "private, no-store" {
			t.Errorf("%s %s кандидат: %d (ожидали %d), Cache-Control %q, %s", tc.method, tc.path, w.Code, tc.status, w.Header().Get("Cache-Control"), w.Body)
		}
	}
}

func TestCareerRoutesBodies(t *testing.T) {
	e := careerEnv(t, nil)
	tok := e.Token(t, "cand")
	w := e.Do(t, "GET", expPath, tok, "")
	var list struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &list); err != nil || len(list.Items) != 1 || list.Items[0]["started_on"] != "2022-11" || list.Items[0]["ended_on"] != nil || list.Items[0]["company"] != "К" {
		t.Fatalf("список опыта: %s", w.Body)
	}
	w = e.Do(t, "POST", expPath, tok, expBody)
	if !strings.Contains(w.Body.String(), `"started_on":"2022-11"`) || !strings.Contains(w.Body.String(), `"id":"e1"`) {
		t.Fatalf("создание: %s", w.Body)
	}
	w = e.Do(t, "GET", eduPath, tok, "")
	if !strings.Contains(w.Body.String(), `"graduation_year":2020`) || !strings.Contains(w.Body.String(), `"level":"higher"`) {
		t.Fatalf("список образования: %s", w.Body)
	}
}

func TestCareerRoutesBadInput(t *testing.T) {
	e := careerEnv(t, nil)
	tok := e.Token(t, "cand")
	for name, tc := range map[string]struct{ method, path, body string }{
		"неизвестное поле":      {"POST", expPath, `{"company":"К","position":"Р","started_on":"2022-11","x":1}`},
		"неверный месяц":        {"POST", expPath, `{"company":"К","position":"Р","started_on":"2022-13"}`},
		"месяц без нуля":        {"POST", expPath, `{"company":"К","position":"Р","started_on":"2022-5"}`},
		"нет начала":            {"POST", expPath, `{"company":"К","position":"Р"}`},
		"пустая компания":       {"PUT", expPath + "/" + someID, `{"company":" ","position":"Р","started_on":"2022-11"}`},
		"будущее начало":        {"POST", expPath, `{"company":"К","position":"Р","started_on":"2099-01"}`},
		"не JSON":               {"POST", eduPath, `nope`},
		"неверный уровень":      {"POST", eduPath, `{"level":"bogus","institution":"У","graduation_year":2020}`},
		"год вне диапазона":     {"PUT", eduPath + "/" + someID, `{"level":"higher","institution":"У","graduation_year":1900}`},
		"неизвестное поле обр.": {"POST", eduPath, `{"level":"higher","institution":"У","graduation_year":2020,"gpa":5}`},
	} {
		if w := e.Do(t, tc.method, tc.path, tok, tc.body); w.Code != 400 || testutil.ErrorCode(t, w) != "validation_error" {
			t.Errorf("%s: %d %s", name, w.Code, w.Body)
		}
	}
	big := `{"company":"` + strings.Repeat("a", 3<<20) + `"}`
	if w := e.Do(t, "POST", expPath, tok, big); w.Code != 413 || testutil.ErrorCode(t, w) != "request_too_large" {
		t.Errorf("большое тело: %d", w.Code)
	}
}

func TestCareerRoutesErrors(t *testing.T) {
	for name, tc := range map[string]struct {
		err    error
		status int
		code   string
	}{
		"нет места работы": {entity.ErrExperienceNotFound, 404, "experience_not_found"},
		"нет образования":  {entity.ErrEducationNotFound, 404, "education_not_found"},
		"нет профиля":      {entity.ErrNotFound, 404, "profile_not_found"},
		"лимит":            {entity.ErrLimitReached, 409, "limit_reached"},
		"не активен":       {entity.ErrForbidden, 403, "forbidden"},
		"неожиданная":      {context.DeadlineExceeded, 500, "internal_error"},
	} {
		e := careerEnv(t, tc.err)
		w := e.Do(t, "POST", expPath, e.Token(t, "cand"), expBody)
		if w.Code != tc.status || testutil.ErrorCode(t, w) != tc.code {
			t.Errorf("%s: %d %s", name, w.Code, w.Body)
		}
		if tc.status == 500 && strings.Contains(w.Body.String(), "deadline") {
			t.Errorf("%s: внутренняя ошибка утекла наружу: %s", name, w.Body)
		}
	}
}

func TestCareerRoutesUnavailable(t *testing.T) {
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{})
	e.Store.Users[testutil.Issuer+"|cand"] = user.User{ID: "u-cand", Role: "candidate", Status: "active"}
	for _, path := range []string{expPath, eduPath} {
		w := e.Do(t, "GET", path, e.Token(t, "cand"), "")
		if w.Code != 503 || testutil.ErrorCode(t, w) != "candidate_unavailable" {
			t.Fatalf("%s: %d %s", path, w.Code, w.Body)
		}
	}
}
