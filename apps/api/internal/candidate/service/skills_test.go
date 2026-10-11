package service

import (
	"context"
	"errors"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

type skillsStub struct {
	put, deleted int
	lastID       string
}

func (s *skillsStub) ListSkills(context.Context, string) ([]entity.Skill, error) {
	return []entity.Skill{}, nil
}
func (s *skillsStub) PutSkill(_ context.Context, _, skillID string, in entity.SkillInput) (entity.Skill, error) {
	s.put++
	s.lastID = skillID
	return entity.Skill{SkillID: skillID, ClaimedLevel: in.ClaimedLevel}, nil
}
func (s *skillsStub) DeleteSkill(_ context.Context, _, skillID string) error {
	s.deleted++
	s.lastID = skillID
	return nil
}

func TestSkillsServiceValidatesBeforeStore(t *testing.T) {
	store := &skillsStub{}
	s := NewSkillsService(store)
	level := func(n int16) *int16 { return &n }
	var v *entity.ValidationError
	if _, err := s.Put(context.Background(), "u1", "не-uuid", entity.SkillInput{ClaimedLevel: level(3)}); !errors.As(err, &v) || store.put != 0 {
		t.Fatalf("неверный UUID не должен доходить до хранилища: %v", err)
	}
	if _, err := s.Put(context.Background(), "u1", "00000000-0000-4000-8000-000000000001", entity.SkillInput{ClaimedLevel: level(6)}); !errors.As(err, &v) || store.put != 0 {
		t.Fatalf("неверный уровень не должен доходить до хранилища: %v", err)
	}
	if err := s.Delete(context.Background(), "u1", "abc"); !errors.As(err, &v) || store.deleted != 0 {
		t.Fatalf("неверный UUID при удалении: %v", err)
	}
	if _, err := s.Put(context.Background(), "u1", "00000000-0000-4000-8000-00000000AB01", entity.SkillInput{ClaimedLevel: level(3)}); err != nil || store.put != 1 || store.lastID != "00000000-0000-4000-8000-00000000ab01" {
		t.Fatalf("UUID должен приходить в хранилище в нижнем регистре: %q %v", store.lastID, err)
	}
	if err := s.Delete(context.Background(), "u1", "00000000-0000-4000-8000-00000000AB01"); err != nil || store.deleted != 1 || store.lastID != "00000000-0000-4000-8000-00000000ab01" {
		t.Fatalf("удаление: %q %v", store.lastID, err)
	}
}

func (s *skillsStub) SubmitSkill(ctx context.Context, user string, in entity.SkillSubmissionInput) (entity.Skill, error) {
	return s.PutSkill(ctx, user, "00000000-0000-4000-8000-000000000001", entity.SkillInput{ClaimedLevel: in.ClaimedLevel})
}
