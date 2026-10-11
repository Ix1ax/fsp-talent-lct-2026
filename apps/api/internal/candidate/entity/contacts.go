package entity

import (
	"net/mail"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

// ContactsInput — приватные контакты кандидата. Работодателю они доступны только по принятому предложению.
type ContactsInput struct {
	FullName string  `json:"full_name"`
	Email    string  `json:"email"`
	Phone    *string `json:"phone"`
	Telegram *string `json:"telegram"`
}

type Contacts struct {
	ContactsInput
	UpdatedAt time.Time `json:"updated_at"`
}

var (
	phonePattern    = regexp.MustCompile(`^[0-9+()\- ]{5,20}$`)
	telegramPattern = regexp.MustCompile(`^[A-Za-z0-9_]{5,32}$`)
)

// Normalize обрезает пробелы, превращает пустые необязательные поля в nil и проверяет значения.
func (in *ContactsInput) Normalize() error {
	in.FullName = strings.TrimSpace(in.FullName)
	in.Email = strings.TrimSpace(in.Email)
	if n := utf8.RuneCountInString(in.FullName); n < 1 || n > 200 {
		return invalid("ФИО должно содержать от 1 до 200 символов")
	}
	if strings.ContainsRune(in.FullName, 0) {
		return invalid("Поля контактов не должны содержать нулевой символ")
	}
	addr, err := mail.ParseAddress(in.Email)
	if err != nil || addr.Address != in.Email || len(in.Email) > 254 || !strings.Contains(in.Email, "@") {
		return invalid("Укажите корректный email без имени и скобок")
	}
	for _, ptr := range []**string{&in.Phone, &in.Telegram} {
		if *ptr == nil {
			continue
		}
		s := strings.TrimSpace(**ptr)
		if s == "" {
			*ptr = nil
		} else {
			*ptr = &s
		}
	}
	if in.Phone != nil && !phonePattern.MatchString(*in.Phone) {
		return invalid("Телефон: от 5 до 20 символов, только цифры, +, пробелы, скобки и дефис")
	}
	if in.Telegram != nil {
		handle := strings.TrimPrefix(*in.Telegram, "@")
		if !telegramPattern.MatchString(handle) {
			return invalid("Telegram: от 5 до 32 символов, латиница, цифры и подчёркивание")
		}
		in.Telegram = &handle
	}
	return nil
}
