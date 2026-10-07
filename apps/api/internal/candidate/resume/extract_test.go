package resume

import (
	"bytes"
	"errors"
	"os"
	"strings"
	"testing"
)

func readFixture(t *testing.T, name string) []byte {
	t.Helper()
	data, err := os.ReadFile("testdata/" + name)
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func extract(t *testing.T, data []byte, maxPages int) ([]Line, error) {
	t.Helper()
	return ExtractLines(bytes.NewReader(data), int64(len(data)), maxPages)
}

func find(lines []Line, text string) (Line, bool) {
	for _, l := range lines {
		if l.Text == text {
			return l, true
		}
	}
	return Line{}, false
}

func TestExtractLinesFixture(t *testing.T) {
	lines, err := extract(t, readFixture(t, "resume_hh.pdf"), 10)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"Иванов Иван", "Проживает: Тверь", "Желаемая должность и зарплата", "Опыт работы — 3 года 11 месяцев", "Образование", "Навыки", "Знание языков", "— B1 — Средний", "Английский", "+7 (900) 000-00-00"} {
		if _, ok := find(lines, want); !ok {
			t.Errorf("нет строки %q", want)
		}
	}
	for _, l := range lines {
		if strings.ContainsRune(l.Text, 0xFFFD) {
			t.Errorf("символ замены не отброшен: %q", l.Text)
		}
		if strings.Contains(l.Text, "Резюме обновлено") {
			t.Errorf("колонтитул не отброшен: %q", l.Text)
		}
		if l.Page < 1 || l.Page > 3 || l.Size <= 0 {
			t.Errorf("страница или размер: %+v", l)
		}
	}
	// Колонки одной строки разделены: период слева, компания справа.
	period, ok1 := find(lines, "Ноябрь 2022 —")
	company, ok2 := find(lines, "ООО Пример")
	if !ok1 || !ok2 || period.X >= company.X || period.Page != company.Page {
		t.Fatalf("колонки: %+v %+v", period, company)
	}
	// Чипы навыков в одной строке дают отдельные сегменты, слова внутри навыка не разрываются.
	for _, chip := range []string{"Go", "PostgreSQL", "Docker", "Kubernetes", "ASP.NET Core", "Базы данных", "Git"} {
		if _, ok := find(lines, chip); !ok {
			t.Errorf("нет навыка %q отдельной строкой", chip)
		}
	}
	// Порядок чтения: страницы по порядку, сверху вниз.
	index := func(text string) int {
		for i, l := range lines {
			if l.Text == text {
				return i
			}
		}
		return -1
	}
	if !(index("Иванов Иван") < index("Опыт работы — 3 года 11 месяцев") && index("Опыт работы — 3 года 11 месяцев") < index("Образование") && index("Образование") < index("Дополнительная информация")) {
		t.Fatal("порядок чтения нарушен")
	}
}

func TestExtractLinesErrors(t *testing.T) {
	fixture := readFixture(t, "resume_hh.pdf")
	var broken *BrokenError
	if _, err := extract(t, []byte("not a pdf at all"), 10); !errors.Is(err, ErrNotPDF) {
		t.Errorf("текст: %v", err)
	}
	if _, err := extract(t, nil, 10); !errors.Is(err, ErrNotPDF) {
		t.Errorf("пустой вход: %v", err)
	}
	if _, err := extract(t, fixture[:len(fixture)/2], 10); !errors.As(err, &broken) {
		t.Errorf("обрезанный файл: %v", err)
	}
	if _, err := extract(t, fixture, 2); !errors.Is(err, ErrTooManyPages) {
		t.Errorf("3 страницы при лимите 2: %v", err)
	}
	if _, err := extract(t, readFixture(t, "blank.pdf"), 10); !errors.Is(err, ErrNoText) {
		t.Errorf("пустой PDF: %v", err)
	}
}

func TestExtractLinesRecoversPanic(t *testing.T) {
	prev := readFragments
	readFragments = func(data []byte, maxPages int) ([][]fragment, error) { panic("boom") }
	defer func() { readFragments = prev }()
	fixture := readFixture(t, "resume_hh.pdf")
	var broken *BrokenError
	if _, err := extract(t, fixture, 10); !errors.As(err, &broken) {
		t.Fatalf("паника библиотеки должна стать BrokenError: %v", err)
	}
}
