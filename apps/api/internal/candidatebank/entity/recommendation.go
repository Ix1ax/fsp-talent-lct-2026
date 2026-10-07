package entity

import "fmt"

// Recommendation показывает категорию, навыки и причины попадания в подборку.
type Recommendation struct {
	Card
	Skills                []SkillMatch     `json:"skills"`
	SkillMatchScore       *float64         `json:"skill_match_score"`
	TestScorePercent      *float64         `json:"test_score_percent"`
	MatchScore            float64          `json:"match_score"`
	Criteria              []MatchCriterion `json:"criteria"`
	MismatchedConditions  []string         `json:"mismatched_conditions"`
	MissingRequiredSkills []string         `json:"missing_required_skills"`
	MatchedConditions     int              `json:"matched_conditions"`
	Reasons               []string         `json:"reasons"`
	UnknownConditions     []string         `json:"unknown_conditions"`
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
	r := Recommendation{Card: card, Reasons: []string{}, UnknownConditions: []string{}, MismatchedConditions: []string{}, MissingRequiredSkills: []string{}, Criteria: []MatchCriterion{}}
	for _, c := range []struct {
		code, message, mismatch string
		matched                 *bool
	}{
		{"work_format", "Совпадает формат работы", "Не совпадает формат работы", format},
		{"salary", "Зарплатные ожидания укладываются в бюджет", "Зарплатные ожидания выше бюджета", salary},
		{"city", "Совпадает город", "Не совпадает город", city},
		{"timezone", "Совпадает часовой пояс", "Не совпадает часовой пояс", timezone},
	} {
		if c.matched == nil {
			r.UnknownConditions = append(r.UnknownConditions, c.code)
		} else if *c.matched {
			r.MatchedConditions++
			r.Reasons = append(r.Reasons, c.message)
		} else {
			r.MismatchedConditions = append(r.MismatchedConditions, c.code)
			r.Reasons = append(r.Reasons, c.mismatch)
		}
	}
	return r
}

type SkillMatch struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Required        bool    `json:"required"`
	EffectiveWeight float64 `json:"effective_weight"`
	Weight          float64 `json:"weight"`
	Source          string  `json:"source"`
	ClaimedLevel    *int16  `json:"claimed_level"`
	VerifiedLevel   *int16  `json:"verified_level"`
}

// Критерии показывают, из чего получилась оценка. Неизвестные данные не считаются совпадением.
type MatchCriterion struct {
	Code   string  `json:"code"`
	Weight float64 `json:"weight"`
	Score  float64 `json:"score"`
	Status string  `json:"status"`
}

func (r *Recommendation) ExplainQualification(spec, grade *bool, gradeSpecified bool) {
	for _, c := range []struct {
		code, name string
		value      *bool
		enabled    bool
	}{
		{"specialization", "специализация", spec, true}, {"grade", "грейд", grade, gradeSpecified},
	} {
		if !c.enabled {
			continue
		}
		if c.value == nil {
			r.UnknownConditions = append(r.UnknownConditions, c.code)
			continue
		}
		if !*c.value {
			r.MismatchedConditions = append(r.MismatchedConditions, c.code)
			r.Reasons = append(r.Reasons, "Не совпадает "+c.name)
			continue
		}
		source := "подтверждено тестом"
		if r.GradeStatus != "confirmed" {
			source = "выбрано кандидатом, не подтверждено тестом"
		}
		r.Reasons = append(r.Reasons, "Совпадает "+c.name+": "+source)
	}
	if !gradeSpecified {
		r.Reasons = append(r.Reasons, "Грейд потребностью не ограничен")
	}
	if r.GradeStatus != "confirmed" {
		r.Reasons = append(r.Reasons, "Подтверждённой категории пока нет")
	}
	for _, skill := range r.Skills {
		switch skill.Source {
		case "test":
			r.Reasons = append(r.Reasons, fmt.Sprintf("Навык %s подтверждён тестом", skill.Name))
		case "claimed":
			r.Reasons = append(r.Reasons, fmt.Sprintf("Навык %s заявлен кандидатом, тестового подтверждения нет", skill.Name))
		default:
			r.UnknownConditions = append(r.UnknownConditions, "skill:"+skill.ID)
			if skill.Required {
				r.MissingRequiredSkills = append(r.MissingRequiredSkills, skill.ID)
				r.Reasons = append(r.Reasons, "Нет данных об обязательном навыке: "+skill.Name)
			}
		}
	}
}
