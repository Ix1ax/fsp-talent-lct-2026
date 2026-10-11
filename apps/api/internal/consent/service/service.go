// Пакет service выполняет сценарии согласий кандидата через интерфейс хранилища.
package service

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
)

type Store interface {
	List(ctx context.Context, userID string) ([]entity.Consent, error)
	Grant(ctx context.Context, userID string, in entity.GrantInput) (entity.Consent, error)
	Revoke(ctx context.Context, userID, kind string, companyID *string) error
}

type Service struct {
	store         Store
	policyVersion string
}

func NewService(store Store, policyVersion string) *Service {
	return &Service{store: store, policyVersion: policyVersion}
}

func (s *Service) PolicyVersion() string { return s.policyVersion }

func (s *Service) List(ctx context.Context, userID string) ([]entity.Consent, error) {
	return s.store.List(ctx, userID)
}

func (s *Service) Grant(ctx context.Context, userID string, in entity.GrantInput) (entity.Consent, error) {
	if err := in.Normalize(s.policyVersion); err != nil {
		return entity.Consent{}, err
	}
	return s.store.Grant(ctx, userID, in)
}

func (s *Service) Revoke(ctx context.Context, userID, kind string, companyID *string) error {
	company, err := entity.ValidateTarget(kind, companyID)
	if err != nil {
		return err
	}
	return s.store.Revoke(ctx, userID, kind, company)
}
