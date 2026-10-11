package entity

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func opts(ids ...string) []Option {
	items := []Option{}
	for _, id := range ids {
		items = append(items, Option{ID: id, Text: "Вариант " + id})
	}
	return items
}

func isInvalid(err error) bool {
	var v *ValidationError
	return errors.As(err, &v) && v.Message != ""
}

func TestValidateContentValid(t *testing.T) {
	for name, c := range map[string]struct {
		kind string
		p    Prompt
		g    GradingSpec
	}{
		"choice один правильный":      {KindChoice, Prompt{Text: "Что такое goroutine?", Options: opts("a", "b", "c")}, GradingSpec{Type: "choice", Correct: []string{"b"}}},
		"choice несколько правильных": {KindChoice, Prompt{Text: "Что верно?", Options: opts("a", "b", "c")}, GradingSpec{Type: "choice", Correct: []string{"a", "c"}, Multiple: true}},
		"short_answer":           {KindShortAnswer, Prompt{Text: "Команда создания ветки?"}, GradingSpec{Type: "text", Accepted: []string{"git checkout -b", "git switch -c"}}},
		"code_reading с выбором": {KindCodeReading, Prompt{Text: "Что выведет код?", Code: "fmt.Println(1+1)", Language: "go", Options: opts("a", "b")}, GradingSpec{Type: "choice", Correct: []string{"a"}}},
		"code_reading с текстом": {KindCodeReading, Prompt{Text: "Что выведет код?", Code: "print(1+1)", Language: "python"}, GradingSpec{Type: "text", Accepted: []string{"2"}}},
		"code_reading без языка": {KindCodeReading, Prompt{Text: "Что выведет код?", Code: "x := 1"}, GradingSpec{Type: "text", Accepted: []string{"1"}}},
	} {
		p, g := c.p, c.g
		if err := ValidateContent(c.kind, &p, &g); err != nil {
			t.Fatalf("%s: %v", name, err)
		}
	}
	p := Prompt{Text: "  Вопрос  ", Options: []Option{{ID: "a", Text: " Первый "}, {ID: "b", Text: "Второй"}}}
	g := GradingSpec{Type: "choice", Correct: []string{"a"}}
	if err := ValidateContent(KindChoice, &p, &g); err != nil || p.Text != "Вопрос" || p.Options[0].Text != "Первый" {
		t.Fatalf("пробелы должны обрезаться: %+v %v", p, err)
	}
	s := GradingSpec{Type: "text", Accepted: []string{"  Ответ  "}}
	if err := ValidateContent(KindShortAnswer, &Prompt{Text: "Вопрос"}, &s); err != nil || s.Accepted[0] != "Ответ" {
		t.Fatalf("допустимые ответы обрезаются: %+v %v", s, err)
	}
}

func TestValidateContentInvalid(t *testing.T) {
	long := func(n int) string { return strings.Repeat("я", n) }
	many := func(n int) []string {
		items := make([]string, n)
		for i := range items {
			items[i] = "ответ" + string(rune('a'+i))
		}
		return items
	}
	ab := opts("a", "b")
	choice := func(correct ...string) GradingSpec { return GradingSpec{Type: "choice", Correct: correct} }
	text := func(accepted ...string) GradingSpec { return GradingSpec{Type: "text", Accepted: accepted} }
	for name, c := range map[string]struct {
		kind string
		p    Prompt
		g    GradingSpec
	}{
		"пустой текст":                      {KindChoice, Prompt{Text: "  ", Options: ab}, choice("a")},
		"текст 5001 символ":                 {KindChoice, Prompt{Text: long(5001), Options: ab}, choice("a")},
		"нулевой символ в тексте":           {KindChoice, Prompt{Text: "a\x00b", Options: ab}, choice("a")},
		"правильный id вне вариантов":       {KindChoice, Prompt{Text: "Вопрос", Options: ab}, choice("z")},
		"два правильных при multiple=false": {KindChoice, Prompt{Text: "Вопрос", Options: ab}, choice("a", "b")},
		"пустой correct":                    {KindChoice, Prompt{Text: "Вопрос", Options: ab}, choice()},
		"повтор правильного id":             {KindChoice, Prompt{Text: "Вопрос", Options: opts("a", "b", "c")}, GradingSpec{Type: "choice", Correct: []string{"a", "a"}, Multiple: true}},
		"повтор id вариантов":               {KindChoice, Prompt{Text: "Вопрос", Options: []Option{{ID: "a", Text: "1"}, {ID: "a", Text: "2"}}}, choice("a")},
		"один вариант":                      {KindChoice, Prompt{Text: "Вопрос", Options: opts("a")}, choice("a")},
		"одиннадцать вариантов":             {KindChoice, Prompt{Text: "Вопрос", Options: opts("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k")}, choice("a")},
		"id с пробелом":                     {KindChoice, Prompt{Text: "Вопрос", Options: []Option{{ID: "a b", Text: "1"}, {ID: "b", Text: "2"}}}, choice("b")},
		"id длиннее 16":                     {KindChoice, Prompt{Text: "Вопрос", Options: []Option{{ID: strings.Repeat("a", 17), Text: "1"}, {ID: "b", Text: "2"}}}, choice("b")},
		"пустой текст варианта":             {KindChoice, Prompt{Text: "Вопрос", Options: []Option{{ID: "a", Text: " "}, {ID: "b", Text: "2"}}}, choice("b")},
		"текст варианта 501":                {KindChoice, Prompt{Text: "Вопрос", Options: []Option{{ID: "a", Text: long(501)}, {ID: "b", Text: "2"}}}, choice("b")},
		"choice без вариантов":              {KindChoice, Prompt{Text: "Вопрос"}, choice("a")},
		"choice со спецификацией text":      {KindChoice, Prompt{Text: "Вопрос", Options: ab}, text("x")},
		"choice с code":                     {KindChoice, Prompt{Text: "Вопрос", Code: "x", Options: ab}, choice("a")},
		"допустимый ответ из пробелов":      {KindShortAnswer, Prompt{Text: "Вопрос"}, text("   ")},
		"пустой список ответов":             {KindShortAnswer, Prompt{Text: "Вопрос"}, text()},
		"21 допустимый ответ":               {KindShortAnswer, Prompt{Text: "Вопрос"}, text(many(21)...)},
		"ответ длиннее 200":                 {KindShortAnswer, Prompt{Text: "Вопрос"}, text(long(201))},
		"short_answer с options":            {KindShortAnswer, Prompt{Text: "Вопрос", Options: ab}, text("x")},
		"short_answer со спецификацией":     {KindShortAnswer, Prompt{Text: "Вопрос"}, choice("a")},
		"text с correct":                    {KindShortAnswer, Prompt{Text: "Вопрос"}, GradingSpec{Type: "text", Accepted: []string{"x"}, Correct: []string{"a"}}},
		"choice с accepted":                 {KindChoice, Prompt{Text: "Вопрос", Options: ab}, GradingSpec{Type: "choice", Correct: []string{"a"}, Accepted: []string{"x"}}},
		"code_reading без code":             {KindCodeReading, Prompt{Text: "Вопрос", Options: ab}, choice("a")},
		"code_reading code 10001":           {KindCodeReading, Prompt{Text: "Вопрос", Code: long(10001)}, text("x")},
		"code_reading язык длиннее 32":      {KindCodeReading, Prompt{Text: "Вопрос", Code: "x", Language: strings.Repeat("a", 33)}, text("x")},
		"code_reading choice без options":   {KindCodeReading, Prompt{Text: "Вопрос", Code: "x"}, choice("a")},
		"code_reading text с options":       {KindCodeReading, Prompt{Text: "Вопрос", Code: "x", Options: ab}, text("x")},
		"неизвестный type":                  {KindChoice, Prompt{Text: "Вопрос", Options: ab}, GradingSpec{Type: "essay"}},
		"language у choice":                 {KindChoice, Prompt{Text: "Вопрос", Language: "go", Options: ab}, choice("a")},
		"неизвестный вид":                   {"essay", Prompt{Text: "Вопрос"}, text("x")},
	} {
		p, g := c.p, c.g
		if err := ValidateContent(c.kind, &p, &g); !isInvalid(err) {
			t.Fatalf("%s: ожидали ValidationError, получили %v", name, err)
		}
	}
}

// Вложенные неизвестные поля отвергаются уже при разборе JSON.
func TestUnknownNestedFieldsRejected(t *testing.T) {
	for name, body := range map[string]string{
		"в prompt":       `{"skill_id":"00000000-0000-4000-8000-000000000001","difficulty":1,"kind":"short_answer","prompt":{"text":"x","hint":"y"},"grading_spec":{"type":"text","accepted":["a"]}}`,
		"в grading_spec": `{"skill_id":"00000000-0000-4000-8000-000000000001","difficulty":1,"kind":"short_answer","prompt":{"text":"x"},"grading_spec":{"type":"text","accepted":["a"],"weight":2}}`,
		"в варианте":     `{"skill_id":"00000000-0000-4000-8000-000000000001","difficulty":1,"kind":"choice","prompt":{"text":"x","options":[{"id":"a","text":"1","correct":true},{"id":"b","text":"2"}]},"grading_spec":{"type":"choice","correct":["a"]}}`,
	} {
		dec := json.NewDecoder(strings.NewReader(body))
		dec.DisallowUnknownFields()
		var in QuestionInput
		if err := dec.Decode(&in); err == nil {
			t.Fatalf("%s: неизвестное поле принято", name)
		}
	}
}

func TestQuestionInputNormalize(t *testing.T) {
	valid := func() QuestionInput {
		return QuestionInput{SkillID: "00000000-0000-4000-8000-00000000AB01", Difficulty: 3, Kind: KindShortAnswer, Prompt: Prompt{Text: "Вопрос"}, GradingSpec: GradingSpec{Type: "text", Accepted: []string{"x"}}}
	}
	in := valid()
	if err := in.Normalize(); err != nil || in.SkillID != "00000000-0000-4000-8000-00000000ab01" {
		t.Fatalf("UUID должен приводиться к нижнему регистру: %q %v", in.SkillID, err)
	}
	for name, mutate := range map[string]func(*QuestionInput){
		"сложность 0":     func(q *QuestionInput) { q.Difficulty = 0 },
		"сложность 6":     func(q *QuestionInput) { q.Difficulty = 6 },
		"неизвестный вид": func(q *QuestionInput) { q.Kind = "essay" },
		"плохой UUID":     func(q *QuestionInput) { q.SkillID = "abc" },
		"пустой UUID":     func(q *QuestionInput) { q.SkillID = "" },
		"плохое задание":  func(q *QuestionInput) { q.GradingSpec = GradingSpec{Type: "text"} },
	} {
		q := valid()
		mutate(&q)
		if err := q.Normalize(); !isInvalid(err) {
			t.Fatalf("%s: ожидали ValidationError, получили %v", name, err)
		}
	}
	v := VersionInput{Prompt: Prompt{Text: "Вопрос"}, GradingSpec: GradingSpec{Type: "text", Accepted: []string{"x"}}}
	if err := v.Normalize(KindShortAnswer); err != nil {
		t.Fatal(err)
	}
	if err := v.Normalize(KindChoice); !isInvalid(err) {
		t.Fatalf("версия проверяется по виду задания: %v", err)
	}
}

func TestNormalizeIDAndVersion(t *testing.T) {
	got, err := NormalizeID("00000000-0000-4000-8000-00000000AB01")
	if err != nil || got != "00000000-0000-4000-8000-00000000ab01" {
		t.Fatalf("NormalizeID: %q %v", got, err)
	}
	for _, bad := range []string{"", "abc", "00000000000040008000000000000001", "00000000-0000-4000-8000-00000000ab01x"} {
		if _, err := NormalizeID(bad); !isInvalid(err) {
			t.Fatalf("%q: ожидали ValidationError, получили %v", bad, err)
		}
	}
	for _, bad := range []int{0, -1} {
		if err := NormalizeVersion(bad); !isInvalid(err) {
			t.Fatalf("версия %d должна отвергаться: %v", bad, err)
		}
	}
	if err := NormalizeVersion(1); err != nil {
		t.Fatal(err)
	}
}

func TestFilters(t *testing.T) {
	active := true
	if err := (&QuestionFilter{Difficulty: 3, Kind: KindChoice, Status: StatusPublished, Active: &active, Limit: 20}).Normalize(); err != nil {
		t.Fatal(err)
	}
	for name, f := range map[string]QuestionFilter{"сложность 6": {Difficulty: 6}, "вид": {Kind: "essay"}, "статус": {Status: "live"}, "навык": {SkillID: "abc"}} {
		f := f
		if err := f.Normalize(); !isInvalid(err) {
			t.Fatalf("%s: ожидали ValidationError, получили %v", name, err)
		}
	}
	if err := (&TemplateFilter{Status: StatusDraft}).Normalize(); err != nil {
		t.Fatal(err)
	}
	if err := (&TemplateFilter{Status: "live"}).Normalize(); !isInvalid(err) {
		t.Fatalf("статус шаблона: %v", err)
	}
}
