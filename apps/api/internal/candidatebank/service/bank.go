// Пакет service предоставляет работодателю каталог доступных кандидатов.
package service

import (
	"context"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
)

type Store interface {
	List(context.Context, string, string, int, int) (entity.Page, error)
	Get(context.Context, string, string, string) (entity.Card, error)
}
type Service struct{ store Store }

func New(store Store) *Service { return &Service{store: store} }
func (s *Service) List(ctx context.Context, user, company string, limit, offset int) (entity.Page, error) {
	return s.store.List(ctx, user, company, limit, offset)
}
func (s *Service) Get(ctx context.Context, user, company, candidate string) (entity.Card, error) {
	return s.store.Get(ctx, user, company, candidate)
}
