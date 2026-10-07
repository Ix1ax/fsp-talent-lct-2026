// Пакет entity описывает аккаунты отдельной панели администрирования.
package entity

import (
	"errors"
	"net/mail"
	"strings"
	"time"
)

var (
	ErrUnauthorized = errors.New("Неверная почта или пароль")
	ErrForbidden    = errors.New("Недостаточно прав администратора")
	ErrConflict     = errors.New("Администратор с такой почтой уже существует")
	ErrRateLimited  = errors.New("Слишком много попыток входа")
)

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }

type Account struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func NormalizeEmail(value string) (string, error) {
	value = strings.ToLower(strings.TrimSpace(value))
	a, err := mail.ParseAddress(value)
	if err != nil || a.Address != value || len(value) > 254 || !strings.Contains(value, "@") {
		return "", &ValidationError{Message: "Укажите корректную почту без имени и скобок"}
	}
	return value, nil
}

func ValidatePassword(value string) error {
	// bcrypt принимает не больше 72 байт. Пароль не обрезаем и не нормализуем молча.
	if len(value) < 12 || len(value) > 72 {
		return &ValidationError{Message: "Пароль должен содержать от 12 до 72 байт"}
	}
	return nil
}

type Login struct {
	AccessToken string    `json:"access_token"`
	TokenType   string    `json:"token_type"`
	ExpiresAt   time.Time `json:"expires_at"`
	Admin       Account   `json:"admin"`
}
