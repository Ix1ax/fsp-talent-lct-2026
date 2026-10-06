package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

type raceStore struct {
	DocumentStore
	file files.File
}

func (r *raceStore) ReserveFile(_ context.Context, _, _ string, f files.File) (files.File, error) {
	f.ID = "test-file"
	r.file = f
	return f, nil
}
func (r *raceStore) CompleteFile(_ context.Context, _, _, _ string) (files.File, error) {
	if r.file.Status != "pending" {
		return files.File{}, entity.ErrNotFound
	}
	r.file.Status = "ready"
	return r.file, nil
}
func (r *raceStore) MarkDeleting(_ context.Context, _, _, _ string) (files.File, error) {
	if r.file.Status != "deleted" {
		r.file.Status = "deleting"
	}
	return r.file, nil
}
func (r *raceStore) FinishDelete(_ context.Context, _ string) error {
	r.file.Status = "deleted"
	return nil
}

type delayedObjects struct {
	files.Objects
	beforeWrite func()
	exists      bool
}

func (o *delayedObjects) Put(_ context.Context, _ files.File, _ []byte) error {
	o.beforeWrite()
	o.exists = true
	return nil
}
func (o *delayedObjects) Delete(_ context.Context, _ files.File) error { o.exists = false; return nil }

func TestDeleteDuringUploadLeavesNoObject(t *testing.T) {
	store := &raceStore{}
	objects := &delayedObjects{}
	service := NewDocumentService(store, objects, "test", slog.New(slog.NewTextHandler(io.Discard, nil)))
	// DELETE успел завершиться, пока Put ещё передавал файл в S3.
	objects.beforeWrite = func() {
		if err := service.Delete(context.Background(), "user", "company", "test-file"); err != nil {
			t.Fatal(err)
		}
	}
	_, err := service.Upload(context.Background(), "user", "company", "document.pdf", "company_document", []byte("%PDF-1.7\n%%EOF"))
	if !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("загрузка удалённого файла: %v", err)
	}
	if objects.exists || store.file.Status != "deleted" {
		t.Fatalf("остался объект после удаления: exists=%v status=%s", objects.exists, store.file.Status)
	}
}
