package service

import (
	"context"
	"errors"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
)

type fakeStore struct {
	granted, revoked int
	lastCompany      *string
}

func (f *fakeStore) List(context.Context, string) ([]entity.Consent, error) { return nil, nil }
func (f *fakeStore) Grant(_ context.Context, _ string, in entity.GrantInput) (entity.Consent, error) {
	f.granted++
	return entity.Consent{Kind: in.Kind, PolicyVersion: in.PolicyVersion, CompanyID: in.CompanyID}, nil
}
func (f *fakeStore) Revoke(_ context.Context, _, _ string, companyID *string) error {
	f.revoked++
	f.lastCompany = companyID
	return nil
}

func TestGrantNormalizesBeforeStore(t *testing.T) {
	store := &fakeStore{}
	s := NewService(store, "v1")
	if s.PolicyVersion() != "v1" {
		t.Fatalf("версия политики: %q", s.PolicyVersion())
	}
	if _, err := s.Grant(context.Background(), "u1", entity.GrantInput{Kind: "other", PolicyVersion: "v1"}); store.granted != 0 || err == nil {
		t.Fatalf("невалидный ввод не должен доходить до хранилища: %v", err)
	}
	if _, err := s.Grant(context.Background(), "u1", entity.GrantInput{Kind: entity.KindProcessing, PolicyVersion: "v0"}); !errors.Is(err, entity.ErrPolicyOutdated) || store.granted != 0 {
		t.Fatalf("устаревшая версия: %v", err)
	}
	if _, err := s.Grant(context.Background(), "u1", entity.GrantInput{Kind: entity.KindProcessing, PolicyVersion: "v1"}); err != nil || store.granted != 1 {
		t.Fatalf("корректная выдача: %v", err)
	}
}

func TestRevokeValidatesKindAndCompany(t *testing.T) {
	store := &fakeStore{}
	s := NewService(store, "v1")
	company := "0b7d3b1e-8f3a-4c58-9d3e-5a1f2c3d4e5f"
	var v *entity.ValidationError
	for name, args := range map[string]struct {
		kind    string
		company *string
	}{
		"неизвестный вид":           {"other", nil},
		"ats_transfer без компании": {entity.KindATSTransfer, nil},
		"processing с компанией":    {entity.KindProcessing, &company},
	} {
		if err := s.Revoke(context.Background(), "u1", args.kind, args.company); !errors.As(err, &v) {
			t.Fatalf("%s: ожидали ValidationError, получили %v", name, err)
		}
	}
	if store.revoked != 0 {
		t.Fatal("невалидный отзыв дошёл до хранилища")
	}
	if err := s.Revoke(context.Background(), "u1", entity.KindATSTransfer, &company); err != nil || store.revoked != 1 || *store.lastCompany != company {
		t.Fatalf("корректный отзыв ats_transfer: %v", err)
	}
	if err := s.Revoke(context.Background(), "u1", entity.KindProcessing, nil); err != nil || store.revoked != 2 {
		t.Fatalf("корректный отзыв processing: %v", err)
	}
}
