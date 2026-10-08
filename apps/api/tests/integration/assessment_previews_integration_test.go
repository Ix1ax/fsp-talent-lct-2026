//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"reflect"
	"strings"
	"sync"
	"testing"

	adminentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/entity"
	adminrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/repository"
	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
	assessmentservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

func TestAssessmentPreviewHTTPIsolationSnapshotsAndExpiry(t *testing.T) {
	db := testDB(t)
	clearDemoBank(t, db)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	rootID := assessmentAdmin(t, db)
	admins := adminservice.New(adminrepo.New(db))
	root, err := admins.Login(ctx, adminentity.Credentials{Email: "assessments@example.test", Password: "Assessments-Admin-Password-2026"}, "root")
	if err != nil {
		t.Fatal(err)
	}
	staff, err := admins.Create(ctx, root.Admin, adminentity.Credentials{Email: "staff@example.test", Password: "Staff-Preview-Password"})
	if err != nil {
		t.Fatal(err)
	}
	staffLogin, err := admins.Login(ctx, adminentity.Credentials{Email: staff.Email, Password: "Staff-Preview-Password"}, "staff")
	if err != nil {
		t.Fatal(err)
	}
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Admins: admins, Assessments: assessmentservice.New(repo)})
	request := func(method, path, token, body string, status int) *httptest.ResponseRecorder {
		t.Helper()
		w := e.Do(t, method, "/api/v1/admin/assessments"+path, token, body)
		if w.Code != status {
			t.Fatalf("%s %s: %d %s", method, path, w.Code, w.Body)
		}
		return w
	}
	decode := func(w *httptest.ResponseRecorder) entity.Preview {
		t.Helper()
		var p entity.Preview
		if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil {
			t.Fatal(err)
		}
		return p
	}
	publishedQuestion(t, repo, rootID, goSkill, 1)
	spec, grade := pairIDs(t, db, "backend", "junior")
	tpl, err := repo.CreateTemplate(ctx, rootID, entity.TemplateInput{StackSkillID: goSkill, SpecializationID: spec, GradeID: grade, TimeLimitSec: 300, PassScore: 70, Blueprint: []entity.BlueprintRow{{SkillID: goSkill, Difficulty: 1, QuestionCount: 1, Weight: 1}}})
	if err != nil {
		t.Fatal(err)
	}
	request("POST", "/templates/"+tpl.ID+"/previews", e.Token(t, "candidate"), "", 401)
	start := request("POST", "/templates/"+tpl.ID+"/previews", staffLogin.AccessToken, "", 201)
	p := decode(start)
	if p.Status != "in_progress" || p.Result != nil || len(p.Questions) != 1 || p.TemplateVersion != tpl.Version || start.Header().Get("Location") == "" {
		t.Fatalf("preview: %+v", p)
	}
	for _, secret := range []string{"grading_spec", "correct_answer", "accepted", "case_sensitive"} {
		if strings.Contains(start.Body.String(), secret) {
			t.Fatalf("утечка %s", secret)
		}
	}
	q := p.Questions[0]
	path := "/previews/" + p.ID
	request("GET", path, root.AccessToken, "", 404)
	request("PUT", path+"/answers/"+q.ID, root.AccessToken, `{"text":"git status"}`, 404)
	request("POST", path+"/submit", root.AccessToken, "", 404)
	request("DELETE", path, root.AccessToken, "", 204)
	request("GET", path, staffLogin.AccessToken, "", 200)
	request("PUT", path+"/answers/"+q.ID, staffLogin.AccessToken, `{"selected":["a"]}`, 400)
	request("PUT", path+"/answers/"+q.ID, staffLogin.AccessToken, `{"text":"git status","extra":true}`, 400)
	request("PUT", path+"/answers/22222222-2222-4222-8222-222222222222", staffLogin.AccessToken, `{"text":"git status"}`, 404)
	request("PUT", path+"/answers/"+q.ID, staffLogin.AccessToken, `{"text":"wrong"}`, 204)
	request("PUT", path+"/answers/"+q.ID, staffLogin.AccessToken, `{"text":"  GIT   STATUS  "}`, 204)
	restored := decode(request("GET", path, staffLogin.AccessToken, "", 200))
	if restored.Questions[0].Answer == nil {
		t.Fatal("ответ не восстановлен")
	}
	// Новая версия и архивирование исходников не меняют снимок запущенного теста.
	if _, err = repo.CreateVersion(ctx, rootID, q.QuestionID, entity.VersionInput{Prompt: entity.Prompt{Text: "Новая версия"}, GradingSpec: entity.GradingSpec{Type: "text", Accepted: []string{"changed"}}}); err != nil {
		t.Fatal(err)
	}
	if _, err = repo.PublishVersion(ctx, rootID, q.QuestionID, 2); err != nil {
		t.Fatal(err)
	}
	if _, err = repo.ArchiveQuestion(ctx, rootID, q.QuestionID); err != nil {
		t.Fatal(err)
	}
	if _, err = repo.ArchiveTemplate(ctx, rootID, tpl.ID); err != nil {
		t.Fatal(err)
	}
	done := decode(request("POST", path+"/submit", staffLogin.AccessToken, "", 200))
	if done.Status != "submitted" || done.Result.ScorePercent != 100 || !done.Result.Passed || done.Result.CorrectCount != 1 || !reflect.DeepEqual(done.Questions[0].Prompt, q.Prompt) {
		t.Fatalf("итог: %+v", done)
	}
	again := decode(request("POST", path+"/submit", staffLogin.AccessToken, "", 200))
	if !reflect.DeepEqual(done.Result, again.Result) || !done.FinishedAt.Equal(*again.FinishedAt) {
		t.Fatal("submit изменил итог")
	}
	request("PUT", path+"/answers/"+q.ID, staffLogin.AccessToken, `{"text":"wrong"}`, 409)
	request("POST", "/templates/"+tpl.ID+"/previews", staffLogin.AccessToken, "", 409)
	for _, table := range []string{"assessment_attempts", "grade_history", "candidate_categories", "skill_evidence", "candidate_skills"} {
		var n int
		if err = db.QueryRow(ctx, `SELECT count(*) FROM `+table).Scan(&n); err != nil {
			t.Fatal(err)
		}
		if n != 0 {
			t.Fatalf("появились боевые данные в %s", table)
		}
	}
	request("DELETE", path, staffLogin.AccessToken, "", 204)
	request("DELETE", path, staffLogin.AccessToken, "", 204)
	request("GET", path, staffLogin.AccessToken, "", 404)

	publishedQuestion(t, repo, rootID, goSkill, 1)
	tpl2, err := repo.CreateTemplate(ctx, rootID, entity.TemplateInput{StackSkillID: goSkill, SpecializationID: spec, GradeID: grade, TimeLimitSec: 300, PassScore: 70, Blueprint: []entity.BlueprintRow{{SkillID: goSkill, Difficulty: 1, QuestionCount: 1, Weight: 1}}})
	if err != nil {
		t.Fatal(err)
	}
	expired := decode(request("POST", "/templates/"+tpl2.ID+"/previews", staffLogin.AccessToken, "", 201))
	if _, err = db.Exec(ctx, `UPDATE assessment_previews SET started_at=clock_timestamp()-interval '10 minutes',expires_at=clock_timestamp()-interval '5 minutes' WHERE id=$1`, expired.ID); err != nil {
		t.Fatal(err)
	}
	w := request("PUT", "/previews/"+expired.ID+"/answers/"+expired.Questions[0].ID, staffLogin.AccessToken, `{"text":"git status"}`, 409)
	if testutil.ErrorCode(t, w) != "preview_expired" {
		t.Fatal(w.Body)
	}
	final := decode(request("GET", "/previews/"+expired.ID, staffLogin.AccessToken, "", 200))
	if final.Status != "expired" || final.Result.UnansweredCount != 1 || final.Result.ScorePercent != 0 {
		t.Fatalf("таймер: %+v", final)
	}
	request("POST", "/previews/"+expired.ID+"/submit", staffLogin.AccessToken, "", 200)
	if _, err = admins.UpdateStatus(ctx, root.Admin, staff.ID, adminentity.StatusInput{Status: "blocked"}); err != nil {
		t.Fatal(err)
	}
	request("GET", "/previews/"+expired.ID, staffLogin.AccessToken, "", 401)
}

func TestAssessmentPreviewIdempotencyLimitsShortagesAndCandidateParity(t *testing.T) {
	db := testDB(t)
	clearDemoBank(t, db)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	admin := assessmentAdmin(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	input := entity.TemplateInput{StackSkillID: goSkill, SpecializationID: spec, GradeID: grade, TimeLimitSec: 300, PassScore: 70, Blueprint: []entity.BlueprintRow{{SkillID: goSkill, Difficulty: 1, QuestionCount: 3, Weight: 1}}}
	tpl, err := repo.CreateTemplate(ctx, admin, input)
	if err != nil {
		t.Fatal(err)
	}
	_, err = repo.StartPreview(ctx, admin, tpl.ID, "shortage")
	var shortage *entity.InsufficientError
	if !errors.As(err, &shortage) || len(shortage.Items) != 1 || shortage.Items[0].Available != 0 || shortage.Items[0].Required != 3 {
		t.Fatalf("нехватка: %v", err)
	}
	var count int
	if err = db.QueryRow(ctx, `SELECT count(*) FROM assessment_previews`).Scan(&count); err != nil || count != 0 {
		t.Fatal("частичный preview")
	}
	for i := 0; i < 3; i++ {
		publishedQuestion(t, repo, admin, goSkill, 1)
	}
	var wg sync.WaitGroup
	ids := make(chan string, 6)
	for i := 0; i < 6; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			p, err := repo.StartPreview(ctx, admin, tpl.ID, "same-key")
			if err != nil {
				t.Error(err)
				return
			}
			ids <- p.ID
		}()
	}
	wg.Wait()
	close(ids)
	var previewID string
	for id := range ids {
		if previewID != "" && previewID != id {
			t.Fatal("дубликат ключа")
		}
		previewID = id
	}
	p, err := repo.GetPreview(ctx, admin, previewID, false)
	if err != nil {
		t.Fatal(err)
	}
	tplOther, err := repo.CreateTemplate(ctx, admin, input)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.StartPreview(ctx, admin, tplOther.ID, "same-key"); !errors.Is(err, entity.ErrPreviewKeyConflict) {
		t.Fatalf("ключ: %v", err)
	}
	for i := 0; i < 2; i++ {
		if _, err = repo.StartPreview(ctx, admin, tpl.ID, ""); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = repo.StartPreview(ctx, admin, tpl.ID, ""); !errors.Is(err, entity.ErrPreviewLimit) {
		t.Fatalf("лимит: %v", err)
	}
	text := "git status"
	for i, q := range p.Questions {
		if i < 2 {
			if err = repo.SavePreviewAnswer(ctx, admin, p.ID, q.ID, entity.Answer{Text: &text}); err != nil {
				t.Fatal(err)
			}
		}
	}
	result, err := repo.GetPreview(ctx, admin, p.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	// Реальный кандидат получает такой же набор: весь банк состоит ровно из трёх заданий.
	if _, err = repo.PublishTemplate(ctx, admin, tpl.ID); err != nil {
		t.Fatal(err)
	}
	user := attemptCandidate(t, db)
	attempt, err := repo.StartAttempt(ctx, user, spec, grade, 7, goSkill)
	if err != nil {
		t.Fatal(err)
	}
	for i, q := range attempt.Questions {
		if i < 2 {
			if err = repo.SaveAnswer(ctx, user, attempt.ID, q.ID, entity.Answer{Text: &text}); err != nil {
				t.Fatal(err)
			}
		}
	}
	submitted, err := repo.SubmitAttempt(ctx, user, attempt.ID, 7)
	if err != nil {
		t.Fatal(err)
	}
	if result.Result.ScorePercent != submitted.Result.ScorePercent || result.Result.Passed != submitted.Result.Passed || result.Result.ScorePercent != 66.67 {
		t.Fatalf("preview=%+v кандидат=%+v", result.Result, submitted.Result)
	}
	if _, err = db.Exec(ctx, `UPDATE assessment_previews SET retain_until=clock_timestamp()-interval '1 second' WHERE id=$1`, p.ID); err != nil {
		t.Fatal(err)
	}
	if _, err = repo.GetPreview(ctx, admin, p.ID, false); !errors.Is(err, entity.ErrPreviewNotFound) {
		t.Fatalf("retention: %v", err)
	}
	if err = db.QueryRow(ctx, `SELECT count(*) FROM assessment_previews WHERE id=$1`, p.ID).Scan(&count); err != nil || count != 0 {
		t.Fatalf("очистка: %d %v", count, err)
	}
}

func TestAssessmentPreviewChoiceValidationAndExpiredPassingResult(t *testing.T) {
	db := testDB(t)
	clearDemoBank(t, db)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	admin := assessmentAdmin(t, db)
	q, err := repo.CreateQuestion(ctx, admin, entity.QuestionInput{SkillID: goSkill, Difficulty: 1, Kind: entity.KindChoice,
		Prompt:      entity.Prompt{Text: "Выберите правильные варианты", Options: []entity.Option{{ID: "a", Text: "Первый"}, {ID: "b", Text: "Второй"}, {ID: "c", Text: "Третий"}}},
		GradingSpec: entity.GradingSpec{Type: "choice", Correct: []string{"a", "c"}, Multiple: true}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.PublishVersion(ctx, admin, q.ID, 1); err != nil {
		t.Fatal(err)
	}
	spec, grade := pairIDs(t, db, "backend", "junior")
	tpl, err := repo.CreateTemplate(ctx, admin, entity.TemplateInput{StackSkillID: goSkill, SpecializationID: spec, GradeID: grade, TimeLimitSec: 300, PassScore: 70, Blueprint: []entity.BlueprintRow{{SkillID: goSkill, Difficulty: 1, QuestionCount: 1, Weight: 2}}})
	if err != nil {
		t.Fatal(err)
	}
	p, err := repo.StartPreview(ctx, admin, tpl.ID, "")
	if err != nil {
		t.Fatal(err)
	}
	if p.Questions[0].AnswerForm.Type != "choice" || !p.Questions[0].AnswerForm.Multiple {
		t.Fatal("неверная форма ответа")
	}
	for _, selected := range [][]string{{"unknown"}, {"a", "a"}, {}} {
		var validation *entity.ValidationError
		if err = repo.SavePreviewAnswer(ctx, admin, p.ID, p.Questions[0].ID, entity.Answer{Selected: selected}); !errors.As(err, &validation) {
			t.Fatalf("неверный ответ: %v", err)
		}
	}
	if err = repo.SavePreviewAnswer(ctx, admin, p.ID, p.Questions[0].ID, entity.Answer{Selected: []string{"c", "a"}}); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(ctx, `UPDATE assessment_previews SET started_at=clock_timestamp()-interval '10 minutes',expires_at=clock_timestamp()-interval '5 minutes' WHERE id=$1`, p.ID); err != nil {
		t.Fatal(err)
	}
	done, err := repo.GetPreview(ctx, admin, p.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	if done.Status != "expired" || !done.Result.Passed || done.Result.ScorePercent != 100 || done.Result.CorrectCount != 1 {
		t.Fatalf("просроченный успешный результат: %+v", done)
	}
}
