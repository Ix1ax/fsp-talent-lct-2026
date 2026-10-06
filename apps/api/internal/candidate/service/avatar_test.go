package service

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/png"
	"io"
	"log/slog"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

type avatarStoreStub struct {
	completeErr error
	discardErr  error
}

func (s *avatarStoreStub) ReserveAvatar(_ context.Context, _ string, f files.File) (files.File, error) {
	f.ID = "new"
	return f, nil
}
func (s *avatarStoreStub) CompleteAvatar(context.Context, string, string) (*files.File, entity.Profile, error) {
	return nil, entity.Profile{}, s.completeErr
}
func (s *avatarStoreStub) Avatar(context.Context, string) (files.File, error) {
	return files.File{}, nil
}
func (s *avatarStoreStub) DetachAvatar(context.Context, string) (files.File, error) {
	return files.File{ID: "old"}, nil
}
func (s *avatarStoreStub) DiscardFile(context.Context, string) error  { return s.discardErr }
func (s *avatarStoreStub) FinishDelete(context.Context, string) error { return nil }

type objectsStub struct {
	deleted   int
	deleteErr error
}

func (o *objectsStub) Put(context.Context, files.File, []byte) error { return nil }
func (o *objectsStub) Get(context.Context, files.File) (io.ReadCloser, error) {
	return io.NopCloser(bytes.NewReader(nil)), nil
}
func (o *objectsStub) Delete(context.Context, files.File) error {
	o.deleted++
	return o.deleteErr
}

func newAvatarServiceForTest(store *avatarStoreStub, objects *objectsStub) *AvatarService {
	return NewAvatarService(store, objects, "bucket", slog.New(slog.NewTextHandler(io.Discard, nil)))
}

// Если запись уже не pending (транзакция могла зафиксироваться, несмотря на ошибку),
// файл может быть живым аватаром, и его объект удалять нельзя.
func TestUploadCleanupKeepsObjectWhenFileIsNotPending(t *testing.T) {
	store := &avatarStoreStub{completeErr: errors.New("обрыв связи при коммите"), discardErr: entity.ErrFileNotPending}
	objects := &objectsStub{}
	if _, err := newAvatarServiceForTest(store, objects).Upload(context.Background(), "u1", "a.png", pngForTest(t)); err == nil {
		t.Fatal("ошибка завершения загрузки должна дойти до вызывающего")
	}
	if objects.deleted != 0 {
		t.Fatalf("объект живого аватара удалён: вызовов Delete %d", objects.deleted)
	}
	store.discardErr = nil
	if _, err := newAvatarServiceForTest(store, objects).Upload(context.Background(), "u1", "a.png", pngForTest(t)); err == nil || objects.deleted != 1 {
		t.Fatalf("закрытую незавершённую загрузку нужно убрать: ошибка %v, вызовов Delete %d", err, objects.deleted)
	}
}

// Аватар уже отвязан от профиля, поэтому сбой S3 не должен превращать удаление в ошибку.
func TestDeleteSucceedsWhenObjectRemovalFails(t *testing.T) {
	objects := &objectsStub{deleteErr: errors.New("S3 недоступен")}
	if err := newAvatarServiceForTest(&avatarStoreStub{}, objects).Delete(context.Background(), "u1"); err != nil {
		t.Fatalf("после отвязки аватара ожидали успех, получили %v", err)
	}
	if objects.deleted != 1 {
		t.Fatalf("удаление объекта должно быть предпринято: %d", objects.deleted)
	}
}

func pngForTest(t *testing.T) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := png.Encode(&b, image.NewRGBA(image.Rect(0, 0, 2, 2))); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}
