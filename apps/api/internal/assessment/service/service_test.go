package service

import (
	"context"
	"errors"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
)

// fakeStore считает обращения к хранилищу, чтобы проверить: ввод валидируется до него.
type fakeStore struct {
	calls int
	kind  string
}

func (f *fakeStore) CreateQuestion(context.Context, string, entity.QuestionInput) (entity.Question, error) {
	f.calls++
	return entity.Question{}, nil
}
func (f *fakeStore) ListQuestions(context.Context, entity.QuestionFilter) (entity.QuestionPage, error) {
	f.calls++
	return entity.QuestionPage{}, nil
}
func (f *fakeStore) GetQuestion(context.Context, string) (entity.Question, error) {
	f.calls++
	return entity.Question{Kind: f.kind}, nil
}
func (f *fakeStore) CreateVersion(context.Context, string, string, entity.VersionInput) (entity.QuestionVersion, error) {
	f.calls++
	return entity.QuestionVersion{}, nil
}
func (f *fakeStore) PublishVersion(context.Context, string, string, int) (entity.QuestionVersion, error) {
	f.calls++
	return entity.QuestionVersion{}, nil
}
func (f *fakeStore) ArchiveQuestion(context.Context, string, string) (entity.Question, error) {
	f.calls++
	return entity.Question{}, nil
}
func (f *fakeStore) CreateTemplate(context.Context, string, entity.TemplateInput) (entity.Template, error) {
	f.calls++
	return entity.Template{}, nil
}
func (f *fakeStore) ListTemplates(context.Context, entity.TemplateFilter) (entity.TemplatePage, error) {
	f.calls++
	return entity.TemplatePage{}, nil
}
func (f *fakeStore) GetTemplate(context.Context, string) (entity.Template, error) {
	f.calls++
	return entity.Template{}, nil
}
func (f *fakeStore) PublishTemplate(context.Context, string, string) (entity.Template, error) {
	f.calls++
	return entity.Template{}, nil
}
func (f *fakeStore) ArchiveTemplate(context.Context, string, string) (entity.Template, error) {
	f.calls++
	return entity.Template{}, nil
}

func mustInvalid(t *testing.T, name string, err error, store *fakeStore, wantCalls int) {
	t.Helper()
	var v *entity.ValidationError
	if !errors.As(err, &v) || store.calls != wantCalls {
		t.Fatalf("%s: ожидали ValidationError без обращения к хранилищу, получили %v, обращений %d", name, err, store.calls)
	}
}

func TestQuestionsValidatedBeforeStore(t *testing.T) {
	store := &fakeStore{kind: entity.KindShortAnswer}
	s := New(store)
	ctx := context.Background()
	const admin = "00000000-0000-4000-8000-0000000000aa"
	bad := entity.QuestionInput{SkillID: "abc", Difficulty: 3, Kind: entity.KindShortAnswer}
	_, err := s.CreateQuestion(ctx, admin, bad)
	mustInvalid(t, "создание с плохим вводом", err, store, 0)
	_, err = s.GetQuestion(ctx, "abc")
	mustInvalid(t, "неверный UUID задания", err, store, 0)
	_, err = s.PublishVersion(ctx, admin, "00000000-0000-4000-8000-000000000001", 0)
	mustInvalid(t, "версия 0", err, store, 0)
	_, err = s.ArchiveQuestion(ctx, admin, "abc")
	mustInvalid(t, "архивация с неверным UUID", err, store, 0)
	_, err = s.ListQuestions(ctx, entity.QuestionFilter{Difficulty: 9})
	mustInvalid(t, "фильтр со сложностью 9", err, store, 0)

	// Содержимое версии проверяется по виду задания, который сервис читает из хранилища.
	versionBad := entity.VersionInput{Prompt: entity.Prompt{Text: "Вопрос"}, GradingSpec: entity.GradingSpec{Type: "choice", Correct: []string{"a"}}}
	_, err = s.CreateVersion(ctx, admin, "00000000-0000-4000-8000-000000000001", versionBad)
	mustInvalid(t, "версия не по виду задания", err, store, 1)
	if store.calls != 1 {
		t.Fatalf("ожидали одно чтение вида задания, обращений %d", store.calls)
	}
	good := entity.VersionInput{Prompt: entity.Prompt{Text: "Вопрос"}, GradingSpec: entity.GradingSpec{Type: "text", Accepted: []string{"x"}}}
	if _, err = s.CreateVersion(ctx, admin, "00000000-0000-4000-8000-00000000000A", good); err != nil || store.calls != 3 {
		t.Fatalf("корректная версия: %v, обращений %d", err, store.calls)
	}
}
