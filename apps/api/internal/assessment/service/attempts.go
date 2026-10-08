package service

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
)

// AttemptStore — хранилище попыток прохождения тестов.
type AttemptStore interface {
	Available(ctx context.Context, userID string, retakeDays int) ([]entity.AvailableTemplate, error)
	StartAttempt(ctx context.Context, userID string, specializationID, gradeID int16, retakeDays int, stackSkillID string) (entity.Attempt, error)
	CurrentAttempt(ctx context.Context, userID string, retakeDays int) (entity.Attempt, error)
	GetAttempt(ctx context.Context, userID, attemptID string, retakeDays int) (entity.Attempt, error)
	SaveAnswer(ctx context.Context, userID, attemptID, questionID string, a entity.Answer) error
	SubmitAttempt(ctx context.Context, userID, attemptID string, retakeDays int) (entity.Attempt, error)
}

// AttemptService выполняет сценарии кандидата: список тестов, старт, ответы, завершение.
type AttemptService struct {
	store      AttemptStore
	retakeDays int
}

func NewAttempts(store AttemptStore, retakeDays int) *AttemptService {
	return &AttemptService{store: store, retakeDays: retakeDays}
}

func (s *AttemptService) Available(ctx context.Context, userID string) ([]entity.AvailableTemplate, error) {
	return s.store.Available(ctx, userID, s.retakeDays)
}

func (s *AttemptService) Start(ctx context.Context, userID string, in entity.StartInput) (entity.Attempt, error) {
	if err := in.Normalize(); err != nil {
		return entity.Attempt{}, err
	}
	return s.store.StartAttempt(ctx, userID, in.SpecializationID, in.GradeID, s.retakeDays, in.StackSkillID)
}

func (s *AttemptService) Current(ctx context.Context, userID string) (entity.Attempt, error) {
	return s.store.CurrentAttempt(ctx, userID, s.retakeDays)
}

func (s *AttemptService) Get(ctx context.Context, userID, attemptID string) (entity.Attempt, error) {
	id, err := entity.NormalizeID(attemptID)
	if err != nil {
		return entity.Attempt{}, err
	}
	return s.store.GetAttempt(ctx, userID, id, s.retakeDays)
}

func (s *AttemptService) SaveAnswer(ctx context.Context, userID, attemptID, questionID string, a entity.Answer) error {
	attempt, err := entity.NormalizeID(attemptID)
	if err != nil {
		return err
	}
	question, err := entity.NormalizeID(questionID)
	if err != nil {
		return err
	}
	if len(a.Selected) == 0 && a.Text == nil {
		return &entity.ValidationError{Message: "Передайте selected или text"}
	}
	return s.store.SaveAnswer(ctx, userID, attempt, question, a)
}

func (s *AttemptService) Submit(ctx context.Context, userID, attemptID string) (entity.Attempt, error) {
	id, err := entity.NormalizeID(attemptID)
	if err != nil {
		return entity.Attempt{}, err
	}
	return s.store.SubmitAttempt(ctx, userID, id, s.retakeDays)
}
