package service

import (
	"context"
	"errors"
	"io"
	"log/slog"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

var ErrStorage = errors.New("Хранилище файлов временно недоступно")

type Store interface {
	List(context.Context, string, string, entity.Filter) (entity.Page, error)
	Get(context.Context, string, string, string) (map[string]any, error)
	CompanyRelated(context.Context, string, string, string, entity.Filter) (entity.Page, error)
	File(context.Context, string, string, string, string) (files.File, error)
	SetStatus(context.Context, string, string, string, entity.StatusInput) (map[string]any, error)
	Decide(context.Context, string, string, entity.Decision) (map[string]any, error)
	Verification(context.Context, string, string, bool) (entity.Verification, error)
	Audit(context.Context, string, entity.Filter) (entity.Page, error)
	Stats(context.Context, string) (map[string]any, error)
}
type Service struct {
	Store
	objects files.Objects
	log     *slog.Logger
}

func New(store Store, objects files.Objects, log *slog.Logger) *Service {
	return &Service{store, objects, log}
}
func (s *Service) SetStatus(ctx context.Context, actor, kind, id string, in entity.StatusInput) (map[string]any, error) {
	if err := in.Validate(kind); err != nil {
		return nil, err
	}
	return s.Store.SetStatus(ctx, actor, kind, id, in)
}
func (s *Service) Decide(ctx context.Context, actor, id string, in entity.Decision) (map[string]any, error) {
	if err := in.Validate(); err != nil {
		return nil, err
	}
	return s.Store.Decide(ctx, actor, id, in)
}
func (s *Service) Download(ctx context.Context, actor, kind, id, fileID string) (files.File, io.ReadCloser, error) {
	file, err := s.File(ctx, actor, kind, id, fileID)
	if err != nil {
		return file, nil, err
	}
	body, err := s.objects.Get(ctx, file)
	if err != nil {
		s.log.Error("Не удалось прочитать файл в админке", "error", err)
		return file, nil, ErrStorage
	}
	return file, body, nil
}
