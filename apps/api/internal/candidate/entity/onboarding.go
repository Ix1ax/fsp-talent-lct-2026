package entity

import (
	"strings"
	"time"
	"unicode/utf8"
)

// SurveyInput — ответы первичного опроса, не подтверждение квалификации.
type SurveyInput struct {
	Industry         string   `json:"industry"`
	SpecializationID int16    `json:"specialization_id"`
	GradeID          int16    `json:"grade_id"`
	SoftSkills       []string `json:"soft_skills"`
}

func (in *SurveyInput) Normalize() error {
	in.Industry = strings.TrimSpace(in.Industry)
	if n := utf8.RuneCountInString(in.Industry); n < 1 || n > 200 || hasNUL(in.Industry) {
		return invalid("Укажите отрасль от 1 до 200 символов")
	}
	if in.SpecializationID <= 0 || in.GradeID <= 0 {
		return invalid("Выберите специализацию и предполагаемый грейд")
	}
	if len(in.SoftSkills) > 20 {
		return invalid("Допустимо до 20 софт-скиллов")
	}
	if in.SoftSkills == nil {
		in.SoftSkills = []string{}
	}
	seen := map[string]bool{}
	for i, s := range in.SoftSkills {
		s = strings.TrimSpace(s)
		k := strings.ToLower(s)
		if n := utf8.RuneCountInString(s); n < 1 || n > 100 || hasNUL(s) || seen[k] {
			return invalid("Софт-скиллы: уникальные названия от 1 до 100 символов")
		}
		seen[k] = true
		in.SoftSkills[i] = s
	}
	return nil
}

type Survey struct {
	SurveyInput
	UpdatedAt time.Time `json:"updated_at"`
}
type OnboardingAttempt struct {
	ID               string    `json:"id"`
	Status           string    `json:"status"`
	SpecializationID int16     `json:"specialization_id"`
	GradeID          int16     `json:"grade_id"`
	DeadlineAt       time.Time `json:"deadline_at"`
}
type Onboarding struct {
	NextStep      string             `json:"next_step"`
	Survey        *Survey            `json:"survey"`
	LatestAttempt *OnboardingAttempt `json:"latest_attempt"`
}

func BuildOnboarding(processing bool, p *Profile, survey *Survey, attempt *OnboardingAttempt, category *Category, now time.Time) Onboarding {
	out := Onboarding{NextStep: "consent", Survey: survey, LatestAttempt: attempt}
	if !processing {
		out.Survey = nil
		out.LatestAttempt = nil
		return out
	}
	out.NextStep = "profile"
	if p == nil {
		return out
	}
	if attempt != nil && attempt.Status == "active" && now.Before(attempt.DeadlineAt) {
		out.NextStep = "in_progress"
		return out
	}
	out.NextStep = "survey"
	if survey == nil {
		return out
	}
	out.NextStep = "test"
	if category != nil && category.SpecializationID == survey.SpecializationID && category.GradeID == survey.GradeID {
		out.NextStep = "complete"
	}
	return out
}
