package service

import (
	"context"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
)

type historyStore interface {
	History(context.Context, string, int, int) (entity.HistoryPage, error)
}

func (s *AttemptService) History(ctx context.Context, userID, rawQuery string) (entity.HistoryPage, error) {
	limit, offset, err := entity.ParseHistoryQuery(rawQuery)
	if err != nil {
		return entity.HistoryPage{}, err
	}
	store, ok := s.store.(historyStore)
	if !ok {
		return entity.HistoryPage{}, entity.ErrUnavailable
	}
	return store.History(ctx, userID, limit, offset)
}
