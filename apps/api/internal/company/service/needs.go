package service

import (
	"context"
	"encoding/json"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
)

type NeedsStore interface {
	CreateNeed(context.Context, string, string, entity.NeedInput) (entity.Need, error)
	GetNeed(context.Context, string, string, string) (entity.Need, error)
	ListNeeds(context.Context, string, string, string, int, int) ([]entity.Need, error)
	UpdateNeed(context.Context, string, string, string, map[string]json.RawMessage) (entity.Need, error)
	ArchiveNeed(context.Context, string, string, string) error
}
type NeedsService struct{ store NeedsStore }

func NewNeedsService(store NeedsStore) *NeedsService { return &NeedsService{store} }
func (s *NeedsService) Create(ctx context.Context, user, company string, in entity.NeedInput) (entity.Need, error) {
	if err := in.Normalize(); err != nil {
		return entity.Need{}, err
	}
	return s.store.CreateNeed(ctx, user, company, in)
}
func (s *NeedsService) Get(ctx context.Context, user, company, id string) (entity.Need, error) {
	return s.store.GetNeed(ctx, user, company, id)
}
func (s *NeedsService) List(ctx context.Context, user, company, status string, limit, offset int) ([]entity.Need, error) {
	if status != "" && status != "draft" && status != "active" && status != "archived" {
		return nil, validationError("Неизвестный фильтр status")
	}
	return s.store.ListNeeds(ctx, user, company, status, limit, offset)
}
func (s *NeedsService) Update(ctx context.Context, user, company, id string, patch map[string]json.RawMessage) (entity.Need, error) {
	return s.store.UpdateNeed(ctx, user, company, id, patch)
}
func (s *NeedsService) Archive(ctx context.Context, user, company, id string) error {
	return s.store.ArchiveNeed(ctx, user, company, id)
}

func validationError(message string) error { return &entity.ValidationError{Message: message} }
