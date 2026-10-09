// Пакет service выполняет сценарии предложений через интерфейс хранилища.
package service

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
)

type Store interface {
	Create(context.Context, string, string, entity.Input) (entity.Offer, error)
	CompanyList(context.Context, string, string, string, int, int) ([]entity.Offer, int64, error)
	CompanyGet(context.Context, string, string, string) (entity.Offer, error)
	CandidateList(context.Context, string, string, int, int) ([]entity.Offer, int64, error)
	CandidateGet(context.Context, string, string) (entity.Offer, error)
	View(context.Context, string, string) (entity.Offer, error)
	Respond(context.Context, string, string, string) (entity.Offer, error)
	CandidateContacts(context.Context, string, string, string) (entity.CandidateContacts, error)
}

type Service struct{ store Store }

func New(store Store) *Service { return &Service{store: store} }

func (s *Service) Create(ctx context.Context, user, company string, in entity.Input) (entity.Offer, error) {
	if err := in.Normalize(); err != nil {
		return entity.Offer{}, err
	}
	return s.store.Create(ctx, user, company, in)
}
func (s *Service) CompanyList(ctx context.Context, user, company, status string, limit, offset int) ([]entity.Offer, int64, error) {
	if err := filter(status); err != nil {
		return nil, 0, err
	}
	return s.store.CompanyList(ctx, user, company, status, limit, offset)
}
func (s *Service) CompanyGet(ctx context.Context, user, company, id string) (entity.Offer, error) {
	return s.store.CompanyGet(ctx, user, company, id)
}
func (s *Service) CandidateList(ctx context.Context, user, status string, limit, offset int) ([]entity.Offer, int64, error) {
	if err := filter(status); err != nil {
		return nil, 0, err
	}
	return s.store.CandidateList(ctx, user, status, limit, offset)
}
func (s *Service) CandidateGet(ctx context.Context, user, id string) (entity.Offer, error) {
	return s.store.CandidateGet(ctx, user, id)
}
func (s *Service) View(ctx context.Context, user, id string) (entity.Offer, error) {
	return s.store.View(ctx, user, id)
}
func (s *Service) Respond(ctx context.Context, user, id, status string) (entity.Offer, error) {
	if err := entity.ValidateResponse(entity.StatusSent, status); err != nil {
		return entity.Offer{}, err
	}
	return s.store.Respond(ctx, user, id, status)
}
func (s *Service) CandidateContacts(ctx context.Context, user, company, offerID string) (entity.CandidateContacts, error) {
	return s.store.CandidateContacts(ctx, user, company, offerID)
}
func filter(status string) error {
	switch status {
	case "", entity.StatusSent, entity.StatusViewed, entity.StatusAccepted, entity.StatusRejected:
		return nil
	default:
		return &entity.ValidationError{Message: "Статус должен быть sent, viewed, accepted или rejected"}
	}
}
