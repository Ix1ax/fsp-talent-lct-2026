package entity

import consententity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"

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
	Profile  *Profile
	Consents []consententity.Consent
	Contacts *Contacts
	Skills   []Skill
}

// FullProfile — ответ GET /me/profile/full. Category и Achievements пока заготовки под тестирование и ФСП.
type FullProfile struct {
	Profile      *Profile     `json:"profile"`
	Consents     FullConsents `json:"consents"`
	Contacts     *Contacts    `json:"contacts"`
	Skills       []Skill      `json:"skills"`
	Category     any          `json:"category"`
	Achievements []any        `json:"achievements"`
	Readiness    Readiness    `json:"readiness"`
}
