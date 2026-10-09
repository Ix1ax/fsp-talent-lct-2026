package entity

import (
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

var (
	ErrNotFound         = errors.New("Задание, решение или компания недоступны")
	ErrForbidden        = errors.New("Недостаточно прав для этого действия")
	ErrDailyLimit       = errors.New("Компания уже опубликовала задание сегодня по московскому времени")
	ErrAlreadySubmitted = errors.New("Вы уже отправили решение этого задания")
	ErrClosed           = errors.New("Приём решений этого задания закрыт")
	ErrConsentRequired  = errors.New("Для отправки решения нужны согласия на обработку и публикацию данных")
)

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }

type Input struct {
	Title            string     `json:"title"`
	Description      string     `json:"description"`
	SpecializationID *int16     `json:"specialization_id"`
	GradeID          *int16     `json:"grade_id"`
	DeadlineAt       *time.Time `json:"deadline_at"`
}

func (in *Input) Validate(now time.Time) error {
	in.Title, in.Description = strings.TrimSpace(in.Title), strings.TrimSpace(in.Description)
	if !utf8.ValidString(in.Title) || strings.ContainsRune(in.Title, 0) || utf8.RuneCountInString(in.Title) < 1 || utf8.RuneCountInString(in.Title) > 200 {
		return &ValidationError{"Название должно содержать от 1 до 200 символов"}
	}
	if !utf8.ValidString(in.Description) || strings.ContainsRune(in.Description, 0) || utf8.RuneCountInString(in.Description) > 10000 {
		return &ValidationError{"Описание должно содержать не более 10000 символов"}
	}
	if in.SpecializationID != nil && *in.SpecializationID <= 0 || in.GradeID != nil && *in.GradeID <= 0 {
		return &ValidationError{"Выберите положительный ID специализации или грейда"}
	}
	if in.DeadlineAt != nil && !in.DeadlineAt.After(now) {
		return &ValidationError{"Срок приёма решений должен быть в будущем"}
	}
	return nil
}

type Task struct {
	ID          string `json:"id"`
	CompanyID   string `json:"company_id"`
	CompanyName string `json:"company_name"`
	Input
	File             files.File         `json:"file"`
	Status           string             `json:"status"`
	ModerationStatus string             `json:"moderation_status"`
	PublishedAt      time.Time          `json:"published_at"`
	PublishedOn      string             `json:"published_on"`
	MySubmission     *SubmissionSummary `json:"my_submission"`
}

type SubmissionSummary struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

type Submission struct {
	ID          string     `json:"id"`
	TaskID      string     `json:"task_id"`
	TaskTitle   string     `json:"task_title"`
	CompanyID   string     `json:"company_id"`
	CompanyName string     `json:"company_name"`
	CandidateID string     `json:"candidate_id"`
	File        files.File `json:"file"`
	Status      string     `json:"status"`
	SubmittedAt time.Time  `json:"submitted_at"`
	Score       *int16     `json:"score"`
	Feedback    *string    `json:"feedback"`
	ReviewedAt  *time.Time `json:"reviewed_at"`
}

type ReviewInput struct {
	Score    *int16  `json:"score"`
	Feedback *string `json:"feedback"`
}

func (in *ReviewInput) Validate() error {
	if in.Score != nil && (*in.Score < 0 || *in.Score > 100) {
		return &ValidationError{"Оценка должна быть от 0 до 100"}
	}
	if in.Feedback != nil {
		v := strings.TrimSpace(*in.Feedback)
		if !utf8.ValidString(v) || strings.ContainsRune(v, 0) || utf8.RuneCountInString(v) > 5000 {
			return &ValidationError{"Комментарий должен содержать не более 5000 символов"}
		}
		if v == "" {
			in.Feedback = nil
		} else {
			in.Feedback = &v
		}
	}
	if in.Score == nil && in.Feedback == nil {
		return &ValidationError{"Укажите оценку или комментарий"}
	}
	return nil
}

type TaskPage struct {
	Items  []Task `json:"items"`
	Total  int64  `json:"total"`
	Limit  int    `json:"limit"`
	Offset int    `json:"offset"`
}
type SubmissionPage struct {
	Items  []Submission `json:"items"`
	Total  int64        `json:"total"`
	Limit  int          `json:"limit"`
	Offset int          `json:"offset"`
}
