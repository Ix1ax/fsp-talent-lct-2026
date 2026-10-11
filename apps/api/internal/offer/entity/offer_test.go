package entity

import (
	"errors"
	"strings"
	"testing"
	"time"
)

const candidateID = "00000000-0000-4000-8000-000000000001"

func amount(n int64) *int64 { return &n }
func text(s string) *string { return &s }
func validInput() Input {
	return Input{CandidateID: candidateID, Title: "Go-разработчик", Description: "Разработка сервисов в продуктовой команде", SalaryFromRUB: amount(150000), SalaryToRUB: amount(250000), ContactEmail: "hr@example.test"}
}

func TestOfferExpirationBoundary(t *testing.T) {
	created := time.Date(2026, 10, 1, 12, 0, 0, 0, time.UTC)
	for _, status := range []string{StatusSent, StatusViewed, StatusAccepted, StatusRejected} {
		for _, age := range []time.Duration{Lifetime - time.Nanosecond, Lifetime, Lifetime + time.Nanosecond} {
			want := status
			if (status == StatusSent || status == StatusViewed) && age >= Lifetime {
				want = StatusExpired
			}
			if got := EffectiveStatus(status, created, created.Add(age)); got != want {
				t.Fatalf("%s, age=%s: got %s, want %s", status, age, got, want)
			}
		}
	}
	for _, decision := range []string{StatusAccepted, StatusRejected} {
		if !errors.Is(ValidateResponse(StatusExpired, decision), ErrExpired) {
			t.Fatal("На истёкшее предложение нельзя ответить")
		}
	}
}

func TestOfferInput(t *testing.T) {
	cases := []struct {
		name   string
		change func(*Input)
		valid  bool
	}{
		{"без потребности", func(*Input) {}, true},
		{"с потребностью", func(in *Input) { in.NeedID = text(candidateID) }, true},
		{"нет кандидата", func(in *Input) { in.CandidateID = "" }, false},
		{"UUID кандидата", func(in *Input) { in.CandidateID = "other-user" }, false},
		{"UUID потребности", func(in *Input) { in.NeedID = text("bad") }, false},
		{"нет названия", func(in *Input) { in.Title = "  " }, false},
		{"длинное название", func(in *Input) { in.Title = strings.Repeat("я", 201) }, false},
		{"нет описания", func(in *Input) { in.Description = "" }, false},
		{"длинное описание", func(in *Input) { in.Description = strings.Repeat("я", 10001) }, false},
		{"нет зарплаты от", func(in *Input) { in.SalaryFromRUB = nil }, false},
		{"нет зарплаты до", func(in *Input) { in.SalaryToRUB = nil }, false},
		{"нулевая зарплата", func(in *Input) { in.SalaryFromRUB = amount(0) }, false},
		{"отрицательная зарплата", func(in *Input) { in.SalaryToRUB = amount(-1) }, false},
		{"слишком большая зарплата", func(in *Input) { in.SalaryToRUB = amount(1_000_000_001) }, false},
		{"обратная вилка", func(in *Input) { in.SalaryFromRUB = amount(300000) }, false},
		{"фиксированная зарплата", func(in *Input) { in.SalaryToRUB = amount(150000) }, true},
		{"нет контакта", func(in *Input) { in.ContactEmail = "" }, false},
		{"имя в email", func(in *Input) { in.ContactEmail = "HR <hr@example.test>" }, false},
		{"контактная ссылка", func(in *Input) { in.ContactURL = text("https://example.test/contact") }, true},
		{"опасная схема", func(in *Input) { in.ContactURL = text("javascript:alert(1)") }, false},
		{"пароль в ссылке", func(in *Input) { in.ContactURL = text("https://user:password@example.test") }, false},
		{"нет хоста", func(in *Input) { in.ContactURL = text("https:///contact") }, false},
		{"нулевой символ", func(in *Input) { in.Description = "Описание\x00" }, false},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			in := validInput()
			tt.change(&in)
			err := in.Normalize()
			if (err == nil) != tt.valid {
				t.Fatalf("валидация: %v", err)
			}
			if err != nil {
				var validation *ValidationError
				if !errors.As(err, &validation) {
					t.Fatalf("не ошибка валидации: %v", err)
				}
			}
		})
	}
}

func TestOfferNormalization(t *testing.T) {
	in := validInput()
	in.CandidateID = "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA"
	in.Title = "  Go-разработчик  "
	in.ContactEmail = " hr@example.test "
	in.ContactURL = text("  ")
	if err := in.Normalize(); err != nil {
		t.Fatal(err)
	}
	if in.CandidateID != "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" || in.Title != "Go-разработчик" || in.ContactEmail != "hr@example.test" || in.ContactURL != nil {
		t.Fatalf("нормализация: %+v", in)
	}
}

func TestResponseTransitions(t *testing.T) {
	for _, current := range []string{StatusSent, StatusViewed, StatusAccepted, StatusRejected} {
		for _, decision := range []string{StatusAccepted, StatusRejected} {
			err := ValidateResponse(current, decision)
			terminal := current == StatusAccepted || current == StatusRejected
			if terminal && current != decision {
				if !errors.Is(err, ErrResponseConflict) {
					t.Fatalf("%s -> %s: %v", current, decision, err)
				}
			} else if err != nil {
				t.Fatalf("%s -> %s: %v", current, decision, err)
			}
		}
	}
	if ValidateResponse(StatusSent, StatusViewed) == nil || ValidateResponse("unknown", StatusAccepted) == nil {
		t.Fatal("Недопустимый переход принят")
	}
}
