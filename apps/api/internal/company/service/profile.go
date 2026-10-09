// Пакет service выполняет сценарии компаний через интерфейсы хранилищ.
package service

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
)

type CompanyStore interface {
	Create(context.Context, string, entity.Input) (entity.Company, error)
	List(context.Context, string, int, int) ([]entity.Company, int64, error)
	Get(context.Context, string, string) (entity.Company, error)
	Update(context.Context, string, string, entity.Patch) (entity.Company, error)
}

type CompanyService struct{ store CompanyStore }

func NewCompanyService(store CompanyStore) *CompanyService { return &CompanyService{store: store} }
func (s *CompanyService) Create(ctx context.Context, user string, in entity.Input) (entity.Company, error) {
	if err := in.Normalize(); err != nil {
		return entity.Company{}, err
	}
	return s.store.Create(ctx, user, in)
}
func (s *CompanyService) Get(ctx context.Context, user, id string) (entity.Company, error) {
	return s.store.Get(ctx, user, id)
}
func (s *CompanyService) List(ctx context.Context, user string, limit, offset int) ([]entity.Company, int64, error) {
	return s.store.List(ctx, user, limit, offset)
}
func (s *CompanyService) Update(ctx context.Context, user, id string, patch entity.Patch) (entity.Company, error) {
	return s.store.Update(ctx, user, id, patch)
}
