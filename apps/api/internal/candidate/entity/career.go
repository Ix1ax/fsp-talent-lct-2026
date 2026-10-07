package entity

import (
	"encoding/json"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	MaxExperiences = 30
	MaxEducation   = 10
	maxEstimate    = 600
)

var monthPattern = regexp.MustCompile(`^(\d{4})-(0[1-9]|1[0-2])$`)

// Month — календарный месяц в формате YYYY-MM; хранится первым числом месяца в UTC.
type Month struct{ t time.Time }

func NewMonth(year int, month time.Month) Month {
	return Month{time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)}
}

// ParseMonth разбирает строго YYYY-MM.
func ParseMonth(s string) (Month, error) {
	m := monthPattern.FindStringSubmatch(s)
	if m == nil {
		return Month{}, invalid("Месяц указывается в формате ГГГГ-ММ, например 2024-05")
	}
	t, err := time.Parse("2006-01", s)
	if err != nil || t.Year() < 1900 {
		return Month{}, invalid("Месяц указывается в формате ГГГГ-ММ, например 2024-05")
	}
	return Month{t.UTC()}, nil
}

func (m Month) IsZero() bool    { return m.t.IsZero() }
func (m Month) Time() time.Time { return m.t }
func (m Month) String() string  { return m.t.Format("2006-01") }
func (m Month) index() int      { return m.t.Year()*12 + int(m.t.Month()) - 1 }

func (m Month) MarshalJSON() ([]byte, error) { return json.Marshal(m.String()) }

func (m *Month) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return invalid("Месяц указывается строкой в формате ГГГГ-ММ")
	}
	parsed, err := ParseMonth(s)
	if err != nil {
		return err
	}
	*m = parsed
	return nil
}

func currentMonth(now time.Time) Month {
	now = now.UTC()
	return NewMonth(now.Year(), now.Month())
}

func hasNUL(values ...string) bool {
	for _, v := range values {
		if strings.ContainsRune(v, 0) {
			return true
		}
	}
	return false
}

func between(s string, min, max int) bool {
	n := utf8.RuneCountInString(s)
	return n >= min && n <= max
}

// ExperienceInput — тело запроса места работы. Пустой EndedOn значит «по настоящее время».
type ExperienceInput struct {
	Company     string `json:"company"`
	Position    string `json:"position"`
	StartedOn   Month  `json:"started_on"`
	EndedOn     *Month `json:"ended_on"`
	Description string `json:"description"`
}

type Experience struct {
	ID string `json:"id"`
	ExperienceInput
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Normalize обрезает строки и проверяет поля. Будущие месяцы запрещены.
func (in *ExperienceInput) Normalize(now time.Time) error {
	in.Company, in.Position = strings.TrimSpace(in.Company), strings.TrimSpace(in.Position)
	in.Description = strings.TrimSpace(in.Description)
	if !between(in.Company, 1, 200) {
		return invalid("Укажите компанию: от 1 до 200 символов")
	}
	if !between(in.Position, 1, 200) {
		return invalid("Укажите должность: от 1 до 200 символов")
	}
	if utf8.RuneCountInString(in.Description) > 2000 {
		return invalid("Описание не длиннее 2000 символов")
	}
	if hasNUL(in.Company, in.Position, in.Description) {
		return invalid("Текст содержит недопустимые символы")
	}
	if in.StartedOn.IsZero() {
		return invalid("Укажите started_on в формате ГГГГ-ММ")
	}
	// Месяц не должен быть в будущем ни в одном часовом поясе: берём самый восточный (UTC+14).
	limit := currentMonth(now.Add(14 * time.Hour))
	if in.StartedOn.index() > limit.index() {
		return invalid("Начало работы не может быть в будущем")
	}
	if in.EndedOn != nil {
		if in.EndedOn.IsZero() || in.EndedOn.index() < in.StartedOn.index() {
			return invalid("Окончание работы не может быть раньше начала")
		}
		if in.EndedOn.index() > limit.index() {
			return invalid("Окончание работы не может быть в будущем")
		}
	}
	return nil
}

// Уровни образования.
var educationLevels = map[string]bool{
	"secondary": true, "vocational": true, "incomplete_higher": true, "higher": true,
	"bachelor": true, "master": true, "phd": true, "doctor": true,
}

type EducationInput struct {
	Level          string `json:"level"`
	Institution    string `json:"institution"`
	Specialty      string `json:"specialty"`
	GraduationYear int    `json:"graduation_year"`
}

type Education struct {
	ID string `json:"id"`
	EducationInput
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (in *EducationInput) Normalize() error {
	in.Institution, in.Specialty = strings.TrimSpace(in.Institution), strings.TrimSpace(in.Specialty)
	if !educationLevels[in.Level] {
		return invalid("Неизвестный уровень образования")
	}
	if !between(in.Institution, 1, 200) {
		return invalid("Укажите учебное заведение: от 1 до 200 символов")
	}
	if utf8.RuneCountInString(in.Specialty) > 200 {
		return invalid("Специальность не длиннее 200 символов")
	}
	if hasNUL(in.Institution, in.Specialty) {
		return invalid("Текст содержит недопустимые символы")
	}
	if in.GraduationYear < 1950 || in.GraduationYear > 2100 {
		return invalid("Год окончания — от 1950 до 2100")
	}
	return nil
}

// EstimateExperienceMonths считает стаж по периодам: пересечения не считаются дважды, период включает начальный
// и конечный месяц, текущая работа считается до текущего месяца. Результат не больше 600.
func EstimateExperienceMonths(items []Experience, now time.Time) int {
	type span struct{ from, to int }
	current := currentMonth(now).index()
	spans := make([]span, 0, len(items))
	for _, e := range items {
		if e.StartedOn.IsZero() {
			continue
		}
		s := span{from: e.StartedOn.index(), to: current}
		if e.EndedOn != nil {
			s.to = e.EndedOn.index()
		}
		if s.to > current {
			s.to = current
		}
		if s.to >= s.from {
			spans = append(spans, s)
		}
	}
	sort.Slice(spans, func(i, j int) bool { return spans[i].from < spans[j].from })
	total, end := 0, -1<<31
	for _, s := range spans {
		from := s.from
		if from <= end {
			from = end + 1
		}
		if s.to >= from {
			total += s.to - from + 1
		}
		if s.to > end {
			end = s.to
		}
	}
	if total > maxEstimate {
		total = maxEstimate
	}
	return total
}
