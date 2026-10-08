package httpapi_test

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	assessmentservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/service"
	candidateentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type scriptedAttempts struct{ err error }

func (s scriptedAttempts) Available(context.Context, string, int) ([]entity.AvailableTemplate, error) {
	return []entity.AvailableTemplate{{SpecializationID: 1, GradeID: 2, CanStart: true, Reason: "ok"}}, s.err
}
func (s scriptedAttempts) StartAttempt(context.Context, string, int16, int16, int, string) (entity.Attempt, error) {
	return entity.Attempt{ID: aid, Status: "active", Questions: []entity.AttemptQuestion{{ID: "q1", Position: 1, Prompt: entity.Prompt{Text: "Вопрос?"}}}}, s.err
}
func (s scriptedAttempts) CurrentAttempt(context.Context, string, int) (entity.Attempt, error) {
	return entity.Attempt{ID: aid, Status: "active", Questions: []entity.AttemptQuestion{}}, s.err
}
func (s scriptedAttempts) GetAttempt(context.Context, string, string, int) (entity.Attempt, error) {
	return entity.Attempt{ID: aid, Status: "active", Questions: []entity.AttemptQuestion{}}, s.err
}
func (s scriptedAttempts) SaveAnswer(context.Context, string, string, string, entity.Answer) error {
	return s.err
}
func (s scriptedAttempts) SubmitAttempt(context.Context, string, string, int) (entity.Attempt, error) {
	return entity.Attempt{ID: aid, Status: "passed", Questions: []entity.AttemptQuestion{}, Result: &entity.AttemptResult{Passed: true, ScorePercent: 100, Skills: []entity.SkillResult{}}}, s.err
}

const (
	aid  = "11111111-1111-4111-8111-111111111111"
	qid  = "22222222-2222-4222-8222-222222222222"
	base = "/api/v1/me/assessments"
)

func attemptEnv(t *testing.T, store scriptedAttempts) *testutil.AuthEnv {
	t.Helper()
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{AssessmentAttempts: assessmentservice.NewAttempts(store, 7)})
	for sub, u := range map[string]user.User{
		"cand": {ID: "u-cand", Role: "candidate", Status: "active"},
		"emp":  {ID: "u-emp", Role: "employer", Status: "active"},
		"blk":  {ID: "u-blk", Role: "candidate", Status: "blocked"},
	} {
		e.Store.Users[testutil.Issuer+"|"+sub] = u
	}
	return e
}

func TestAssessmentAttemptRoutesAccess(t *testing.T) {
	e := attemptEnv(t, scriptedAttempts{})
	for _, tc := range []struct{ method, path, body string }{
		{"GET", base + "/available", ""},
		{"POST", base + "/attempts", `{"stack_skill_id":"00000000-0000-4000-8000-000000000001","specialization_id":1,"grade_id":2}`},
		{"GET", base + "/attempts/current", ""},
		{"GET", base + "/attempts/" + aid, ""},
		{"PUT", base + "/attempts/" + aid + "/answers/" + qid, `{"text":"x"}`},
		{"POST", base + "/attempts/" + aid + "/submit", ""},
	} {
		if w := e.Do(t, tc.method, tc.path, "", tc.body); w.Code != 401 {
			t.Errorf("%s %s без токена: %d", tc.method, tc.path, w.Code)
		}
		if w := e.Do(t, tc.method, tc.path, e.Token(t, "emp"), tc.body); w.Code != 403 || testutil.ErrorCode(t, w) != "forbidden" {
			t.Errorf("%s %s работодатель: %d %s", tc.method, tc.path, w.Code, w.Body)
		}
		if w := e.Do(t, tc.method, tc.path, e.Token(t, "blk"), tc.body); w.Code != 403 {
			t.Errorf("%s %s заблокированный: %d", tc.method, tc.path, w.Code)
		}
		w := e.Do(t, tc.method, tc.path, e.Token(t, "cand"), tc.body)
		if w.Code >= 300 || w.Header().Get("Cache-Control") != "private, no-store" {
			t.Errorf("%s %s кандидат: %d, Cache-Control %q, %s", tc.method, tc.path, w.Code, w.Header().Get("Cache-Control"), w.Body)
		}
	}
}

func TestAssessmentAttemptRoutesUnavailable(t *testing.T) {
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{})
	e.Store.Users[testutil.Issuer+"|cand"] = user.User{ID: "u-cand", Role: "candidate", Status: "active"}
	w := e.Do(t, "GET", base+"/available", e.Token(t, "cand"), "")
	if w.Code != 503 || testutil.ErrorCode(t, w) != "assessments_unavailable" {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
}

func TestAssessmentAttemptRoutesBadInput(t *testing.T) {
	e := attemptEnv(t, scriptedAttempts{})
	tok := e.Token(t, "cand")
	for name, tc := range map[string]struct{ method, path, body string }{
		"неизвестное поле":     {"POST", base + "/attempts", `{"stack_skill_id":"00000000-0000-4000-8000-000000000001","specialization_id":1,"grade_id":2,"x":1}`},
		"нулевой грейд":        {"POST", base + "/attempts", `{"stack_skill_id":"00000000-0000-4000-8000-000000000001","specialization_id":1}`},
		"не JSON":              {"POST", base + "/attempts", `nope`},
		"плохой id попытки":    {"GET", base + "/attempts/nope", ""},
		"плохой id в ответе":   {"PUT", base + "/attempts/" + aid + "/answers/nope", `{"text":"x"}`},
		"пустой ответ":         {"PUT", base + "/attempts/" + aid + "/answers/" + qid, `{}`},
		"неизвестное в ответе": {"PUT", base + "/attempts/" + aid + "/answers/" + qid, `{"text":"x","extra":1}`},
	} {
		if w := e.Do(t, tc.method, tc.path, tok, tc.body); w.Code != 400 || testutil.ErrorCode(t, w) != "validation_error" {
			t.Errorf("%s: %d %s", name, w.Code, w.Body)
		}
	}
	big := `{"text":"` + strings.Repeat("a", 3<<20) + `"}`
	if w := e.Do(t, "PUT", base+"/attempts/"+aid+"/answers/"+qid, tok, big); w.Code != 413 || testutil.ErrorCode(t, w) != "request_too_large" {
		t.Errorf("большое тело: %d", w.Code)
	}
}

func TestAssessmentAttemptRouteErrors(t *testing.T) {
	retry := time.Date(2026, 10, 14, 12, 0, 0, 0, time.UTC)
	for name, tc := range map[string]struct {
		err    error
		status int
		code   string
		extra  string
	}{
		"активная":     {&entity.ActiveError{AttemptID: aid}, 409, "attempt_active", `"attempt_id":"` + aid + `"`},
		"пересдача":    {&entity.RetakeError{RetryAt: retry}, 409, "retake_cooldown", `"retry_at":"2026-10-14T12:00:00Z"`},
		"подтверждён":  {entity.ErrAlreadyConfirmed, 409, "already_confirmed", ""},
		"недоступен":   {entity.ErrUnavailable, 409, "assessment_unavailable", ""},
		"закрыта":      {entity.ErrAttemptClosed, 409, "attempt_closed", ""},
		"нет попытки":  {entity.ErrAttemptNotFound, 404, "attempt_not_found", ""},
		"нет задания":  {entity.ErrQuestionNotFound, 404, "question_not_found", ""},
		"нет профиля":  {candidateentity.ErrNotFound, 404, "profile_not_found", ""},
		"нет согласия": {candidateentity.ErrConsentRequired, 409, "consent_required", ""},
		"не активен":   {candidateentity.ErrForbidden, 403, "forbidden", ""},
		"форма ответа": {&entity.ValidationError{Message: "Выберите вариант ответа"}, 400, "validation_error", ""},
		"неожиданная":  {context.DeadlineExceeded, 500, "internal_error", ""},
	} {
		e := attemptEnv(t, scriptedAttempts{err: tc.err})
		w := e.Do(t, "POST", base+"/attempts", e.Token(t, "cand"), `{"stack_skill_id":"00000000-0000-4000-8000-000000000001","specialization_id":1,"grade_id":2}`)
		if w.Code != tc.status || testutil.ErrorCode(t, w) != tc.code || !strings.Contains(w.Body.String(), tc.extra) {
			t.Errorf("%s: %d %s", name, w.Code, w.Body)
		}
		if tc.status == 500 && strings.Contains(w.Body.String(), "deadline") {
			t.Errorf("%s: внутренняя ошибка утекла наружу: %s", name, w.Body)
		}
	}
}

func TestAssessmentAttemptRouteBodies(t *testing.T) {
	e := attemptEnv(t, scriptedAttempts{})
	tok := e.Token(t, "cand")
	w := e.Do(t, "POST", base+"/attempts", tok, `{"stack_skill_id":"00000000-0000-4000-8000-000000000001","specialization_id":1,"grade_id":2}`)
	var started entity.Attempt
	if w.Code != 201 || json.Unmarshal(w.Body.Bytes(), &started) != nil || started.ID != aid || len(started.Questions) != 1 {
		t.Fatalf("старт: %d %s", w.Code, w.Body)
	}
	if w = e.Do(t, "POST", base+"/attempts/"+aid+"/submit", tok, ""); w.Code != 200 || !strings.Contains(w.Body.String(), `"passed":true`) {
		t.Fatalf("submit: %d %s", w.Code, w.Body)
	}
	if w = e.Do(t, "PUT", base+"/attempts/"+aid+"/answers/"+qid, tok, `{"selected":["a"]}`); w.Code != 204 {
		t.Fatalf("ответ: %d %s", w.Code, w.Body)
	}
	if w = e.Do(t, "GET", base+"/available", tok, ""); w.Code != 200 || !strings.Contains(w.Body.String(), `"can_start":true`) {
		t.Fatalf("список: %d %s", w.Code, w.Body)
	}
}
