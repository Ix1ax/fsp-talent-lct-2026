package entity

import "errors"

// ErrContactsUnavailable: контакты нельзя выдать (нет активного согласия кандидата или самих контактов).
var ErrContactsUnavailable = errors.New("контакты кандидата сейчас недоступны")

// CandidateContacts — контакты кандидата, которые видит работодатель после принятого предложения.
type CandidateContacts struct {
	FullName string  `json:"full_name"`
	Email    string  `json:"email"`
	Phone    *string `json:"phone"`
	Telegram *string `json:"telegram"`
}
