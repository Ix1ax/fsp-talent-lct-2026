// Пакет entity содержит модель согласий кандидата на обработку данных (152-ФЗ) и правила её проверки.
package entity

import (
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	KindProcessing  = "processing"
	KindPublication = "publication"
	KindATSTransfer = "ats_transfer"
)

type Consent struct {
	ID            string     `json:"id"`
	Kind          string     `json:"kind"`
	PolicyVersion string     `json:"policy_version"`
	CompanyID     *string    `json:"company_id"`
	GrantedAt     time.Time  `json:"granted_at"`
	RevokedAt     *time.Time `json:"revoked_at"`
}

type GrantInput struct {
	Kind          string  `json:"kind"`
	PolicyVersion string  `json:"policy_version"`
	CompanyID     *string `json:"company_id"`
}

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func ValidKind(kind string) bool {
	return kind == KindProcessing || kind == KindPublication || kind == KindATSTransfer
}

// ValidateTarget проверяет вид и компанию: компания нужна только для ats_transfer. Возвращает UUID в нижнем регистре.
func ValidateTarget(kind string, companyID *string) (*string, error) {
	if !ValidKind(kind) {
		return nil, invalid("Вид согласия должен быть processing, publication или ats_transfer")
	}
	if kind != KindATSTransfer {
		if companyID != nil {
			return nil, invalid("company_id указывается только для ats_transfer")
		}
		return nil, nil
	}
	if companyID == nil || !uuidPattern.MatchString(*companyID) {
		return nil, invalid("Для ats_transfer укажите корректный UUID компании в company_id")
	}
	id := strings.ToLower(*companyID)
	return &id, nil
}

// Normalize проверяет ввод и версию политики. Устаревшая версия возвращает ErrPolicyOutdated.
func (in *GrantInput) Normalize(currentVersion string) error {
	in.Kind = strings.TrimSpace(in.Kind)
	in.PolicyVersion = strings.TrimSpace(in.PolicyVersion)
	company, err := ValidateTarget(in.Kind, in.CompanyID)
	if err != nil {
		return err
	}
	in.CompanyID = company
	if n := utf8.RuneCountInString(in.PolicyVersion); n < 1 || n > 32 {
		return invalid("Укажите версию политики до 32 символов")
	}
	if in.PolicyVersion != currentVersion {
		return ErrPolicyOutdated
	}
	return nil
}
