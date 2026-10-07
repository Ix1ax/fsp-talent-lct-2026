//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
)

// answerWith сохраняет ответы на все задания попытки: верный или заведомо неверный по решению pick.
func answerWith(t *testing.T, db *pgxpool.Pool, repo *assessmentrepo.Repository, user string, attempt entity.Attempt, pick func(q entity.AttemptQuestion) bool) {
	t.Helper()
	for _, q := range attempt.Questions {
		if !pick(q) {
			continue
		}
		if err := repo.SaveAnswer(context.Background(), user, attempt.ID, q.ID, answerFor(t, db, q, true)); err != nil {
			t.Fatalf("ответ на задание %d: %v", q.Position, err)
		}
	}
}

// answerFor строит верный (или неверный) ответ по снимку правил из БД.
func answerFor(t *testing.T, db *pgxpool.Pool, q entity.AttemptQuestion, correct bool) entity.Answer {
	t.Helper()
	var raw []byte
	if err := db.QueryRow(context.Background(), `SELECT grading_snapshot FROM attempt_questions WHERE id=$1`, q.ID).Scan(&raw); err != nil {
		t.Fatal(err)
	}
	var spec entity.GradingSpec
	if err := json.Unmarshal(raw, &spec); err != nil {
		t.Fatal(err)
	}
	if spec.Type == "text" {
		text := "совсем неверно"
		if correct {
			text = spec.Accepted[0]
		}
		return entity.Answer{Text: &text}
	}
	if correct {
		return entity.Answer{Selected: spec.Correct}
	}
	isCorrect := map[string]bool{}
	for _, id := range spec.Correct {
		isCorrect[id] = true
	}
	for _, o := range q.Prompt.Options {
		if !isCorrect[o.ID] {
			return entity.Answer{Selected: []string{o.ID}}
		}
	}
	t.Fatal("нет неверного варианта")
	return entity.Answer{}
}

func countRows(t *testing.T, db *pgxpool.Pool, query string, args ...any) int {
	t.Helper()
	var n int
	if err := db.QueryRow(context.Background(), query, args...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func all(entity.AttemptQuestion) bool { return true }

func TestSubmitPassWritesOutcomes(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	attempt, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, attempt, all)
	done, err := repo.SubmitAttempt(ctx, user, attempt.ID, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	res := done.Result
	if done.Status != "passed" || res == nil || !res.Passed || res.ScorePercent != 100 || len(done.Questions) != 0 || done.FinishedAt == nil {
		t.Fatalf("итог: %+v", done)
	}
	if len(res.Skills) != 3 || res.Category == nil || res.Category.Specialization != "Бэкенд" || res.Category.Grade != "Junior" || res.RetryAt != nil {
		t.Fatalf("навыки и категория: %+v", res)
	}
	for _, sk := range res.Skills {
		if !sk.Confirmed || sk.Level == nil || *sk.Level != 5 || sk.Percent != 100 || sk.Name == "" {
			t.Fatalf("навык: %+v", sk)
		}
	}
	if n := countRows(t, db, `SELECT count(*) FROM skill_evidence WHERE source='test' AND level=5 AND attempt_id=$1`, attempt.ID); n != 3 {
		t.Fatalf("подтверждений: %d", n)
	}
	if n := countRows(t, db, `SELECT count(*) FROM candidate_skills WHERE claimed_level IS NULL`); n != 3 {
		t.Fatalf("навыков без самооценки: %d", n)
	}
	if n := countRows(t, db, `SELECT count(*) FROM grade_history WHERE attempt_id=$1 AND specialization_id=$2 AND grade_id=$3`, attempt.ID, spec, grade); n != 1 {
		t.Fatalf("истории: %d", n)
	}
	if n := countRows(t, db, `SELECT count(*) FROM candidate_categories WHERE attempt_id=$1 AND specialization_id=$2 AND grade_id=$3`, attempt.ID, spec, grade); n != 1 {
		t.Fatalf("категория: %d", n)
	}
	if n := countRows(t, db, `SELECT count(*) FROM attempt_answers WHERE is_correct IS NOT TRUE OR awarded IS NULL`); n != 0 {
		t.Fatalf("неоценённых ответов: %d", n)
	}
}

func TestSubmitFailWritesNothing(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	attempt, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	done, err := repo.SubmitAttempt(ctx, user, attempt.ID, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	if done.Status != "failed" || done.Result.Passed || done.Result.ScorePercent != 0 || done.Result.Category != nil || done.Result.RetryAt == nil {
		t.Fatalf("итог: %+v", done)
	}
	if want := done.FinishedAt.Add(retakeDays * 24 * time.Hour); !done.Result.RetryAt.Equal(want) {
		t.Fatalf("retry_at %v, ожидали %v", done.Result.RetryAt, want)
	}
	for _, sk := range done.Result.Skills {
		if sk.Confirmed || sk.Level != nil {
			t.Fatalf("навык подтверждён при провале: %+v", sk)
		}
	}
	if n := countRows(t, db, `SELECT (SELECT count(*) FROM skill_evidence)+(SELECT count(*) FROM grade_history)+(SELECT count(*) FROM candidate_categories)+(SELECT count(*) FROM candidate_skills)`); n != 0 {
		t.Fatalf("после провала записано строк: %d", n)
	}
}

func TestSkillConfirmedOnlyAboveThreshold(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	attempt, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	// Git (вес 1 из 7) не отвечаем: тест пройден (6/7), навык Git не подтверждён.
	var gitID string
	if err = db.QueryRow(ctx, `SELECT id::text FROM skills WHERE code='git'`).Scan(&gitID); err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, attempt, func(q entity.AttemptQuestion) bool { return q.SkillID != gitID })
	done, err := repo.SubmitAttempt(ctx, user, attempt.ID, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	if done.Status != "passed" || done.Result.ScorePercent != 85.71 {
		t.Fatalf("итог: %+v", done.Result)
	}
	for _, sk := range done.Result.Skills {
		if (sk.SkillID == gitID) == sk.Confirmed {
			t.Fatalf("навык %s: confirmed=%v", sk.Name, sk.Confirmed)
		}
	}
	if n := countRows(t, db, `SELECT count(*) FROM skill_evidence WHERE skill_id=$1`, gitID); n != 0 {
		t.Fatalf("подтверждение слабого навыка записано: %d", n)
	}
	if n := countRows(t, db, `SELECT count(*) FROM skill_evidence`); n != 2 {
		t.Fatalf("подтверждений: %d", n)
	}
}

func TestSubmitIdempotentAndConcurrent(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	attempt, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, attempt, all)
	var wg sync.WaitGroup
	results := make([]entity.Attempt, 10)
	for i := range results {
		wg.Add(1)
		go func() {
			defer wg.Done()
			var err error
			if results[i], err = repo.SubmitAttempt(ctx, user, attempt.ID, retakeDays); err != nil {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	for _, r := range results {
		if r.Status != "passed" || !r.FinishedAt.Equal(*results[0].FinishedAt) {
			t.Fatalf("результаты расходятся: %+v и %+v", r, results[0])
		}
	}
	if n := countRows(t, db, `SELECT count(*) FROM grade_history`); n != 1 {
		t.Fatalf("записей истории: %d", n)
	}
	// Повторное завершение уже закрытой попытки не меняет итог, ответ после закрытия отклоняется.
	again, err := repo.SubmitAttempt(ctx, user, attempt.ID, retakeDays)
	if err != nil || again.Result.ScorePercent != 100 {
		t.Fatalf("повторный submit: %+v (%v)", again, err)
	}
	if err = repo.SaveAnswer(ctx, user, attempt.ID, attempt.Questions[0].ID, answerFor(t, db, attempt.Questions[0], true)); !errors.Is(err, entity.ErrAttemptClosed) {
		t.Fatalf("ответ после закрытия: %v", err)
	}
}

func expire(t *testing.T, db *pgxpool.Pool) {
	t.Helper()
	if _, err := db.Exec(context.Background(), `UPDATE assessment_attempts SET deadline_at=now()-interval '1 second' WHERE status='active'`); err != nil {
		t.Fatal(err)
	}
}

func TestLazyExpiry(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	spec, grade := pairIDs(t, db, "backend", "junior")

	// Без ответов: просрочка закрывает попытку как expired, ответ отклоняется.
	user := attemptCandidate(t, db)
	attempt, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	expire(t, db)
	if err = repo.SaveAnswer(ctx, user, attempt.ID, attempt.Questions[0].ID, answerFor(t, db, attempt.Questions[0], true)); !errors.Is(err, entity.ErrAttemptClosed) {
		t.Fatalf("ответ после дедлайна: %v", err)
	}
	if status := countRows(t, db, `SELECT count(*) FROM assessment_attempts WHERE id=$1 AND status='expired' AND finished_at IS NOT NULL`, attempt.ID); status != 1 {
		t.Fatal("попытка должна быть закрыта как expired")
	}
	if n := countRows(t, db, `SELECT count(*) FROM attempt_answers`); n != 0 {
		t.Fatalf("ответ после дедлайна сохранён: %d", n)
	}

	// Чтение просроченной попытки закрывает её по сохранённым ответам: достаточно верных — passed.
	other := attemptCandidate(t, db)
	second, err := repo.StartAttempt(ctx, other, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, other, second, all)
	expire(t, db)
	got, err := repo.GetAttempt(ctx, other, second.ID, retakeDays)
	if err != nil || got.Status != "passed" || got.Result == nil || got.Result.ScorePercent != 100 {
		t.Fatalf("просроченная с ответами: %+v (%v)", got, err)
	}
}

func TestSubmitVsExpiryRace(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	attempt, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, attempt, all)
	expire(t, db)
	var wg sync.WaitGroup
	for i := 0; i < 6; i++ {
		wg.Add(3)
		go func() {
			defer wg.Done()
			if _, err := repo.SubmitAttempt(ctx, user, attempt.ID, retakeDays); err != nil {
				t.Error(err)
			}
		}()
		go func() {
			defer wg.Done()
			if _, err := repo.GetAttempt(ctx, user, attempt.ID, retakeDays); err != nil {
				t.Error(err)
			}
		}()
		go func() {
			defer wg.Done()
			if err := repo.SaveAnswer(ctx, user, attempt.ID, attempt.Questions[0].ID, answerFor(t, db, attempt.Questions[0], false)); err != nil && !errors.Is(err, entity.ErrAttemptClosed) {
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if n := countRows(t, db, `SELECT count(*) FROM grade_history`); n != 1 {
		t.Fatalf("записей истории: %d", n)
	}
	if n := countRows(t, db, `SELECT count(*) FROM assessment_attempts WHERE status='passed' AND score_percent=100`); n != 1 {
		t.Fatalf("итог попытки изменился во время гонки")
	}
}

func TestSaveAnswerValidation(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	spec, grade := pairIDs(t, db, "backend", "junior")
	user, other := attemptCandidate(t, db), attemptCandidate(t, db)
	mine, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	theirs, err := repo.StartAttempt(ctx, other, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	var choice, text *entity.AttemptQuestion
	for i, q := range mine.Questions {
		if len(q.Prompt.Options) > 0 && choice == nil {
			choice = &mine.Questions[i]
		}
		if len(q.Prompt.Options) == 0 && text == nil {
			text = &mine.Questions[i]
		}
	}
	if choice == nil || text == nil {
		t.Skip("в демо-шаблоне нет обоих видов заданий")
	}
	long := strings.Repeat("я", 501)
	var validation *entity.ValidationError
	for name, tc := range map[string]struct {
		attempt, question string
		answer            entity.Answer
		want              error
	}{
		"чужое задание":       {mine.ID, theirs.Questions[0].ID, entity.Answer{Selected: []string{"a"}}, entity.ErrQuestionNotFound},
		"чужая попытка":       {theirs.ID, mine.Questions[0].ID, entity.Answer{Selected: []string{"a"}}, entity.ErrAttemptNotFound},
		"не uuid":             {mine.ID, "nope", entity.Answer{Selected: []string{"a"}}, entity.ErrQuestionNotFound},
		"неизвестный вариант": {mine.ID, choice.ID, entity.Answer{Selected: []string{"zzz"}}, nil},
		"текст на выбор":      {mine.ID, choice.ID, entity.Answer{Text: &long}, nil},
		"выбор на текст":      {mine.ID, text.ID, entity.Answer{Selected: []string{"a"}}, nil},
		"длинный текст":       {mine.ID, text.ID, entity.Answer{Text: &long}, nil},
	} {
		err := repo.SaveAnswer(ctx, user, tc.attempt, tc.question, tc.answer)
		if tc.want != nil && !errors.Is(err, tc.want) || tc.want == nil && !errors.As(err, &validation) {
			t.Errorf("%s: %v", name, err)
		}
	}
	if n := countRows(t, db, `SELECT count(*) FROM attempt_answers`); n != 0 {
		t.Fatalf("сохранено ответов: %d", n)
	}
	// Ответ можно заменить; сохранённый ответ виден в попытке.
	good := answerFor(t, db, *choice, true)
	bad := answerFor(t, db, *choice, false)
	for _, a := range []entity.Answer{bad, good} {
		if err := repo.SaveAnswer(ctx, user, mine.ID, choice.ID, a); err != nil {
			t.Fatal(err)
		}
	}
	got, err := repo.CurrentAttempt(ctx, user, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	for _, q := range got.Questions {
		if q.ID == choice.ID && (q.Answer == nil || len(q.Answer.Selected) != len(good.Selected) || q.Answer.Selected[0] != good.Selected[0]) {
			t.Fatalf("ответ после замены: %+v", q.Answer)
		}
	}
}

// backendMiddle публикует шаблон backend Middle из заданий демо-банка.
func backendMiddle(t *testing.T, db *pgxpool.Pool, repo *assessmentrepo.Repository) (int16, int16) {
	t.Helper()
	spec, grade := pairIDs(t, db, "backend", "middle")
	admin := assessmentAdmin(t, db)
	tpl, err := repo.CreateTemplate(context.Background(), admin, entity.TemplateInput{SpecializationID: spec, GradeID: grade, TimeLimitSec: 1800, PassScore: 60,
		Blueprint: []entity.BlueprintRow{{SkillID: goSkill, Difficulty: 1, QuestionCount: 3, Weight: 3}}})
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.PublishTemplate(context.Background(), admin, tpl.ID); err != nil {
		t.Fatal(err)
	}
	return spec, grade
}

func TestGradeProgressionAndEvidenceNotLowered(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	jspec, jgrade := pairIDs(t, db, "backend", "junior")
	mspec, mgrade := backendMiddle(t, db, repo)

	junior, err := repo.StartAttempt(ctx, user, jspec, jgrade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, junior, all)
	if _, err = repo.SubmitAttempt(ctx, user, junior.ID, retakeDays); err != nil {
		t.Fatal(err)
	}

	// Тот же грейд закрыт, более высокий доступен сразу.
	if _, err = repo.StartAttempt(ctx, user, jspec, jgrade, retakeDays); !errors.Is(err, entity.ErrAlreadyConfirmed) {
		t.Fatalf("повторный Junior: %v", err)
	}
	items, err := repo.Available(ctx, user, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	for _, it := range items {
		switch {
		case it.SpecializationID == jspec && it.GradeID == jgrade:
			if it.CanStart || it.Reason != "already_confirmed" || !it.Confirmed {
				t.Fatalf("Junior: %+v", it)
			}
		case it.SpecializationID == mspec && it.GradeID == mgrade:
			if !it.CanStart || it.Reason != "ok" {
				t.Fatalf("Middle: %+v", it)
			}
		}
	}

	// Middle: Go подтверждён на 66.67% (уровень 3), прежний уровень 5 не понижается.
	middle, err := repo.StartAttempt(ctx, user, mspec, mgrade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	n := 0
	answerWith(t, db, repo, user, middle, func(entity.AttemptQuestion) bool { n++; return n <= 2 })
	done, err := repo.SubmitAttempt(ctx, user, middle.ID, retakeDays)
	if err != nil || done.Status != "passed" || done.Result.ScorePercent != 66.67 {
		t.Fatalf("Middle: %+v (%v)", done, err)
	}
	if lvl := countRows(t, db, `SELECT level FROM skill_evidence WHERE skill_id=$1`, goSkill); lvl != 5 {
		t.Fatalf("уровень Go понижен до %d", lvl)
	}
	if n := countRows(t, db, `SELECT count(*) FROM skill_evidence WHERE skill_id=$1 AND attempt_id=$2`, goSkill, junior.ID); n != 1 {
		t.Fatal("подтверждение должно остаться за лучшей попыткой")
	}
	if n := countRows(t, db, `SELECT count(*) FROM grade_history`); n != 2 {
		t.Fatalf("история: %d", n)
	}
	if n := countRows(t, db, `SELECT count(*) FROM candidate_categories WHERE specialization_id=$1 AND grade_id=$2 AND attempt_id=$3`, mspec, mgrade, middle.ID); n != 1 {
		t.Fatal("категория должна стать Middle")
	}
}

func TestRetakeAfterCooldown(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	first, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.SubmitAttempt(ctx, user, first.ID, retakeDays); err != nil {
		t.Fatal(err)
	}
	var cooldown *entity.RetakeError
	if _, err = repo.StartAttempt(ctx, user, spec, grade, retakeDays); !errors.Is(err, entity.ErrRetakeCooldown) || !errors.As(err, &cooldown) || cooldown.RetryAt.Before(time.Now().Add(6*24*time.Hour)) {
		t.Fatalf("пересдача сразу: %v", err)
	}
	// Состарим завершённую попытку: триггер защищает её от правок, поэтому отключаем его на время теста.
	for _, q := range []string{`ALTER TABLE assessment_attempts DISABLE TRIGGER attempt_closed_immutable`, `UPDATE assessment_attempts SET finished_at=now()-interval '8 days'`, `ALTER TABLE assessment_attempts ENABLE TRIGGER attempt_closed_immutable`} {
		if _, err = db.Exec(ctx, q); err != nil {
			t.Fatal(err)
		}
	}
	second, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
	if err != nil || second.ID == first.ID {
		t.Fatalf("пересдача через срок: %+v (%v)", second, err)
	}
}
