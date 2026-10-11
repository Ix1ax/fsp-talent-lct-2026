package resume

import (
	"errors"
	"strings"
	"testing"
	"time"
)

const (
	left  = 42.5
	right = 127.6
)

var testNow = time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)

// doc собирает строки по страницам; y задаёт порядок чтения сверху вниз (чем больше y, тем выше).
type doc struct {
	lines []Line
	y     float64
	page  int
}

func newDoc() *doc { return &doc{y: 800, page: 1} }

func (d *doc) at(x, size float64, text string) *doc {
	d.lines = append(d.lines, Line{Page: d.page, X: x, Y: d.y, Size: size, Text: text})
	return d
}

// next опускает «курсор» на step пунктов вниз и пишет строку.
func (d *doc) next(step, x, size float64, text string) *doc {
	d.y -= step
	return d.at(x, size, text)
}

func (d *doc) same(x, size float64, text string) *doc { return d.at(x, size, text) }

func (d *doc) pageBreak() *doc { d.page++; d.y = 800; return d }

func s(v *string) string {
	if v == nil {
		return "<nil>"
	}
	return *v
}

// header и разделы вспомогательного документа в реальном макете hh.ru.
func headerDoc() *doc {
	d := newDoc()
	d.at(left, 25, "Иванов Иван")
	d.next(20, left, 9, "Мужчина, 30 лет, родился 1 января 1996")
	d.next(26, left, 9, "+7 (900) 000-00-00")
	d.next(13, left, 9, "ivan.ivanov@example.test — предпочитаемый способ связи")
	d.next(13, left, 9, "telegram: @ivanov")
	d.next(26, left, 9, "Проживает: Тверь")
	d.next(13, left, 9, "Гражданство: Россия, есть разрешение на работу: Россия")
	d.next(39, left, 11, "Желаемая должность и зарплата")
	d.next(20, left, 12, "Backend разработчик (Go)")
	d.next(16, left, 9, "Специализации:")
	d.next(13, left+14, 9, "—  Программист, разработчик")
	d.next(13, left, 9, "Формат работы: удалённо, гибрид")
	return d
}

func TestParseHeader(t *testing.T) {
	draft, _, err := ParseHH(headerDoc().lines, testNow)
	if err != nil {
		t.Fatal(err)
	}
	c := draft.Contacts
	if c == nil || s(c.FullName) != "Иванов Иван" || s(c.Phone) != "+7 (900) 000-00-00" || s(c.Email) != "ivan.ivanov@example.test" || s(c.Telegram) != "@ivanov" {
		t.Fatalf("контакты: %+v", c)
	}
	if s(draft.City) != "Тверь" {
		t.Fatalf("город: %s", s(draft.City))
	}
}

func TestParseCityCutsAtComma(t *testing.T) {
	d := newDoc().at(left, 25, "Иванов Иван")
	d.next(20, left, 9, "Проживает: Москва, м. Тульская")
	d.next(40, left, 11, "Желаемая должность и зарплата")
	d.next(20, left, 12, "Разработчик")
	draft, _, err := ParseHH(d.lines, testNow)
	if err != nil || s(draft.City) != "Москва" {
		t.Fatalf("город: %s (%v)", s(draft.City), err)
	}
}

func TestParseDesired(t *testing.T) {
	draft, _, err := ParseHH(headerDoc().lines, testNow)
	if err != nil {
		t.Fatal(err)
	}
	if s(draft.Headline) != "Backend разработчик (Go)" {
		t.Fatalf("должность: %s", s(draft.Headline))
	}
	if strings.Join(draft.WorkFormatCodes, ",") != "remote,hybrid" {
		t.Fatalf("форматы: %v", draft.WorkFormatCodes)
	}
	if draft.SalaryMinRUB != nil {
		t.Fatalf("зарплата не указана: %v", *draft.SalaryMinRUB)
	}

	d := headerDoc()
	d.next(13, left, 9, "Зарплата: от 150 000 ₽ на руки")
	draft, _, _ = ParseHH(d.lines, testNow)
	if draft.SalaryMinRUB == nil || *draft.SalaryMinRUB != 150000 {
		t.Fatalf("зарплата: %v", draft.SalaryMinRUB)
	}

	d = newDoc().at(left, 25, "Иванов Иван")
	d.next(40, left, 11, "Желаемая должность и зарплата")
	d.next(20, left, 12, "Аналитик")
	d.next(13, left, 9, "Формат работы: офис")
	draft, _, _ = ParseHH(d.lines, testNow)
	if strings.Join(draft.WorkFormatCodes, ",") != "office" {
		t.Fatalf("офис: %v", draft.WorkFormatCodes)
	}
}

// skillsDoc: раздел «Навыки» в реальном макете: подпись слева, содержимое справа, чипы в одной строке.
func skillsDoc(d *doc) *doc {
	d.next(60, left, 11, "Навыки")
	d.next(18, left, 8, "Знание языков")
	d.same(right, 9, "Русский")
	d.same(162.6, 9, "— Родной")
	d.next(13, right, 9, "Английский")
	d.same(181.6, 9, "— B1 — Средний")
	d.next(30, left, 8, "Навыки")
	d.same(right, 10, "Go     \n PostgreSQL     \n Docker")
	d.same(300, 10, "Kubernetes")
	d.next(18, right, 10, "Базы данных")
	d.same(210, 10, "ASP.NET Core     \n go")
	return d
}

func TestParseSkills(t *testing.T) {
	draft, _, err := ParseHH(skillsDoc(headerDoc()).lines, testNow)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"Go", "PostgreSQL", "Docker", "Kubernetes", "Базы данных", "ASP.NET Core"}
	if strings.Join(draft.Skills, "|") != strings.Join(want, "|") {
		t.Fatalf("навыки: %q, ожидали %q", draft.Skills, want)
	}
}

func TestParseSkillsLimits(t *testing.T) {
	d := headerDoc()
	d.next(60, left, 11, "Навыки")
	d.next(30, left, 8, "Навыки")
	for i := 0; i < 60; i++ {
		d.next(13, right, 10, "Навык"+string(rune('A'+i%26))+string(rune('a'+i/26)))
	}
	d.next(13, right, 10, strings.Repeat("я", 101))
	draft, warnings, err := ParseHH(d.lines, testNow)
	if err != nil {
		t.Fatal(err)
	}
	if len(draft.Skills) != 50 {
		t.Fatalf("навыков %d, ожидали 50", len(draft.Skills))
	}
	if len(warnings) == 0 {
		t.Fatal("нужно предупреждение об обрезке навыков")
	}
}

func TestParseLanguages(t *testing.T) {
	draft, _, err := ParseHH(skillsDoc(headerDoc()).lines, testNow)
	if err != nil {
		t.Fatal(err)
	}
	if len(draft.Languages) != 2 || draft.Languages[0] != (Language{"Русский", "Родной"}) || draft.Languages[1] != (Language{"Английский", "B1"}) {
		t.Fatalf("языки: %+v", draft.Languages)
	}
}

func TestParseSummary(t *testing.T) {
	d := skillsDoc(headerDoc())
	d.next(60, left, 11, "Дополнительная информация")
	d.next(18, left, 8, "Обо мне")
	d.same(right, 9, "Backend-разработчик с опытом на Go.")
	d.next(13, right, 9, "Специализируюсь на REST API.")
	d.next(26, right, 9, "Ключевые навыки")
	d.next(13, right, 9, "• Backend: Go")
	d.next(26, right, 9, "Опыт работы")
	d.next(13, right, 9, "Go-разработчик")
	draft, _, err := ParseHH(d.lines, testNow)
	if err != nil {
		t.Fatal(err)
	}
	// Всё, что кандидат написал в «Обо мне», остаётся: внутренние заголовки это его собственное оформление, а не разделы.
	want := "Backend-разработчик с опытом на Go. Специализируюсь на REST API.\n\nКлючевые навыки • Backend: Go\n\nОпыт работы Go-разработчик"
	if s(draft.Summary) != want {
		t.Fatalf("о себе: %q\nожидали %q", s(draft.Summary), want)
	}
	// Одноимённая строка из «Обо мне» не создаёт раздел опыта и не меняет остальной разбор.
	if len(draft.Experience) != 0 {
		t.Fatalf("опыт из текста «Обо мне»: %+v", draft.Experience)
	}
	if len(draft.Skills) != 6 {
		t.Fatalf("навыки изменились: %q", draft.Skills)
	}
}

func TestParseSummaryLimit(t *testing.T) {
	d := headerDoc()
	d.next(60, left, 11, "Дополнительная информация")
	d.next(18, left, 8, "Обо мне")
	for i := 0; i < 400; i++ {
		d.next(13, right, 9, strings.Repeat("слово ", 10))
	}
	draft, warnings, err := ParseHH(d.lines, testNow)
	if err != nil || draft.Summary == nil || len([]rune(*draft.Summary)) > 10000 || len(warnings) == 0 {
		t.Fatalf("лимит: %d символов, предупреждений %d (%v)", len([]rune(s(draft.Summary))), len(warnings), err)
	}
}

func TestParseHeadlineLimit(t *testing.T) {
	d := newDoc().at(left, 25, "Иванов Иван")
	d.next(40, left, 11, "Желаемая должность и зарплата")
	d.next(20, left, 12, strings.Repeat("я", 250))
	draft, warnings, err := ParseHH(d.lines, testNow)
	if err != nil || len([]rune(s(draft.Headline))) != 200 || len(warnings) == 0 {
		t.Fatalf("заголовок: %d (%v), предупреждений %d", len([]rune(s(draft.Headline))), err, len(warnings))
	}
}

func TestParseUnrecognized(t *testing.T) {
	for name, lines := range map[string][]Line{
		"пусто":           nil,
		"случайный текст": newDoc().at(left, 12, "Договор поставки").next(13, left, 9, "Стороны договорились о следующем").lines,
		"только шапка":    newDoc().at(left, 25, "Иванов Иван").next(20, left, 9, "Проживает: Тверь").lines,
	} {
		if _, _, err := ParseHH(lines, testNow); !errors.Is(err, ErrUnrecognized) {
			t.Errorf("%s: %v", name, err)
		}
	}
}

func TestParseEmptyContacts(t *testing.T) {
	d := newDoc().at(left, 25, "Иванов Иван")
	d.next(40, left, 11, "Желаемая должность и зарплата")
	d.next(20, left, 12, "Разработчик")
	draft, _, err := ParseHH(d.lines, testNow)
	if err != nil || draft.Contacts == nil || s(draft.Contacts.FullName) != "Иванов Иван" || draft.Contacts.Email != nil {
		t.Fatalf("контакты: %+v (%v)", draft.Contacts, err)
	}
}

func TestParsePhoneWithNonBreakingSpaces(t *testing.T) {
	d := newDoc().at(left, 25, "Иванов Иван")
	d.next(20, left, 9, "+7\u00a0(952)\u00a00928466")
	d.next(40, left, 11, "Желаемая должность и зарплата")
	d.next(20, left, 12, "Разработчик")
	draft, _, err := ParseHH(d.lines, testNow)
	if err != nil || draft.Contacts == nil || s(draft.Contacts.Phone) != "+7 (952) 0928466" {
		t.Fatalf("телефон: %v (%v)", draft.Contacts, err)
	}
}

// Лишний фрагмент левее колонки (номер страницы, водяной знак) не должен ломать распознавание.
func TestParseIgnoresStrayLeftFragment(t *testing.T) {
	d := skillsDoc(headerDoc())
	d.lines = append(d.lines, Line{Page: 1, X: 20, Y: 10, Size: 8, Text: "1"})
	draft, _, err := ParseHH(d.lines, testNow)
	if err != nil {
		t.Fatalf("лишний фрагмент слева сломал разбор: %v", err)
	}
	if len(draft.Skills) != 6 || s(draft.Headline) != "Backend разработчик (Go)" {
		t.Fatalf("навыки %d, должность %s", len(draft.Skills), s(draft.Headline))
	}
}

func TestParseContactAndLanguageLimits(t *testing.T) {
	d := newDoc().at(left, 25, strings.Repeat("Я", 300))
	d.next(20, left, 9, "+7 "+strings.Repeat("9", 40))
	d.next(13, left, 9, strings.Repeat("a", 250)+"@example.test")
	d.next(40, left, 11, "Навыки")
	d.next(18, left, 8, "Знание языков")
	for i := 0; i < 30; i++ {
		d.next(13, right, 9, "Язык"+strings.Repeat("я", i%7)+" — B1")
		d.same(200, 9, "")
	}
	draft, warnings, err := ParseHH(d.lines, testNow)
	if err != nil {
		t.Fatal(err)
	}
	c := draft.Contacts
	if c == nil || len([]rune(s(c.FullName))) != 200 || c.Phone != nil || c.Email != nil {
		t.Fatalf("контакты: %+v", c)
	}
	if len(draft.Languages) != 20 || len(warnings) == 0 {
		t.Fatalf("языков %d, предупреждений %d", len(draft.Languages), len(warnings))
	}
}
