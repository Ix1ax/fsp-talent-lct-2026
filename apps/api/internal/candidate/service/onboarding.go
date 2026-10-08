package service

import (
	"context"
	"errors"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

var ErrOnboardingUnavailable = errors.New("Опрос кандидата не настроен")

type surveyStore interface {
	PutSurvey(context.Context, string, entity.SurveyInput) (entity.Survey, error)
}

func (s *FullProfileService) PutSurvey(ctx context.Context, userID string, in entity.SurveyInput) (entity.Survey, error) {
	if err := in.Normalize(); err != nil {
		return entity.Survey{}, err
	}
	store, ok := s.store.(surveyStore)
	if !ok {
		return entity.Survey{}, ErrOnboardingUnavailable
	}
	return store.PutSurvey(ctx, userID, in)
}
