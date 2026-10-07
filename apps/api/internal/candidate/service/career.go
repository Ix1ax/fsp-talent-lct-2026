package service

import (
	"context"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

// CareerStore — хранилище мест работы и образования кандидата.
type CareerStore interface {
	ListExperience(ctx context.Context, userID string) ([]entity.Experience, error)
	CreateExperience(ctx context.Context, userID string, in entity.ExperienceInput) (entity.Experience, error)
	ReplaceExperience(ctx context.Context, userID, id string, in entity.ExperienceInput) (entity.Experience, error)
	DeleteExperience(ctx context.Context, userID, id string) error
	ListEducation(ctx context.Context, userID string) ([]entity.Education, error)
	CreateEducation(ctx context.Context, userID string, in entity.EducationInput) (entity.Education, error)
	ReplaceEducation(ctx context.Context, userID, id string, in entity.EducationInput) (entity.Education, error)
	DeleteEducation(ctx context.Context, userID, id string) error
}

type CareerService struct {
	store CareerStore
	now   func() time.Time
}

// NewCareerService принимает часы, чтобы проверка «не в будущем» не зависела от системного времени в тестах.
func NewCareerService(store CareerStore, now func() time.Time) *CareerService {
	if now == nil {
		now = time.Now
	}
	return &CareerService{store: store, now: now}
}

func (s *CareerService) ListExperience(ctx context.Context, userID string) ([]entity.Experience, error) {
	return s.store.ListExperience(ctx, userID)
}

func (s *CareerService) CreateExperience(ctx context.Context, userID string, in entity.ExperienceInput) (entity.Experience, error) {
	if err := in.Normalize(s.now()); err != nil {
		return entity.Experience{}, err
	}
	return s.store.CreateExperience(ctx, userID, in)
}

func (s *CareerService) ReplaceExperience(ctx context.Context, userID, id string, in entity.ExperienceInput) (entity.Experience, error) {
	if err := in.Normalize(s.now()); err != nil {
		return entity.Experience{}, err
	}
	return s.store.ReplaceExperience(ctx, userID, id, in)
}

func (s *CareerService) DeleteExperience(ctx context.Context, userID, id string) error {
	return s.store.DeleteExperience(ctx, userID, id)
}

func (s *CareerService) ListEducation(ctx context.Context, userID string) ([]entity.Education, error) {
	return s.store.ListEducation(ctx, userID)
}

func (s *CareerService) CreateEducation(ctx context.Context, userID string, in entity.EducationInput) (entity.Education, error) {
	if err := in.Normalize(); err != nil {
		return entity.Education{}, err
	}
	return s.store.CreateEducation(ctx, userID, in)
}

func (s *CareerService) ReplaceEducation(ctx context.Context, userID, id string, in entity.EducationInput) (entity.Education, error) {
	if err := in.Normalize(); err != nil {
		return entity.Education{}, err
	}
	return s.store.ReplaceEducation(ctx, userID, id, in)
}

func (s *CareerService) DeleteEducation(ctx context.Context, userID, id string) error {
	return s.store.DeleteEducation(ctx, userID, id)
}
