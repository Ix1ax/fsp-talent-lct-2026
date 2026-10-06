package entity

import "errors"

var (
	ErrNotFound       = errors.New("профиль кандидата не найден")
	ErrAvatarNotFound = errors.New("аватар не найден")
	ErrForbidden      = errors.New("профилем может управлять только активный кандидат")
	ErrConflict       = errors.New("профиль кандидата уже создан")
)

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }
func invalid(message string) error       { return &ValidationError{message} }
