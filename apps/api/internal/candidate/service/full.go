package service

import (
	"context"
	fspentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/entity"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	consententity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
)

type FullProfileStore interface {
	FullSnapshot(ctx context.Context, userID string) (entity.FullSnapshot, error)
}

type FullProfileService struct {
	store         FullProfileStore
	policyVersion string
	now           func() time.Time
}

func NewFullProfileService(store FullProfileStore, policyVersion string) *FullProfileService {
	return &FullProfileService{store: store, policyVersion: policyVersion, now: time.Now}
}

// Get собирает полный профиль из снимка. Контакты видны только при активном общем согласии processing
// (согласие с привязкой к компании его не заменяет). Готовность считается по тому, что реально показано.
func (s *FullProfileService) Get(ctx context.Context, userID string) (entity.FullProfile, error) {
	snapshot, err := s.store.FullSnapshot(ctx, userID)
	if err != nil {
		return entity.FullProfile{}, err
	}
	processing, publication := false, false
	for _, c := range snapshot.Consents {
		if c.CompanyID != nil || c.RevokedAt != nil {
			continue
		}
		switch c.Kind {
		case consententity.KindProcessing:
			processing = true
		case consententity.KindPublication:
			publication = true
		}
	}
	contacts := snapshot.Contacts
	if !processing {
		contacts = nil
	}
	consents, skills := snapshot.Consents, snapshot.Skills
	if consents == nil {
		consents = []consententity.Consent{}
	}
	if skills == nil {
		skills = []entity.Skill{}
	}
	experience, education := snapshot.Experience, snapshot.Education
	if experience == nil {
		experience = []entity.Experience{}
	}
	if education == nil {
		education = []entity.Education{}
	}
	var estimated *int
	if len(experience) > 0 {
		months := entity.EstimateExperienceMonths(experience, s.now())
		estimated = &months
	}
	achievements := snapshot.Achievements
	if achievements == nil || !processing {
		achievements = []fspentity.Achievement{}
	}
	names := snapshot.WorkFormatNames
	if names == nil {
		names = []string{}
	}
	return entity.FullProfile{
		WorkFormatNames:           names,
		Onboarding:                entity.BuildOnboarding(processing, snapshot.Profile, snapshot.Survey, snapshot.LatestAttempt, snapshot.Category, s.now()),
		Profile:                   snapshot.Profile,
		Consents:                  entity.FullConsents{CurrentPolicyVersion: s.policyVersion, Items: consents},
		Contacts:                  contacts,
		Skills:                    skills,
		Category:                  snapshot.Category,
		Achievements:              achievements,
		Experience:                experience,
		Education:                 education,
		ExperienceEstimatedMonths: estimated,
		Readiness: entity.BuildReadiness(entity.ReadinessInput{
			ProcessingConsent: processing, PublicationConsent: publication,
			Profile: snapshot.Profile, HasContacts: contacts != nil, SkillCount: len(skills),
		}),
	}, nil
}
