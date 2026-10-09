// Package entity описывает операционные функции административной панели.
package entity

import (
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

var (
	ErrNotFound  = errors.New("Запись не найдена")
	ErrForbidden = errors.New("Недостаточно прав администратора")
	ErrConflict  = errors.New("Состояние записи изменилось или переход недоступен")
	ErrEvidence  = errors.New("Для заявки нужны ИНН и хотя бы один готовый документ компании")
)

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }
func ID(raw string) (string, error) {
	id, err := uuid.Parse(raw)
	if err != nil {
		return "", &ValidationError{"Некорректный UUID"}
	}
	return id.String(), nil
}
func reason(v string, required bool) (string, error) {
	v = strings.TrimSpace(v)
	if !utf8.ValidString(v) || strings.ContainsRune(v, 0) || utf8.RuneCountInString(v) > 2000 || required && v == "" {
		return "", &ValidationError{"Укажите причину до 2000 символов"}
	}
	return v, nil
}

type Decision struct {
	Status          string `json:"status"`
	Reason          string `json:"reason"`
	ExpectedVersion *int   `json:"expected_version"`
}

func (in *Decision) Validate() error {
	if in.Status != "verified" && in.Status != "rejected" && in.Status != "unverified" {
		return &ValidationError{"Статус должен быть verified, rejected или unverified"}
	}
	if in.ExpectedVersion == nil || *in.ExpectedVersion < 0 {
		return &ValidationError{"Укажите expected_version из карточки компании"}
	}
	var err error
	in.Reason, err = reason(in.Reason, in.Status != "verified")
	return err
}

type StatusInput struct {
	Status string `json:"status"`
	Reason string `json:"reason"`
}

func (in *StatusInput) Validate(kind string) error {
	valid := false
	switch kind {
	case "user", "company":
		valid = in.Status == "active" || in.Status == "blocked"
	case "need":
		valid = in.Status == "published" || in.Status == "hidden"
	case "task":
		valid = in.Status == "published" || in.Status == "hidden"
	}
	if !valid {
		return &ValidationError{"Недопустимый статус для этого действия"}
	}
	var err error
	in.Reason, err = reason(in.Reason, true)
	return err
}

type Verification struct {
	CompanyID   string     `json:"company_id"`
	Status      string     `json:"status"`
	Version     int        `json:"version"`
	RequestedAt *time.Time `json:"requested_at"`
	ReviewedAt  *time.Time `json:"reviewed_at"`
	Reason      *string    `json:"reason"`
	DocumentIDs []string   `json:"document_ids"`
}
type Page struct {
	Items  []any `json:"items"`
	Total  int64 `json:"total"`
	Limit  int   `json:"limit"`
	Offset int   `json:"offset"`
}
