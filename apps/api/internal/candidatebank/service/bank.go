// Пакет service предоставляет работодателю каталог доступных кандидатов.
package service

import (
	"context"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
)

type Store interface {
	Recommend(context.Context, string, string, string, entity.Filter) (entity.RecommendationPage, error)
	List(context.Context, string, string, entity.Filter) (entity.Page, error)
	GetDetails(context.Context, string, string, string) (entity.Details, error)
}
type Service struct{ store Store }

func New(store Store) *Service { return &Service{store: store} }
func (s *Service) List(ctx context.Context, user, company string, filter entity.Filter) (entity.Page, error) {
	return s.store.List(ctx, user, company, filter)
}
func (s *Service) Get(ctx context.Context, user, company, candidate string) (entity.Details, error) {
	return s.store.GetDetails(ctx, user, company, candidate)
}

func (s *Service) Recommend(ctx context.Context, user, company, need string, filter entity.Filter) (entity.RecommendationPage, error) {
	return s.store.Recommend(ctx, user, company, need, filter)
}
