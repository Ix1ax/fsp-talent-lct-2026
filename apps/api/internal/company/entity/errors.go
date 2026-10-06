package entity

import (
	"errors"
)

var ErrNotFound = errors.New("компания или файл не найдены")
var ErrForbidden = errors.New("изменять компанию может только её владелец")
var ErrConflict = errors.New("компания с таким ИНН уже существует")

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }
func invalid(message string) error       { return &ValidationError{message} }
