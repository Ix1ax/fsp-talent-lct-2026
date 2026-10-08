package entity

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrPreviewForbidden    = errors.New("Недостаточно прав для пробного прохождения")
	ErrPreviewsUnavailable = errors.New("Пробное прохождение не настроено")
	ErrPreviewNotFound     = errors.New("Пробное прохождение или его вопрос не найден")
	ErrPreviewClosed       = errors.New("Пробное прохождение уже завершено")
	ErrPreviewExpired      = errors.New("Время пробного прохождения истекло")
	ErrPreviewLimit        = errors.New("Можно иметь не более трёх активных пробных прохождений")
	ErrPreviewKeyConflict  = errors.New("Idempotency-Key уже использован для другого шаблона")
)

const PreviewRetentionDays = 7
const PreviewActiveLimit = 3

type PreviewAnswerForm struct {
	Type     string `json:"type"`
	Multiple bool   `json:"multiple"`
}
type PreviewQuestion struct {
	ID         string            `json:"id"`
	QuestionID string            `json:"question_id"`
	Position   int               `json:"position"`
	Version    int               `json:"version"`
	SkillID    string            `json:"skill_id"`
	SkillName  string            `json:"skill_name"`
	Difficulty int16             `json:"difficulty"`
	Weight     float64           `json:"weight"`
	Kind       string            `json:"kind"`
	Prompt     Prompt            `json:"prompt"`
	AnswerForm PreviewAnswerForm `json:"answer_form"`
	Answer     *Answer           `json:"answer"`
}
type PreviewReview struct {
	ID            string      `json:"id"`
	Correct       bool        `json:"correct"`
	Answered      bool        `json:"answered"`
	CorrectAnswer GradingSpec `json:"correct_answer"`
}
type PreviewSkillScore struct {
	SkillID string  `json:"skill_id"`
	Percent float64 `json:"percent"`
}
type PreviewResult struct {
	ScorePercent    float64             `json:"score_percent"`
	PassScore       float64             `json:"pass_score"`
	Passed          bool                `json:"passed"`
	CorrectCount    int                 `json:"correct_count"`
	UnansweredCount int                 `json:"unanswered_count"`
	QuestionCount   int                 `json:"question_count"`
	Skills          []PreviewSkillScore `json:"skills"`
	Questions       []PreviewReview     `json:"questions"`
}
type Preview struct {
	ID              string            `json:"id"`
	TemplateID      string            `json:"template_id"`
	TemplateVersion int               `json:"template_version"`
	Status          string            `json:"status"`
	StartedAt       time.Time         `json:"started_at"`
	ExpiresAt       time.Time         `json:"expires_at"`
	ServerTime      time.Time         `json:"server_time"`
	FinishedAt      *time.Time        `json:"finished_at"`
	RetainUntil     time.Time         `json:"retain_until"`
	TimeLimitSec    int               `json:"time_limit_sec"`
	PassScore       float64           `json:"pass_score"`
	Questions       []PreviewQuestion `json:"questions"`
	Result          *PreviewResult    `json:"result"`
}

// NormalizePreviewKey принимает только печатный ASCII: ключ можно безопасно повторять в HTTP-заголовке.
func NormalizePreviewKey(key string) error {
	if len(key) > 128 || strings.TrimSpace(key) != key {
		return invalid("Idempotency-Key: от 1 до 128 печатных ASCII-символов без пробелов по краям")
	}
	for _, r := range key {
		if r < 33 || r > 126 {
			return invalid("Idempotency-Key содержит недопустимые символы")
		}
	}
	return nil
}
