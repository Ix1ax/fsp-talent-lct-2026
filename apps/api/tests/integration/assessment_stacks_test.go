//go:build integration

package integration

import (
	"context"
	"errors"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/migrations"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
	candidateentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
)

const javaStack = "00000000-0000-4000-8000-000000000006"

func TestStackSelectionAndQualifications(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	// Нельзя запустить тест другого направления или навыка без шаблона.
	front, _ := pairIDs(t, db, "frontend", "junior")
	if _, err := repo.StartAttempt(ctx, user, front, grade, retakeDays, javaStack); !errors.Is(err, entity.ErrUnavailable) {
		t.Fatal(err)
	}
	for _, stack := range []string{goSkill, javaStack} {
		a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, stack)
		if err != nil {
			t.Fatal(err)
		}
		if a.StackSkillID == nil || *a.StackSkillID != stack || a.StackName == nil {
			t.Fatal(a)
		}
		hasPrimary := false
		for _, q := range a.Questions {
			if q.SkillID == stack {
				hasPrimary = true
			}
			if stack == javaStack && q.SkillID == goSkill {
				t.Fatal("Java получил вопрос Go")
			}
		}
		if !hasPrimary {
			t.Fatal("Нет вопросов основного стека")
		}
		answerWith(t, db, repo, user, a, all)
		done, err := repo.SubmitAttempt(ctx, user, a.ID, retakeDays)
		if err != nil || done.Result.Category == nil || done.Result.Category.StackSkillID == nil || *done.Result.Category.StackSkillID != stack {
			t.Fatal(done, err)
		}
		if _, err = repo.StartAttempt(ctx, user, spec, grade, retakeDays, stack); !errors.Is(err, entity.ErrAlreadyConfirmed) {
			t.Fatal(err)
		}
	}
	full := candidateservice.NewFullProfileService(candidaterepo.NewRepository(db), "v1")
	if _, err := full.PutSurvey(ctx, user, candidateentity.SurveyInput{Industry: "IT", SpecializationID: spec, GradeID: grade, StackSkillID: goSkill}); err != nil {
		t.Fatal(err)
	}
	p, err := full.Get(ctx, user)
	if err != nil || len(p.Qualifications) != 2 || p.Onboarding.NextStep != "complete" {
		t.Fatal(p, err)
	}
	h, err := repo.History(ctx, user, 20, 0)
	if err != nil || len(h.Items) != 2 {
		t.Fatal(h, err)
	}
	for _, item := range h.Items {
		if item.StackSkillID == nil || item.Category.StackSkillID == nil {
			t.Fatal(item)
		}
	}
}

func TestStackScopedTemplatePublication(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	admin := assessmentAdmin(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	// Новая версия Java не архивирует опубликованный Go.
	input := entity.TemplateInput{SpecializationID: spec, GradeID: grade, StackSkillID: javaStack, TimeLimitSec: 600, PassScore: 60, Blueprint: []entity.BlueprintRow{{SkillID: javaStack, Difficulty: 1, QuestionCount: 3, Weight: 3}}}
	tpl, err := repo.CreateTemplate(ctx, admin, input)
	if err != nil {
		t.Fatal(err)
	}
	if tpl.Version != 2 {
		t.Fatal(tpl)
	}
	if _, err = repo.PublishTemplate(ctx, admin, tpl.ID); err != nil {
		t.Fatal(err)
	}
	if n := countRows(t, db, `SELECT count(*) FROM assessment_templates WHERE specialization_id=$1 AND grade_id=$2 AND status='published'`, spec, grade); n != 2 {
		t.Fatal(n)
	}
	page, err := repo.ListTemplates(ctx, entity.TemplateFilter{StackSkillID: javaStack, Status: "published", Limit: 20})
	if err != nil || len(page.Items) != 2 {
		t.Fatal(page, err)
	} // Junior и Middle Java.
	_, err = db.Exec(ctx, `UPDATE assessment_templates SET stack_skill_id=$2 WHERE id=$1`, tpl.ID, goSkill)
	if err == nil {
		t.Fatal("Опубликованный стек изменён")
	}
	input.StackSkillID = goSkill
	if _, err = repo.CreateTemplate(ctx, admin, input); err == nil {
		t.Fatal("Шаблон не проверяет основной навык")
	}
}

func TestPrimaryStackCannotBeCompensatedByOtherSkills(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, javaStack)
	if err != nil {
		t.Fatal(err)
	}
	primaryCorrect := false
	answerWith(t, db, repo, user, a, func(q entity.AttemptQuestion) bool {
		if q.SkillID != javaStack {
			return true
		}
		if !primaryCorrect {
			primaryCorrect = true
			return true
		}
		return false
	})
	done, err := repo.SubmitAttempt(ctx, user, a.ID, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	if done.Result.ScorePercent != 60 || done.Result.Passed || done.Result.Category != nil {
		t.Fatal("Общий балл подтвердил проваленный стек", done)
	}
}

func TestArchivedStackUnavailable(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	if _, err := db.Exec(ctx, `UPDATE skills SET active=false WHERE id=$1`, javaStack); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, javaStack); !errors.Is(err, entity.ErrUnavailable) {
		t.Fatal(err)
	}
	items, err := repo.Available(ctx, user, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	for _, it := range items {
		if it.StackSkillID == javaStack {
			t.Fatal(it)
		}
	}
}

func TestStackMigrationPreservesLegacyAttempt(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	sqlDB := stdlib.OpenDB(*db.Config().ConnConfig)
	defer sqlDB.Close()
	provider, err := goose.NewProvider(goose.DialectPostgres, sqlDB, migrations.Files)
	if err != nil {
		t.Fatal(err)
	}
	// Возвращаем только временную тестовую схему к версии до введения стеков.
	for i := 0; i < 2; i++ {
		if _, err = provider.Down(ctx); err != nil {
			t.Fatal(err)
		}
	}
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	var profile, attempt string
	if err = db.QueryRow(ctx, `SELECT id::text FROM candidate_profiles WHERE user_id=$1`, user).Scan(&profile); err != nil {
		t.Fatal(err)
	}
	if err = db.QueryRow(ctx, `INSERT INTO assessment_attempts(candidate_id,template_id,specialization_id,grade_id,status,deadline_at,finished_at,time_limit_sec,pass_score,score_percent)
 VALUES($1,'b0000000-0000-4000-8000-000000000001',$2,$3,'passed',clock_timestamp(),clock_timestamp(),1800,60,100) RETURNING id::text`, profile, spec, grade).Scan(&attempt); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(ctx, `INSERT INTO grade_history(candidate_id,specialization_id,grade_id,attempt_id) VALUES($1,$2,$3,$4)`, profile, spec, grade, attempt); err != nil {
		t.Fatal(err)
	}
	if _, err = provider.Up(ctx); err != nil {
		t.Fatal(err)
	}
	got, err := assessmentrepo.New(db).GetAttempt(ctx, user, attempt, retakeDays)
	if err != nil || got.Status != "passed" || got.StackSkillID != nil || got.Result.Category.StackSkillID != nil || got.Result.ScorePercent != 100 {
		t.Fatal(got, err)
	}
}
