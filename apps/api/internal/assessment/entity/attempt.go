package entity

import (
	"errors"
	"math"
	"strings"
	"time"
	"unicode/utf8"
)

var (
	ErrAttemptActive    = errors.New("У вас уже есть активная попытка тестирования")
	ErrRetakeCooldown   = errors.New("Пересдать этот тест можно позже")
	ErrAlreadyConfirmed = errors.New("Этот грейд уже подтверждён")
	ErrUnavailable      = errors.New("Тест по этой специализации и грейду сейчас недоступен")
	ErrAttemptClosed    = errors.New("Попытка уже завершена")
	ErrAttemptNotFound  = errors.New("Попытка не найдена")
	ErrQuestionNotFound = errors.New("Задание не найдено в этой попытке")
)

// ActiveError сообщает, какая попытка уже идёт.
type ActiveError struct{ AttemptID string }

func (e *ActiveError) Error() string        { return ErrAttemptActive.Error() }
func (e *ActiveError) Is(target error) bool { return target == ErrAttemptActive }

// RetakeError сообщает, когда можно пересдать тест.
type RetakeError struct{ RetryAt time.Time }

func (e *RetakeError) Error() string        { return ErrRetakeCooldown.Error() }
func (e *RetakeError) Is(target error) bool { return target == ErrRetakeCooldown }

const (
	AttemptActive  = "active"
	AttemptPassed  = "passed"
	AttemptFailed  = "failed"
	AttemptExpired = "expired"

	maxAnswerText = 500
)

// Answer — ответ кандидата: выбранные варианты или текст.
type Answer struct {
	Selected []string `json:"selected,omitempty"`
	Text     *string  `json:"text,omitempty"`
}

// ValidateAnswer проверяет форму ответа по заданию из снимка попытки. Правильность не проверяется.
func ValidateAnswer(prompt Prompt, g GradingSpec, a Answer) error {
	switch g.Type {
	case "choice":
		if a.Text != nil {
			return invalid("Для этого задания выберите вариант ответа")
		}
		if len(a.Selected) == 0 || (!g.Multiple && len(a.Selected) != 1) {
			return invalid("Выберите вариант ответа")
		}
		known := map[string]bool{}
		for _, o := range prompt.Options {
			known[o.ID] = true
		}
		seen := map[string]bool{}
		for _, id := range a.Selected {
			if !known[id] {
				return invalid("Неизвестный вариант ответа")
			}
			if seen[id] {
				return invalid("Варианты ответа не должны повторяться")
			}
			seen[id] = true
		}
	case "text":
		if len(a.Selected) != 0 || a.Text == nil {
			return invalid("Для этого задания введите текстовый ответ")
		}
		if hasNUL(*a.Text) || strings.TrimSpace(*a.Text) == "" || utf8.RuneCountInString(*a.Text) > maxAnswerText {
			return invalid("Ответ — непустой текст не длиннее 500 символов")
		}
	default:
		return invalid("Неизвестный вид проверки задания")
	}
	return nil
}

func normalizeText(s string, caseSensitive bool) string {
	s = strings.Join(strings.Fields(s), " ")
	if !caseSensitive {
		s = strings.ToLower(s)
	}
	return s
}

// GradeAnswer проверяет ответ по правилам из снимка. Частичных баллов нет.
func GradeAnswer(g GradingSpec, a Answer) bool {
	switch g.Type {
	case "choice":
		if a.Text != nil || len(a.Selected) != len(g.Correct) {
			return false
		}
		want := map[string]bool{}
		for _, id := range g.Correct {
			want[id] = true
		}
		got := map[string]bool{}
		for _, id := range a.Selected {
			if !want[id] || got[id] {
				return false
			}
			got[id] = true
		}
		return true
	case "text":
		if a.Text == nil || len(a.Selected) != 0 {
			return false
		}
		answer := normalizeText(*a.Text, g.CaseSensitive)
		if answer == "" {
			return false
		}
		for _, accepted := range g.Accepted {
			if normalizeText(accepted, g.CaseSensitive) == answer {
				return true
			}
		}
	}
	return false
}

// QuestionPoints — стоимость одного задания строки состава: вес строки делится поровну.
func QuestionPoints(weight float64, count int) float64 { return weight / float64(count) }

// ScoredItem — задание попытки с результатом проверки.
type ScoredItem struct {
	SkillID string
	Points  float64
	Correct bool
}

// SkillScore — баллы по одному навыку.
type SkillScore struct {
	SkillID          string
	Earned, Possible float64
}

func round2(v float64) float64 { return math.Round(v*100) / 100 }

// Percent — процент набранных баллов по навыку с точностью до сотых.
func (s SkillScore) Percent() float64 {
	if s.Possible == 0 {
		return 0
	}
	return round2(s.Earned / s.Possible * 100)
}

// Score считает общий процент и баллы по навыкам (в порядке первого появления навыка).
func Score(items []ScoredItem) (float64, []SkillScore) {
	var earned, possible float64
	skills := []SkillScore{}
	index := map[string]int{}
	for _, it := range items {
		i, ok := index[it.SkillID]
		if !ok {
			i = len(skills)
			index[it.SkillID] = i
			skills = append(skills, SkillScore{SkillID: it.SkillID})
		}
		possible += it.Points
		skills[i].Possible += it.Points
		if it.Correct {
			earned += it.Points
			skills[i].Earned += it.Points
		}
	}
	if possible == 0 {
		return 0, skills
	}
	return round2(earned / possible * 100), skills
}

// SkillLevel переводит процент баллов по навыку в уровень 1–5.
func SkillLevel(percent float64) int16 {
	switch {
	case percent >= 85:
		return 5
	case percent >= 70:
		return 4
	case percent >= 55:
		return 3
	case percent >= 40:
		return 2
	}
	return 1
}

// CheckRetake проверяет, прошёл ли срок пересдачи после последней неудачной попытки пары.
func CheckRetake(now time.Time, lastFinished *time.Time, days int) (bool, time.Time) {
	if lastFinished == nil {
		return true, time.Time{}
	}
	retryAt := lastFinished.Add(time.Duration(days) * 24 * time.Hour)
	return !now.Before(retryAt), retryAt
}

// Confirmed — цель не выше уже подтверждённого грейда той же специализации.
func Confirmed(currentRank, targetRank int16) bool { return targetRank <= currentRank }
