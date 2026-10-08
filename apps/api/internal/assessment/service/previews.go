package service

import (
	"context"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
)

// PreviewStore отделён от Store банка для совместимости существующих реализаций.
type PreviewStore interface {
	StartPreview(context.Context, string, string, string) (entity.Preview, error)
	GetPreview(context.Context, string, string, bool) (entity.Preview, error)
	SavePreviewAnswer(context.Context, string, string, string, entity.Answer) error
	DeletePreview(context.Context, string, string) error
}

func (s *Service) StartPreview(ctx context.Context, actor, templateID, key string) (entity.Preview, error) {
	if s.previews == nil {
		return entity.Preview{}, entity.ErrPreviewsUnavailable
	}
	id, err := entity.NormalizeID(templateID)
	if err != nil {
		return entity.Preview{}, err
	}
	if err = entity.NormalizePreviewKey(key); err != nil {
		return entity.Preview{}, err
	}
	return s.previews.StartPreview(ctx, actor, id, key)
}
func (s *Service) GetPreview(ctx context.Context, actor, id string, submit bool) (entity.Preview, error) {
	if s.previews == nil {
		return entity.Preview{}, entity.ErrPreviewsUnavailable
	}
	id, err := entity.NormalizeID(id)
	if err != nil {
		return entity.Preview{}, err
	}
	return s.previews.GetPreview(ctx, actor, id, submit)
}
func (s *Service) SavePreviewAnswer(ctx context.Context, actor, id, questionID string, a entity.Answer) error {
	if s.previews == nil {
		return entity.ErrPreviewsUnavailable
	}
	id, err := entity.NormalizeID(id)
	if err != nil {
		return err
	}
	questionID, err = entity.NormalizeID(questionID)
	if err != nil {
		return err
	}
	return s.previews.SavePreviewAnswer(ctx, actor, id, questionID, a)
}
func (s *Service) DeletePreview(ctx context.Context, actor, id string) error {
	if s.previews == nil {
		return entity.ErrPreviewsUnavailable
	}
	id, err := entity.NormalizeID(id)
	if err != nil {
		return err
	}
	return s.previews.DeletePreview(ctx, actor, id)
}
