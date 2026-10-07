package resume

import (
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

const (
	maxHeadline = 200
	maxCity     = 200
	maxSummary  = 10000
	maxSkills   = 50
	maxSkillLen = 100

	// Левая колонка шаблона hh.ru: заголовки и подписи; правая колонка — содержимое. Граница по X от левого края.
	leftTolerance = 5.0
	rightOffset   = 40.0
	headingSize   = 10.5
	labelSize     = 9.5
)

var (
	emailPattern    = regexp.MustCompile(`[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)+`)
	phonePattern    = regexp.MustCompile(`^\+?\d[\d\s\x{00a0}\x{202f}()\-]{8,}\d$`)
	telegramPattern = regexp.MustCompile(`(?i)telegram:\s*@?([A-Za-z0-9_]{3,})`)
	cityPattern     = regexp.MustCompile(`Проживает:\s*([^,]+)`)
	formatPattern   = regexp.MustCompile(`(?i)формат работы:\s*(.+)`)
	salaryPattern   = regexp.MustCompile(`(?i)(\d[\d\s\x{00a0}\x{202f}]{2,})\s*(?:₽|руб)`)
	chipSeparator   = regexp.MustCompile(`\s{2,}|\n`)
	levelCEFR       = regexp.MustCompile(`\b([ABC][12])\b`)
	langPattern     = regexp.MustCompile(`^(.+?)\s+[—–-]\s+(.+)$`)
)

// Заголовки внутри текста «Обо мне»: набраны обычным шрифтом в правой колонке, это не разделы.
var summaryStops = map[string]bool{
	"Ключевые навыки": true, "Опыт работы": true, "Образование": true, "Достижения": true, "Ключевые проекты": true,
}

type sectionKind int

const (
	secNone sectionKind = iota
	secDesired
	secExperience
	secEducation
	secSkills
	secExtra
)

func headingKind(text string) sectionKind {
	switch {
	case strings.HasPrefix(text, "Желаемая должность и зарплата"):
		return secDesired
	case strings.HasPrefix(text, "Опыт работы"):
		return secExperience
	case text == "Образование":
		return secEducation
	case text == "Навыки":
		return secSkills
	case text == "Дополнительная информация":
		return secExtra
	}
	return secNone
}

// ParseHH разбирает строки PDF-резюме hh.ru в черновик. Что не удалось распознать, остаётся пустым и даёт предупреждение.
func ParseHH(lines []Line, now time.Time) (Draft, []string, error) {
	var draft Draft
	var warnings []string
	if len(lines) == 0 {
		return draft, nil, ErrUnrecognized
	}
	left := lines[0].X
	for _, l := range lines {
		left = math.Min(left, l.X)
	}

	sections := map[sectionKind][]Line{}
	var header []Line
	current := secNone
	for _, l := range lines {
		if l.X <= left+leftTolerance && l.Size >= headingSize {
			if kind := headingKind(l.Text); kind != secNone {
				current = kind
				if _, ok := sections[kind]; !ok {
					sections[kind] = []Line{}
				}
				continue
			}
		}
		if current == secNone {
			header = append(header, l)
		} else {
			sections[current] = append(sections[current], l)
		}
	}
	_, hasDesired := sections[secDesired]
	_, hasExperience := sections[secExperience]
	_, hasSkills := sections[secSkills]
	if !hasDesired && !hasExperience && !hasSkills {
		return draft, nil, ErrUnrecognized
	}

	draft.Contacts, draft.City = parseHeader(header)
	desired := sections[secDesired]
	draft.Headline, draft.WorkFormatCodes, draft.SalaryMinRUB = parseDesired(desired, left)
	draft.Skills, draft.Languages, warnings = parseSkillsAndLanguages(sections[secSkills], left, warnings)
	draft.Summary = parseSummary(sections[secExtra], left)
	var w []string
	draft.Experience, w = parseExperience(sections[secExperience], left, now)
	warnings = append(warnings, w...)
	draft.Education, w = parseEducation(sections[secEducation], left)
	warnings = append(warnings, w...)

	draft.Headline, warnings = capText(draft.Headline, maxHeadline, "Должность", warnings)
	draft.City, warnings = capText(draft.City, maxCity, "Город", warnings)
	draft.Summary, warnings = capText(draft.Summary, maxSummary, "Описание «Обо мне»", warnings)
	return draft, warnings, nil
}

func capText(v *string, limit int, name string, warnings []string) (*string, []string) {
	if v == nil || utf8.RuneCountInString(*v) <= limit {
		return v, warnings
	}
	cut := string([]rune(*v)[:limit])
	return &cut, append(warnings, name+" обрезан(о) до "+strconv.Itoa(limit)+" символов")
}

func strPtr(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

func parseHeader(header []Line) (*Contacts, *string) {
	if len(header) == 0 {
		return nil, nil
	}
	c := &Contacts{}
	var city *string
	biggest := header[0]
	for _, l := range header {
		if l.Size > biggest.Size {
			biggest = l
		}
		if c.Email == nil {
			if m := emailPattern.FindString(l.Text); m != "" {
				c.Email = strPtr(m)
			}
		}
		if c.Phone == nil && phonePattern.MatchString(strings.TrimSpace(l.Text)) {
			c.Phone = strPtr(strings.Join(strings.Fields(strings.NewReplacer("\u00a0", " ", "\u202f", " ").Replace(l.Text)), " "))
		}
		if c.Telegram == nil {
			if m := telegramPattern.FindStringSubmatch(l.Text); m != nil {
				c.Telegram = strPtr("@" + m[1])
			}
		}
		if city == nil {
			if m := cityPattern.FindStringSubmatch(l.Text); m != nil {
				city = strPtr(m[1])
			}
		}
	}
	c.FullName = strPtr(biggest.Text)
	return c, city
}

func parseDesired(lines []Line, left float64) (*string, []string, *int64) {
	var headline *string
	var codes []string
	var salary *int64
	for _, l := range lines {
		text := strings.TrimSpace(l.Text)
		if headline == nil && !strings.HasPrefix(text, "Специализации") && !formatPattern.MatchString(text) && text != "" {
			headline = strPtr(text)
		}
		if m := formatPattern.FindStringSubmatch(text); m != nil {
			codes = append(codes, formatCodes(m[1])...)
		}
		if salary == nil {
			if m := salaryPattern.FindStringSubmatch(text); m != nil {
				digits := strings.Map(func(r rune) rune {
					if r >= '0' && r <= '9' {
						return r
					}
					return -1
				}, m[1])
				if n, err := strconv.ParseInt(digits, 10, 64); err == nil && n > 0 && n <= 1_000_000_000 {
					salary = &n
				}
			}
		}
	}
	return headline, dedupe(codes), salary
}

func formatCodes(text string) []string {
	var out []string
	for _, part := range strings.Split(strings.ToLower(text), ",") {
		switch p := strings.TrimSpace(part); {
		case strings.Contains(p, "удал"):
			out = append(out, "remote")
		case strings.Contains(p, "гибрид"):
			out = append(out, "hybrid")
		case strings.Contains(p, "офис"):
			out = append(out, "office")
		}
	}
	return out
}

func dedupe(values []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, v := range values {
		if !seen[v] {
			seen[v] = true
			out = append(out, v)
		}
	}
	return out
}

func isLeft(l Line, left float64) bool  { return l.X <= left+leftTolerance }
func isRight(l Line, left float64) bool { return l.X >= left+rightOffset }

// rows склеивает сегменты одной визуальной строки (одна страница, близкая высота) слева направо.
func rows(lines []Line) []string {
	var out []string
	var current []Line
	flush := func() {
		if len(current) == 0 {
			return
		}
		sort.SliceStable(current, func(i, j int) bool { return current[i].X < current[j].X })
		parts := make([]string, len(current))
		for i, l := range current {
			parts[i] = strings.TrimSpace(l.Text)
		}
		out = append(out, strings.Join(parts, " "))
		current = nil
	}
	for _, l := range lines {
		if len(current) > 0 && (current[0].Page != l.Page || math.Abs(current[0].Y-l.Y) > 2) {
			flush()
		}
		current = append(current, l)
	}
	flush()
	return out
}

func parseSkillsAndLanguages(lines []Line, left float64, warnings []string) ([]string, []Language, []string) {
	var langLines, skillLines []Line
	label := ""
	for _, l := range lines {
		switch {
		case isLeft(l, left) && l.Size <= labelSize:
			label = strings.TrimSpace(l.Text)
		case isRight(l, left):
			switch label {
			case "Знание языков":
				langLines = append(langLines, l)
			case "Навыки":
				skillLines = append(skillLines, l)
			}
		}
	}
	var languages []Language
	for _, row := range rows(langLines) {
		m := langPattern.FindStringSubmatch(row)
		if m == nil {
			continue
		}
		level := strings.TrimSpace(m[2])
		if c := levelCEFR.FindString(level); c != "" {
			level = c
		}
		languages = append(languages, Language{Name: strings.TrimSpace(m[1]), Level: level})
	}

	seen := map[string]bool{}
	var skills []string
	tooLong, over := false, false
	for _, l := range skillLines {
		for _, chip := range chipSeparator.Split(l.Text, -1) {
			name := strings.TrimSpace(chip)
			if name == "" || seen[strings.ToLower(name)] {
				continue
			}
			if utf8.RuneCountInString(name) > maxSkillLen {
				tooLong = true
				continue
			}
			if len(skills) >= maxSkills {
				over = true
				continue
			}
			seen[strings.ToLower(name)] = true
			skills = append(skills, name)
		}
	}
	if tooLong {
		warnings = append(warnings, "Часть навыков пропущена: название длиннее 100 символов")
	}
	if over {
		warnings = append(warnings, "Навыков больше 50: лишние пропущены")
	}
	return skills, languages, warnings
}

func parseSummary(lines []Line, left float64) *string {
	var parts []string
	active := false
	var prev *Line
	for i := range lines {
		l := lines[i]
		text := strings.TrimSpace(l.Text)
		if isLeft(l, left) && l.Size <= labelSize {
			active = text == "Обо мне"
			prev = nil
			continue
		}
		if !active || !isRight(l, left) {
			continue
		}
		if summaryStops[text] {
			active = false
			continue
		}
		sep := " "
		if prev != nil && prev.Page == l.Page && prev.Y-l.Y > 20 {
			sep = "\n\n"
		}
		if len(parts) > 0 {
			parts = append(parts, sep)
		}
		parts = append(parts, text)
		prev = &lines[i]
	}
	return strPtr(strings.Join(parts, ""))
}
