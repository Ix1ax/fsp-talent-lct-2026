package resume

import (
	"errors"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

// ErrUnrecognized — файл не похож на резюме hh.ru: не найден ни один из разделов «Желаемая должность», «Опыт работы», «Навыки».
var ErrUnrecognized = errors.New("файл не похож на резюме hh.ru")

// Contacts — контакты из шапки резюме.
type Contacts struct {
	FullName *string `json:"full_name"`
	Email    *string `json:"email"`
	Phone    *string `json:"phone"`
	Telegram *string `json:"telegram"`
}

// Language — язык и уровень владения.
type Language struct {
	Name  string `json:"name"`
	Level string `json:"level"`
}

// Draft — разобранное резюме. Навыки и форматы работы заданы названиями и кодами: сопоставление со справочниками делает сервис.
type Draft struct {
	Headline        *string
	City            *string
	Summary         *string
	SalaryMinRUB    *int64
	WorkFormatCodes []string
	Contacts        *Contacts
	Skills          []string
	Experience      []entity.ExperienceInput
	Education       []entity.EducationInput
	Languages       []Language
}
