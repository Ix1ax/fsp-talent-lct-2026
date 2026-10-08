// Пакет service выполняет сценарии банка заданий и шаблонов тестов через интерфейс хранилища.
package service

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
)

type Store interface {
	CreateQuestion(ctx context.Context, actorID string, in entity.QuestionInput) (entity.Question, error)
	ListQuestions(ctx context.Context, f entity.QuestionFilter) (entity.QuestionPage, error)
	GetQuestion(ctx context.Context, id string) (entity.Question, error)
	CreateVersion(ctx context.Context, actorID, questionID string, in entity.VersionInput) (entity.QuestionVersion, error)
	PublishVersion(ctx context.Context, actorID, questionID string, version int) (entity.QuestionVersion, error)
	ArchiveQuestion(ctx context.Context, actorID, questionID string) (entity.Question, error)
	CreateTemplate(ctx context.Context, actorID string, in entity.TemplateInput) (entity.Template, error)
	ListTemplates(ctx context.Context, f entity.TemplateFilter) (entity.TemplatePage, error)
	GetTemplate(ctx context.Context, id string) (entity.Template, error)
	PublishTemplate(ctx context.Context, actorID, id string) (entity.Template, error)
	ArchiveTemplate(ctx context.Context, actorID, id string) (entity.Template, error)
}

type Service struct {
	store    Store
	previews PreviewStore
}

func New(store Store) *Service {
	previews, _ := store.(PreviewStore)
	return &Service{store: store, previews: previews}
}

func (s *Service) CreateQuestion(ctx context.Context, actorID string, in entity.QuestionInput) (entity.Question, error) {
	if err := in.Normalize(); err != nil {
		return entity.Question{}, err
	}
	return s.store.CreateQuestion(ctx, actorID, in)
}

func (s *Service) ListQuestions(ctx context.Context, f entity.QuestionFilter) (entity.QuestionPage, error) {
	if err := f.Normalize(); err != nil {
		return entity.QuestionPage{}, err
	}
	return s.store.ListQuestions(ctx, f)
}

func (s *Service) GetQuestion(ctx context.Context, id string) (entity.Question, error) {
	id, err := entity.NormalizeID(id)
	if err != nil {
		return entity.Question{}, err
	}
	return s.store.GetQuestion(ctx, id)
}

// CreateVersion проверяет содержимое по виду задания, поэтому сначала читает задание.
func (s *Service) CreateVersion(ctx context.Context, actorID, questionID string, in entity.VersionInput) (entity.QuestionVersion, error) {
	id, err := entity.NormalizeID(questionID)
	if err != nil {
		return entity.QuestionVersion{}, err
	}
	question, err := s.store.GetQuestion(ctx, id)
	if err != nil {
		return entity.QuestionVersion{}, err
	}
	if err := in.Normalize(question.Kind); err != nil {
		return entity.QuestionVersion{}, err
	}
	return s.store.CreateVersion(ctx, actorID, id, in)
}

func (s *Service) PublishVersion(ctx context.Context, actorID, questionID string, version int) (entity.QuestionVersion, error) {
	id, err := entity.NormalizeID(questionID)
	if err != nil {
		return entity.QuestionVersion{}, err
	}
	if err := entity.NormalizeVersion(version); err != nil {
		return entity.QuestionVersion{}, err
	}
	return s.store.PublishVersion(ctx, actorID, id, version)
}

func (s *Service) ArchiveQuestion(ctx context.Context, actorID, questionID string) (entity.Question, error) {
	id, err := entity.NormalizeID(questionID)
	if err != nil {
		return entity.Question{}, err
	}
	return s.store.ArchiveQuestion(ctx, actorID, id)
}

func (s *Service) CreateTemplate(ctx context.Context, actorID string, in entity.TemplateInput) (entity.Template, error) {
	if err := in.Normalize(); err != nil {
		return entity.Template{}, err
	}
	return s.store.CreateTemplate(ctx, actorID, in)
}

func (s *Service) ListTemplates(ctx context.Context, f entity.TemplateFilter) (entity.TemplatePage, error) {
	if err := f.Normalize(); err != nil {
		return entity.TemplatePage{}, err
	}
	return s.store.ListTemplates(ctx, f)
}

func (s *Service) GetTemplate(ctx context.Context, id string) (entity.Template, error) {
	id, err := entity.NormalizeID(id)
	if err != nil {
		return entity.Template{}, err
	}
	return s.store.GetTemplate(ctx, id)
}

func (s *Service) PublishTemplate(ctx context.Context, actorID, id string) (entity.Template, error) {
	id, err := entity.NormalizeID(id)
	if err != nil {
		return entity.Template{}, err
	}
	return s.store.PublishTemplate(ctx, actorID, id)
}

func (s *Service) ArchiveTemplate(ctx context.Context, actorID, id string) (entity.Template, error) {
	id, err := entity.NormalizeID(id)
	if err != nil {
		return entity.Template{}, err
	}
	return s.store.ArchiveTemplate(ctx, actorID, id)
}
