package entity

import (
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

// MaxSkills — предел числа навыков одного кандидата.
const MaxSkills = 50

// Источники подтверждения навыка. Вес источника задаёт Confidence: это единственное место с весами.
const (
	SourceClaimed = "claimed"
	SourceTest    = "test"
	SourceFSP     = "fsp"
)

// Confidence возвращает вес источника подтверждения: claimed 0.3, test 0.8, fsp 1.0; неизвестный источник 0.
func Confidence(source string) float64 {
	switch source {
	case SourceClaimed:
		return 0.3
	case SourceTest:
		return 0.8
	case SourceFSP:
		return 1.0
	default:
		return 0
	}
}

// SkillInput — тело запроса: кандидат передаёт только свой уровень. Источник и вес клиент задать не может.
type SkillInput struct {
	ClaimedLevel *int16 `json:"claimed_level"`
}

// Skill — навык кандидата вместе с названием из справочника, источником и весом подтверждения.
type Skill struct {
	ModerationStatus string    `json:"moderation_status"`
	SkillID          string    `json:"skill_id"`
	Code             string    `json:"code"`
	Name             string    `json:"name"`
	ClaimedLevel     *int16    `json:"claimed_level"`
	Source           string    `json:"source"`
	Confidence       float64   `json:"confidence"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func (in *SkillInput) Normalize() error {
	if in.ClaimedLevel == nil || *in.ClaimedLevel < 1 || *in.ClaimedLevel > 5 {
		return invalid("Укажите claimed_level: целое число от 1 до 5")
	}
	return nil
}

var skillIDPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// NormalizeSkillID проверяет UUID навыка и приводит его к нижнему регистру.
func NormalizeSkillID(id string) (string, error) {
	if !skillIDPattern.MatchString(id) {
		return "", invalid("Некорректный UUID навыка в адресе запроса")
	}
	return strings.ToLower(id), nil
}

// Новый навык сразу прикрепляется к резюме, но ждёт модерации перед публикацией в справочнике.
type SkillSubmissionInput struct {
	Name         string `json:"name"`
	ClaimedLevel *int16 `json:"claimed_level"`
}

func (in *SkillSubmissionInput) Normalize() error {
	in.Name = strings.Join(strings.Fields(in.Name), " ")
	if n := utf8.RuneCountInString(in.Name); n < 1 || n > 100 {
		return invalid("Название навыка должно содержать от 1 до 100 символов")
	}
	for _, r := range in.Name {
		if unicode.IsControl(r) || unicode.Is(unicode.Cf, r) {
			return invalid("Название навыка содержит недопустимые символы")
		}
	}
	return (&SkillInput{ClaimedLevel: in.ClaimedLevel}).Normalize()
}
