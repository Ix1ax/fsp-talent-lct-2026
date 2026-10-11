package service

import (
	"context"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/exportpdf"
)

func (s *FullProfileService) ExportPDF(ctx context.Context, userID string) ([]byte, error) {
	p, err := s.Get(ctx, userID)
	if err != nil {
		return nil, err
	}
	if p.Profile == nil {
		return nil, entity.ErrNotFound
	}
	if p.Onboarding.NextStep == "consent" {
		return nil, entity.ErrConsentRequired
	}
	if err = ctx.Err(); err != nil {
		return nil, err
	}
	return exportpdf.Render(p)
}
