package entity

import "errors"

var (
	ErrNotFound         = errors.New("профиль кандидата не найден")
	ErrAvatarNotFound   = errors.New("аватар не найден")
	ErrForbidden        = errors.New("профилем может управлять только активный кандидат")
	ErrConflict         = errors.New("профиль кандидата уже создан")
	ErrFileNotPending   = errors.New("файл уже не ожидает загрузки")
	ErrContactsNotFound = errors.New("контакты кандидата не найдены")
	ErrConsentRequired  = errors.New("нужно согласие на обработку персональных данных")
)

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }
func invalid(message string) error       { return &ValidationError{message} }
