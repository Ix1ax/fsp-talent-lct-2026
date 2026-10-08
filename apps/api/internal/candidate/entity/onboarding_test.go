package entity

import (
	"testing"
	"time"
)

func TestOnboardingSteps(t *testing.T) {
	now := time.Now()
	p := &Profile{ID: "p"}
	s := &Survey{SurveyInput: SurveyInput{StackSkillID: "00000000-0000-4000-8000-000000000001", SpecializationID: 1, GradeID: 2}}
	cases := []struct {
		consent bool
		p       *Profile
		s       *Survey
		a       *OnboardingAttempt
		c       *Category
		want    string
	}{
		{false, p, s, nil, nil, "consent"}, {true, nil, nil, nil, nil, "profile"}, {true, p, nil, nil, nil, "survey"}, {true, p, s, nil, nil, "test"},
		{true, p, s, &OnboardingAttempt{Status: "active", DeadlineAt: now.Add(time.Hour)}, nil, "in_progress"},
		{true, p, s, &OnboardingAttempt{Status: "active", DeadlineAt: now.Add(-time.Hour)}, nil, "test"},
		{true, p, s, nil, &Category{StackSkillID: ptrStack("00000000-0000-4000-8000-000000000001"), SpecializationID: 1, GradeID: 2}, "complete"}, {true, p, s, nil, &Category{StackSkillID: ptrStack("00000000-0000-4000-8000-000000000001"), SpecializationID: 1, GradeID: 3}, "test"},
	}
	for _, c := range cases {
		got := BuildOnboarding(c.consent, c.p, c.s, c.a, c.c, now)
		if got.NextStep != c.want {
			t.Fatalf("%s: %+v", c.want, got)
		}
		if !c.consent && (got.Survey != nil || got.LatestAttempt != nil) {
			t.Fatal("Опрос раскрыт без согласия")
		}
	}
}
func TestSurveyValidation(t *testing.T) {
	in := SurveyInput{StackSkillID: "00000000-0000-4000-8000-000000000001", Industry: " IT ", SpecializationID: 1, GradeID: 2, SoftSkills: []string{"Коммуникация", "Работа в команде"}}
	if err := in.Normalize(); err != nil || in.Industry != "IT" {
		t.Fatal(in, err)
	}
	in.SoftSkills = []string{"Коммуникация", " коммуникация "}
	if in.Normalize() == nil {
		t.Fatal("Повтор софт-скилла принят")
	}
}

func ptrStack(s string) *string { return &s }

func TestOnboardingUsesQualificationScopeAndRank(t *testing.T) {
	now := time.Now()
	p := &Profile{ID: "p"}
	survey := &Survey{SurveyInput: SurveyInput{SpecializationID: 1, GradeID: 2, StackSkillID: "java"}, GradeRank: 2}
	goQualification := Category{SpecializationID: 1, GradeID: 3, GradeRank: 3, StackSkillID: ptrStack("go")}
	javaQualification := Category{SpecializationID: 1, GradeID: 3, GradeRank: 3, StackSkillID: ptrStack("java")}
	if got := BuildOnboarding(true, p, survey, nil, &goQualification, now); got.NextStep != "test" {
		t.Fatal(got)
	}
	if got := BuildOnboarding(true, p, survey, nil, &goQualification, now, javaQualification); got.NextStep != "complete" {
		t.Fatal(got)
	}
}
