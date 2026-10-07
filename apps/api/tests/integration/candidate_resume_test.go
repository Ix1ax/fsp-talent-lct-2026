//go:build integration

package integration

import (
	"context"
	"errors"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
)

func TestResumeImportAccess(t *testing.T) {
	db := testDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()

	employer := careerUser(t, db, "employer", "active", false)
	blocked := careerUser(t, db, "candidate", "blocked", true)
	grantConsentRows(t, db, blocked, "processing")
	for name, user := range map[string]string{"работодатель": employer, "заблокированный": blocked} {
		if err := repo.ImportAccess(ctx, user); !errors.Is(err, entity.ErrForbidden) {
			t.Errorf("%s: %v", name, err)
		}
	}

	noConsent := careerUser(t, db, "candidate", "active", true)
	if err := repo.ImportAccess(ctx, noConsent); !errors.Is(err, entity.ErrConsentRequired) {
		t.Errorf("без согласия: %v", err)
	}

	// Согласие с привязкой к компании и отозванное согласие не считаются.
	var company string
	if err := db.QueryRow(ctx, `INSERT INTO companies(name,contact_email) VALUES('Компания','hr@example.test') RETURNING id::text`).Scan(&company); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO candidate_consents(user_id,kind,policy_version,company_id) VALUES($1,'ats_transfer','v1',$2)`, noConsent, company); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO candidate_consents(user_id,kind,policy_version,granted_at,revoked_at) VALUES($1,'processing','v1',now()-interval '2 days',now()-interval '1 day')`, noConsent); err != nil {
		t.Fatal(err)
	}
	if err := repo.ImportAccess(ctx, noConsent); !errors.Is(err, entity.ErrConsentRequired) {
		t.Errorf("привязанное и отозванное согласие: %v", err)
	}

	// Профиль не нужен: кандидат с активным processing может импортировать при онбординге.
	noProfile := careerUser(t, db, "candidate", "active", false)
	grantConsentRows(t, db, noProfile, "processing")
	if err := repo.ImportAccess(ctx, noProfile); err != nil {
		t.Errorf("без профиля с согласием: %v", err)
	}
}

func TestResumeMatchSkills(t *testing.T) {
	db := testDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()
	skillByCode := func(code string) string {
		var id string
		if err := db.QueryRow(ctx, `SELECT id::text FROM skills WHERE code=$1`, code).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	pending := newSkill(t, db, "pending_skill", false, "pending")
	rejected := newSkill(t, db, "rejected_skill", false, "rejected")
	inactive := newSkill(t, db, "inactive_skill", false, "approved")
	_, _, _ = pending, rejected, inactive

	got, err := repo.MatchSkills(ctx, []string{"Go", "GOLANG", "javascript", "JS", "Неизвестный", "Навык pending_skill", "Навык rejected_skill", "Навык inactive_skill", "go"})
	if err != nil {
		t.Fatal(err)
	}
	if got["go"] != skillByCode("go") || got["golang"] != skillByCode("go") {
		t.Fatalf("Go и алиас golang: %v", got)
	}
	if got["javascript"] != skillByCode("javascript") || got["js"] != skillByCode("javascript") {
		t.Fatalf("JavaScript и алиас js: %v", got)
	}
	for _, name := range []string{"неизвестный", "навык pending_skill", "навык rejected_skill", "навык inactive_skill"} {
		if _, ok := got[name]; ok {
			t.Errorf("%q не должен сопоставляться: %v", name, got)
		}
	}
	// По коду навыка тоже находится; не одобренные навыки по коду не находятся.
	byCode, err := repo.MatchSkills(ctx, []string{"typescript", "pending_skill", "rejected_skill", "inactive_skill"})
	if err != nil || byCode["typescript"] != skillByCode("typescript") || len(byCode) != 1 {
		t.Fatalf("по коду: %v (%v)", byCode, err)
	}
	if empty, err := repo.MatchSkills(ctx, nil); err != nil || len(empty) != 0 {
		t.Fatalf("пустой список: %v (%v)", empty, err)
	}
}

func TestResumeWorkFormatIDs(t *testing.T) {
	db := testDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()
	ids, err := repo.WorkFormatIDs(ctx, []string{"remote", "unknown", "office", "remote"})
	if err != nil || len(ids) != 2 || ids[0] != 3 || ids[1] != 1 {
		t.Fatalf("форматы: %v (%v)", ids, err)
	}
	if empty, err := repo.WorkFormatIDs(ctx, nil); err != nil || len(empty) != 0 {
		t.Fatalf("пустой список: %v (%v)", empty, err)
	}
}
