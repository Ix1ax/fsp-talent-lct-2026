// Пакет user связывает проверенную OIDC-идентичность с пользователем приложения и его ролью.
package user

import (
	"context"
	"errors"
)

const (
	RoleCandidate = "candidate"
	RoleEmployer  = "employer"
	RoleAdmin     = "admin"

	StatusActive = "active"
)

var (
	ErrNotFound    = errors.New("пользователь не найден")
	ErrExists      = errors.New("пользователь уже зарегистрирован")
	ErrInvalidRole = errors.New("недопустимая роль")
	ErrInactive    = errors.New("пользователь заблокирован или удалён")
)

type User struct {
	ID     string `json:"id"`
	Role   string `json:"role"`
	Status string `json:"status"`
}

// Store хранит пользователей. Реализация для Postgres — в repository.go.
type Store interface {
	FindByIdentity(ctx context.Context, issuer, subject string) (User, error)
	Create(ctx context.Context, issuer, subject, role string) (User, error)
}

type Service struct{ store Store }

func NewService(store Store) *Service { return &Service{store: store} }

// Resolve возвращает активного пользователя по внешней идентичности.
func (s *Service) Resolve(ctx context.Context, issuer, subject string) (User, error) {
	u, err := s.store.FindByIdentity(ctx, issuer, subject)
	if err != nil {
		return User{}, err
	}
	if u.Status != StatusActive {
		return User{}, ErrInactive
	}
	return u, nil
}

// Register создаёт пользователя при первом входе. Роль admin через API выдать нельзя.
func (s *Service) Register(ctx context.Context, issuer, subject, role string) (User, error) {
	if role != RoleCandidate && role != RoleEmployer {
		return User{}, ErrInvalidRole
	}
	return s.store.Create(ctx, issuer, subject, role)
}
