package entity

import (
	fspentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/entity"
	"time"

	consententity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
)

// ReadinessItem — один пункт чек-листа готовности профиля.
type ReadinessItem struct {
	Code     string `json:"code"`
	Title    string `json:"title"`
	Done     bool   `json:"done"`
	Required bool   `json:"required"`
}

// Readiness — чек-лист готовности. Это подсказка для фронта: жёсткие условия публикации проверяет сервер отдельно.
type Readiness struct {
	Percent        int             `json:"percent"`
	ReadyToPublish bool            `json:"ready_to_publish"`
	Items          []ReadinessItem `json:"items"`
}

// ReadinessInput — данные, по которым считается готовность. Статус модерации навыков не учитывается: засчитывается любой навык.
type ReadinessInput struct {
	ProcessingConsent, PublicationConsent bool
	Profile                               *Profile
	HasContacts                           bool
	SkillCount                            int
}

// BuildReadiness считает чек-лист. Порядок пунктов фиксирован: сначала шесть обязательных, затем пять необязательных.
func BuildReadiness(in ReadinessInput) Readiness {
	p := in.Profile
	has := p != nil
	items := []ReadinessItem{
		{"consent_processing", "Согласие на обработку персональных данных", in.ProcessingConsent, true},
		{"profile", "Профиль создан", has, true},
		{"contacts", "Контакты сохранены", in.HasContacts, true},
		{"skills", "Добавлен хотя бы один навык", in.SkillCount > 0, true},
		{"work_formats", "Выбран формат работы", has && len(p.WorkFormatIDs) > 0, true},
		{"consent_publication", "Согласие на публикацию профиля", in.PublicationConsent, true},
		{"headline", "Заголовок профиля", has && p.Headline != nil, false},
		{"summary", "Описание о себе", has && p.Summary != nil, false},
		{"city", "Город", has && p.City != nil, false},
		{"salary", "Желаемая зарплата", has && p.SalaryMinRUB != nil, false},
		{"avatar", "Аватар", has && p.AvatarFileID != nil, false},
	}
	done, ready := 0, true
	for _, item := range items {
		if item.Done {
			done++
		} else if item.Required {
			ready = false
		}
	}
	return Readiness{Percent: (done*100 + len(items)/2) / len(items), ReadyToPublish: ready, Items: items}
}

// FullConsents — активные согласия и текущая версия политики.
type FullConsents struct {
	CurrentPolicyVersion string                  `json:"current_policy_version"`
	Items                []consententity.Consent `json:"items"`
}

// FullSnapshot — согласованный снимок данных кандидата из хранилища.
type FullSnapshot struct {
	Qualifications  []Category
	WorkFormatNames []string
	Survey          *Survey
	LatestAttempt   *OnboardingAttempt
	Achievements    []fspentity.Achievement
	Profile         *Profile
	Consents        []consententity.Consent
	Contacts        *Contacts
	Skills          []Skill
	Category        *Category
	Experience      []Experience
	Education       []Education
}

// Category — текущая категория кандидата: специализация и грейд, подтверждённые последним пройденным тестом.
type Category struct {
	GradeRank        int16     `json:"-"`
	StackSkillID     *string   `json:"stack_skill_id"`
	StackName        *string   `json:"stack_name"`
	SpecializationID int16     `json:"specialization_id"`
	Specialization   string    `json:"specialization"`
	GradeID          int16     `json:"grade_id"`
	Grade            string    `json:"grade"`
	ConfirmedAt      time.Time `json:"confirmed_at"`
}

// FullProfile — ответ GET /me/profile/full. Достижения поступают только из адаптера реестра ФСП.
type FullProfile struct {
	Qualifications  []Category              `json:"qualifications"`
	WorkFormatNames []string                `json:"work_format_names"`
	Onboarding      Onboarding              `json:"onboarding"`
	Profile         *Profile                `json:"profile"`
	Consents        FullConsents            `json:"consents"`
	Contacts        *Contacts               `json:"contacts"`
	Skills          []Skill                 `json:"skills"`
	Category        *Category               `json:"category"`
	Achievements    []fspentity.Achievement `json:"achievements"`
	// Опыт и образование кандидата; ExperienceEstimatedMonths — подсказка по местам работы (nil, если их нет).
	Experience                []Experience `json:"experience"`
	Education                 []Education  `json:"education"`
	ExperienceEstimatedMonths *int         `json:"experience_estimated_months"`
	Readiness                 Readiness    `json:"readiness"`
}
