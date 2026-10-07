package entity

import (
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	KindChoice      = "choice"
	KindCodeReading = "code_reading"
	KindShortAnswer = "short_answer"

	StatusDraft     = "draft"
	StatusPublished = "published"
	StatusArchived  = "archived"
)

type Option struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

type Prompt struct {
	Text     string   `json:"text"`
	Code     string   `json:"code,omitempty"`
	Language string   `json:"language,omitempty"`
	Options  []Option `json:"options,omitempty"`
}

type GradingSpec struct {
	Type          string   `json:"type"`
	Correct       []string `json:"correct,omitempty"`
	Multiple      bool     `json:"multiple,omitempty"`
	Accepted      []string `json:"accepted,omitempty"`
	CaseSensitive bool     `json:"case_sensitive,omitempty"`
}

type QuestionInput struct {
	SkillID     string      `json:"skill_id"`
	Difficulty  int16       `json:"difficulty"`
	Kind        string      `json:"kind"`
	Prompt      Prompt      `json:"prompt"`
	GradingSpec GradingSpec `json:"grading_spec"`
}

type VersionInput struct {
	Prompt      Prompt      `json:"prompt"`
	GradingSpec GradingSpec `json:"grading_spec"`
}

type QuestionVersion struct {
	Version     int         `json:"version"`
	Status      string      `json:"status"`
	Prompt      Prompt      `json:"prompt"`
	GradingSpec GradingSpec `json:"grading_spec"`
	CreatedAt   time.Time   `json:"created_at"`
	PublishedAt *time.Time  `json:"published_at"`
}

type Question struct {
	ID               string            `json:"id"`
	SkillID          string            `json:"skill_id"`
	SkillName        string            `json:"skill_name"`
	Difficulty       int16             `json:"difficulty"`
	Kind             string            `json:"kind"`
	Active           bool              `json:"active"`
	CreatedAt        time.Time         `json:"created_at"`
	LatestVersion    int               `json:"latest_version"`
	PublishedVersion *int              `json:"published_version"`
	Versions         []QuestionVersion `json:"versions,omitempty"`
}

type QuestionFilter struct {
	SkillID       string
	Difficulty    int16
	Kind, Status  string
	Active        *bool
	Limit, Offset int
}

type QuestionPage struct {
	Items  []Question `json:"items"`
	Total  int64      `json:"total"`
	Limit  int        `json:"limit"`
	Offset int        `json:"offset"`
}

var (
	idPattern     = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	optionPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,16}$`)
)

// NormalizeID проверяет UUID и приводит его к нижнему регистру.
func NormalizeID(id string) (string, error) {
	if !idPattern.MatchString(id) {
		return "", invalid("Некорректный UUID")
	}
	return strings.ToLower(id), nil
}

func NormalizeVersion(version int) error {
	if version < 1 {
		return invalid("Номер версии должен быть целым числом от 1")
	}
	return nil
}

func validKind(kind string) bool {
	return kind == KindChoice || kind == KindCodeReading || kind == KindShortAnswer
}

func validStatus(status string) bool {
	return status == StatusDraft || status == StatusPublished || status == StatusArchived
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

// ValidateContent проверяет текст задания и правила проверки по виду задания и обрезает пробелы по краям.
func ValidateContent(kind string, p *Prompt, g *GradingSpec) error {
	if !validKind(kind) {
		return invalid("Вид задания должен быть choice, code_reading или short_answer")
	}
	p.Text, p.Code, p.Language = strings.TrimSpace(p.Text), strings.TrimSpace(p.Code), strings.TrimSpace(p.Language)
	if !between(p.Text, 1, 5000) {
		return invalid("Текст задания должен содержать от 1 до 5000 символов")
	}
	if hasNUL(p.Text, p.Code, p.Language) {
		return invalid("Тексты задания не должны содержать нулевой символ")
	}
	if kind == KindCodeReading {
		if !between(p.Code, 1, 10000) {
			return invalid("Для code_reading нужен фрагмент кода (code) до 10000 символов")
		}
		if utf8.RuneCountInString(p.Language) > 32 {
			return invalid("Название языка (language) не должно превышать 32 символа")
		}
	} else if p.Code != "" || p.Language != "" {
		return invalid("Поля code и language допустимы только для code_reading")
	}
	switch g.Type {
	case "choice":
		if kind == KindShortAnswer {
			return invalid("Для short_answer правила проверки должны быть типа text")
		}
		if len(g.Accepted) != 0 || g.CaseSensitive {
			return invalid("Для правил типа choice поля accepted и case_sensitive не допускаются")
		}
		if err := validateOptions(p.Options); err != nil {
			return err
		}
		ids := map[string]bool{}
		for _, o := range p.Options {
			ids[o.ID] = true
		}
		if len(g.Correct) == 0 || len(g.Correct) > len(p.Options) {
			return invalid("Укажите правильные варианты ответа (correct)")
		}
		if !g.Multiple && len(g.Correct) != 1 {
			return invalid("При multiple=false должен быть ровно один правильный вариант")
		}
		seen := map[string]bool{}
		for _, id := range g.Correct {
			if !ids[id] || seen[id] {
				return invalid("Правильные варианты должны быть различными id из options")
			}
			seen[id] = true
		}
	case "text":
		if kind == KindChoice {
			return invalid("Для choice правила проверки должны быть типа choice")
		}
		if len(p.Options) != 0 {
			return invalid("Для заданий с текстовым ответом options не допускаются")
		}
		if len(g.Correct) != 0 || g.Multiple {
			return invalid("Для правил типа text поля correct и multiple не допускаются")
		}
		if len(g.Accepted) < 1 || len(g.Accepted) > 20 {
			return invalid("Укажите от 1 до 20 допустимых ответов (accepted)")
		}
		for i, a := range g.Accepted {
			a = strings.TrimSpace(a)
			if !between(a, 1, 200) || hasNUL(a) {
				return invalid("Допустимый ответ должен содержать от 1 до 200 символов без нулевого символа")
			}
			g.Accepted[i] = a
		}
	default:
		return invalid("Тип правил проверки должен быть choice или text")
	}
	return nil
}

func validateOptions(options []Option) error {
	if len(options) < 2 || len(options) > 10 {
		return invalid("Нужно от 2 до 10 вариантов ответа (options)")
	}
	seen := map[string]bool{}
	for i := range options {
		o := &options[i]
		o.Text = strings.TrimSpace(o.Text)
		if !optionPattern.MatchString(o.ID) || seen[o.ID] {
			return invalid("id варианта: от 1 до 16 символов из латиницы, цифр, дефиса и подчёркивания, без повторов")
		}
		seen[o.ID] = true
		if !between(o.Text, 1, 500) || hasNUL(o.Text) {
			return invalid("Текст варианта должен содержать от 1 до 500 символов без нулевого символа")
		}
	}
	return nil
}

func (in *QuestionInput) Normalize() error {
	id, err := NormalizeID(in.SkillID)
	if err != nil {
		return invalid("Укажите корректный UUID навыка (skill_id)")
	}
	in.SkillID = id
	if in.Difficulty < 1 || in.Difficulty > 5 {
		return invalid("Сложность (difficulty) должна быть от 1 до 5")
	}
	return ValidateContent(in.Kind, &in.Prompt, &in.GradingSpec)
}

// Normalize проверяет версию по виду задания, которому она принадлежит.
func (in *VersionInput) Normalize(kind string) error {
	return ValidateContent(kind, &in.Prompt, &in.GradingSpec)
}

func normalizeFilter(skillID *string, difficulty int16, kind, status string, limit, offset *int) error {
	if *skillID != "" {
		id, err := NormalizeID(*skillID)
		if err != nil {
			return invalid("Некорректный UUID навыка в фильтре")
		}
		*skillID = id
	}
	if difficulty < 0 || difficulty > 5 {
		return invalid("Сложность в фильтре должна быть от 1 до 5")
	}
	if kind != "" && !validKind(kind) {
		return invalid("Неизвестный вид задания в фильтре")
	}
	if status != "" && !validStatus(status) {
		return invalid("Статус в фильтре должен быть draft, published или archived")
	}
	if *limit == 0 {
		*limit = 20
	}
	if *limit < 1 || *limit > 100 || *offset < 0 || *offset > 100000 {
		return invalid("limit: от 1 до 100; offset: от 0")
	}
	return nil
}

func (f *QuestionFilter) Normalize() error {
	return normalizeFilter(&f.SkillID, f.Difficulty, f.Kind, f.Status, &f.Limit, &f.Offset)
}
