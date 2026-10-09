package user

import (
	"context"
	"errors"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"
)

// IdentityProfile приходит только из проверенного OIDC-токена или административного импорта.
// Контактная почта кандидата не заменяет подтверждённую почту аккаунта.
type IdentityProfile struct {
	Email, DisplayName string
	IssuedAt           time.Time
}

func (p IdentityProfile) normalized() (IdentityProfile, error) {
	p.Email, p.DisplayName = strings.TrimSpace(p.Email), strings.TrimSpace(p.DisplayName)
	if p.Email != "" {
		address, err := mail.ParseAddress(p.Email)
		if err != nil || address.Address != p.Email || !strings.Contains(p.Email, "@") || len(p.Email) > 254 || !utf8.ValidString(p.Email) {
			return p, errors.New("Некорректная почта проверенной идентичности")
		}
	}
	// Имя необязательно и может отсутствовать в настройках OIDC. Не ломаем вход из-за него.
	if !utf8.ValidString(p.DisplayName) || strings.ContainsRune(p.DisplayName, 0) || utf8.RuneCountInString(p.DisplayName) > 200 {
		p.DisplayName = ""
	}
	return p, nil
}

type identityProfileStore interface {
	SyncIdentityProfile(context.Context, string, string, IdentityProfile) error
	CreateWithIdentityProfile(context.Context, string, string, string, IdentityProfile) (User, error)
}

func (s *Service) SyncIdentityProfile(ctx context.Context, issuer, subject string, profile IdentityProfile) error {
	profile, err := profile.normalized()
	if err != nil {
		return err
	}
	if store, ok := s.store.(identityProfileStore); ok {
		return store.SyncIdentityProfile(ctx, issuer, subject, profile)
	}
	return nil
}

func (s *Service) RegisterWithIdentityProfile(ctx context.Context, issuer, subject, role string, profile IdentityProfile) (User, error) {
	if role != RoleCandidate && role != RoleEmployer {
		return User{}, ErrInvalidRole
	}
	profile, err := profile.normalized()
	if err != nil {
		return User{}, err
	}
	if store, ok := s.store.(identityProfileStore); ok {
		return store.CreateWithIdentityProfile(ctx, issuer, subject, role, profile)
	}
	return s.store.Create(ctx, issuer, subject, role)
}
