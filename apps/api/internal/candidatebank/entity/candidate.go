// Пакет entity описывает безопасную выдачу банка кандидатов для работодателя.
package entity

import "errors"

var ErrNotFound = errors.New("Кандидат или компания недоступны")

// Card не содержит локальный ID пользователя, контакты и адреса файлов S3.
// Свободный текст исключён: кандидат может случайно указать в нём телефон или почту.
type Card struct {
	Category         Category `json:"category"`
	ID               string   `json:"id"`
	City             *string  `json:"city"`
	Timezone         *string  `json:"timezone"`
	ExperienceMonths int      `json:"experience_months"`
	SalaryMinRUB     *int64   `json:"salary_min_rub"`
	SearchStatus     string   `json:"search_status"`
	WorkFormatIDs    []int16  `json:"work_format_ids"`
}

// Category содержит только категорию успешного теста, без самооценки из резюме.
type Category struct {
	SpecializationID int16 `json:"specialization_id"`
	GradeID          int16 `json:"grade_id"`
}

type Page struct {
	Items  []Card `json:"items"`
	Total  int64  `json:"total"`
	Limit  int    `json:"limit"`
	Offset int    `json:"offset"`
}
