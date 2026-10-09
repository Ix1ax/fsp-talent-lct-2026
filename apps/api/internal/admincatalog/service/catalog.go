// Пакет service проверяет ввод перед изменением общих справочников.
package service

import (
	"context"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/entity"
)

type Store interface {
	Pending(context.Context, string, int, int) ([]entity.Item, int64, error)
	Moderate(context.Context, string, string, string, entity.ModerationInput) (entity.ModerationResult, error)
	List(context.Context, string, string, string, int, int) ([]entity.Item, int64, error)
	Create(context.Context, string, string, entity.CreateInput) (entity.Item, error)
	Get(context.Context, string, string, string) (entity.Item, error)
	Delete(context.Context, string, string, string) error
	Update(context.Context, string, string, string, entity.UpdateInput) (entity.Item, error)
}
type Service struct{ store Store }

func New(store Store) *Service { return &Service{store: store} }
func (s *Service) List(ctx context.Context, actor, kind, q string, limit, offset int) ([]entity.Item, int64, error) {
	if !entity.Kind(kind) {
		return nil, 0, entity.ErrNotFound
	}
	if utf8.RuneCountInString(q) > 100 || strings.ContainsRune(q, 0) || limit < 1 || limit > 100 || offset < 0 {
		return nil, 0, &entity.ValidationError{Message: "Некорректные параметры списка"}
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
	id, err = normalizeID(kind, id)
	if err != nil {
		return entity.Item{}, err
	}
	return s.store.Update(ctx, actor, kind, id, in)
}

func normalizeID(kind, id string) (string, error) {
	if !entity.Kind(kind) {
		return "", entity.ErrNotFound
	}
	if kind == "skills" {
		u, e := uuid.Parse(id)
		if e != nil {
			return "", &entity.ValidationError{Message: "Некорректный ID навыка"}
		}
		id = u.String()
	} else {
		n, e := strconv.ParseInt(id, 10, 16)
		if e != nil || n < 1 {
			return "", &entity.ValidationError{Message: "Некорректный ID записи"}
		}
		id = strconv.FormatInt(n, 10)
	}
	return id, nil
}
func (s *Service) Get(ctx context.Context, actor, kind, id string) (entity.Item, error) {
	id, err := normalizeID(kind, id)
	if err != nil {
		return entity.Item{}, err
	}
	return s.store.Get(ctx, actor, kind, id)
}
func (s *Service) Delete(ctx context.Context, actor, kind, id string) error {
	id, err := normalizeID(kind, id)
	if err != nil {
		return err
	}
	return s.store.Delete(ctx, actor, kind, id)
}

func (s *Service) Pending(ctx context.Context, actor string, limit, offset int) ([]entity.Item, int64, error) {
	if limit < 1 || limit > 100 || offset < 0 {
		return nil, 0, &entity.ValidationError{Message: "Некорректные параметры списка"}
	}
	return s.store.Pending(ctx, actor, limit, offset)
}
func (s *Service) Moderate(ctx context.Context, actor, id, action string, in entity.ModerationInput) (entity.ModerationResult, error) {
	id, err := normalizeID("skills", id)
	if err != nil {
		return entity.ModerationResult{}, err
	}
	in, err = entity.NormalizeModeration(action, in)
	if err != nil {
		return entity.ModerationResult{}, err
	}
	if action == "merged" {
		in.TargetID, err = normalizeID("skills", in.TargetID)
		if err != nil {
			return entity.ModerationResult{}, err
		}
		if id == in.TargetID {
			return entity.ModerationResult{}, &entity.ValidationError{Message: "Нельзя объединить навык с самим собой"}
		}
	}
	return s.store.Moderate(ctx, actor, id, action, in)
}
