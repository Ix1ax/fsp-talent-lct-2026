package user

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/url"
	"strings"
	"time"
)

// IdentityImportUser совместим с ответом Keycloak Admin /users и экспортом realm.
type IdentityImportUser struct {
	Subject       string `json:"id"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"emailVerified"`
	FirstName     string `json:"firstName"`
	LastName      string `json:"lastName"`
}

type IdentityImportResult struct{ Updated, Skipped int }

func DecodeIdentityImport(reader io.Reader) ([]IdentityImportUser, error) {
	const maxSize = 64 << 20
	data, err := io.ReadAll(io.LimitReader(reader, maxSize+1))
	if err != nil {
		return nil, err
	}
	if len(data) > maxSize {
		return nil, errors.New("Экспорт превышает 64 МБ")
	}
	data = []byte(strings.TrimSpace(string(data)))
	var users []IdentityImportUser
	if len(data) > 0 && data[0] == '[' {
		err = json.Unmarshal(data, &users)
	} else {
		var realm struct {
			Users []IdentityImportUser `json:"users"`
		}
		err = json.Unmarshal(data, &realm)
		users = realm.Users
	}
	if err != nil || users == nil || len(users) > 50000 {
		return nil, errors.New("Ожидается массив пользователей Keycloak или объект с users (до 50000 записей)")
	}
	return users, nil
}

// Импорт не создаёт аккаунты и не меняет роли/блокировки. Все обновления одной выгрузки атомарны.
func (r *Repository) ImportIdentityProfiles(ctx context.Context, issuer string, records []IdentityImportUser, observedAt time.Time) (IdentityImportResult, error) {
	var result IdentityImportResult
	if len(records) > 50000 {
		return result, errors.New("Выгрузка превышает 50000 записей")
	}
	u, err := url.Parse(issuer)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Scheme != "https" && u.Scheme != "http") || observedAt.IsZero() || observedAt.After(time.Now().Add(time.Minute)) {
		return result, errors.New("Укажите точный issuer и время создания выгрузки не в будущем")
	}
	profiles := make([]IdentityProfile, len(records))
	seen := map[string]bool{}
	for idx, record := range records {
		if record.Subject == "" || strings.ContainsRune(record.Subject, 0) || seen[record.Subject] {
			return result, errors.New("Пустой или повторный id в выгрузке")
		}
		seen[record.Subject] = true
		profile := IdentityProfile{DisplayName: strings.TrimSpace(record.FirstName + " " + record.LastName), IssuedAt: observedAt}
		if record.EmailVerified {
			profile.Email = record.Email
		}
		profiles[idx], err = profile.normalized()
		if err != nil {
			return result, err
		}
	}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)
	for idx, record := range records {
		p := profiles[idx]
		tag, err := tx.Exec(ctx, syncIdentityProfileSQL, issuer, record.Subject, p.Email, p.DisplayName, p.IssuedAt)
		if err != nil {
			return IdentityImportResult{}, err
		}
		if tag.RowsAffected() > 0 {
			result.Updated++
		} else {
			result.Skipped++
		}
	}
	return result, tx.Commit(ctx)
}
