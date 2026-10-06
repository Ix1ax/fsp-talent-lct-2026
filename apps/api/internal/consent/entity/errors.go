package entity

import "errors"

var (
	ErrConsentExists   = errors.New("согласие уже дано")
	ErrPolicyOutdated  = errors.New("версия политики устарела")
	ErrNotFound        = errors.New("активное согласие не найдено")
	ErrCompanyNotFound = errors.New("компания не найдена")
	ErrForbidden       = errors.New("согласиями управляет только активный кандидат")
)

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }
func invalid(message string) error       { return &ValidationError{message} }
