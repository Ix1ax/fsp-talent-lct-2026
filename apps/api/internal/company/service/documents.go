package service

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

var ErrStorage = errors.New("хранилище файлов временно недоступно")

type DocumentStore interface {
	ReserveFile(context.Context, string, string, files.File) (files.File, error)
	CompleteFile(context.Context, string, string, string) (files.File, error)
	File(context.Context, string, string, string) (files.File, error)
	ListFiles(context.Context, string, string, int, int) ([]files.File, error)
	MarkDeleting(context.Context, string, string, string) (files.File, error)
	FinishDelete(context.Context, string) error
}
type DocumentService struct {
	store   DocumentStore
	objects files.Objects
	bucket  string
	log     *slog.Logger
}

func NewDocumentService(store DocumentStore, objects files.Objects, bucket string, log *slog.Logger) *DocumentService {
	return &DocumentService{store, objects, bucket, log}
}
func (s *DocumentService) ListFiles(ctx context.Context, user, id string, limit, offset int) ([]files.File, error) {
	return s.store.ListFiles(ctx, user, id, limit, offset)
}

func (s *DocumentService) Upload(ctx context.Context, user, id, name, purpose string, data []byte) (files.File, error) {
	f, err := files.Prepare(name, purpose, data)
	if err != nil {
		return f, err
	}
	f.Bucket = s.bucket
	f.OwnerUserID = user
	f, err = s.store.ReserveFile(ctx, user, id, f)
	if err != nil {
		return f, err
	}
	if err = s.objects.Put(ctx, f, data); err == nil {
		var ready files.File
		ready, err = s.store.CompleteFile(ctx, user, id, f.ID)
		if err == nil {
			return ready, nil
		}
	} else {
		err = fmt.Errorf("%w: %v", ErrStorage, err)
	}
	// У запроса уже мог истечь контекст. Незавершённый файл всё равно пробуем удалить.
	cleanup, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if cleanupErr := s.Delete(cleanup, user, id, f.ID); cleanupErr != nil {
		s.log.Error("Не удалось убрать незавершённую загрузку; файл можно удалить повторно", "file_id", f.ID, "error", cleanupErr)
	}
	return files.File{}, err
}
func (s *DocumentService) Download(ctx context.Context, user, id, fileID string) (files.File, io.ReadCloser, error) {
	f, err := s.store.File(ctx, user, id, fileID)
	if err != nil {
		return f, nil, err
	}
	if f.Status != "ready" {
		return f, nil, entity.ErrNotFound
	}
	body, err := s.objects.Get(ctx, f)
	if err != nil {
		return f, nil, fmt.Errorf("%w: %v", ErrStorage, err)
	}
	return f, body, nil
}
func (s *DocumentService) Delete(ctx context.Context, user, id, fileID string) error {
	f, err := s.store.MarkDeleting(ctx, user, id, fileID)
	if err != nil {
		return err
	}
	// Повторный DELETE также убирает объект: загрузка могла закончиться уже после первого удаления.
	if f.Status == "deleted" {
		if err := s.objects.Delete(ctx, f); err != nil {
			return fmt.Errorf("%w: %v", ErrStorage, err)
		}
		return nil
	}
	if err = s.objects.Delete(ctx, f); err != nil {
		return fmt.Errorf("%w: %v", ErrStorage, err)
	}
	return s.store.FinishDelete(ctx, f.ID)
}
