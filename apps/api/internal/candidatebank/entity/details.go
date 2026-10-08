package entity

import "time"

// Details — отдельный ответ работодателю. Контакты, свободный текст и внутренние ID попыток сюда не попадают.
type Details struct {
	Card
	Skills     []DetailSkill      `json:"skills"`
	Assessment *DetailAssessment  `json:"assessment"`
	Experience []DetailExperience `json:"experience"`
	Education  []DetailEducation  `json:"education"`
}

type DetailSkill struct {
	ID            string `json:"id"`
	Code          string `json:"code"`
	Name          string `json:"name"`
	ClaimedLevel  *int16 `json:"claimed_level"`
	VerifiedLevel *int16 `json:"verified_level"`
	Source        string `json:"source"`
}

// DetailAssessment показывает только результат теста текущей подтверждённой категории.
type DetailAssessment struct {
	ScorePercent float64   `json:"score_percent"`
	ConfirmedAt  time.Time `json:"confirmed_at"`
}

// Названия организаций, должности и описания вводятся свободно и могут содержать контакты.
// До отдельного безопасного сценария раскрытия показываем только структурированные сведения.
type DetailExperience struct {
	StartedOn string  `json:"started_on"`
	EndedOn   *string `json:"ended_on"`
}

type DetailEducation struct {
	Level          string `json:"level"`
	GraduationYear int16  `json:"graduation_year"`
}
