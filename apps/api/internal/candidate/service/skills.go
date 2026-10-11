package service

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

type SkillsStore interface {
	SubmitSkill(context.Context, string, entity.SkillSubmissionInput) (entity.Skill, error)
	ListSkills(ctx context.Context, userID string) ([]entity.Skill, error)
	PutSkill(ctx context.Context, userID, skillID string, in entity.SkillInput) (entity.Skill, error)
	DeleteSkill(ctx context.Context, userID, skillID string) error
}

type SkillsService struct{ store SkillsStore }

func NewSkillsService(store SkillsStore) *SkillsService { return &SkillsService{store: store} }

func (s *SkillsService) List(ctx context.Context, userID string) ([]entity.Skill, error) {
	return s.store.ListSkills(ctx, userID)
}

func (s *SkillsService) Put(ctx context.Context, userID, skillID string, in entity.SkillInput) (entity.Skill, error) {
	id, err := entity.NormalizeSkillID(skillID)
	if err != nil {
		return entity.Skill{}, err
	}
	if err := in.Normalize(); err != nil {
		return entity.Skill{}, err
	}
	return s.store.PutSkill(ctx, userID, id, in)
}

func (s *SkillsService) Delete(ctx context.Context, userID, skillID string) error {
	id, err := entity.NormalizeSkillID(skillID)
	if err != nil {
		return err
	}
	return s.store.DeleteSkill(ctx, userID, id)
}

func (s *SkillsService) Submit(ctx context.Context, userID string, in entity.SkillSubmissionInput) (entity.Skill, error) {
	if err := in.Normalize(); err != nil {
		return entity.Skill{}, err
	}
	return s.store.SubmitSkill(ctx, userID, in)
}
