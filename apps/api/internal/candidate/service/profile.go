// Пакет service выполняет сценарии профиля кандидата через интерфейсы хранилищ.
package service

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

type ProfileStore interface {
	Create(ctx context.Context, userID string, in entity.ProfileInput) (entity.Profile, error)
	Get(ctx context.Context, userID string) (entity.Profile, error)
	Update(ctx context.Context, userID string, patch entity.Patch) (entity.Profile, error)
}

type ProfileService struct{ store ProfileStore }

func NewProfileService(store ProfileStore) *ProfileService { return &ProfileService{store: store} }

func (s *ProfileService) Create(ctx context.Context, userID string, in entity.ProfileInput) (entity.Profile, error) {
	if err := in.Normalize(); err != nil {
		return entity.Profile{}, err
	}
	return s.store.Create(ctx, userID, in)
}
func (s *ProfileService) Get(ctx context.Context, userID string) (entity.Profile, error) {
	return s.store.Get(ctx, userID)
}
func (s *ProfileService) Update(ctx context.Context, userID string, patch entity.Patch) (entity.Profile, error) {
	return s.store.Update(ctx, userID, patch)
}
