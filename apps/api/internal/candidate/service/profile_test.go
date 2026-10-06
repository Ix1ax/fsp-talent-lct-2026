package service

import (
	"context"
	"errors"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

type fakeStore struct {
	created int
	err     error
}

func (f *fakeStore) Create(_ context.Context, userID string, in entity.ProfileInput) (entity.Profile, error) {
	f.created++
	return entity.Profile{ID: "p-" + userID, ProfileInput: in}, f.err
}
func (f *fakeStore) Get(_ context.Context, userID string) (entity.Profile, error) {
	return entity.Profile{ID: "p-" + userID}, f.err
}
func (f *fakeStore) Update(_ context.Context, userID string, _ entity.Patch) (entity.Profile, error) {
	return entity.Profile{ID: "p-" + userID}, f.err
}

func TestCreateNormalizesBeforeStore(t *testing.T) {
	store := &fakeStore{}
	s := NewProfileService(store)
	var v *entity.ValidationError
	if _, err := s.Create(context.Background(), "u1", entity.ProfileInput{SearchStatus: "public"}); !errors.As(err, &v) || store.created != 0 {
		t.Fatalf("невалидный ввод не должен доходить до хранилища: err=%v created=%d", err, store.created)
	}
	p, err := s.Create(context.Background(), "u1", entity.ProfileInput{})
	if err != nil || store.created != 1 || p.SearchStatus != "hidden" {
		t.Fatalf("ввод по умолчанию: %+v err=%v created=%d", p, err, store.created)
	}
}

func TestStoreErrorsPassThrough(t *testing.T) {
	store := &fakeStore{err: entity.ErrNotFound}
	s := NewProfileService(store)
	if _, err := s.Get(context.Background(), "u1"); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("Get: %v", err)
	}
	if _, err := s.Update(context.Background(), "u1", entity.Patch{}); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("Update: %v", err)
	}
}
