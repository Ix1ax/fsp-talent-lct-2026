package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

type careerStub struct {
	calls int
	err   error
}

func (c *careerStub) ListExperience(context.Context, string) ([]entity.Experience, error) {
	c.calls++
	return nil, c.err
}
func (c *careerStub) CreateExperience(context.Context, string, entity.ExperienceInput) (entity.Experience, error) {
	c.calls++
	return entity.Experience{ID: "e"}, c.err
}
func (c *careerStub) ReplaceExperience(context.Context, string, string, entity.ExperienceInput) (entity.Experience, error) {
	c.calls++
	return entity.Experience{ID: "e"}, c.err
}
func (c *careerStub) DeleteExperience(context.Context, string, string) error { c.calls++; return c.err }
func (c *careerStub) ListEducation(context.Context, string) ([]entity.Education, error) {
	c.calls++
	return nil, c.err
}
func (c *careerStub) CreateEducation(context.Context, string, entity.EducationInput) (entity.Education, error) {
	c.calls++
	return entity.Education{ID: "d"}, c.err
}
func (c *careerStub) ReplaceEducation(context.Context, string, string, entity.EducationInput) (entity.Education, error) {
	c.calls++
	return entity.Education{ID: "d"}, c.err
}
func (c *careerStub) DeleteEducation(context.Context, string, string) error { c.calls++; return c.err }

func startedOn(t *testing.T, s string) entity.Month {
	t.Helper()
	m, err := entity.ParseMonth(s)
	if err != nil {
		t.Fatal(err)
	}
	return m
}

func TestCareerServiceValidatesBeforeStore(t *testing.T) {
	store := &careerStub{}
	now := time.Date(2026, 10, 8, 0, 0, 0, 0, time.UTC)
	s := NewCareerService(store, func() time.Time { return now })
	ctx := context.Background()
	var v *entity.ValidationError

	if _, err := s.CreateExperience(ctx, "u", entity.ExperienceInput{Company: " ", Position: "Р", StartedOn: startedOn(t, "2022-01")}); !errors.As(err, &v) {
		t.Fatalf("пустая компания: %v", err)
	}
	// Месяц следующий за «сейчас» из часов сервиса: проверка использует его, а не системное время.
	if _, err := s.CreateExperience(ctx, "u", entity.ExperienceInput{Company: "К", Position: "Р", StartedOn: startedOn(t, "2026-11")}); !errors.As(err, &v) {
		t.Fatalf("будущий месяц: %v", err)
	}
	if _, err := s.ReplaceEducation(ctx, "u", "id", entity.EducationInput{Level: "bogus", Institution: "У", GraduationYear: 2020}); !errors.As(err, &v) {
		t.Fatalf("уровень: %v", err)
	}
	if _, err := s.CreateEducation(ctx, "u", entity.EducationInput{Level: "higher", Institution: "", GraduationYear: 2020}); !errors.As(err, &v) {
		t.Fatalf("пустое заведение: %v", err)
	}
	if store.calls != 0 {
		t.Fatalf("хранилище вызвано %d раз при неверном вводе", store.calls)
	}
}

func TestCareerServicePassesThrough(t *testing.T) {
	store := &careerStub{}
	s := NewCareerService(store, time.Now)
	ctx := context.Background()
	good := entity.ExperienceInput{Company: " К ", Position: "Р", StartedOn: startedOn(t, "2022-01")}
	if e, err := s.CreateExperience(ctx, "u", good); err != nil || e.ID != "e" {
		t.Fatalf("создание: %+v %v", e, err)
	}
	if _, err := s.ReplaceExperience(ctx, "u", "id", good); err != nil {
		t.Fatal(err)
	}
	if err := s.DeleteExperience(ctx, "u", "id"); err != nil {
		t.Fatal(err)
	}
	if _, err := s.ListEducation(ctx, "u"); err != nil {
		t.Fatal(err)
	}
	store.err = entity.ErrLimitReached
	if _, err := s.CreateEducation(ctx, "u", entity.EducationInput{Level: "higher", Institution: "У", GraduationYear: 2020}); !errors.Is(err, entity.ErrLimitReached) {
		t.Fatalf("ошибка хранилища должна пробрасываться: %v", err)
	}
	if store.calls != 5 {
		t.Fatalf("вызовов хранилища: %d", store.calls)
	}
}
