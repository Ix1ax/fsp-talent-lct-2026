// Пакет entity описывает редактирование общих справочников в админке.
package entity

import (
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

var (
	ErrNotFound           = errors.New("Запись справочника не найдена")
	ErrConflict           = errors.New("Код, название навыка или порядок грейда уже занят")
	ErrInvalidTransition  = errors.New("Действие недоступно для текущего статуса навыка")
	ErrInUse              = errors.New("Запись используется в профилях или потребностях: архивируйте её")
	ErrModerationRequired = errors.New("Для этого навыка нужны отдельные действия модерации")
	ErrForbidden          = errors.New("Недостаточно прав для управления справочниками")
	codePattern           = regexp.MustCompile(`^[a-z][a-z0-9_-]*$`)
)

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }

// Строковый ID позволяет одинаково возвращать UUID навыков и числовые ID остальных справочников.
type Item struct {
	SubmittedBy      *string    `json:"submitted_by,omitempty"`
	SubmittedAt      *time.Time `json:"submitted_at,omitempty"`
	ModeratedBy      *string    `json:"moderated_by,omitempty"`
	ModeratedAt      *time.Time `json:"moderated_at,omitempty"`
	ModerationReason *string    `json:"moderation_reason,omitempty"`
	MergedInto       *string    `json:"merged_into,omitempty"`
	ModerationStatus *string    `json:"moderation_status,omitempty"`
	ID               string     `json:"id"`
	Code             string     `json:"code"`
	Name             string     `json:"name"`
	Active           *bool      `json:"active,omitempty"`
	Rank             *int16     `json:"rank,omitempty"`
	Aliases          []string   `json:"aliases,omitempty"`
}
type CreateInput struct {
	Code    string   `json:"code"`
	Name    string   `json:"name"`
	Rank    *int16   `json:"rank,omitempty"`
	Aliases []string `json:"aliases,omitempty"`
}

// Код и порядок грейда не меняются: на них опираются интеграции и сравнение уровней.
type UpdateInput struct {
	Name    *string  `json:"name,omitempty"`
	Active  *bool    `json:"active,omitempty"`
	Aliases []string `json:"aliases,omitempty"`
}

func Kind(kind string) bool {
	switch kind {
	case "specializations", "skills", "grades", "work_formats":
		return true
	}
	return false
}
func name(value string) (string, error) {
	value = strings.Join(strings.Fields(value), " ")
	if n := utf8.RuneCountInString(value); n < 1 || n > 200 || strings.ContainsRune(value, 0) {
		return "", &ValidationError{"Название должно содержать от 1 до 200 символов"}
	}
	for _, r := range value {
		if unicode.IsControl(r) || unicode.Is(unicode.Cf, r) {
			return "", &ValidationError{"Название содержит недопустимые символы"}
		}
	}
	return value, nil
}
func aliases(values []string) ([]string, error) {
	if len(values) > 30 {
		return nil, &ValidationError{"Можно указать не более 30 альтернативных названий"}
	}
	out := []string{}
	seen := map[string]bool{}
	for _, v := range values {
		v, err := name(v)
		if err != nil {
			return nil, err
		}
		key := strings.ToLower(v)
		if !seen[key] {
			out = append(out, v)
			seen[key] = true
		}
	}
	return out, nil
}
func NormalizeCreate(kind string, in CreateInput) (CreateInput, error) {
	if !Kind(kind) {
		return in, ErrNotFound
	}
	var err error
	in.Code = strings.TrimSpace(in.Code)
	max := 64
	if kind == "grades" || kind == "work_formats" {
		max = 32
	}
	if len(in.Code) > max || !codePattern.MatchString(in.Code) {
		return in, &ValidationError{"Код должен начинаться с латинской буквы и содержать строчные латинские буквы, цифры, дефис или подчёркивание"}
	}
	in.Name, err = name(in.Name)
	if err != nil {
		return in, err
	}
	if kind == "grades" {
		if in.Rank == nil || *in.Rank < 1 {
			return in, &ValidationError{"Укажите положительный порядок грейда"}
		}
	} else if in.Rank != nil {
		return in, &ValidationError{"Порядок можно указать только для грейда"}
	}
	if kind != "skills" && in.Aliases != nil {
		return in, &ValidationError{"Альтернативные названия доступны только для навыков"}
	}
	if kind == "skills" {
		in.Aliases, err = aliases(in.Aliases)
	}
	return in, err
}
func NormalizeUpdate(kind string, in UpdateInput) (UpdateInput, error) {
	if !Kind(kind) {
		return in, ErrNotFound
	}
	var err error
	if in.Name == nil && in.Active == nil && in.Aliases == nil {
		return in, &ValidationError{"Укажите хотя бы одно поле для изменения"}
	}
	if in.Name != nil {
		value, e := name(*in.Name)
		if e != nil {
			return in, e
		}
		in.Name = &value
	}
	if kind != "skills" && in.Aliases != nil {
		return in, &ValidationError{"Альтернативные названия доступны только для навыков"}
	}

	if in.Aliases != nil {
		in.Aliases, err = aliases(in.Aliases)
	}
	return in, err
}
