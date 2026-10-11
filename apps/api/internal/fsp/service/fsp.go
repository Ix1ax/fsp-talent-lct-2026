package service

import (
	"context"
	"fmt"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/entity"
)

type Registry interface {
	Lookup(context.Context, entity.Identity) (entity.Record, error)
}
type Store interface {
	Get(context.Context, string) (entity.Profile, error)
	Save(context.Context, string, entity.Identity, entity.Record, bool) (entity.Profile, error)
	Failure(context.Context, string) error
	Unlink(context.Context, string) error
}
type Service struct {
	store    Store
	registry Registry
}

func New(store Store, registry Registry) *Service { return &Service{store: store, registry: registry} }
func (s *Service) Get(ctx context.Context, user string) (entity.Profile, error) {
	return s.store.Get(ctx, user)
}
func (s *Service) Unlink(ctx context.Context, user string) error { return s.store.Unlink(ctx, user) }

func (s *Service) Sync(ctx context.Context, user string, identity entity.Identity, link bool) (entity.Profile, error) {
	before, err := s.store.Get(ctx, user)
	if err != nil {
		return entity.Profile{}, err
	}
	if !link && before.Link == nil {
		return before, entity.ErrNotLinked
	}
	record, err := s.registry.Lookup(ctx, identity)
	if err != nil {
		if failure := s.store.Failure(ctx, user); failure != nil {
			return before, failure
		}
		return before, entity.ErrUnavailable
	}
	// Ошибка адаптера не должна сохранить неполный ответ или обнулить прежние данные.
	if err = validate(record); err != nil {
		if failure := s.store.Failure(ctx, user); failure != nil {
			return before, failure
		}
		return before, err
	}
	return s.store.Save(ctx, user, identity, record, link)
}

func validate(r entity.Record) error {
	if r.ParticipantID == "" || len(r.ParticipantID) > 200 || r.Source == "" || len(r.Source) > 100 || len(r.Items) > 1000 {
		return entity.ErrUnavailable
	}
	seen := map[string]bool{}
	for _, a := range r.Items {
		_, err := time.Parse("2006-01-02", a.OccurredOn)
		if a.ID == "" || len(a.ID) > 200 || seen[a.ID] || a.EventID == "" || len(a.EventID) > 200 || a.EventName == "" || len(a.EventName) > 500 || a.Discipline == "" || len(a.Discipline) > 200 || a.Result == "" || len(a.Result) > 500 || a.Source != r.Source || err != nil || (a.Place != nil && *a.Place < 1) {
			return fmt.Errorf("%w: некорректные данные адаптера", entity.ErrUnavailable)
		}
		seen[a.ID] = true
	}
	return nil
}
