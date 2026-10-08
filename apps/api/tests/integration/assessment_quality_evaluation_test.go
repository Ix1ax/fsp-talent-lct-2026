//go:build integration

package integration

import (
	"context"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
	"testing"
)

// Синтетические знания заданы независимо от конкретного случайного вопроса:
// слабый не решает задания; средний решает базовые задания, а в backend также Go сложности 2; сильный решает обе сложности.
func TestAssessmentQualityEvaluation(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	for _, specCode := range []string{"backend", "frontend"} {
		for _, gradeCode := range []string{"junior", "middle"} {
			spec, grade := pairIDs(t, db, specCode, gradeCode)
			for _, kind := range []string{"weak", "medium", "strong"} {
				// Повторяем одинаковый профиль знаний на независимых кандидатах: пройденную пару пересдавать нельзя.
				seen := map[string]bool{}
				for trial := 0; trial < 4; trial++ {
					user := attemptCandidate(t, db)
					a, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays)
					if err != nil {
						t.Fatal(err)
					}
					var fingerprint string
					for _, q := range a.Questions {
						var version string
						if err = db.QueryRow(ctx, `SELECT question_version_id::text FROM attempt_questions WHERE id=$1`, q.ID).Scan(&version); err != nil {
							t.Fatal(err)
						}
						fingerprint += version + ";"
					}
					seen[fingerprint] = true
					answerWith(t, db, repo, user, a, func(q entity.AttemptQuestion) bool {
						return kind == "strong" || (kind == "medium" && (q.Difficulty == 1 || (specCode == "backend" && q.SkillID == goSkill)))
					})
					done, err := repo.SubmitAttempt(ctx, user, a.ID, retakeDays)
					if err != nil {
						t.Fatal(err)
					}
					wantPassed := kind == "strong" || (kind == "medium" && gradeCode == "junior")
					if done.Result.Passed != wantPassed {
						t.Fatalf("%s/%s %s: score=%v passed=%v", specCode, gradeCode, kind, done.Result.ScorePercent, done.Result.Passed)
					}
					if kind == "strong" && done.Result.ScorePercent != 100 {
						t.Fatal("Сильный кандидат не получил 100%")
					}
					if kind == "weak" && done.Result.ScorePercent != 0 {
						t.Fatal("Слабый кандидат получил баллы")
					}
					if wantPassed && (done.Result.Category == nil || done.Result.Category.GradeID != grade) {
						t.Fatal("Категория не присвоена")
					}
					if !wantPassed && done.Result.Category != nil {
						t.Fatal("Категория присвоена после провала")
					}
					t.Logf("%s/%s %s trial=%d: %.2f%% passed=%v", specCode, gradeCode, kind, trial+1, done.Result.ScorePercent, done.Result.Passed)
				}
				// Порядок вопросов тоже случайный; фиксируем число разных реальных снимков для отчёта.
				t.Logf("%s/%s %s: %d разных снимков из 4", specCode, gradeCode, kind, len(seen))
			}
		}
	}
}
