package service

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/resume"
)

type resumeStub struct {
	access  error
	skills  map[string]string
	formats []int16
	asked   []string
}

func (r *resumeStub) ImportAccess(context.Context, string) error { return r.access }
func (r *resumeStub) MatchSkills(_ context.Context, names []string) (map[string]string, error) {
	r.asked = names
	return r.skills, nil
}
func (r *resumeStub) WorkFormatIDs(context.Context, []string) ([]int16, error) { return r.formats, nil }

var resumeNow = time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)

func newResumeService(store ResumeStore) *ResumeImportService {
	return NewResumeImportService(store, func() time.Time { return resumeNow })
}

func fixtureFile(t *testing.T) []byte {
	t.Helper()
	data, err := os.ReadFile("../resume/testdata/resume_hh.pdf")
	if err != nil {
		t.Fatal(err)
	}
	return data
}

type forbiddenReader struct{ t *testing.T }

func (r forbiddenReader) Read([]byte) (int, error) {
	r.t.Fatal("файл не должен читаться до проверки доступа")
	return 0, nil
}

type endlessReader struct{ read int }

func (r *endlessReader) Read(p []byte) (int, error) {
	r.read += len(p)
	for i := range p {
		p[i] = 'x'
	}
	return len(p), nil
}

func TestImportRejectsBeforeParsing(t *testing.T) {
	s := newResumeService(&resumeStub{access: entity.ErrConsentRequired})
	if _, err := s.Import(context.Background(), "u", forbiddenReader{t}); !errors.Is(err, entity.ErrConsentRequired) {
		t.Fatalf("ошибка доступа должна пробрасываться: %v", err)
	}
}

func TestImportTooLarge(t *testing.T) {
	s := newResumeService(&resumeStub{})
	r := &endlessReader{}
	if _, err := s.Import(context.Background(), "u", r); !errors.Is(err, ErrResumeTooLarge) {
		t.Fatalf("большой файл: %v", err)
	}
	if r.read > MaxResumeBytes+1 {
		t.Fatalf("прочитано %d байт при лимите %d", r.read, MaxResumeBytes)
	}
}

func TestImportNotPDF(t *testing.T) {
	s := newResumeService(&resumeStub{})
	if _, err := s.Import(context.Background(), "u", strings.NewReader("это просто текст, а не PDF")); !errors.Is(err, ErrResumeUnrecognized) {
		t.Fatalf("не PDF: %v", err)
	}
}

func TestImportFixture(t *testing.T) {
	store := &resumeStub{skills: map[string]string{"go": "id-go", "postgresql": "id-pg"}, formats: []int16{3, 2}}
	s := newResumeService(store)
	result, err := s.Import(context.Background(), "u", bytes.NewReader(fixtureFile(t)))
	if err != nil {
		t.Fatal(err)
	}
	d := result.Draft
	if d.Headline == nil || *d.Headline != "Backend разработчик (Go)" || d.City == nil || *d.City != "Тверь" {
		t.Fatalf("должность и город: %+v", d)
	}
	if len(d.WorkFormatIDs) != 2 || d.WorkFormatIDs[0] != 3 {
		t.Fatalf("форматы работы: %v", d.WorkFormatIDs)
	}
	byName := map[string]*string{}
	for _, sk := range d.Skills {
		byName[sk.Name] = sk.SkillID
	}
	if byName["Go"] == nil || *byName["Go"] != "id-go" || byName["PostgreSQL"] == nil || byName["ASP.NET Core"] != nil {
		t.Fatalf("навыки: %+v", d.Skills)
	}
	if _, ok := byName["ASP.NET Core"]; !ok {
		t.Fatal("нераспознанный навык должен остаться в черновике с skill_id null")
	}
	if len(d.Experience) != 2 || len(d.Education) != 2 || len(d.Languages) != 2 {
		t.Fatalf("опыт %d, образование %d, языки %d", len(d.Experience), len(d.Education), len(d.Languages))
	}
	for _, e := range d.Experience {
		in := e
		if err := in.Normalize(resumeNow); err != nil {
			t.Fatalf("опыт не проходит Normalize: %v", err)
		}
	}
	if d.Contacts == nil || d.Contacts.Email == nil || *d.Contacts.Email != "ivan.ivanov@example.test" {
		t.Fatalf("контакты: %+v", d.Contacts)
	}
	if len(store.asked) == 0 {
		t.Fatal("навыки должны сопоставляться со справочником")
	}
}

func TestImportDropsInvalidCareerEntries(t *testing.T) {
	s := newResumeService(&resumeStub{})
	good := entity.ExperienceInput{Company: "К", Position: "Р", StartedOn: monthOf(t, "2022-01")}
	future := entity.ExperienceInput{Company: "Будущая", Position: "Р", StartedOn: monthOf(t, "2030-01")}
	s.parse = func([]byte, time.Time) (resume.Draft, []string, error) {
		return resume.Draft{
			Experience: []entity.ExperienceInput{future, good},
			Education:  []entity.EducationInput{{Level: "bogus", Institution: "У", GraduationYear: 2020}, {Level: "higher", Institution: "У", GraduationYear: 2020}},
		}, nil, nil
	}
	result, err := s.Import(context.Background(), "u", strings.NewReader("%PDF-1.4 stub"))
	if err != nil {
		t.Fatal(err)
	}
	if len(result.Draft.Experience) != 1 || result.Draft.Experience[0].Company != "К" || len(result.Draft.Education) != 1 || len(result.Warnings) != 2 {
		t.Fatalf("записи: %+v, предупреждения %v", result.Draft, result.Warnings)
	}
}

func TestImportTimeout(t *testing.T) {
	s := newResumeService(&resumeStub{})
	s.timeout = 50 * time.Millisecond
	release := make(chan struct{})
	defer close(release)
	s.parse = func([]byte, time.Time) (resume.Draft, []string, error) {
		<-release
		return resume.Draft{}, nil, nil
	}
	started := time.Now()
	if _, err := s.Import(context.Background(), "u", strings.NewReader("%PDF-1.4 stub")); !errors.Is(err, ErrResumeUnrecognized) {
		t.Fatalf("таймаут: %v", err)
	}
	if time.Since(started) > 2*time.Second {
		t.Fatalf("ответ занял %v", time.Since(started))
	}
}

func TestImportArraysNotNull(t *testing.T) {
	s := newResumeService(&resumeStub{})
	s.parse = func([]byte, time.Time) (resume.Draft, []string, error) { return resume.Draft{}, nil, nil }
	result, err := s.Import(context.Background(), "u", strings.NewReader("%PDF-1.4 stub"))
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(result)
	for _, want := range []string{`"skills":[]`, `"experience":[]`, `"education":[]`, `"languages":[]`, `"work_format_ids":[]`, `"warnings":[]`} {
		if !strings.Contains(string(raw), want) {
			t.Errorf("в ответе нет %s: %s", want, raw)
		}
	}
}

func monthOf(t *testing.T, s string) entity.Month {
	t.Helper()
	m, err := entity.ParseMonth(s)
	if err != nil {
		t.Fatal(err)
	}
	return m
}
