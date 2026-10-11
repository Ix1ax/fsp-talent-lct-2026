package web_test

import (
	"bytes"
	"context"
	"encoding/json"
	"mime/multipart"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/resume"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

const resumePath = "/api/v1/me/profile/import/resume"

type resumeStore struct{ access error }

func (r *resumeStore) ImportAccess(context.Context, string) error { return r.access }
func (r *resumeStore) MatchSkills(_ context.Context, names []string) (map[string]string, error) {
	return map[string]string{"go": "id-go"}, nil
}
func (r *resumeStore) WorkFormatIDs(context.Context, []string) ([]int16, error) {
	return []int16{3}, nil
}

func resumeEnv(t *testing.T, store *resumeStore) *testutil.AuthEnv {
	t.Helper()
	return resumeEnvWithParser(t, store, nil)
}

func resumeEnvWithParser(t *testing.T, store *resumeStore, parser candidateservice.ResumeParser) *testutil.AuthEnv {
	t.Helper()
	service := candidateservice.NewResumeImportService(store, nil)
	if parser != nil {
		service.WithParser(parser)
	}
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{CandidateResume: service})
	for sub, u := range map[string]user.User{
		"cand":  {ID: "u-cand", Role: "candidate", Status: "active"},
		"cand2": {ID: "u-cand2", Role: "candidate", Status: "active"},
		"cand3": {ID: "u-cand3", Role: "candidate", Status: "active"},
		"emp":   {ID: "u-emp", Role: "employer", Status: "active"},
		"blk":   {ID: "u-blk", Role: "candidate", Status: "blocked"},
	} {
		e.Store.Users[testutil.Issuer+"|"+sub] = u
	}
	return e
}

func uploadResume(t *testing.T, e *testutil.AuthEnv, sub, field, name string, data []byte) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile(field, name)
	if err != nil {
		t.Fatal(err)
	}
	part.Write(data)
	w.Close()
	req := httptest.NewRequest("POST", resumePath, &body)
	if sub != "" {
		req.Header.Set("Authorization", "Bearer "+e.Token(t, sub))
	}
	req.Header.Set("Content-Type", w.FormDataContentType())
	rec := httptest.NewRecorder()
	e.Router.ServeHTTP(rec, req)
	return rec
}

func resumeFixture(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile("../resume/testdata/resume_hh.pdf")
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func TestResumeImportAccess(t *testing.T) {
	pdf := resumeFixture(t)
	e := resumeEnv(t, &resumeStore{})
	if w := uploadResume(t, e, "", "file", "r.pdf", pdf); w.Code != 401 {
		t.Fatalf("без токена: %d", w.Code)
	}
	if w := uploadResume(t, e, "emp", "file", "r.pdf", pdf); w.Code != 403 || testutil.ErrorCode(t, w) != "forbidden" {
		t.Fatalf("работодатель: %d %s", w.Code, w.Body)
	}
	if w := uploadResume(t, e, "blk", "file", "r.pdf", pdf); w.Code != 403 || testutil.ErrorCode(t, w) != "user_inactive" {
		t.Fatalf("заблокированный: %d %s", w.Code, w.Body)
	}
	noConsent := resumeEnv(t, &resumeStore{access: entity.ErrConsentRequired})
	if w := uploadResume(t, noConsent, "cand", "file", "r.pdf", pdf); w.Code != 409 || testutil.ErrorCode(t, w) != "consent_required" {
		t.Fatalf("без согласия: %d %s", w.Code, w.Body)
	}
	broken := resumeEnv(t, &resumeStore{access: context.DeadlineExceeded})
	w := uploadResume(t, broken, "cand", "file", "r.pdf", pdf)
	if w.Code != 500 || testutil.ErrorCode(t, w) != "internal_error" || strings.Contains(w.Body.String(), "deadline") {
		t.Fatalf("внутренняя ошибка: %d %s", w.Code, w.Body)
	}
}

func TestResumeImportDraft(t *testing.T) {
	e := resumeEnv(t, &resumeStore{})
	w := uploadResume(t, e, "cand", "file", "Иванов.pdf", resumeFixture(t))
	if w.Code != 200 || w.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("%d, Cache-Control %q, %s", w.Code, w.Header().Get("Cache-Control"), w.Body)
	}
	var got struct {
		Draft struct {
			Headline      string  `json:"headline"`
			City          string  `json:"city"`
			WorkFormatIDs []int16 `json:"work_format_ids"`
			Skills        []struct {
				Name    string  `json:"name"`
				SkillID *string `json:"skill_id"`
			} `json:"skills"`
			Experience []map[string]any `json:"experience"`
			Education  []map[string]any `json:"education"`
			Contacts   map[string]any   `json:"contacts"`
		} `json:"draft"`
		Warnings []string `json:"warnings"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	d := got.Draft
	if d.Headline != "Backend разработчик (Go)" || d.City != "Тверь" || len(d.WorkFormatIDs) != 1 || len(d.Experience) != 2 || len(d.Education) != 2 || d.Contacts["email"] != "ivan.ivanov@example.test" || got.Warnings == nil {
		t.Fatalf("черновик: %s", w.Body)
	}
	if d.Experience[0]["started_on"] != "2022-11" || d.Experience[0]["ended_on"] != nil || d.Education[0]["level"] != "higher" {
		t.Fatalf("формат опыта и образования: %v %v", d.Experience[0], d.Education[0])
	}
	if len(d.Skills) == 0 || d.Skills[0].Name != "Go" || d.Skills[0].SkillID == nil || *d.Skills[0].SkillID != "id-go" || d.Skills[1].SkillID != nil {
		t.Fatalf("навыки: %+v", d.Skills)
	}
}

func TestResumeImportBadInput(t *testing.T) {
	e := resumeEnv(t, &resumeStore{})
	if w := uploadResume(t, e, "cand", "other", "r.pdf", resumeFixture(t)); w.Code != 400 || testutil.ErrorCode(t, w) != "validation_error" {
		t.Errorf("не то поле: %d %s", w.Code, w.Body)
	}
	if w := e.Do(t, "POST", resumePath, e.Token(t, "cand"), `{"file":"x"}`); w.Code != 400 || testutil.ErrorCode(t, w) != "validation_error" {
		t.Errorf("не multipart: %d %s", w.Code, w.Body)
	}
	if w := uploadResume(t, e, "cand", "file", "r.pdf", []byte("это просто текст")); w.Code != 422 || testutil.ErrorCode(t, w) != "resume_unrecognized" {
		t.Errorf("не PDF: %d %s", w.Code, w.Body)
	}
	if w := uploadResume(t, e, "cand", "file", "r.pdf", nil); w.Code != 422 || testutil.ErrorCode(t, w) != "resume_unrecognized" {
		t.Errorf("пустой файл: %d %s", w.Code, w.Body)
	}
	if w := uploadResume(t, e, "cand", "file", "r.pdf", append([]byte("%PDF-1.4\n"), bytes.Repeat([]byte("x"), 6<<20)...)); w.Code != 413 || testutil.ErrorCode(t, w) != "resume_too_large" {
		t.Errorf("большой файл: %d %s", w.Code, w.Body)
	}
}

func TestResumeImportUnavailable(t *testing.T) {
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{})
	e.Store.Users[testutil.Issuer+"|cand"] = user.User{ID: "u-cand", Role: "candidate", Status: "active"}
	if w := uploadResume(t, e, "cand", "file", "r.pdf", resumeFixture(t)); w.Code != 503 || testutil.ErrorCode(t, w) != "candidate_unavailable" {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
}

// Два разбора идут одновременно; третий запрос сразу получает 503, а не ждёт. Слот занят только на время разбора.
func TestResumeImportBusy(t *testing.T) {
	entered := make(chan struct{}, 3)
	gate := make(chan struct{})
	var once sync.Once
	release := func() { once.Do(func() { close(gate) }) }
	defer release()
	blocking := func(context.Context, []byte, time.Time) (resume.Draft, []string, error) {
		entered <- struct{}{}
		<-gate
		return resume.Draft{}, nil, nil
	}
	e := resumeEnvWithParser(t, &resumeStore{}, blocking)
	pdf := resumeFixture(t)
	var wg sync.WaitGroup
	for _, sub := range []string{"cand", "cand2"} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if w := uploadResume(t, e, sub, "file", "r.pdf", pdf); w.Code != 200 {
				t.Errorf("%s: %d %s", sub, w.Code, w.Body)
			}
		}()
	}
	for i := 0; i < 2; i++ {
		select {
		case <-entered:
		case <-time.After(5 * time.Second):
			t.Fatal("два запроса не заняли слоты")
		}
	}
	// Третий запрос не должен ждать слот: при поломке ограничения он завис бы на общем барьере, поэтому у ожидания есть предел.
	third := make(chan *httptest.ResponseRecorder, 1)
	go func() { third <- uploadResume(t, e, "cand3", "file", "r.pdf", pdf) }()
	select {
	case w := <-third:
		if w.Code != 503 || testutil.ErrorCode(t, w) != "import_busy" || w.Header().Get("Retry-After") != "5" {
			t.Errorf("третий запрос: %d %s, Retry-After %q", w.Code, w.Body, w.Header().Get("Retry-After"))
		}
	case <-time.After(3 * time.Second):
		release()
		wg.Wait()
		t.Fatal("третий запрос занял слот вместо отказа: ограничение разборов не работает")
	}
	release()
	wg.Wait()
}

// Паника разборщика не роняет сервер: клиент получает 422, следующий запрос обрабатывается.
func TestResumeImportParserPanic(t *testing.T) {
	calls := 0
	e := resumeEnvWithParser(t, &resumeStore{}, func(context.Context, []byte, time.Time) (resume.Draft, []string, error) {
		calls++
		if calls == 1 {
			panic("boom")
		}
		return resume.Draft{}, nil, nil
	})
	if w := uploadResume(t, e, "cand", "file", "r.pdf", resumeFixture(t)); w.Code != 422 || testutil.ErrorCode(t, w) != "resume_unrecognized" {
		t.Fatalf("паника: %d %s", w.Code, w.Body)
	}
	if w := uploadResume(t, e, "cand", "file", "r.pdf", resumeFixture(t)); w.Code != 200 {
		t.Fatalf("следующий запрос: %d %s", w.Code, w.Body)
	}
}

// Файл не пишется во временные файлы: часть multipart читается в память с пределом.
func TestResumeImportRejectsExtraParts(t *testing.T) {
	e := resumeEnv(t, &resumeStore{})
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, _ := w.CreateFormFile("file", "a.pdf")
	part.Write(resumeFixture(t))
	other, _ := w.CreateFormFile("file", "b.pdf")
	other.Write(resumeFixture(t))
	w.Close()
	req := httptest.NewRequest("POST", resumePath, &body)
	req.Header.Set("Authorization", "Bearer "+e.Token(t, "cand"))
	req.Header.Set("Content-Type", w.FormDataContentType())
	rec := httptest.NewRecorder()
	e.Router.ServeHTTP(rec, req)
	if rec.Code != 400 || testutil.ErrorCode(t, rec) != "validation_error" {
		t.Fatalf("два файла: %d %s", rec.Code, rec.Body)
	}
}

// Резюме с персональными данными не должно попадать во временные файлы, даже если файл больше порога multipart в памяти.
func TestResumeImportDoesNotWriteToDisk(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("TMPDIR", dir)
	var files []string
	e := resumeEnvWithParser(t, &resumeStore{}, func(context.Context, []byte, time.Time) (resume.Draft, []string, error) {
		entries, _ := os.ReadDir(dir)
		for _, entry := range entries {
			files = append(files, entry.Name())
		}
		return resume.Draft{}, nil, nil
	})
	big := append([]byte("%PDF-1.4\n"), bytes.Repeat([]byte("x"), 2<<20)...)
	if w := uploadResume(t, e, "cand", "file", "big.pdf", big); w.Code != 200 {
		t.Fatalf("%d %s", w.Code, w.Body)
	}
	if len(files) != 0 {
		t.Fatalf("во время разбора во временном каталоге файлы: %v", files)
	}
}
