//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
	candidateentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

const retakeDays = 7

// attemptCandidate создаёт активного кандидата с профилем и согласием processing.
func attemptCandidate(t *testing.T, db *pgxpool.Pool) string {
	t.Helper()
	ctx := context.Background()
	var user string
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1)`, user); err != nil {
		t.Fatal(err)
	}
	grantConsentRows(t, db, user, "processing")
	return user
}

func demoTemplateSize(t *testing.T, db *pgxpool.Pool, spec, grade int16) int {
	t.Helper()
	var n int
	if err := db.QueryRow(context.Background(), `SELECT sum(b.question_count) FROM assessment_blueprints b JOIN assessment_templates t ON t.id=b.template_id WHERE t.specialization_id=$1 AND t.grade_id=$2 AND t.status='published'`, spec, grade).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestStartAttemptSnapshotsWithoutGradingSpec(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")

	attempt, err := repo.StartAttempt(context.Background(), user, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	if attempt.Status != "active" || len(attempt.Questions) != demoTemplateSize(t, db, spec, grade) || attempt.Result != nil {
		t.Fatalf("попытка: %+v", attempt)
	}
	if !attempt.DeadlineAt.After(attempt.StartedAt) || attempt.TimeLimitSec != 1800 {
		t.Fatalf("дедлайн: %v..%v, лимит %d", attempt.StartedAt, attempt.DeadlineAt, attempt.TimeLimitSec)
	}
	raw, _ := json.Marshal(attempt)
	for _, leak := range []string{"grading", "correct", "accepted", "case_sensitive"} {
		if strings.Contains(string(raw), leak) {
			t.Fatalf("в ответе кандидату есть %q: %s", leak, raw)
		}
	}
	seen := map[string]bool{}
	for i, q := range attempt.Questions {
		if q.Position != i+1 || seen[q.ID] || q.Prompt.Text == "" || q.Answer != nil {
			t.Fatalf("задание %d: %+v", i, q)
		}
		seen[q.ID] = true
	}
	var snapshots int
	if err := db.QueryRow(context.Background(), `SELECT count(*) FROM attempt_questions WHERE attempt_id=$1 AND grading_snapshot ? 'type'`, attempt.ID).Scan(&snapshots); err != nil || snapshots != len(attempt.Questions) {
		t.Fatalf("снимков правил: %d (%v)", snapshots, err)
	}
}

func TestStartAttemptOneActive(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	fspec, fgrade := pairIDs(t, db, "frontend", "junior")

	first, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	var active *entity.ActiveError
	_, err = repo.StartAttempt(ctx, user, fspec, fgrade, retakeDays)
	if !errors.Is(err, entity.ErrAttemptActive) || !errors.As(err, &active) || active.AttemptID != first.ID {
		t.Fatalf("второй старт: %v", err)
	}

	other := attemptCandidate(t, db)
	var started, rejected atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := repo.StartAttempt(ctx, other, spec, grade, retakeDays)
			switch {
			case err == nil:
				started.Add(1)
			case errors.Is(err, entity.ErrAttemptActive):
				rejected.Add(1)
			default:
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if started.Load() != 1 || rejected.Load() != 9 {
		t.Fatalf("стартовало %d, отклонено %d", started.Load(), rejected.Load())
	}
}

func TestStartAttemptUnavailable(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")

	// Для пары без шаблона и для неизвестных справочников.
	for _, pair := range [][2]int16{{3, 4}, {99, 99}} {
		if _, err := repo.StartAttempt(ctx, user, pair[0], pair[1], retakeDays); !errors.Is(err, entity.ErrUnavailable) {
			t.Fatalf("пара %v: %v", pair, err)
		}
	}
	// Банк сократился после публикации шаблона: неполный тест не выдаётся.
	if _, err := db.Exec(ctx, `UPDATE assessment_questions SET active=false WHERE skill_id=$1`, goSkill); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays); !errors.Is(err, entity.ErrUnavailable) {
		t.Fatalf("банк сократился: %v", err)
	}
	var attempts int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM assessment_attempts`).Scan(&attempts); err != nil || attempts != 0 {
		t.Fatalf("попыток создано: %d (%v)", attempts, err)
	}
}

func TestStartAttemptRequiresActiveCandidate(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	spec, grade := pairIDs(t, db, "backend", "junior")
	newUser := func(role, status string, profile bool, consent bool) string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES($1,$2) RETURNING id::text`, role, status).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if profile {
			if _, err := db.Exec(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1)`, id); err != nil {
				t.Fatal(err)
			}
		}
		if consent {
			grantConsentRows(t, db, id, "processing")
		}
		return id
	}
	for name, tc := range map[string]struct {
		user string
		want error
	}{
		"нет профиля":     {newUser("candidate", "active", false, true), candidateentity.ErrNotFound},
		"нет согласия":    {newUser("candidate", "active", true, false), candidateentity.ErrConsentRequired},
		"работодатель":    {newUser("employer", "active", false, false), candidateentity.ErrForbidden},
		"заблокированный": {newUser("candidate", "blocked", true, true), candidateentity.ErrForbidden},
	} {
		if _, err := repo.StartAttempt(ctx, tc.user, spec, grade, retakeDays); !errors.Is(err, tc.want) {
			t.Errorf("%s: %v", name, err)
		}
		if _, err := repo.Available(ctx, tc.user, retakeDays); tc.want != candidateentity.ErrConsentRequired && !errors.Is(err, tc.want) {
			t.Errorf("%s, список: %v", name, err)
		}
	}
}

func TestAttemptSnapshotSurvivesBankChanges(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")

	attempt, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(ctx, `UPDATE assessment_question_versions SET status='archived' WHERE status='published'`); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(ctx, `UPDATE assessment_questions SET active=false`); err != nil {
		t.Fatal(err)
	}
	again, err := repo.GetAttempt(ctx, user, attempt.ID, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	before, _ := json.Marshal(attempt.Questions)
	after, _ := json.Marshal(again.Questions)
	if string(before) != string(after) || again.Status != "active" {
		t.Fatalf("задания изменились:\n%s\n%s", before, after)
	}
	current, err := repo.CurrentAttempt(ctx, user, retakeDays)
	if err != nil || current.ID != attempt.ID {
		t.Fatalf("текущая попытка: %+v (%v)", current, err)
	}
}

func TestGetAttemptIsPrivate(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	owner, stranger := attemptCandidate(t, db), attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	attempt, err := repo.StartAttempt(ctx, owner, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.GetAttempt(ctx, stranger, attempt.ID, retakeDays); !errors.Is(err, entity.ErrAttemptNotFound) {
		t.Fatalf("чужая попытка: %v", err)
	}
	if _, err = repo.CurrentAttempt(ctx, stranger, retakeDays); !errors.Is(err, entity.ErrAttemptNotFound) {
		t.Fatalf("нет активной: %v", err)
	}
}

func TestAvailableStates(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	fspec, fgrade := pairIDs(t, db, "frontend", "junior")
	find := func(items []entity.AvailableTemplate, s, g int16) entity.AvailableTemplate {
		for _, it := range items {
			if it.SpecializationID == s && it.GradeID == g {
				return it
			}
		}
		t.Fatalf("нет шаблона %d/%d в %+v", s, g, items)
		return entity.AvailableTemplate{}
	}

	items, err := repo.Available(ctx, user, retakeDays)
	if err != nil || len(items) != 4 {
		t.Fatalf("список: %+v (%v)", items, err)
	}
	if b := find(items, spec, grade); !b.CanStart || b.Reason != "ok" || b.QuestionCount != demoTemplateSize(t, db, spec, grade) || b.PassScore != 60 || b.TimeLimitSec != 1800 {
		t.Fatalf("backend: %+v", b)
	}

	if _, err = repo.StartAttempt(ctx, user, spec, grade, retakeDays); err != nil {
		t.Fatal(err)
	}
	items, _ = repo.Available(ctx, user, retakeDays)
	for _, it := range items {
		if it.CanStart || it.Reason != "attempt_active" {
			t.Fatalf("во время попытки: %+v", it)
		}
	}

	// Попытка просрочена: ленивое закрытие, провал и срок пересдачи только для этой пары.
	if _, err = db.Exec(ctx, `UPDATE assessment_attempts SET deadline_at=now()-interval '1 minute'`); err != nil {
		t.Fatal(err)
	}
	items, err = repo.Available(ctx, user, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	b := find(items, spec, grade)
	if b.CanStart || b.Reason != "retake_cooldown" || b.RetryAt == nil || b.RetryAt.Before(time.Now().Add(6*24*time.Hour)) {
		t.Fatalf("после просрочки: %+v", b)
	}
	if f := find(items, fspec, fgrade); !f.CanStart || f.Reason != "ok" {
		t.Fatalf("другая пара: %+v", f)
	}
}
