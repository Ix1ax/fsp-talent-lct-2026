package entity

import "fmt"

// Recommendation показывает категорию, навыки и причины попадания в подборку.
type Recommendation struct {
	Card
	Skills            []SkillMatch `json:"skills"`
	SkillMatchScore   *float64     `json:"skill_match_score"`
	TestScorePercent  float64      `json:"test_score_percent"`
	MatchedConditions int          `json:"matched_conditions"`
	Reasons           []string     `json:"reasons"`
	UnknownConditions []string     `json:"unknown_conditions"`
}

type RecommendationPage struct {
	Items              []Recommendation `json:"items"`
	Total              int64            `json:"total"`
	Limit              int              `json:"limit"`
	Offset             int              `json:"offset"`
	NeedID             string           `json:"need_id"`
	MatchingMode       string           `json:"matching_mode"`
	UnassessedCriteria []string         `json:"unassessed_criteria"`
}

// Условия оцениваем по отдельности. Количество совпадений не является процентом пригодности.
func Explain(card Card, format, salary, city, timezone *bool) Recommendation {
	r := Recommendation{Card: card, Reasons: []string{}, UnknownConditions: []string{}}
	for _, c := range []struct {
		code, message string
		matched       *bool
	}{
		{"work_format", "Совпадает формат работы", format},
		{"salary", "Зарплатные ожидания укладываются в бюджет", salary},
		{"city", "Совпадает город", city},
		{"timezone", "Совпадает часовой пояс", timezone},
	} {
		if c.matched == nil {
			r.UnknownConditions = append(r.UnknownConditions, c.code)
		} else if *c.matched {
			r.MatchedConditions++
			r.Reasons = append(r.Reasons, c.message)
		}
	}
	return r
}

type SkillMatch struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Required      bool    `json:"required"`
	Weight        float64 `json:"weight"`
	Source        string  `json:"source"`
	ClaimedLevel  *int16  `json:"claimed_level"`
	VerifiedLevel *int16  `json:"verified_level"`
}

func (r *Recommendation) ExplainQualification() {
	r.Reasons = append(r.Reasons, "Совпадают специализация и подтверждённый грейд")
	for _, skill := range r.Skills {
		switch skill.Source {
		case "test":
			r.Reasons = append(r.Reasons, fmt.Sprintf("Навык %s подтверждён тестом", skill.Name))
		case "claimed":
			r.Reasons = append(r.Reasons, fmt.Sprintf("Навык %s заявлен кандидатом, тестового подтверждения нет", skill.Name))
		default:
			r.UnknownConditions = append(r.UnknownConditions, "skill:"+skill.ID)
		}
	}
}
