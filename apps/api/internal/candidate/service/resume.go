package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/resume"
)

const (
	MaxResumeBytes = 5 << 20
	MaxResumePages = 10
	ResumeTimeout  = 10 * time.Second
)

var (
	ErrResumeTooLarge     = errors.New("файл резюме слишком большой")
	ErrResumeUnrecognized = errors.New("не удалось распознать резюме")
)

// ResumeStore — справочники и проверка доступа для импорта резюме.
type ResumeStore interface {
	ImportAccess(ctx context.Context, userID string) error
	MatchSkills(ctx context.Context, names []string) (map[string]string, error)
	WorkFormatIDs(ctx context.Context, codes []string) ([]int16, error)
}

// DraftSkill — навык из резюме; SkillID пуст, если в справочнике такого навыка нет.
type DraftSkill struct {
	Name    string  `json:"name"`
	SkillID *string `json:"skill_id"`
}

// ImportedDraft — черновик профиля. Опыт и образование в формате POST /me/experience и /me/education.
type ImportedDraft struct {
	Headline      *string                  `json:"headline"`
	City          *string                  `json:"city"`
	Summary       *string                  `json:"summary"`
	SalaryMinRUB  *int64                   `json:"salary_min_rub"`
	WorkFormatIDs []int16                  `json:"work_format_ids"`
	Contacts      *resume.Contacts         `json:"contacts"`
	Skills        []DraftSkill             `json:"skills"`
	Experience    []entity.ExperienceInput `json:"experience"`
	Education     []entity.EducationInput  `json:"education"`
	Languages     []resume.Language        `json:"languages"`
}

type ImportResult struct {
	Draft    ImportedDraft `json:"draft"`
	Warnings []string      `json:"warnings"`
}

type ResumeImportService struct {
	store   ResumeStore
	now     func() time.Time
	timeout time.Duration
	parse   func(data []byte, now time.Time) (resume.Draft, []string, error)
}

func NewResumeImportService(store ResumeStore, now func() time.Time) *ResumeImportService {
	if now == nil {
		now = time.Now
	}
	return &ResumeImportService{store: store, now: now, timeout: ResumeTimeout, parse: parsePDF}
}

func parsePDF(data []byte, now time.Time) (resume.Draft, []string, error) {
	lines, err := resume.ExtractLines(bytes.NewReader(data), int64(len(data)), MaxResumePages)
	if err != nil {
		return resume.Draft{}, nil, err
	}
	return resume.ParseHH(lines, now)
}

// Import разбирает PDF и возвращает черновик. Ничего не сохраняет: файл живёт только в памяти этого вызова.
func (s *ResumeImportService) Import(ctx context.Context, userID string, file io.Reader) (ImportResult, error) {
	if err := s.store.ImportAccess(ctx, userID); err != nil {
		return ImportResult{}, err
	}
	data, err := io.ReadAll(io.LimitReader(file, MaxResumeBytes+1))
	if err != nil {
		return ImportResult{}, err
	}
	if len(data) > MaxResumeBytes {
		return ImportResult{}, ErrResumeTooLarge
	}

	type parsed struct {
		draft    resume.Draft
		warnings []string
		err      error
	}
	done := make(chan parsed, 1)
	now := s.now()
	go func() {
		d, w, err := s.parse(data, now)
		done <- parsed{d, w, err}
	}()
	timer := time.NewTimer(s.timeout)
	defer timer.Stop()
	var p parsed
	select {
	case p = <-done:
	case <-timer.C:
		return ImportResult{}, fmt.Errorf("%w: разбор занял больше %v", ErrResumeUnrecognized, s.timeout)
	case <-ctx.Done():
		return ImportResult{}, ctx.Err()
	}
	if p.err != nil {
		return ImportResult{}, fmt.Errorf("%w: %v", ErrResumeUnrecognized, p.err)
	}

	warnings := append([]string{}, p.warnings...)
	draft := ImportedDraft{
		Headline: p.draft.Headline, City: p.draft.City, Summary: p.draft.Summary, SalaryMinRUB: p.draft.SalaryMinRUB,
		Contacts: p.draft.Contacts, Languages: p.draft.Languages,
		Experience: []entity.ExperienceInput{}, Education: []entity.EducationInput{}, Skills: []DraftSkill{},
	}
	if draft.Languages == nil {
		draft.Languages = []resume.Language{}
	}
	for _, e := range p.draft.Experience {
		in := e
		if err := in.Normalize(now); err != nil {
			warnings = append(warnings, "Место работы «"+strings.TrimSpace(e.Company)+"» пропущено: "+err.Error())
			continue
		}
		draft.Experience = append(draft.Experience, in)
	}
	for _, e := range p.draft.Education {
		in := e
		if err := in.Normalize(); err != nil {
			warnings = append(warnings, "Запись об образовании «"+strings.TrimSpace(e.Institution)+"» ("+strconv.Itoa(e.GraduationYear)+") пропущена: "+err.Error())
			continue
		}
		draft.Education = append(draft.Education, in)
	}
	matched, err := s.store.MatchSkills(ctx, p.draft.Skills)
	if err != nil {
		return ImportResult{}, err
	}
	for _, name := range p.draft.Skills {
		sk := DraftSkill{Name: name}
		if id, ok := matched[strings.ToLower(strings.TrimSpace(name))]; ok {
			sk.SkillID = &id
		}
		draft.Skills = append(draft.Skills, sk)
	}
	if draft.WorkFormatIDs, err = s.store.WorkFormatIDs(ctx, p.draft.WorkFormatCodes); err != nil {
		return ImportResult{}, err
	}
	if draft.WorkFormatIDs == nil {
		draft.WorkFormatIDs = []int16{}
	}
	return ImportResult{Draft: draft, Warnings: warnings}, nil
}
