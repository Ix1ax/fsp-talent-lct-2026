// Пакет entity содержит модели компаний и правила их валидации.
package entity

import (
	"encoding/json"
	"net/mail"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"
)

type Company struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Description        *string   `json:"description"`
	INN                *string   `json:"inn"`
	ContactEmail       string    `json:"contact_email"`
	ContactURL         *string   `json:"contact_url"`
	LogoFileID         *string   `json:"logo_file_id"`
	VerificationStatus string    `json:"verification_status"`
	CreatedAt          time.Time `json:"created_at"`
	MemberRole         string    `json:"member_role"`
}

type Input struct {
	Name         string  `json:"name"`
	Description  *string `json:"description"`
	INN          *string `json:"inn"`
	ContactEmail string  `json:"contact_email"`
	ContactURL   *string `json:"contact_url"`
}

// В PATCH отсутствие поля сохраняет значение, null очищает необязательное поле.
type Patch map[string]json.RawMessage

func (p Patch) Apply(current Company) (Input, error) {
	in := Input{current.Name, current.Description, current.INN, current.ContactEmail, current.ContactURL}
	if len(p) == 0 {
		return in, invalid("Передайте хотя бы одно поле компании")
	}
	for field, raw := range p {
		var target any
		switch field {
		case "name":
			target = &in.Name
		case "description":
			target = &in.Description
		case "inn":
			target = &in.INN
		case "contact_email":
			target = &in.ContactEmail
		case "contact_url":
			target = &in.ContactURL
		default:
			return in, invalid("Неизвестное или недоступное для изменения поле: " + field)
		}
		if (field == "name" || field == "contact_email") && string(raw) == "null" {
			return in, invalid("Поле " + field + " нельзя очистить")
		}
		if json.Unmarshal(raw, target) != nil {
			return in, invalid("Некорректное значение поля " + field)
		}
	}
	return in, in.Normalize()
}

func (in *Input) Normalize() error {
	in.Name = strings.TrimSpace(in.Name)
	in.ContactEmail = strings.TrimSpace(in.ContactEmail)
	if n := utf8.RuneCountInString(in.Name); n < 1 || n > 200 {
		return invalid("Название должно содержать от 1 до 200 символов")
	}
	addr, err := mail.ParseAddress(in.ContactEmail)
	if err != nil || addr.Address != in.ContactEmail || len(in.ContactEmail) > 254 {
		return invalid("Укажите корректный контактный email")
	}
	for _, ptr := range []**string{&in.Description, &in.INN, &in.ContactURL} {
		if *ptr != nil {
			s := strings.TrimSpace(**ptr)
			if s == "" {
				*ptr = nil
			} else {
				*ptr = &s
			}
		}
	}
	values := []string{in.Name, in.ContactEmail}
	for _, value := range []*string{in.Description, in.INN, in.ContactURL} {
		if value != nil {
			values = append(values, *value)
		}
	}
	for _, value := range values {
		if strings.ContainsRune(value, 0) {
			return invalid("Поля компании не должны содержать нулевой символ")
		}
	}
	if in.Description != nil && utf8.RuneCountInString(*in.Description) > 10000 {
		return invalid("Описание не должно превышать 10000 символов")
	}
	if in.INN != nil && !validINN(*in.INN) {
		return invalid("ИНН должен содержать 10 или 12 цифр с корректной контрольной суммой")
	}
	if in.ContactURL != nil {
		u, err := url.Parse(*in.ContactURL)
		if err != nil || u.Hostname() == "" || u.User != nil || (u.Scheme != "https" && u.Scheme != "http") || len(*in.ContactURL) > 2048 {
			return invalid("Укажите ссылку с протоколом http или https")
		}
	}
	return nil
}
func validINN(s string) bool {
	if len(s) != 10 && len(s) != 12 {
		return false
	}
	nonzero := false
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
		nonzero = nonzero || c != '0'
	}
	if !nonzero {
		return false
	}
	check := func(weights []int, pos int) bool {
		sum := 0
		for i, w := range weights {
			sum += w * int(s[i]-'0')
		}
		return sum%11%10 == int(s[pos]-'0')
	}
	if len(s) == 10 {
		return check([]int{2, 4, 10, 3, 5, 9, 4, 6, 8}, 9)
	}
	return check([]int{7, 2, 4, 10, 3, 5, 9, 4, 6, 8}, 10) && check([]int{3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8}, 11)
}
