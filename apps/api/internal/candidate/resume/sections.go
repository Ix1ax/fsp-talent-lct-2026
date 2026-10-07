package resume

import (
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

const (
	maxDescription = 2000
	maxInstitution = 200
	maxSpecialty   = 200
	bigFont        = 11.0 // компания, должность и учебное заведение набраны крупнее описания и подписей
)

var (
	periodStart   = regexp.MustCompile(`^\p{L}+\s+\d{4}\s*[—–-]`)
	periodPattern = regexp.MustCompile(`^(\p{L}+)\s+(\d{4})\s*[—–-]\s*(?:(\p{L}+)\s+(\d{4})|(?:по\s+)?настоящее\s+время)`)
	yearLine      = regexp.MustCompile(`^\d{4}$`)
	bullet        = regexp.MustCompile(`^[-•–—]\s`)
)

var russianMonths = map[string]time.Month{
	"январь": time.January, "февраль": time.February, "март": time.March, "апрель": time.April, "май": time.May, "июнь": time.June,
	"июль": time.July, "август": time.August, "сентябрь": time.September, "октябрь": time.October, "ноябрь": time.November, "декабрь": time.December,
}

func collapse(s string) string {
	return strings.Join(strings.Fields(strings.ReplaceAll(s, " ", " ")), " ")
}

// parsePeriod разбирает «Ноябрь 2022 — настоящее время» и «Март 2020 — Октябрь 2022». Будущее начало, перевёрнутый период
// и неизвестные месяцы не принимаются.
func parsePeriod(s string, now time.Time) (entity.Month, *entity.Month, bool) {
	m := periodPattern.FindStringSubmatch(strings.ToLower(collapse(s)))
	if m == nil {
		return entity.Month{}, nil, false
	}
	startMonth, ok := russianMonths[m[1]]
	startYear, _ := strconv.Atoi(m[2])
	if !ok || startYear < 1900 {
		return entity.Month{}, nil, false
	}
	from := entity.NewMonth(startYear, startMonth)
	current := entity.NewMonth(now.UTC().Year(), now.UTC().Month())
	if from.Time().After(current.Time()) {
		return entity.Month{}, nil, false
	}
	if m[3] == "" {
		return from, nil, true
	}
	endMonth, ok := russianMonths[m[3]]
	endYear, _ := strconv.Atoi(m[4])
	if !ok || endYear < 1900 {
		return entity.Month{}, nil, false
	}
	to := entity.NewMonth(endYear, endMonth)
	if to.Time().Before(from.Time()) || to.Time().After(current.Time()) {
		return entity.Month{}, nil, false
	}
	return from, &to, true
}

type experienceEntry struct {
	left  []string
	right []Line
}

// parseExperience делит раздел на записи по строкам периода в левой колонке; содержимое справа: компания, должность
// (крупный шрифт) и описание. Записи, которые не удалось разобрать, пропускаются с предупреждением.
func parseExperience(lines []Line, left float64, now time.Time) ([]entity.ExperienceInput, []string) {
	var entries []*experienceEntry
	var cur *experienceEntry
	orphan := false
	for _, l := range lines {
		text := strings.TrimSpace(l.Text)
		switch {
		case isLeft(l, left) && periodStart.MatchString(collapse(text)):
			cur = &experienceEntry{left: []string{text}}
			entries = append(entries, cur)
		case isLeft(l, left):
			if cur != nil {
				cur.left = append(cur.left, text)
			}
		case isRight(l, left):
			if cur != nil {
				cur.right = append(cur.right, l)
			} else {
				orphan = true
			}
		}
	}
	var out []entity.ExperienceInput
	var warnings []string
	if orphan {
		warnings = append(warnings, "Часть текста раздела «Опыт работы» не удалось отнести к местам работы: проверьте записи")
	}
	for _, e := range entries {
		from, to, ok := parsePeriod(strings.Join(e.left, " "), now)
		var big, small []Line
		for _, l := range e.right {
			if l.Size >= bigFont && len(big) < 2 {
				big = append(big, l)
			} else {
				small = append(small, l)
			}
		}
		if len(big) < 2 && len(e.right) >= 2 && len(big) == 0 { // шрифты не различаются: первые две строки
			big, small = e.right[:2], e.right[2:]
		}
		name := "без названия"
		if len(big) > 0 {
			name = strings.TrimSpace(big[0].Text)
		}
		if !ok {
			warnings = append(warnings, "Не удалось разобрать период места работы «"+name+"»: запись пропущена")
			continue
		}
		if len(big) < 2 {
			warnings = append(warnings, "Не удалось найти компанию или должность в записи начиная с "+from.String()+": запись пропущена")
			continue
		}
		description := buildDescription(small)
		if utf8.RuneCountInString(description) > maxDescription {
			description = string([]rune(description)[:maxDescription])
			warnings = append(warnings, "Описание места работы «"+name+"» обрезано до 2000 символов")
		}
		out = append(out, entity.ExperienceInput{Company: collapse(big[0].Text), Position: collapse(big[1].Text), StartedOn: from, EndedOn: to, Description: description})
	}
	if len(out) > entity.MaxExperiences {
		out = out[:entity.MaxExperiences]
		warnings = append(warnings, "Мест работы больше 30: лишние пропущены")
	}
	return out, warnings
}

// buildDescription склеивает перенесённые строки в абзацы, пункты списка остаются каждый на своей строке.
func buildDescription(lines []Line) string {
	var items []string
	for _, l := range lines {
		text := collapse(l.Text)
		if text == "" {
			continue
		}
		if len(items) == 0 || bullet.MatchString(text) {
			items = append(items, text)
		} else {
			items[len(items)-1] += " " + text
		}
	}
	return strings.Join(items, "\n")
}

type educationEntry struct {
	year  int
	level []string
	right []Line
}

func educationLevel(text string) (string, bool) {
	t := strings.ToLower(collapse(text))
	switch {
	case strings.Contains(t, "неоконченное"):
		return "incomplete_higher", true
	case strings.Contains(t, "среднее специальное"):
		return "vocational", true
	case strings.Contains(t, "кандидат наук"):
		return "phd", true
	case strings.Contains(t, "доктор наук"):
		return "doctor", true
	case strings.Contains(t, "бакалавр"):
		return "bachelor", true
	case strings.Contains(t, "магистр"):
		return "master", true
	case strings.Contains(t, "высшее"):
		return "higher", true
	case strings.Contains(t, "среднее"):
		return "secondary", true
	}
	return "", false
}

// parseEducation делит раздел на записи по строкам года в левой колонке (под годом подпись уровня), справа учебное
// заведение (крупный шрифт) и строка специальности; запись может переходить на следующую страницу.
func parseEducation(lines []Line, left float64) ([]entity.EducationInput, []string) {
	var entries []*educationEntry
	var cur *educationEntry
	orphan := false
	for _, l := range lines {
		text := strings.TrimSpace(l.Text)
		switch {
		case isLeft(l, left) && l.Size >= headingSize:
			// Общий заголовок уровня («Высшее») перед записями.
		case isLeft(l, left) && yearLine.MatchString(text):
			year, _ := strconv.Atoi(text)
			cur = &educationEntry{year: year}
			entries = append(entries, cur)
		case isLeft(l, left):
			if cur != nil {
				cur.level = append(cur.level, text)
			}
		case isRight(l, left):
			if cur != nil {
				cur.right = append(cur.right, l)
			} else {
				orphan = true
			}
		}
	}
	var out []entity.EducationInput
	var warnings []string
	if orphan {
		warnings = append(warnings, "Часть текста раздела «Образование» не удалось отнести к записям: проверьте образование")
	}
	for _, e := range entries {
		levelText := strings.Join(e.level, " ")
		level, ok := educationLevel(levelText)
		if !ok {
			warnings = append(warnings, "Не удалось определить уровень образования «"+collapse(levelText)+"» ("+strconv.Itoa(e.year)+"): запись пропущена")
			continue
		}
		var institution, specialty []string
		for _, l := range e.right {
			if l.Size >= bigFont {
				institution = append(institution, collapse(l.Text))
			} else {
				specialty = append(specialty, collapse(l.Text))
			}
		}
		if len(institution) == 0 && len(e.right) > 0 { // шрифты не различаются: первая строка — заведение
			institution = []string{collapse(e.right[0].Text)}
			for _, l := range e.right[1:] {
				specialty = append(specialty, collapse(l.Text))
			}
		}
		if len(institution) == 0 {
			warnings = append(warnings, "Не найдено учебное заведение ("+strconv.Itoa(e.year)+"): запись пропущена")
			continue
		}
		in := entity.EducationInput{Level: level, Institution: strings.Join(institution, " "), Specialty: specialtyName(strings.Join(specialty, " ")), GraduationYear: e.year}
		if utf8.RuneCountInString(in.Institution) > maxInstitution {
			in.Institution = string([]rune(in.Institution)[:maxInstitution])
			warnings = append(warnings, "Название учебного заведения обрезано до 200 символов")
		}
		if utf8.RuneCountInString(in.Specialty) > maxSpecialty {
			in.Specialty = string([]rune(in.Specialty)[:maxSpecialty])
			warnings = append(warnings, "Специальность обрезана до 200 символов")
		}
		out = append(out, in)
	}
	if len(out) > entity.MaxEducation {
		out = out[:entity.MaxEducation]
		warnings = append(warnings, "Записей об образовании больше 10: лишние пропущены")
	}
	return out, warnings
}

// specialtyName берёт часть строки после последней запятой: до неё факультет или институт.
func specialtyName(line string) string {
	line = strings.TrimSpace(line)
	if i := strings.LastIndex(line, ","); i >= 0 {
		if tail := strings.TrimSpace(line[i+1:]); tail != "" {
			return tail
		}
	}
	return line
}
