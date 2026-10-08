//go:build integration

package integration

import (
	"context"
	"testing"

	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
)

func TestFullProfileCategoryAndTestEvidence(t *testing.T) {
	db := testDB(t)
	repo := assessmentrepo.New(db)
	full := candidateservice.NewFullProfileService(candidaterepo.NewRepository(db), "v1")
	skills := candidaterepo.NewRepository(db)
	ctx := context.Background()
	user := attemptCandidate(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")

	// Самооценка Go до теста: навык с источником claimed.
	if _, err := skills.PutSkill(ctx, user, goSkill, skillLevel(2)); err != nil {
		t.Fatal(err)
	}
	before, err := full.Get(ctx, user)
	if err != nil || before.Category != nil || len(before.Skills) != 1 || before.Skills[0].Source != "claimed" || before.Skills[0].VerifiedLevel != nil {
		t.Fatalf("до теста: %+v (%v)", before, err)
	}

	attempt, err := repo.StartAttempt(ctx, user, spec, grade, retakeDays, defaultTestStack(spec))
	if err != nil {
		t.Fatal(err)
	}
	answerWith(t, db, repo, user, attempt, all)
	if _, err = repo.SubmitAttempt(ctx, user, attempt.ID, retakeDays); err != nil {
		t.Fatal(err)
	}

	after, err := full.Get(ctx, user)
	if err != nil {
		t.Fatal(err)
	}
	c := after.Category
	if c == nil || c.SpecializationID != spec || c.GradeID != grade || c.Specialization != "Бэкенд" || c.Grade != "Junior" || c.ConfirmedAt.IsZero() {
		t.Fatalf("категория: %+v", c)
	}
	if len(after.Skills) != 3 {
		t.Fatalf("навыков: %d", len(after.Skills))
	}
	for _, sk := range after.Skills {
		if sk.Source != "test" || sk.Confidence != 0.8 || sk.VerifiedLevel == nil || *sk.VerifiedLevel != 5 {
			t.Fatalf("навык после теста: %+v", sk)
		}
		switch sk.SkillID {
		case goSkill:
			if sk.ClaimedLevel == nil || *sk.ClaimedLevel != 2 {
				t.Fatalf("самооценка Go потеряна: %+v", sk)
			}
		default:
			if sk.ClaimedLevel != nil {
				t.Fatalf("у навыка из теста нет самооценки: %+v", sk)
			}
		}
	}

	// Навыки из теста можно убрать из списка кандидата так же, как любые другие; подтверждение при этом не мешает.
	if err = skills.DeleteSkill(ctx, user, goSkill); err != nil {
		t.Fatalf("удаление навыка с подтверждением: %v", err)
	}
}
