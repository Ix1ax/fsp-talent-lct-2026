package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

var ErrStorage = errors.New("хранилище файлов временно недоступно")

type AvatarStore interface {
	ReserveAvatar(ctx context.Context, userID string, f files.File) (files.File, error)
	CompleteAvatar(ctx context.Context, userID, fileID string) (*files.File, entity.Profile, error)
	Avatar(ctx context.Context, userID string) (files.File, error)
	DetachAvatar(ctx context.Context, userID string) (files.File, error)
	DiscardFile(ctx context.Context, fileID string) error
	FinishDelete(ctx context.Context, fileID string) error
}

type AvatarService struct {
	store   AvatarStore
	objects files.Objects
	bucket  string
	log     *slog.Logger
}

func NewAvatarService(store AvatarStore, objects files.Objects, bucket string, log *slog.Logger) *AvatarService {
	return &AvatarService{store, objects, bucket, log}
}

// Upload загружает или заменяет аватар. Профиль меняется только после записи объекта в S3.
func (s *AvatarService) Upload(ctx context.Context, userID, name string, data []byte) (entity.Profile, error) {
	f, err := files.Prepare(name, files.PurposeCandidateAvatar, data)
	if err != nil {
		return entity.Profile{}, err
	}
	f.Bucket, f.OwnerUserID = s.bucket, userID
	if f, err = s.store.ReserveAvatar(ctx, userID, f); err != nil {
		return entity.Profile{}, err
	}
	if err = s.objects.Put(ctx, f, data); err != nil {
		err = fmt.Errorf("%w: %v", ErrStorage, err)
	} else {
		replaced, profile, completeErr := s.store.CompleteAvatar(ctx, userID, f.ID)
		if completeErr == nil {
			if replaced != nil {
				s.removeObject(*replaced)
			}
			return profile, nil
		}
		err = completeErr
	}
	// У запроса уже мог истечь контекст, поэтому незавершённую загрузку убираем отдельным.
	cleanup, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	switch discardErr := s.store.DiscardFile(cleanup, f.ID); {
	case discardErr == nil:
		s.removeObjectWith(cleanup, f)
	case errors.Is(discardErr, entity.ErrFileNotPending):
		s.log.Warn("Загрузка аватара уже не в статусе pending; объект не удаляем", "file_id", f.ID)
	default:
		s.log.Error("Не удалось закрыть незавершённую загрузку аватара", "file_id", f.ID, "error", discardErr)
	}
	return entity.Profile{}, err
}

func (s *AvatarService) Download(ctx context.Context, userID string) (files.File, io.ReadCloser, error) {
	f, err := s.store.Avatar(ctx, userID)
	if err != nil {
		return f, nil, err
	}
	body, err := s.objects.Get(ctx, f)
	if err != nil {
		return f, nil, fmt.Errorf("%w: %v", ErrStorage, err)
	}
	return f, body, nil
}

func (s *AvatarService) Delete(ctx context.Context, userID string) error {
	f, err := s.store.DetachAvatar(ctx, userID)
	if err != nil {
		return err
	}
	// Аватар уже отвязан от профиля, поэтому сбой S3 клиенту не показываем:
	// запись остаётся в статусе deleting, как при замене.
	s.removeObject(f)
	return nil
}

// removeObject удаляет объект прежнего аватара после замены; ошибка не отменяет замену, запись остаётся deleting.
func (s *AvatarService) removeObject(f files.File) {
	cleanup, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	s.removeObjectWith(cleanup, f)
}

func (s *AvatarService) removeObjectWith(ctx context.Context, f files.File) {
	if err := s.objects.Delete(ctx, f); err != nil {
		s.log.Error("Не удалось удалить объект аватара; запись остаётся в статусе deleting", "file_id", f.ID, "error", err)
		return
	}
	if err := s.store.FinishDelete(ctx, f.ID); err != nil {
		s.log.Error("Не удалось закрыть запись удалённого аватара", "file_id", f.ID, "error", err)
	}
}
