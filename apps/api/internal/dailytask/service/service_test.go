package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

type uncertainStore struct {
	Store
	committed bool
	checkErr  error
}

func (s uncertainStore) CanCreate(context.Context, string, string, entity.Input) error { return nil }
func (s uncertainStore) Create(context.Context, string, string, entity.Input, files.File) (entity.Task, error) {
	return entity.Task{}, errors.New("connection lost during commit")
}
func (s uncertainStore) FileExists(context.Context, files.File) (bool, error) {
	return s.committed, s.checkErr
}

type cleanupObjects struct {
	files.Objects
	deleted bool
	cancel  context.CancelFunc
}

func (o *cleanupObjects) Put(context.Context, files.File, []byte) error { o.cancel(); return nil }
func (o *cleanupObjects) Delete(ctx context.Context, f files.File) error {
	if ctx.Err() != nil {
		return errors.New("cleanup inherited cancelled request")
	}
	if f.Bucket != "private" || f.OwnerUserID != "user" {
		return errors.New("missing bucket or owner")
	}
	o.deleted = true
	return nil
}
func TestCleanupAfterUncertainCommit(t *testing.T) {
	for _, tc := range []struct {
		name      string
		committed bool
		checkErr  error
		deleted   bool
	}{
		{"rollback", false, nil, true}, {"commit succeeded", true, nil, false}, {"database unreachable", false, errors.New("db unavailable"), false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			objects := &cleanupObjects{cancel: cancel}
			s := New(uncertainStore{committed: tc.committed, checkErr: tc.checkErr}, objects, "private", slog.New(slog.NewTextHandler(io.Discard, nil)))
			_, err := s.UploadTask(ctx, "user", "company", entity.Input{Title: "Задание"}, "task.md", []byte("Решить задачу"))
			if err == nil || objects.deleted != tc.deleted {
				t.Fatalf("deleted=%v want=%v err=%v", objects.deleted, tc.deleted, err)
			}
		})
	}
}
