package service

import (
	"context"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	consententity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
)

type fullStub struct{ snapshot entity.FullSnapshot }

func (f fullStub) FullSnapshot(context.Context, string) (entity.FullSnapshot, error) {
	return f.snapshot, nil
}

func active(kind string) consententity.Consent {
	return consententity.Consent{ID: "c-" + kind, Kind: kind, PolicyVersion: "v1", GrantedAt: time.Now()}
}

func doneCodes(r entity.Readiness) map[string]bool {
	done := map[string]bool{}
	for _, item := range r.Items {
		done[item.Code] = item.Done
	}
	return done
}

func TestFullProfileWithoutProfile(t *testing.T) {
	s := NewFullProfileService(fullStub{entity.FullSnapshot{Consents: []consententity.Consent{active("processing")}}}, "v7")
	got, err := s.Get(context.Background(), "u1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Profile != nil || got.Contacts != nil || got.Category != nil {
		t.Fatalf("профиля, контактов и категории нет: %+v", got)
	}
	if got.Skills == nil || got.Achievements == nil || got.Consents.Items == nil || len(got.Skills) != 0 || len(got.Achievements) != 0 {
		t.Fatalf("массивы не должны быть nil: skills=%v achievements=%v consents=%v", got.Skills, got.Achievements, got.Consents.Items)
	}
	if got.Consents.CurrentPolicyVersion != "v7" || len(got.Consents.Items) != 1 {
		t.Fatalf("согласия: %+v", got.Consents)
	}
	done := doneCodes(got.Readiness)
	if !done["consent_processing"] || done["profile"] || got.Readiness.ReadyToPublish {
		t.Fatalf("готовность без профиля: %+v", got.Readiness)
	}
}

func TestFullProfileHidesContactsWithoutProcessing(t *testing.T) {
	contacts := &entity.Contacts{ContactsInput: entity.ContactsInput{FullName: "Иван", Email: "a@b.ru"}}
	snapshot := entity.FullSnapshot{Profile: &entity.Profile{ID: "p"}, Contacts: contacts, Consents: []consententity.Consent{active("publication")}}
	got, err := NewFullProfileService(fullStub{snapshot}, "v1").Get(context.Background(), "u1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Contacts != nil || doneCodes(got.Readiness)["contacts"] {
		t.Fatalf("без processing контакты скрыты и пункт не выполнен: %+v", got)
	}
	// Согласие, выданное компании (ats_transfer), не заменяет общего processing.
	company := "0b7d3b1e-8f3a-4c58-9d3e-5a1f2c3d4e5f"
	other := consententity.Consent{ID: "c1", Kind: "processing", CompanyID: &company}
	snapshot.Consents = []consententity.Consent{other}
	if got, _ = NewFullProfileService(fullStub{snapshot}, "v1").Get(context.Background(), "u1"); got.Contacts != nil {
		t.Fatal("согласие с company_id не должно открывать контакты")
	}
}

func TestFullProfileReady(t *testing.T) {
	contacts := &entity.Contacts{ContactsInput: entity.ContactsInput{FullName: "Иван", Email: "a@b.ru"}}
	snapshot := entity.FullSnapshot{
		Profile:  &entity.Profile{ID: "p", ProfileInput: entity.ProfileInput{WorkFormatIDs: []int16{1}}},
		Contacts: contacts,
		Consents: []consententity.Consent{active("processing"), active("publication")},
		Skills:   []entity.Skill{{SkillID: "s1", ModerationStatus: "pending"}},
	}
	got, err := NewFullProfileService(fullStub{snapshot}, "v1").Get(context.Background(), "u1")
	if err != nil {
		t.Fatal(err)
	}
	if got.Contacts == nil || !got.Readiness.ReadyToPublish || got.Readiness.Percent != 55 {
		t.Fatalf("готовый профиль (навык на модерации засчитан): %+v", got.Readiness)
	}
	if len(got.Skills) != 1 || got.Skills[0].ModerationStatus != "pending" {
		t.Fatalf("навыки: %+v", got.Skills)
	}
}

func TestFullProfileCarriesCategory(t *testing.T) {
	now := time.Now()
	category := &entity.Category{SpecializationID: 1, Specialization: "Бэкенд", GradeID: 2, Grade: "Junior", ConfirmedAt: now}
	s := NewFullProfileService(fullStub{entity.FullSnapshot{Category: category}}, "v1")
	got, err := s.Get(context.Background(), "u1")
	if err != nil || got.Category == nil || got.Category.Grade != "Junior" || !got.Category.ConfirmedAt.Equal(now) {
		t.Fatalf("категория: %+v (%v)", got.Category, err)
	}
}

func TestFullProfileCareerEmptyAndEstimate(t *testing.T) {
	now := time.Date(2026, 10, 8, 0, 0, 0, 0, time.UTC)
	s := NewFullProfileService(fullStub{entity.FullSnapshot{}}, "v1")
	s.now = func() time.Time { return now }
	got, err := s.Get(context.Background(), "u1")
	if err != nil || got.Experience == nil || got.Education == nil || len(got.Experience) != 0 || len(got.Education) != 0 || got.ExperienceEstimatedMonths != nil {
		t.Fatalf("пустой снимок: %+v (%v)", got, err)
	}

	from, to := entity.NewMonth(2022, 11), entity.NewMonth(2023, 1)
	snapshot := entity.FullSnapshot{
		Experience: []entity.Experience{{ID: "e1", ExperienceInput: entity.ExperienceInput{Company: "К", Position: "Р", StartedOn: from, EndedOn: &to}}},
		Education:  []entity.Education{{ID: "d1", EducationInput: entity.EducationInput{Level: "higher", Institution: "У", GraduationYear: 2027}}},
	}
	s = NewFullProfileService(fullStub{snapshot}, "v1")
	s.now = func() time.Time { return now }
	got, err = s.Get(context.Background(), "u1")
	if err != nil || len(got.Experience) != 1 || len(got.Education) != 1 || got.ExperienceEstimatedMonths == nil || *got.ExperienceEstimatedMonths != 3 {
		t.Fatalf("с записями: %+v (%v)", got, err)
	}
}
