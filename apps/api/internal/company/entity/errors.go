package entity

import (
	"errors"
)

var ErrNotFound = errors.New("запись не найдена или недоступна")
var ErrForbidden = errors.New("недостаточно прав для этого действия")
var ErrConflict = errors.New("компания с таким ИНН уже существует")

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }
func invalid(message string) error       { return &ValidationError{message} }
