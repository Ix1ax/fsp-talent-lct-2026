package entity

// Recommendation объясняет совпадения условий, а не подтверждает квалификацию кандидата.
type Recommendation struct {
	Card
	MatchedConditions int      `json:"matched_conditions"`
	Reasons           []string `json:"reasons"`
	UnknownConditions []string `json:"unknown_conditions"`
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
