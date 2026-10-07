package entity

import "time"

// StartInput — тело запроса старта попытки.
type StartInput struct {
	SpecializationID int16 `json:"specialization_id"`
	GradeID          int16 `json:"grade_id"`
}

func (in *StartInput) Normalize() error {
	if in.SpecializationID <= 0 || in.GradeID <= 0 {
		return invalid("Укажите specialization_id и grade_id")
	}
	return nil
}

// AttemptQuestion — задание попытки. Правил проверки здесь нет и быть не должно.
type AttemptQuestion struct {
	ID         string  `json:"id"`
	Position   int     `json:"position"`
	SkillID    string  `json:"skill_id"`
	Difficulty int16   `json:"difficulty"`
	Prompt     Prompt  `json:"prompt"`
	Answer     *Answer `json:"answer"`
}

// SkillResult — итог по навыку: процент, подтверждён ли навык и уровень.
type SkillResult struct {
	SkillID   string  `json:"skill_id"`
	Name      string  `json:"name"`
	Percent   float64 `json:"percent"`
	Confirmed bool    `json:"confirmed"`
	Level     *int16  `json:"level"`
}

// CategoryRef — категория кандидата.
type CategoryRef struct {
	SpecializationID int16     `json:"specialization_id"`
	Specialization   string    `json:"specialization"`
	GradeID          int16     `json:"grade_id"`
	Grade            string    `json:"grade"`
	ConfirmedAt      time.Time `json:"confirmed_at"`
}

// AttemptResult — итог завершённой попытки. Правильные ответы не раскрываются.
type AttemptResult struct {
	Passed       bool          `json:"passed"`
	ScorePercent float64       `json:"score_percent"`
	PassScore    float64       `json:"pass_score"`
	Skills       []SkillResult `json:"skills"`
	Category     *CategoryRef  `json:"category"`
	RetryAt      *time.Time    `json:"retry_at"`
}

// Attempt — попытка. Пока она активна, Questions заполнен, а Result равен nil; после завершения наоборот.
type Attempt struct {
	ID               string            `json:"id"`
	Status           string            `json:"status"`
	SpecializationID int16             `json:"specialization_id"`
	GradeID          int16             `json:"grade_id"`
	StartedAt        time.Time         `json:"started_at"`
	DeadlineAt       time.Time         `json:"deadline_at"`
	FinishedAt       *time.Time        `json:"finished_at"`
	TimeLimitSec     int               `json:"time_limit_sec"`
	Questions        []AttemptQuestion `json:"questions"`
	Result           *AttemptResult    `json:"result"`
}

// Состояния доступности теста для кандидата.
const (
	ReasonOK        = "ok"
	ReasonActive    = "attempt_active"
	ReasonCooldown  = "retake_cooldown"
	ReasonConfirmed = "already_confirmed"
)

// AvailableTemplate — опубликованный тест и его состояние для кандидата.
type AvailableTemplate struct {
	SpecializationID int16      `json:"specialization_id"`
	GradeID          int16      `json:"grade_id"`
	TimeLimitSec     int        `json:"time_limit_sec"`
	PassScore        float64    `json:"pass_score"`
	QuestionCount    int        `json:"question_count"`
	CanStart         bool       `json:"can_start"`
	Reason           string     `json:"reason"`
	RetryAt          *time.Time `json:"retry_at"`
	Confirmed        bool       `json:"confirmed"`
}
