package catalog

import (
	"context"
	"strings"
	"unicode/utf8"
)

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }

type Store interface {
	Catalogs(context.Context) (Catalogs, error)
	SearchSkills(context.Context, string, int, int) ([]CatalogSkill, int64, error)
}
type Service struct{ store Store }

func NewService(store Store) *Service                        { return &Service{store} }
func (s *Service) Get(ctx context.Context) (Catalogs, error) { return s.store.Catalogs(ctx) }
func (s *Service) Skills(ctx context.Context, q string, limit, offset int) ([]CatalogSkill, int64, error) {
	q = strings.TrimSpace(q)
	if utf8.RuneCountInString(q) > 100 || strings.ContainsRune(q, 0) {
		return nil, 0, &ValidationError{Message: "Строка поиска не должна превышать 100 символов"}
	}
	return s.store.SearchSkills(ctx, q, limit, offset)
}
