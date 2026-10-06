// Пакет entity содержит модель профиля кандидата и правила её валидации.
package entity

import (
	"encoding/json"
	"strings"
	"time"
	_ "time/tzdata"
	"unicode/utf8"
)

type ProfileInput struct {
	Headline         *string `json:"headline"`
	Summary          *string `json:"summary"`
	City             *string `json:"city"`
	Timezone         *string `json:"timezone"`
	ExperienceMonths int     `json:"experience_months"`
	SalaryMinRUB     *int64  `json:"salary_min_rub"`
	SearchStatus     string  `json:"search_status"`
	WorkFormatIDs    []int16 `json:"work_format_ids"`
}

type Profile struct {
	ID           string  `json:"id"`
	AvatarFileID *string `json:"avatar_file_id"`
	ProfileInput
	UpdatedAt time.Time `json:"updated_at"`
}

// Normalize обрезает пробелы, заполняет значения по умолчанию и проверяет границы.
func (in *ProfileInput) Normalize() error {
	for _, ptr := range []**string{&in.Headline, &in.Summary, &in.City, &in.Timezone} {
		if *ptr != nil {
			s := strings.TrimSpace(**ptr)
			if s == "" {
				*ptr = nil
			} else {
				*ptr = &s
			}
			if s != "" && strings.ContainsRune(s, 0) {
				return invalid("Поля профиля не должны содержать нулевой символ")
			}
		}
	}
	if in.Headline != nil && utf8.RuneCountInString(*in.Headline) > 200 {
		return invalid("Заголовок не должен превышать 200 символов")
	}
	if in.Summary != nil && utf8.RuneCountInString(*in.Summary) > 10000 {
		return invalid("Описание не должно превышать 10000 символов")
	}
	if in.City != nil && utf8.RuneCountInString(*in.City) > 200 {
		return invalid("Название города не должно превышать 200 символов")
	}
	if in.Timezone != nil {
		if len(*in.Timezone) > 64 {
			return invalid("Слишком длинное название часового пояса")
		}
		if _, err := time.LoadLocation(*in.Timezone); err != nil || *in.Timezone == "Local" {
			return invalid("Укажите часовой пояс IANA, например Europe/Moscow")
		}
	}
	if in.ExperienceMonths < 0 || in.ExperienceMonths > 600 {
		return invalid("Стаж должен быть от 0 до 600 месяцев")
	}
	if in.SalaryMinRUB != nil && (*in.SalaryMinRUB < 0 || *in.SalaryMinRUB > 1_000_000_000) {
		return invalid("Желаемая зарплата должна быть от 0 до 1000000000 рублей в месяц")
	}
	if in.SearchStatus == "" {
		in.SearchStatus = "hidden"
	}
	if in.SearchStatus != "open" && in.SearchStatus != "passive" && in.SearchStatus != "hidden" {
		return invalid("Статус поиска должен быть open, passive или hidden")
	}
	if in.WorkFormatIDs == nil {
		in.WorkFormatIDs = []int16{}
	}
	if len(in.WorkFormatIDs) > 10 {
		return invalid("Допустимо до 10 форматов работы")
	}
	seen := map[int16]bool{}
	for _, id := range in.WorkFormatIDs {
		if id <= 0 || seen[id] {
			return invalid("Форматы работы должны быть уникальными ID из справочника")
		}
		seen[id] = true
	}
	return nil
}

// Patch: отсутствие поля сохраняет значение, null очищает необязательное поле.
type Patch map[string]json.RawMessage

func (p Patch) Apply(current Profile) (ProfileInput, error) {
	in := current.ProfileInput
	in.WorkFormatIDs = append([]int16{}, current.WorkFormatIDs...)
	if len(p) == 0 {
		return in, invalid("Передайте хотя бы одно поле профиля")
	}
	for field, raw := range p {
		var target any
		switch field {
		case "headline":
			target = &in.Headline
		case "summary":
			target = &in.Summary
		case "city":
			target = &in.City
		case "timezone":
			target = &in.Timezone
		case "experience_months":
			target = &in.ExperienceMonths
		case "salary_min_rub":
			target = &in.SalaryMinRUB
		case "search_status":
			target = &in.SearchStatus
		case "work_format_ids":
			target = &in.WorkFormatIDs
		default:
			return in, invalid("Неизвестное или недоступное для изменения поле: " + field)
		}
		if (field == "experience_months" || field == "search_status") && string(raw) == "null" {
			return in, invalid("Поле " + field + " нельзя очистить")
		}
		if json.Unmarshal(raw, target) != nil {
			return in, invalid("Некорректное значение поля " + field)
		}
	}
	return in, in.Normalize()
}
