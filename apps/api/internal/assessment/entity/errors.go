// Пакет entity описывает задания банка тестов и шаблоны тестов. Он не зависит от HTTP и PostgreSQL.
package entity

import "errors"

var (
	ErrNotFound = errors.New("задание или шаблон не найдены")
	ErrConflict = errors.New("действие невозможно в текущем состоянии")
)

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }
func invalid(message string) error       { return &ValidationError{Message: message} }

// Shortage — строка состава, для которой в банке не хватает опубликованных заданий.
type Shortage struct {
	SkillID    string `json:"skill_id"`
	Difficulty int16  `json:"difficulty"`
	Required   int    `json:"required"`
	Available  int    `json:"available"`
}

// InsufficientError возвращается при публикации шаблона, если заданий в банке не хватает.
type InsufficientError struct{ Items []Shortage }

func (e *InsufficientError) Error() string {
	return "В банке не хватает опубликованных заданий для состава шаблона"
}
