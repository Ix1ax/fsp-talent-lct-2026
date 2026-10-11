package entity

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"math"
	"strings"
	"time"
	_ "time/tzdata"
	"unicode/utf8"
)

type NeedSkill struct {
	SkillID  string  `json:"skill_id"`
	Required bool    `json:"required"`
	Weight   float64 `json:"weight"`
}
type NeedInput struct {
	SpecializationID int16       `json:"specialization_id"`
	GradeID          *int16      `json:"grade_id"`
	Title            string      `json:"title"`
	Description      string      `json:"description"`
	SalaryFromRUB    *int64      `json:"salary_from_rub"`
	SalaryToRUB      *int64      `json:"salary_to_rub"`
	City             *string     `json:"city"`
	Timezone         *string     `json:"timezone"`
	Status           string      `json:"status"`
	Skills           []NeedSkill `json:"skills"`
	WorkFormatIDs    []int16     `json:"work_format_ids"`
}
type Need struct {
	ID        string `json:"id"`
	CompanyID string `json:"company_id"`
	CreatedBy string `json:"created_by"`
	NeedInput
	CreatedAt        time.Time `json:"created_at"`
	ModerationStatus string    `json:"moderation_status"`
}

func (in *NeedInput) Normalize() error {
	in.Title = strings.TrimSpace(in.Title)
	in.Description = strings.TrimSpace(in.Description)
	if n := utf8.RuneCountInString(in.Title); n < 1 || n > 200 {
		return invalid("Название потребности должно содержать от 1 до 200 символов")
	}
	if n := utf8.RuneCountInString(in.Description); n < 1 || n > 10000 {
		return invalid("Описание должно содержать от 1 до 10000 символов")
	}
	if in.SpecializationID <= 0 || in.GradeID != nil && *in.GradeID <= 0 {
		return invalid("Выберите специализацию и допустимый грейд из справочника")
	}
	for _, v := range []*int64{in.SalaryFromRUB, in.SalaryToRUB} {
		if v != nil && (*v < 0 || *v > 1_000_000_000) {
			return invalid("Зарплата должна быть от 0 до 1000000000 рублей в месяц")
		}
	}
	if in.SalaryFromRUB != nil && in.SalaryToRUB != nil && *in.SalaryFromRUB > *in.SalaryToRUB {
		return invalid("Нижняя граница зарплаты не может превышать верхнюю")
	}
	for _, v := range []**string{&in.City, &in.Timezone} {
		if *v != nil {
			s := strings.TrimSpace(**v)
			if s == "" {
				*v = nil
			} else {
				*v = &s
			}
		}
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
	for _, value := range append([]string{in.Title, in.Description}, optionalText(in.City, in.Timezone)...) {
		if strings.ContainsRune(value, 0) {
			return invalid("Поля потребности не должны содержать нулевой символ")
		}
	}
	if in.Status == "" {
		in.Status = "draft"
	}
	if in.Status != "draft" && in.Status != "active" && in.Status != "archived" {
		return invalid("Статус должен быть draft, active или archived")
	}
	if len(in.Skills) > 50 || len(in.WorkFormatIDs) > 10 {
		return invalid("Допустимо до 50 навыков и до 10 форматов работы")
	}
	ids := map[string]bool{}
	for i := range in.Skills {
		skill := &in.Skills[i]
		id, valid := normalizeUUID(skill.SkillID)
		if !valid {
			return invalid("Некорректный UUID навыка")
		}
		skill.SkillID = id
		if ids[skill.SkillID] {
			return invalid("Навыки не должны повторяться")
		}
		ids[skill.SkillID] = true
		if math.IsNaN(skill.Weight) || math.IsInf(skill.Weight, 0) || skill.Weight < 0.01 || skill.Weight > 100 || math.Abs(skill.Weight*100-math.Round(skill.Weight*100)) > 0.000001 {
			return invalid("Вес навыка: от 0.01 до 100, не более двух знаков после запятой")
		}
	}
	formats := map[int16]bool{}
	for _, id := range in.WorkFormatIDs {
		if id <= 0 || formats[id] {
			return invalid("Форматы работы должны быть уникальными ID из справочника")
		}
		formats[id] = true
	}
	if in.Status == "active" && (len(in.Skills) == 0 || len(in.WorkFormatIDs) == 0) {
		return invalid("Для активной потребности выберите хотя бы один навык и формат работы")
	}
	if in.Skills == nil {
		in.Skills = []NeedSkill{}
	}
	if in.WorkFormatIDs == nil {
		in.WorkFormatIDs = []int16{}
	}
	return nil
}

// Проверка UUID не требует драйвера базы данных: модели не зависят от Postgres.
func normalizeUUID(value string) (string, bool) {
	if len(value) == 36 {
		if value[8] != '-' || value[13] != '-' || value[18] != '-' || value[23] != '-' {
			return "", false
		}
		value = strings.ReplaceAll(value, "-", "")
	}
	if len(value) != 32 {
		return "", false
	}
	if _, err := hex.DecodeString(value); err != nil {
		return "", false
	}
	value = strings.ToLower(value)
	return value[:8] + "-" + value[8:12] + "-" + value[12:16] + "-" + value[16:20] + "-" + value[20:], true
}
func optionalText(values ...*string) []string {
	out := []string{}
	for _, v := range values {
		if v != nil {
			out = append(out, *v)
		}
	}
	return out
}

// Массивы PATCH заменяют набор целиком. Не переданное поле сохраняется.
func ApplyNeedPatch(current Need, patch map[string]json.RawMessage) (NeedInput, error) {
	in := current.NeedInput
	if len(patch) == 0 {
		return in, invalid("Передайте хотя бы одно поле потребности")
	}
	for key, raw := range patch {
		var target any
		nullable := false
		switch key {
		case "specialization_id":
			target = &in.SpecializationID
		case "grade_id":
			target = &in.GradeID
			nullable = true
		case "title":
			target = &in.Title
		case "description":
			target = &in.Description
		case "salary_from_rub":
			target = &in.SalaryFromRUB
			nullable = true
		case "salary_to_rub":
			target = &in.SalaryToRUB
			nullable = true
		case "city":
			target = &in.City
			nullable = true
		case "timezone":
			target = &in.Timezone
			nullable = true
		case "status":
			target = &in.Status
		case "skills":
			target = &in.Skills
		case "work_format_ids":
			target = &in.WorkFormatIDs
		default:
			return in, invalid("Недоступное поле потребности: " + key)
		}
		if strings.TrimSpace(string(raw)) == "null" && !nullable {
			return in, invalid("Поле " + key + " нельзя очистить через null")
		}
		decoder := json.NewDecoder(bytes.NewReader(raw))
		decoder.DisallowUnknownFields()
		if decoder.Decode(target) != nil {
			return in, invalid("Некорректное значение поля " + key)
		}
	}
	if in.Status == "" {
		return in, invalid("Статус не может быть пустым")
	}
	return in, in.Normalize()
}
