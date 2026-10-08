package service

import (
	"context"
	"errors"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	consent "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
	"testing"
)

func TestExportRequiresProcessing(t *testing.T) {
	snapshot := entity.FullSnapshot{Profile: &entity.Profile{ID: "p"}}
	s := NewFullProfileService(fullStub{snapshot}, "v1")
	if _, err := s.ExportPDF(context.Background(), "u"); !errors.Is(err, entity.ErrConsentRequired) {
		t.Fatal(err)
	}
	snapshot.Consents = []consent.Consent{active("processing")}
	s = NewFullProfileService(fullStub{snapshot}, "v1")
	if data, err := s.ExportPDF(context.Background(), "u"); err != nil || len(data) == 0 {
		t.Fatal(err)
	}
}
