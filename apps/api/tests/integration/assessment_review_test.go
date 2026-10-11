//go:build integration

package integration

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	admincatalogentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/entity"
	admincatalogrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
	candidateentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

// abandon делает активную попытку просроченной: дедлайн был ago назад.
func abandon(t *testing.T, db *pgxpool.Pool, user string, ago time.Duration) {
	t.Helper()
	if _, err := db.Exec(context.Background(), `UPDATE assessment_attempts SET started_at=now()-make_interval(secs=>$1+1800),deadline_at=now()-make_interval(secs=>$1)
 WHERE status='active' AND candidate_id=(SELECT id FROM candidate_profiles WHERE user_id=$2)`, ago.Seconds(), user); err != nil {
		t.Fatal(err)
	}
}

func attemptStatus(t *testing.T, db *pgxpool.Pool, attemptID string) string {
	t.Helper()
	var status string
	if err := db.QueryRow(context.Background(), `SELECT status FROM assessment_attempts WHERE id=$1`, attemptID).Scan(&status); err != nil {
		t.Fatal(err)
	}
	return status
}

// Брошенный тест не должен блокировать пересдачу: закрытие просроченной попытки сохраняется на любом пути,
// а срок пересдачи считается от дедлайна, а не от момента обращения.
func TestAbandonedAttemptDoesNotBlockRetake(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	spec, grade := pairIDs(t, db, "backend", "junior")
	begin := func() (string, entity.Attempt) {
		user := attemptCandidate(t, db)
		a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
		if err != nil {
			t.Fatal(err)
		}
		return user, a
	}

	user, a := begin()
	abandon(t, db, user, 30*24*time.Hour)
	if _, err := repo.CurrentAttempt(ctx, user, retakeDays); !errors.Is(err, entity.ErrAttemptNotFound) {
		t.Fatalf("текущая: %v", err)
	}
	if got := attemptStatus(t, db, a.ID); got != "expired" {
		t.Fatalf("после /current попытка %q, ожидали expired", got)
	}
	var finished time.Time
	if err := db.QueryRow(ctx, `SELECT finished_at FROM assessment_attempts WHERE id=$1`, a.ID).Scan(&finished); err != nil || finished.After(time.Now().Add(-29*24*time.Hour)) {
		t.Fatalf("finished_at должен быть дедлайном, а не моментом обращения: %v (%v)", finished, err)
	}

	user, a = begin()
	abandon(t, db, user, 30*24*time.Hour)
	items, err := repo.Available(ctx, user, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	for _, it := range items {
		if it.SpecializationID == spec && it.GradeID == grade && (!it.CanStart || it.Reason != "ok") {
			t.Fatalf("давно брошенная попытка блокирует пересдачу: %+v", it)
		}
	}
	if got := attemptStatus(t, db, a.ID); got != "expired" {
		t.Fatalf("после /available попытка %q, ожидали expired", got)
	}

	user, a = begin()
	abandon(t, db, user, 30*24*time.Hour)
	if _, err = repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec)); err != nil {
		t.Fatalf("старт через месяц после брошенной попытки: %v", err)
	}

	// Свежая просрочка: пересдача запрещена, срок от дедлайна, а закрытие сохранено несмотря на отказ.
	user, a = begin()
	abandon(t, db, user, time.Hour)
	var cooldown *entity.RetakeError
	_, err = repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
	if !errors.As(err, &cooldown) {
		t.Fatalf("старт сразу после просрочки: %v", err)
	}
	want := time.Now().Add(-time.Hour).Add(retakeDays * 24 * time.Hour)
	if d := cooldown.RetryAt.Sub(want); d < -time.Minute || d > time.Minute {
		t.Fatalf("retry_at %v, ожидали около %v", cooldown.RetryAt, want)
	}
	if got := attemptStatus(t, db, a.ID); got != "expired" {
		t.Fatalf("после отказа в старте попытка %q, ожидали expired", got)
	}
}

// Просроченная попытка с достаточными ответами фиксирует итоги даже при чтении через /available.
func TestAbandonedPassedAttemptPersistsOutcomes(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	spec, grade := pairIDs(t, db, "backend", "junior")
	user := attemptCandidate(t, db)
	a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, a, all)
	abandon(t, db, user, time.Hour)
	if _, err = repo.Available(ctx, user, retakeDays); err != nil {
		t.Fatal(err)
	}
	if got := attemptStatus(t, db, a.ID); got != "passed" || countRows(t, db, `SELECT count(*) FROM grade_history`) != 1 {
		t.Fatalf("итоги просроченной успешной попытки не сохранены: %s", got)
	}
}

func TestAttemptQuestionExposesSelectionMode(t *testing.T) {
	db := testDB(t)
	clearDemoBank(t, db)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	admin := assessmentAdmin(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	for i, multiple := range []bool{true, false} {
		correct := []string{"a"}
		if multiple {
			correct = []string{"a", "b"}
		}
		q, err := repo.CreateQuestion(ctx, admin, entity.QuestionInput{SkillID: goSkill, Difficulty: int16(i + 1), Kind: entity.KindChoice,
			Prompt:      entity.Prompt{Text: "Что верно?", Options: []entity.Option{{ID: "a", Text: "A"}, {ID: "b", Text: "B"}, {ID: "c", Text: "C"}}},
			GradingSpec: entity.GradingSpec{Type: "choice", Correct: correct, Multiple: multiple}})
		if err != nil {
			t.Fatal(err)
		}
		if _, err = repo.PublishVersion(ctx, admin, q.ID, 1); err != nil {
			t.Fatal(err)
		}
	}
	tpl, err := repo.CreateTemplate(ctx, admin, entity.TemplateInput{StackSkillID: goSkill, SpecializationID: spec, GradeID: grade, TimeLimitSec: 600, PassScore: 50,
		Blueprint: []entity.BlueprintRow{{SkillID: goSkill, Difficulty: 1, QuestionCount: 1, Weight: 1}, {SkillID: goSkill, Difficulty: 2, QuestionCount: 1, Weight: 1}}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.PublishTemplate(ctx, admin, tpl.ID); err != nil {
		t.Fatal(err)
	}
	user := attemptCandidate(t, db)
	a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil || len(a.Questions) != 2 {
		t.Fatalf("%+v %v", a, err)
	}
	if !a.Questions[0].Multiple || a.Questions[1].Multiple {
		t.Fatalf("признак множественного выбора: %+v", a.Questions)
	}
}

// Подтверждения не пишутся по навыкам, которые уже не одобрены, а слияние навыков переносит подтверждения.
func TestEvidenceAndSkillModeration(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	moderation := admincatalogrepo.New(db)
	ctx := context.Background()
	admin := assessmentAdmin(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	skillID := func(code string) string {
		var id string
		if err := db.QueryRow(ctx, `SELECT id::text FROM skills WHERE code=$1`, code).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	git, sql := skillID("git"), skillID("sql")

	user := attemptCandidate(t, db)
	a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, a, all)
	if _, err = db.Exec(ctx, `UPDATE skills SET moderation_status='rejected',active=false WHERE id=$1`, git); err != nil {
		t.Fatal(err)
	}
	done, err := repo.SubmitAttempt(ctx, user, a.ID, retakeDays)
	if err != nil || done.Status != "passed" {
		t.Fatalf("%+v %v", done, err)
	}
	if n := countRows(t, db, `SELECT count(*) FROM skill_evidence WHERE skill_id=$1`, git) + countRows(t, db, `SELECT count(*) FROM candidate_skills WHERE skill_id=$1`, git); n != 0 {
		t.Fatalf("по отклонённому навыку записано строк: %d", n)
	}
	for _, sk := range done.Result.Skills {
		if sk.SkillID == git && sk.Confirmed {
			t.Fatal("отклонённый навык не может быть подтверждён")
		}
	}

	// Слияние go -> sql: подтверждение переезжает и берётся лучший уровень.
	if _, err = db.Exec(ctx, `UPDATE skill_evidence SET level=3 WHERE skill_id=$1`, sql); err != nil {
		t.Fatal(err)
	}
	if _, err = moderation.Moderate(ctx, admin, goSkill, "merged", admincatalogentity.ModerationInput{TargetID: sql}); err != nil {
		t.Fatalf("слияние: %v", err)
	}
	if n := countRows(t, db, `SELECT count(*) FROM skill_evidence WHERE skill_id=$1`, goSkill); n != 0 {
		t.Fatalf("подтверждение осталось на слитом навыке: %d", n)
	}
	if lvl := countRows(t, db, `SELECT level FROM skill_evidence WHERE skill_id=$1`, sql); lvl != 5 {
		t.Fatalf("уровень после слияния %d, ожидали лучший (5)", lvl)
	}
}

// Согласие processing нужно не только на старте: после отзыва ответы не принимаются и итоги не пишутся.
func TestAttemptAfterConsentRevoked(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	spec, grade := pairIDs(t, db, "backend", "junior")
	user := attemptCandidate(t, db)
	a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, a, all)
	if _, err = db.Exec(ctx, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1`, user); err != nil {
		t.Fatal(err)
	}
	if err = repo.SaveAnswer(ctx, user, a.ID, a.Questions[0].ID, answerFor(t, db, a.Questions[0], true)); !errors.Is(err, candidateentity.ErrConsentRequired) {
		t.Fatalf("ответ без согласия: %v", err)
	}
	if _, err = repo.SubmitAttempt(ctx, user, a.ID, retakeDays); !errors.Is(err, candidateentity.ErrConsentRequired) {
		t.Fatalf("submit без согласия: %v", err)
	}
	items, err := repo.Available(ctx, user, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	for _, it := range items {
		if it.CanStart {
			t.Fatalf("без согласия тест нельзя начать: %+v", it)
		}
	}
	// Просрочка закрывает попытку, но данные не обрабатываются.
	abandon(t, db, user, time.Hour)
	if _, err = repo.GetAttempt(ctx, user, a.ID, retakeDays); err != nil {
		t.Fatal(err)
	}
	if n := countRows(t, db, `SELECT (SELECT count(*) FROM skill_evidence)+(SELECT count(*) FROM grade_history)+(SELECT count(*) FROM candidate_categories)+(SELECT count(*) FROM candidate_skills)`); n != 0 {
		t.Fatalf("после отзыва согласия записано строк: %d", n)
	}
}

func TestStartUnknownGradeAfterPass(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	spec, grade := pairIDs(t, db, "backend", "junior")
	user := attemptCandidate(t, db)
	a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, a, all)
	if _, err = repo.SubmitAttempt(ctx, user, a.ID, retakeDays); err != nil {
		t.Fatal(err)
	}
	if _, err = repo.StartAttempt(ctx, user, spec, 99, retakeDays, defaultTestStack(spec)); !errors.Is(err, entity.ErrUnavailable) {
		t.Fatalf("неизвестный грейд: %v", err)
	}
}
