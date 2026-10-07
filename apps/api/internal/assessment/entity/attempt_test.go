package entity

import (
	"errors"
	"strings"
	"testing"
	"time"
)

func str(s string) *string { return &s }

func TestGradeAnswerChoice(t *testing.T) {
	single := GradingSpec{Type: "choice", Correct: []string{"b"}}
	multi := GradingSpec{Type: "choice", Correct: []string{"a", "c"}, Multiple: true}
	for name, tc := range map[string]struct {
		spec GradingSpec
		got  []string
		want bool
	}{
		"верный":                  {single, []string{"b"}, true},
		"неверный":                {single, []string{"a"}, false},
		"лишний вариант":          {single, []string{"b", "a"}, false},
		"множественный, порядок":  {multi, []string{"c", "a"}, true},
		"не хватает":              {multi, []string{"a"}, false},
		"лишний во множественном": {multi, []string{"a", "b", "c"}, false},
	} {
		if got := GradeAnswer(tc.spec, Answer{Selected: tc.got}); got != tc.want {
			t.Errorf("%s: %v, ожидали %v", name, got, tc.want)
		}
	}
	if GradeAnswer(single, Answer{Text: str("b")}) {
		t.Error("текст не должен засчитываться как выбор")
	}
}

func TestGradeAnswerText(t *testing.T) {
	loose := GradingSpec{Type: "text", Accepted: []string{"Go  Routine", "горутина"}}
	strict := GradingSpec{Type: "text", Accepted: []string{"Go"}, CaseSensitive: true}
	for name, tc := range map[string]struct {
		spec GradingSpec
		got  string
		want bool
	}{
		"регистр не важен":       {loose, "  go routine ", true},
		"кириллица":              {loose, "ГОРУТИНА", true},
		"повторные пробелы":      {loose, "GO\t\tROUTINE", true},
		"чужой ответ":            {loose, "поток", false},
		"пустой":                 {loose, "   ", false},
		"регистр важен: верно":   {strict, "Go", true},
		"регистр важен: неверно": {strict, "go", false},
	} {
		if got := GradeAnswer(tc.spec, Answer{Text: str(tc.got)}); got != tc.want {
			t.Errorf("%s: %v, ожидали %v", name, got, tc.want)
		}
	}
	if GradeAnswer(loose, Answer{Selected: []string{"a"}}) {
		t.Error("выбор не должен засчитываться как текст")
	}
}

func TestValidateAnswer(t *testing.T) {
	prompt := Prompt{Text: "q", Options: []Option{{ID: "a", Text: "A"}, {ID: "b", Text: "B"}}}
	choice := GradingSpec{Type: "choice", Correct: []string{"a"}}
	multi := GradingSpec{Type: "choice", Correct: []string{"a", "b"}, Multiple: true}
	text := GradingSpec{Type: "text", Accepted: []string{"x"}}
	var v *ValidationError
	for name, tc := range map[string]struct {
		g  GradingSpec
		a  Answer
		ok bool
	}{
		"выбор":                  {choice, Answer{Selected: []string{"a"}}, true},
		"неизвестный вариант":    {choice, Answer{Selected: []string{"z"}}, false},
		"пустой выбор":           {choice, Answer{Selected: []string{}}, false},
		"дубль":                  {multi, Answer{Selected: []string{"a", "a"}}, false},
		"несколько при одном":    {choice, Answer{Selected: []string{"a", "b"}}, false},
		"несколько при multiple": {multi, Answer{Selected: []string{"a", "b"}}, true},
		"текст":                  {text, Answer{Text: str("x")}, true},
		"пустой текст":           {text, Answer{Text: str("  ")}, false},
		"длинный текст":          {text, Answer{Text: str(strings.Repeat("я", 501))}, false},
		"текст на выбор":         {choice, Answer{Text: str("a")}, false},
		"выбор на текст":         {text, Answer{Selected: []string{"a"}}, false},
		"оба поля":               {text, Answer{Text: str("x"), Selected: []string{"a"}}, false},
		"нулевой байт":           {text, Answer{Text: str("a\x00b")}, false},
	} {
		err := ValidateAnswer(prompt, tc.g, tc.a)
		if tc.ok && err != nil || !tc.ok && !errors.As(err, &v) {
			t.Errorf("%s: %v", name, err)
		}
	}
}

func TestScore(t *testing.T) {
	percent, skills := Score([]ScoredItem{
		{SkillID: "go", Points: 1, Correct: true},
		{SkillID: "go", Points: 1, Correct: false},
		{SkillID: "sql", Points: 2.5, Correct: true},
	})
	if percent != 77.78 {
		t.Fatalf("процент %v", percent)
	}
	if len(skills) != 2 || skills[0].SkillID != "go" || skills[0].Percent() != 50 || skills[1].Percent() != 100 {
		t.Fatalf("навыки: %+v", skills)
	}
	if p, s := Score(nil); p != 0 || len(s) != 0 {
		t.Fatalf("пустой вход: %v %v", p, s)
	}
}

func TestQuestionPoints(t *testing.T) {
	if got := QuestionPoints(2.5, 5); got != 0.5 {
		t.Fatalf("%v", got)
	}
}

func TestSkillLevel(t *testing.T) {
	for percent, want := range map[float64]int16{0: 1, 39.99: 1, 40: 2, 54.99: 2, 55: 3, 69.99: 3, 70: 4, 84.99: 4, 85: 5, 100: 5} {
		if got := SkillLevel(percent); got != want {
			t.Errorf("SkillLevel(%v) = %d, ожидали %d", percent, got, want)
		}
	}
}

func TestCheckRetake(t *testing.T) {
	now := time.Date(2026, 10, 14, 12, 0, 0, 0, time.UTC)
	finished := now.Add(-7 * 24 * time.Hour)
	if ok, _ := CheckRetake(now, &finished, 7); !ok {
		t.Error("ровно через 7 суток должно быть можно")
	}
	finished = now.Add(-7*24*time.Hour + time.Second)
	ok, retry := CheckRetake(now, &finished, 7)
	if ok || !retry.Equal(finished.Add(7*24*time.Hour)) {
		t.Errorf("за секунду до срока: %v %v", ok, retry)
	}
	if ok, _ := CheckRetake(now, nil, 7); !ok {
		t.Error("без прошлых попыток можно")
	}
}

func TestConfirmed(t *testing.T) {
	for _, tc := range []struct {
		current, target int16
		want            bool
	}{{2, 2, true}, {3, 2, true}, {2, 3, false}} {
		if got := Confirmed(tc.current, tc.target); got != tc.want {
			t.Errorf("Confirmed(%d,%d) = %v", tc.current, tc.target, got)
		}
	}
}

func TestAttemptErrorsMatchSentinels(t *testing.T) {
	if !errors.Is(&ActiveError{AttemptID: "x"}, ErrAttemptActive) || !errors.Is(&RetakeError{}, ErrRetakeCooldown) {
		t.Fatal("типизированные ошибки должны совпадать с признаками")
	}
}
