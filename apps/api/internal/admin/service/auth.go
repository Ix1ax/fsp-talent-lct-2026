// Пакет service реализует вход в админку без публичной регистрации.
package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/entity"
	"golang.org/x/crypto/bcrypt"
	"time"
)

type Store interface {
	UpdateStatus(context.Context, string, string, string) (entity.Account, error)
	List(context.Context, string, int, int) ([]entity.Account, error)
	Lookup(context.Context, string) (entity.Account, string, error)
	AllowLogin(context.Context, []byte, int) error
	IssueSession(context.Context, string, string, []byte, time.Time) error
	Resolve(context.Context, []byte) (entity.Account, error)
	Logout(context.Context, []byte) error
	Create(context.Context, string, string, string) (entity.Account, error)
	Bootstrap(context.Context, string, string) error
}

type Service struct {
	store Store
	dummy []byte
}

func New(store Store) *Service {
	// Сравнение с фиктивным хешем выравнивает обработку неизвестной почты и неверного пароля.
	dummy, _ := bcrypt.GenerateFromPassword([]byte("not-a-real-admin-password"), bcrypt.DefaultCost)
	return &Service{store: store, dummy: dummy}
}
func digest(value string) []byte { h := sha256.Sum256([]byte(value)); return h[:] }

func (s *Service) Login(ctx context.Context, in entity.Credentials, ip string) (entity.Login, error) {
	var result entity.Login
	email, err := entity.NormalizeEmail(in.Email)
	if err != nil {
		return result, entity.ErrUnauthorized
	}
	if err = s.store.AllowLogin(ctx, digest("ip:"+ip), 30); err != nil {
		return result, err
	}
	if err = s.store.AllowLogin(ctx, digest("email:"+email), 10); err != nil {
		return result, err
	}
	a, hash, err := s.store.Lookup(ctx, email)
	if err != nil && !errors.Is(err, entity.ErrUnauthorized) {
		return result, err
	}
	candidate := []byte(hash)
	if len(candidate) == 0 {
		candidate = s.dummy
	}
	check := bcrypt.CompareHashAndPassword(candidate, []byte(in.Password))
	if err != nil || hash == "" || check != nil || a.Status != "active" {
		return result, entity.ErrUnauthorized
	}
	raw := make([]byte, 32)
	if _, err = rand.Read(raw); err != nil {
		return result, err
	}
	token := base64.RawURLEncoding.EncodeToString(raw)
	expires := time.Now().UTC().Add(8 * time.Hour)
	if err = s.store.IssueSession(ctx, a.ID, hash, digest(token), expires); err != nil {
		return result, err
	}
	return entity.Login{AccessToken: token, TokenType: "Bearer", ExpiresAt: expires, Admin: a}, nil
}
func (s *Service) Resolve(ctx context.Context, token string) (entity.Account, error) {
	raw, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil || len(raw) != 32 {
		return entity.Account{}, entity.ErrUnauthorized
	}
	return s.store.Resolve(ctx, digest(token))
}
func (s *Service) Logout(ctx context.Context, token string) error {
	return s.store.Logout(ctx, digest(token))
}
func (s *Service) Create(ctx context.Context, actor entity.Account, in entity.Credentials) (entity.Account, error) {
	if actor.Role != "superadmin" || actor.Status != "active" {
		return entity.Account{}, entity.ErrForbidden
	}
	email, err := entity.NormalizeEmail(in.Email)
	if err != nil {
		return entity.Account{}, err
	}
	if err = entity.ValidatePassword(in.Password); err != nil {
		return entity.Account{}, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return entity.Account{}, err
	}
	return s.store.Create(ctx, actor.ID, email, string(hash))
}
func (s *Service) Bootstrap(ctx context.Context, email, password string) error {
	if email == "" && password == "" {
		return nil
	}
	email, err := entity.NormalizeEmail(email)
	if err != nil {
		return err
	}
	if err = entity.ValidatePassword(password); err != nil {
		return err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.store.Bootstrap(ctx, email, string(hash))
}

func (s *Service) List(ctx context.Context, actor entity.Account, limit, offset int) ([]entity.Account, error) {
	if actor.Role != "superadmin" || actor.Status != "active" {
		return nil, entity.ErrForbidden
	}
	return s.store.List(ctx, actor.ID, limit, offset)
}

func (s *Service) UpdateStatus(ctx context.Context, actor entity.Account, id string, in entity.StatusInput) (entity.Account, error) {
	if actor.Role != "superadmin" || actor.Status != "active" {
		return entity.Account{}, entity.ErrForbidden
	}
	id, err := entity.NormalizeStatusID(id, in)
	if err != nil {
		return entity.Account{}, err
	}
	return s.store.UpdateStatus(ctx, actor.ID, id, in.Status)
}
