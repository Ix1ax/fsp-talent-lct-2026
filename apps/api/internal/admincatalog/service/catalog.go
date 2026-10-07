// Пакет service проверяет ввод перед изменением общих справочников.
package service

import (
	"context"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/entity"
)

type Store interface {
	List(context.Context, string, string, string, int, int) ([]entity.Item, error)
	Create(context.Context, string, string, entity.CreateInput) (entity.Item, error)
	Update(context.Context, string, string, string, entity.UpdateInput) (entity.Item, error)
}
type Service struct{ store Store }

func New(store Store) *Service { return &Service{store: store} }
func (s *Service) List(ctx context.Context, actor, kind, q string, limit, offset int) ([]entity.Item, error) {
	if !entity.Kind(kind) {
		return nil, entity.ErrNotFound
	}
	if len(q) > 400 || strings.ContainsRune(q, 0) || limit < 1 || limit > 100 || offset < 0 {
		return nil, &entity.ValidationError{Message: "Некорректные параметры списка"}
	}
	return s.store.List(ctx, actor, kind, strings.TrimSpace(q), limit, offset)
}
func (s *Service) Create(ctx context.Context, actor, kind string, in entity.CreateInput) (entity.Item, error) {
	in, err := entity.NormalizeCreate(kind, in)
	if err != nil {
		return entity.Item{}, err
	}
	return s.store.Create(ctx, actor, kind, in)
}
func (s *Service) Update(ctx context.Context, actor, kind, id string, in entity.UpdateInput) (entity.Item, error) {
	in, err := entity.NormalizeUpdate(kind, in)
	if err != nil {
		return entity.Item{}, err
	}
	if kind == "skills" {
		u, e := uuid.Parse(id)
		if e != nil {
			return entity.Item{}, &entity.ValidationError{Message: "Некорректный ID навыка"}
		}
		id = u.String()
	} else {
		n, e := strconv.ParseInt(id, 10, 16)
		if e != nil || n < 1 {
			return entity.Item{}, &entity.ValidationError{Message: "Некорректный ID записи"}
		}
		id = strconv.FormatInt(n, 10)
	}
	return s.store.Update(ctx, actor, kind, id, in)
}
