//go:build integration

package integration

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	adminentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/entity"
	adminrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/repository"
	assessmententity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
	assessmentservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/service"
	candidateentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"strings"
	"sync"
	"testing"
)

func TestCandidateSurveyAndExport(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	repo := candidaterepo.NewRepository(db)
	s := candidateservice.NewFullProfileService(repo, "v1")
	spec, grade := pairIDs(t, db, "backend", "junior")
	in := candidateentity.SurveyInput{StackSkillID: goSkill, Industry: "IT", SpecializationID: spec, GradeID: grade, SoftSkills: []string{"Коммуникация"}}
	if _, err := s.PutSurvey(ctx, user, in); err != nil {
		t.Fatal(err)
	}
	p, err := s.Get(ctx, user)
	if err != nil || p.Onboarding.NextStep != "test" || p.Category != nil || p.Onboarding.Survey == nil {
		t.Fatal(p, err)
	}
	if data, err := s.ExportPDF(ctx, user); err != nil || len(data) == 0 {
		t.Fatal(err)
	}
	attempt, err := assessmentrepo.New(db).StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	p, err = s.Get(ctx, user)
	if err != nil || p.Onboarding.NextStep != "in_progress" || p.Onboarding.LatestAttempt.ID != attempt.ID {
		t.Fatal(p, err)
	}
	in.SpecializationID = 32767
	if _, err = s.PutSurvey(ctx, user, in); err == nil {
		t.Fatal("Неизвестная специализация принята")
	}
	if _, err = db.Exec(ctx, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1 AND kind='processing'`, user); err != nil {
		t.Fatal(err)
	}
	if _, err = s.ExportPDF(ctx, user); !errors.Is(err, candidateentity.ErrConsentRequired) {
		t.Fatal(err)
	}
	if _, err = s.PutSurvey(ctx, user, in); !errors.Is(err, candidateentity.ErrConsentRequired) {
		t.Fatal(err)
	}
}
func TestSkillMergeDuringAttempt(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	repo := assessmentrepo.New(db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, a, all)
	var target string
	if err = db.QueryRow(ctx, `INSERT INTO skills(code,name,active,moderation_status) VALUES('golang-target','Go канонический',true,'approved') RETURNING id::text`).Scan(&target); err != nil {
		t.Fatal(err)
	}
	if _, err = adminrepo.New(db).Moderate(ctx, assessmentAdmin(t, db), goSkill, "merged", adminentity.ModerationInput{TargetID: target}); err != nil {
		t.Fatal(err)
	}
	done, err := repo.SubmitAttempt(ctx, user, a.ID, retakeDays)
	if err != nil || !done.Result.Passed {
		t.Fatal(done, err)
	}
	history, err := repo.History(ctx, user, 20, 0)
	if err != nil || history.Total != 1 || history.Items[0].Category == nil {
		t.Fatal("История результата", history, err)
	}
	other := attemptCandidate(t, db)
	history, err = repo.History(ctx, other, 20, 0)
	if err != nil || history.Total != 0 {
		t.Fatal("Чужая история", history, err)
	}
	found := false
	for _, sk := range done.Result.Skills {
		if sk.SkillID == goSkill {
			t.Fatal("Старый ID после объединения")
		}
		if sk.SkillID == target && sk.Confirmed {
			found = true
		}
	}
	if !found || countRows(t, db, `SELECT count(*) FROM skill_evidence WHERE skill_id=$1 AND attempt_id=$2`, target, a.ID) != 1 {
		t.Fatal("Подтверждение потерялось")
	}
	if countRows(t, db, `SELECT count(*) FROM attempt_questions WHERE attempt_id=$1 AND skill_id=$2`, a.ID, goSkill) == 0 {
		t.Fatal("История вопросов переписана")
	}
}
func TestGradeChangeBlocksParallelStarts(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	repo := assessmentrepo.New(db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, a, all)
	done, err := repo.SubmitAttempt(ctx, user, a.ID, retakeDays)
	if err != nil || done.Result.NextGradeChangeAt == nil {
		t.Fatal(done, err)
	}
	ms, mg := pairIDs(t, db, "frontend", "middle")
	errs := make(chan error, 5)
	var wg sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, e := repo.StartAttempt(ctx, user, ms, mg, retakeDays, defaultTestStack(ms))
			errs <- e
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if !errors.Is(err, assessmententity.ErrGradeChangeCooldown) {
			t.Fatal(err)
		}
	}
	if countRows(t, db, `SELECT count(*) FROM assessment_attempts WHERE status='active'`) != 0 {
		t.Fatal("Начат тест в интервале ограничения")
	}
}

func TestCandidateCompletionHTTPPrivacy(t *testing.T) {
	f := newOfferFixture(t)
	for _, who := range []string{"candidate", "other_candidate", "no_profile"} {
		grantConsentRows(t, f.db, f.ids[who], "processing")
	}
	repo := candidaterepo.NewRepository(f.db)
	old := f.auth.Store.Users
	f.auth = testutil.NewAuthEnvWithOptions(t, httpapi.Options{Candidates: candidateservice.NewProfileService(repo), CandidateFull: candidateservice.NewFullProfileService(repo, "v1"), AssessmentAttempts: assessmentservice.NewAttempts(assessmentrepo.New(f.db), retakeDays)})
	f.auth.Store.Users = old
	for who := range f.tokens {
		f.tokens[who] = f.auth.Token(t, who)
	}
	spec, grade := pairIDs(t, f.db, "backend", "junior")
	body := fmt.Sprintf(`{"stack_skill_id":"00000000-0000-4000-8000-000000000001","industry":"IT","specialization_id":%d,"grade_id":%d,"soft_skills":["Коммуникация"]}`, spec, grade)
	f.request(t, "PUT", "/api/v1/me/profile/onboarding", "candidate", body, 200)
	f.request(t, "PUT", "/api/v1/me/profile/onboarding", "owner", body, 403)
	f.request(t, "PUT", "/api/v1/me/profile/onboarding", "no_profile", body, 404)
	w := f.request(t, "GET", "/api/v1/me/profile/onboarding", "other_candidate", "", 200)
	if strings.Contains(w.Body.String(), "Коммуникация") {
		t.Fatal("Чужой опрос раскрыт")
	}
	w = f.request(t, "GET", "/api/v1/me/profile/export.pdf", "candidate", "", 200)
	if !bytes.HasPrefix(w.Body.Bytes(), []byte("%PDF-")) || w.Header().Get("Cache-Control") != "private, no-store" || w.Header().Get("Content-Disposition") == "" {
		t.Fatal("Неверный ответ экспорта")
	}
	f.request(t, "GET", "/api/v1/me/profile/export.pdf", "owner", "", 403)
	f.request(t, "GET", "/api/v1/me/profile/export.pdf", "no_profile", "", 404)
	f.request(t, "GET", "/api/v1/me/assessments/history?limit=0", "candidate", "", 400)
	a, err := assessmentrepo.New(f.db).StartAttempt(context.Background(), f.ids["candidate"], spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	w = f.request(t, "GET", "/api/v1/me/assessments/history", "candidate", "", 200)
	if !strings.Contains(w.Body.String(), a.ID) || strings.Contains(w.Body.String(), "grading_snapshot") {
		t.Fatal("Неверный состав истории")
	}
	w = f.request(t, "GET", "/api/v1/me/assessments/history", "other_candidate", "", 200)
	if strings.Contains(w.Body.String(), a.ID) {
		t.Fatal("Чужая история раскрыта")
	}
	f.exec(t, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1 AND kind='processing'`, f.ids["candidate"])
	f.request(t, "GET", "/api/v1/me/profile/export.pdf", "candidate", "", 409)
	f.request(t, "PUT", "/api/v1/me/profile/onboarding", "candidate", body, 409)
	f.request(t, "GET", "/api/v1/me/assessments/history", "candidate", "", 200)
}

func TestFailedPromotionKeepsCategory(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, a, all)
	if _, err = repo.SubmitAttempt(ctx, user, a.ID, retakeDays); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(ctx, `UPDATE grade_history SET achieved_at=clock_timestamp()-interval '8 days' WHERE candidate_id=(SELECT id FROM candidate_profiles WHERE user_id=$1)`, user); err != nil {
		t.Fatal(err)
	}
	_, middle := pairIDs(t, db, "backend", "middle")
	a, err = repo.StartAttempt(ctx, user, spec, middle, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	done, err := repo.SubmitAttempt(ctx, user, a.ID, retakeDays)
	if err != nil || done.Result.Passed {
		t.Fatal(done, err)
	}
	if countRows(t, db, `SELECT count(*) FROM candidate_categories WHERE candidate_id=(SELECT id FROM candidate_profiles WHERE user_id=$1) AND grade_id=$2`, user, grade) != 1 {
		t.Fatal("Категория понизилась после провала")
	}
	if countRows(t, db, `SELECT count(*) FROM grade_history WHERE candidate_id=(SELECT id FROM candidate_profiles WHERE user_id=$1)`, user) != 1 {
		t.Fatal("История изменилась после провала")
	}
}
