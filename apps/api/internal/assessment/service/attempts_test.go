package service

import (
	"context"
	"errors"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
)

type memAttempts struct {
	calls int
	days  int
	start entity.StartInput
	err   error
}

func (m *memAttempts) Available(_ context.Context, _ string, days int) ([]entity.AvailableTemplate, error) {
	m.calls, m.days = m.calls+1, days
	return nil, m.err
}
func (m *memAttempts) StartAttempt(_ context.Context, _ string, spec, grade int16, days int, stack string) (entity.Attempt, error) {
	m.calls, m.days, m.start = m.calls+1, days, entity.StartInput{StackSkillID: "00000000-0000-4000-8000-000000000001", SpecializationID: spec, GradeID: grade}
	return entity.Attempt{ID: "a"}, m.err
}
func (m *memAttempts) CurrentAttempt(_ context.Context, _ string, days int) (entity.Attempt, error) {
	m.calls, m.days = m.calls+1, days
	return entity.Attempt{}, m.err
}
func (m *memAttempts) GetAttempt(_ context.Context, _, _ string, days int) (entity.Attempt, error) {
	m.calls, m.days = m.calls+1, days
	return entity.Attempt{}, m.err
}
func (m *memAttempts) SaveAnswer(context.Context, string, string, string, entity.Answer) error {
	m.calls++
	return m.err
}
func (m *memAttempts) SubmitAttempt(_ context.Context, _, _ string, days int) (entity.Attempt, error) {
	m.calls, m.days = m.calls+1, days
	return entity.Attempt{}, m.err
}

const id1, id2 = "11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"

func TestAttemptServiceValidation(t *testing.T) {
	store := &memAttempts{}
	s := NewAttempts(store, 9)
	ctx := context.Background()
	var v *entity.ValidationError
	text := "x"
	for name, err := range map[string]error{
		"нулевая специализация": func() error { _, err := s.Start(ctx, "u", entity.StartInput{GradeID: 2}); return err }(),
		"нулевой грейд": func() error {
			_, err := s.Start(ctx, "u", entity.StartInput{StackSkillID: "00000000-0000-4000-8000-000000000001", SpecializationID: 1})
			return err
		}(),
		"плохой id попытки":          func() error { _, err := s.Get(ctx, "u", "nope"); return err }(),
		"плохой id при submit":       func() error { _, err := s.Submit(ctx, "u", "nope"); return err }(),
		"плохой id попытки в ответе": s.SaveAnswer(ctx, "u", "nope", id2, entity.Answer{Text: &text}),
		"плохой id задания":          s.SaveAnswer(ctx, "u", id1, "nope", entity.Answer{Text: &text}),
	} {
		if !errors.As(err, &v) {
			t.Errorf("%s: %v", name, err)
		}
	}
	if store.calls != 0 {
		t.Fatalf("хранилище вызвано %d раз при неверном вводе", store.calls)
	}
}

func TestAttemptServicePassesRetakeDays(t *testing.T) {
	store := &memAttempts{}
	s := NewAttempts(store, 9)
	ctx := context.Background()
	if _, err := s.Start(ctx, "u", entity.StartInput{StackSkillID: "00000000-0000-4000-8000-000000000001", SpecializationID: 1, GradeID: 2}); err != nil || store.days != 9 || store.start.GradeID != 2 {
		t.Fatalf("старт: %+v %v", store, err)
	}
	store.days = 0
	if _, err := s.Submit(ctx, "u", id1); err != nil || store.days != 9 {
		t.Fatalf("submit: %v %v", store.days, err)
	}
	store.err = entity.ErrAttemptClosed
	if err := s.SaveAnswer(ctx, "u", id1, id2, entity.Answer{Selected: []string{"a"}}); !errors.Is(err, entity.ErrAttemptClosed) {
		t.Fatalf("ошибка хранилища должна пробрасываться: %v", err)
	}
}
