// Пакет entity описывает предложения о работе. Он не зависит от HTTP и PostgreSQL.
package entity

import (
	"encoding/hex"
	"errors"
	"net/mail"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	StatusSent     = "sent"
	StatusViewed   = "viewed"
	StatusAccepted = "accepted"
	StatusRejected = "rejected"
	StatusExpired  = "expired"
	Lifetime       = 14 * 24 * time.Hour
)

var (
	ErrNotFound         = errors.New("предложение не найдено или недоступно")
	ErrForbidden        = errors.New("недостаточно прав для этого действия")
	ErrResponseConflict = errors.New("ответ на предложение уже сохранён и не может быть изменён")
	ErrExpired          = errors.New("срок предложения истёк; ответить на него нельзя")
)

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }
func invalid(message string) error       { return &ValidationError{Message: message} }

// CandidateID — ID профиля, не users.id и не subject из Keycloak.
// Оба конца вилки — указатели, чтобы отличать отсутствующее поле от указанного значения.
type Input struct {
	CandidateID   string  `json:"candidate_id"`
	NeedID        *string `json:"need_id"`
	Title         string  `json:"title"`
	Description   string  `json:"description"`
	SalaryFromRUB *int64  `json:"salary_from_rub"`
	SalaryToRUB   *int64  `json:"salary_to_rub"`
	ContactEmail  string  `json:"contact_email"`
	ContactURL    *string `json:"contact_url"`
}

// CompanyName и условия — снимок на момент отправки. Контактов кандидата в модели нет.
type Offer struct {
	ID            string     `json:"id"`
	CompanyID     string     `json:"company_id"`
	CandidateID   string     `json:"candidate_id"`
	CreatedBy     string     `json:"created_by"`
	NeedID        *string    `json:"need_id"`
	CompanyName   string     `json:"company_name"`
	Title         string     `json:"title"`
	Description   string     `json:"description"`
	SalaryFromRUB int64      `json:"salary_from_rub"`
	SalaryToRUB   int64      `json:"salary_to_rub"`
	ContactEmail  string     `json:"contact_email"`
	ContactURL    *string    `json:"contact_url"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
	ViewedAt      *time.Time `json:"viewed_at"`
	RespondedAt   *time.Time `json:"responded_at"`
}

func (in *Input) Normalize() error {
	var ok bool
	if in.CandidateID, ok = uuid(in.CandidateID); !ok {
		return invalid("Укажите корректный UUID профиля кандидата")
	}
	if in.NeedID != nil {
		id, valid := uuid(*in.NeedID)
		if !valid {
			return invalid("Укажите корректный UUID потребности")
		}
		in.NeedID = &id
	}
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(in.Description)
	in.ContactEmail = strings.TrimSpace(in.ContactEmail)
	if n := utf8.RuneCountInString(in.Title); n < 1 || n > 200 {
		return invalid("Название предложения должно содержать от 1 до 200 символов")
	}
	if n := utf8.RuneCountInString(in.Description); n < 1 || n > 10000 {
		return invalid("Описание предложения должно содержать от 1 до 10000 символов")
	}
	if in.SalaryFromRUB == nil || in.SalaryToRUB == nil {
		return invalid("Укажите обе границы зарплаты в рублях: от и до")
	}
	if *in.SalaryFromRUB < 1 || *in.SalaryToRUB < 1 || *in.SalaryFromRUB > 1_000_000_000 || *in.SalaryToRUB > 1_000_000_000 {
		return invalid("Зарплата должна быть от 1 до 1000000000 рублей в месяц")
	}
	if *in.SalaryFromRUB > *in.SalaryToRUB {
		return invalid("Нижняя граница зарплаты не может превышать верхнюю")
	}
	address, err := mail.ParseAddress(in.ContactEmail)
	if err != nil || address.Address != in.ContactEmail || len(in.ContactEmail) > 254 {
		return invalid("Укажите корректный контактный email работодателя без имени получателя")
	}
	if in.ContactURL != nil {
		value := strings.TrimSpace(*in.ContactURL)
		if value == "" {
			in.ContactURL = nil
		} else {
			u, err := url.Parse(value)
			if err != nil || len(value) > 2048 || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" || u.User != nil || strings.ContainsAny(value, "\x00\r\n\t ") {
				return invalid("Контактная ссылка должна быть HTTP(S)-адресом без логина и пароля, до 2048 символов")
			}
			in.ContactURL = &value
		}
	}
	for _, value := range []string{in.Title, in.Description, in.ContactEmail} {
		if strings.ContainsRune(value, 0) {
			return invalid("Поля предложения не должны содержать нулевой символ")
		}
	}
	return nil
}

// Повтор того же ответа допустим. Изменять уже принятое решение нельзя.
// Проверка текущего статуса и запись ответа позже выполняются в одной транзакции.
func ValidateResponse(current, decision string) error {
	if decision != StatusAccepted && decision != StatusRejected {
		return invalid("Ответ должен быть accepted или rejected")
	}
	switch current {
	case StatusExpired:
		return ErrExpired
	case StatusSent, StatusViewed:
		return nil
	case StatusAccepted, StatusRejected:
		if current == decision {
			return nil
		}
		return ErrResponseConflict
	default:
		return invalid("Неизвестный статус предложения")
	}
}

// Истечение не является ответом кандидата и не меняет сохранённую историю.
func EffectiveStatus(status string, createdAt, now time.Time) string {
	if (status == StatusSent || status == StatusViewed) && !now.Before(createdAt.Add(Lifetime)) {
		return StatusExpired
	}
	return status
}

func uuid(value string) (string, bool) {
	if len(value) != 36 || value[8] != '-' || value[13] != '-' || value[18] != '-' || value[23] != '-' {
		return "", false
	}
	raw := strings.ReplaceAll(value, "-", "")
	if len(raw) != 32 {
		return "", false
	}
	if _, err := hex.DecodeString(raw); err != nil {
		return "", false
	}
	return strings.ToLower(value), true
}
