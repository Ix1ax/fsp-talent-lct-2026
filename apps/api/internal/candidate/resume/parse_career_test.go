package resume

import (
	"bytes"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

// put добавляет строку с абсолютной высотой; порядок вызовов должен идти сверху вниз, как в чтении страницы.
func put(d *doc, y, x, size float64, text string) *doc {
	d.y = y
	return d.at(x, size, text)
}

func month(t *testing.T, s string) entity.Month {
	t.Helper()
	m, err := entity.ParseMonth(s)
	if err != nil {
		t.Fatal(err)
	}
	return m
}

func TestParsePeriod(t *testing.T) {
	from, to, ok := parsePeriod("Ноябрь 2022 — настоящее время", testNow)
	if !ok || from.String() != "2022-11" || to != nil {
		t.Fatalf("текущая работа: %v %v %v", from, to, ok)
	}
	from, to, ok = parsePeriod("Март 2020 — Октябрь 2022", testNow)
	if !ok || from.String() != "2020-03" || to == nil || to.String() != "2022-10" {
		t.Fatalf("законченная: %v %v %v", from, to, ok)
	}
	for name, bad := range map[string]string{
		"мусор":             "где-то когда-то",
		"без года":          "Март — Октябрь 2022",
		"конец раньше":      "Март 2022 — Январь 2022",
		"будущее начало":    "Декабрь 2026 — настоящее время",
		"неизвестный месяц": "Мартобрь 2022 — настоящее время",
		"пусто":             "",
	} {
		if _, _, ok := parsePeriod(bad, testNow); ok {
			t.Errorf("%s принят: %q", name, bad)
		}
	}
	// Регистр и лишние пробелы не мешают.
	if from, _, ok := parsePeriod("  ноябрь   2022  —  Настоящее время ", testNow); !ok || from.String() != "2022-11" {
		t.Errorf("регистр и пробелы: %v %v", from, ok)
	}
}

func experienceDoc() *doc {
	d := newDoc()
	d.at(left, 25, "Иванов Иван")
	put(d, 700, left, 11, "Желаемая должность и зарплата")
	put(d, 680, left, 12, "Backend разработчик (Go)")
	put(d, 500, left, 11, "Опыт работы — 3 года 11 месяцев")
	put(d, 446, left, 8, "Ноябрь 2022 —")
	put(d, 443, right, 12, "ООО Пример")
	put(d, 435, left, 8, "настоящее время")
	put(d, 424, left, 8, "3 года 11")
	put(d, 423, right, 12, "Go-разработчик")
	put(d, 413, left, 8, "месяцев")
	put(d, 404, right, 9, "Разработка и поддержка backend-части на Go: проектирование")
	put(d, 391, right, 9, "REST API для продукта.")
	put(d, 378, right, 9, "-     Написание автотестов для ключевых сценариев и регресс-")
	put(d, 365, right, 9, "проверок.")
	put(d, 352, right, 9, "- Интеграция с внешними сервисами.")
	put(d, 320, left, 8, "Март 2020 —")
	put(d, 317, right, 12, "Студия Альфа")
	put(d, 309, left, 8, "Октябрь 2022")
	put(d, 297, right, 12, "Программист")
	put(d, 298, left, 8, "2 года 8")
	put(d, 287, left, 8, "месяцев")
	put(d, 278, right, 9, "Поддержка веб-приложений на PHP.")
	return d
}

func TestParseExperience(t *testing.T) {
	draft, warnings, err := ParseHH(experienceDoc().lines, testNow)
	if err != nil {
		t.Fatal(err)
	}
	if len(warnings) != 0 || len(draft.Experience) != 2 {
		t.Fatalf("записей %d, предупреждения %v", len(draft.Experience), warnings)
	}
	a, b := draft.Experience[0], draft.Experience[1]
	if a.Company != "ООО Пример" || a.Position != "Go-разработчик" || a.StartedOn.String() != "2022-11" || a.EndedOn != nil {
		t.Fatalf("первая запись: %+v", a)
	}
	wantDesc := "Разработка и поддержка backend-части на Go: проектирование REST API для продукта.\n- Написание автотестов для ключевых сценариев и регресс- проверок.\n- Интеграция с внешними сервисами."
	if a.Description != wantDesc {
		t.Fatalf("описание:\n%q\nожидали\n%q", a.Description, wantDesc)
	}
	if b.Company != "Студия Альфа" || b.Position != "Программист" || b.StartedOn.String() != "2020-03" || b.EndedOn == nil || b.EndedOn.String() != "2022-10" || b.Description != "Поддержка веб-приложений на PHP." {
		t.Fatalf("вторая запись: %+v", b)
	}
	// Записи проходят проверку создания, значит их можно сразу отправлять в POST /me/experience.
	for _, e := range draft.Experience {
		in := e
		if err := in.Normalize(testNow); err != nil {
			t.Fatalf("запись не проходит Normalize: %v", err)
		}
	}
}

func TestParseExperienceSkipsBrokenEntries(t *testing.T) {
	d := newDoc().at(left, 25, "Иванов Иван")
	put(d, 500, left, 11, "Опыт работы — 1 год")
	put(d, 446, left, 8, "Когда-то —")
	put(d, 443, right, 12, "Компания без даты")
	put(d, 435, left, 8, "настоящее время")
	put(d, 423, right, 12, "Должность")
	put(d, 380, left, 8, "Январь 2030 —")
	put(d, 377, right, 12, "Компания из будущего")
	put(d, 369, left, 8, "настоящее время")
	put(d, 357, right, 12, "Должность")
	put(d, 320, left, 8, "Январь 2020 —")
	put(d, 317, right, 12, "Хорошая компания")
	put(d, 309, left, 8, "настоящее время")
	put(d, 297, right, 12, "Должность")
	draft, warnings, err := ParseHH(d.lines, testNow)
	if err != nil {
		t.Fatal(err)
	}
	if len(draft.Experience) != 1 || draft.Experience[0].Company != "Хорошая компания" {
		t.Fatalf("записи: %+v", draft.Experience)
	}
	if len(warnings) < 2 {
		t.Fatalf("нужны предупреждения о двух пропущенных записях: %v", warnings)
	}
}

func TestParseExperienceLimits(t *testing.T) {
	d := newDoc().at(left, 25, "Иванов Иван")
	put(d, 780, left, 11, "Опыт работы — много")
	y := 760.0
	for i := 0; i < 35; i++ {
		put(d, y, left, 8, "Январь 2020 —")
		put(d, y-3, right, 12, "Компания")
		put(d, y-11, left, 8, "настоящее время")
		put(d, y-20, right, 12, "Должность")
		y -= 40
		if y < 40 {
			d.pageBreak()
			y = 780
		}
	}
	draft, warnings, err := ParseHH(d.lines, testNow)
	if err != nil || len(draft.Experience) != 30 || len(warnings) == 0 {
		t.Fatalf("записей %d, предупреждений %d (%v)", len(draft.Experience), len(warnings), err)
	}
	d2 := newDoc().at(left, 25, "Иванов Иван")
	put(d2, 780, left, 11, "Опыт работы — 1 год")
	put(d2, 760, left, 8, "Январь 2020 —")
	put(d2, 757, right, 12, "Компания")
	put(d2, 749, left, 8, "настоящее время")
	put(d2, 737, right, 12, "Должность")
	for i := 0; i < 300; i++ {
		put(d2, 700-float64(i)*10, right, 9, strings.Repeat("слово ", 8))
	}
	draft, warnings, err = ParseHH(d2.lines, testNow)
	if err != nil || len(draft.Experience) != 1 || len([]rune(draft.Experience[0].Description)) > 2000 || len(warnings) == 0 {
		t.Fatalf("описание: %d (%v) %v", len([]rune(draft.Experience[0].Description)), err, warnings)
	}
}

func educationDoc() *doc {
	d := newDoc().at(left, 25, "Иванов Иван")
	put(d, 700, left, 11, "Образование")
	put(d, 680, left, 11, "Высшее")
	put(d, 656, left, 8, "2027")
	put(d, 653, right, 12, "Университет «Дубна» (государственный университет «Дубна»),")
	put(d, 645, left, 8, "Высшее")
	put(d, 639, right, 12, "Дубна (Московская область)")
	d.pageBreak()
	put(d, 786, right, 9, "Институт системного анализа и управления, ПРОГРАММНАЯ ИНЖЕНЕРИЯ")
	put(d, 762, left, 8, "2024")
	put(d, 759, right, 12, "Тверской колледж им. А.Н. Коняева")
	put(d, 751, left, 8, "Среднее")
	put(d, 746, right, 9, "IT-College, Информационные системы и программирование")
	put(d, 740, left, 8, "специальное")
	return d
}

func TestParseEducation(t *testing.T) {
	d := educationDoc()
	d.pageBreak()
	put(d, 780, left, 11, "Навыки")
	draft, warnings, err := ParseHH(d.lines, testNow)
	if err != nil {
		t.Fatal(err)
	}
	if len(warnings) != 0 || len(draft.Education) != 2 {
		t.Fatalf("записей %d, предупреждения %v", len(draft.Education), warnings)
	}
	a, b := draft.Education[0], draft.Education[1]
	if a.Level != "higher" || a.GraduationYear != 2027 || a.Institution != "Университет «Дубна» (государственный университет «Дубна»), Дубна (Московская область)" || a.Specialty != "ПРОГРАММНАЯ ИНЖЕНЕРИЯ" {
		t.Fatalf("первая запись: %+v", a)
	}
	if b.Level != "vocational" || b.GraduationYear != 2024 || b.Institution != "Тверской колледж им. А.Н. Коняева" || b.Specialty != "Информационные системы и программирование" {
		t.Fatalf("вторая запись: %+v", b)
	}
	for _, e := range draft.Education {
		in := e
		if err := in.Normalize(); err != nil {
			t.Fatalf("запись не проходит Normalize: %v", err)
		}
	}
}

func TestParseEducationLevels(t *testing.T) {
	for label, want := range map[string]string{
		"Среднее":             "secondary",
		"Среднее специальное": "vocational",
		"Неоконченное высшее": "incomplete_higher",
		"Высшее":              "higher",
		"Бакалавр":            "bachelor",
		"Магистр":             "master",
		"Кандидат наук":       "phd",
		"Доктор наук":         "doctor",
	} {
		d := newDoc().at(left, 25, "Иванов Иван")
		put(d, 700, left, 11, "Образование")
		put(d, 660, left, 8, "2020")
		put(d, 657, right, 12, "Учебное заведение")
		put(d, 640, left, 8, label)
		put(d, 500, left, 11, "Навыки")
		draft, _, err := ParseHH(d.lines, testNow)
		if err != nil || len(draft.Education) != 1 || draft.Education[0].Level != want {
			t.Errorf("%s: %+v (%v), ожидали %s", label, draft.Education, err, want)
		}
	}
}

func TestParseEducationSkipsBrokenEntries(t *testing.T) {
	d := newDoc().at(left, 25, "Иванов Иван")
	put(d, 700, left, 11, "Образование")
	put(d, 660, left, 8, "2020")
	put(d, 640, left, 8, "Высшее")
	put(d, 600, left, 8, "2019")
	put(d, 597, right, 12, "Университет")
	put(d, 580, left, 8, "что-то непонятное")
	put(d, 500, left, 11, "Навыки")
	draft, warnings, err := ParseHH(d.lines, testNow)
	if err != nil || len(draft.Education) != 0 || len(warnings) < 2 {
		t.Fatalf("записи %+v, предупреждения %v (%v)", draft.Education, warnings, err)
	}
	d2 := newDoc().at(left, 25, "Иванов Иван")
	put(d2, 780, left, 11, "Образование")
	y := 760.0
	for i := 0; i < 12; i++ {
		put(d2, y, left, 8, "2020")
		put(d2, y-3, right, 12, "Университет")
		put(d2, y-12, left, 8, "Высшее")
		y -= 30
	}
	put(d2, 100, left, 11, "Навыки")
	draft, warnings, err = ParseHH(d2.lines, testNow)
	if err != nil || len(draft.Education) != 10 || len(warnings) == 0 {
		t.Fatalf("лимит: %d (%v) %v", len(draft.Education), err, warnings)
	}
}

// Образец PDF целиком: извлечение и разбор вместе дают то, что заложено в синтетическом резюме.
func TestParseFixture(t *testing.T) {
	data, err := os.ReadFile("testdata/resume_hh.pdf")
	if err != nil {
		t.Fatal(err)
	}
	lines, err := ExtractLines(bytes.NewReader(data), int64(len(data)), 10)
	if err != nil {
		t.Fatal(err)
	}
	draft, warnings, err := ParseHH(lines, time.Date(2026, 10, 8, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	if len(warnings) != 0 {
		t.Fatalf("предупреждения: %v", warnings)
	}
	if s(draft.Headline) != "Backend разработчик (Go)" || s(draft.City) != "Тверь" || strings.Join(draft.WorkFormatCodes, ",") != "remote,hybrid" {
		t.Fatalf("должность, город, форматы: %s %s %v", s(draft.Headline), s(draft.City), draft.WorkFormatCodes)
	}
	c := draft.Contacts
	if c == nil || s(c.FullName) != "Иванов Иван" || s(c.Phone) != "+7 (900) 000-00-00" || s(c.Email) != "ivan.ivanov@example.test" || s(c.Telegram) != "@ivanov" {
		t.Fatalf("контакты: %+v", c)
	}
	if len(draft.Experience) != 2 || draft.Experience[0].Company != "ООО Пример" || draft.Experience[0].Position != "Go-разработчик" || draft.Experience[0].EndedOn != nil ||
		draft.Experience[1].Company != "Студия Альфа" || draft.Experience[1].StartedOn.String() != "2020-03" || draft.Experience[1].EndedOn.String() != "2022-10" {
		t.Fatalf("опыт: %+v", draft.Experience)
	}
	if len(draft.Education) != 2 || draft.Education[0].Level != "higher" || draft.Education[0].GraduationYear != 2027 || draft.Education[0].Specialty != "ПРОГРАММНАЯ ИНЖЕНЕРИЯ" ||
		draft.Education[1].Level != "vocational" || draft.Education[1].GraduationYear != 2024 {
		t.Fatalf("образование: %+v", draft.Education)
	}
	want := []string{"Go", "PostgreSQL", "Docker", "Kubernetes", "Базы данных", "ASP.NET Core", "Git"}
	if strings.Join(draft.Skills, "|") != strings.Join(want, "|") {
		t.Fatalf("навыки: %q", draft.Skills)
	}
	if len(draft.Languages) != 2 || draft.Languages[1] != (Language{"Английский", "B1"}) {
		t.Fatalf("языки: %+v", draft.Languages)
	}
	if !strings.HasPrefix(s(draft.Summary), "Backend-разработчик с опытом разработки на Go и PHP.") || !strings.Contains(s(draft.Summary), "Ключевые навыки") {
		t.Fatalf("о себе: %q", s(draft.Summary))
	}
}
