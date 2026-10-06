package entity

import (
	"errors"
	"strings"
	"testing"
)

func TestContactsInputNormalize(t *testing.T) {
	in := ContactsInput{FullName: "  Иван Иванов ", Email: " ivan@example.test ", Phone: str(" +7 (900) 123-45-67 "), Telegram: str("@ivan_dev")}
	if err := in.Normalize(); err != nil {
		t.Fatal(err)
	}
	if in.FullName != "Иван Иванов" || in.Email != "ivan@example.test" || *in.Phone != "+7 (900) 123-45-67" || *in.Telegram != "ivan_dev" {
		t.Fatalf("нормализация: %+v", in)
	}
	empty := ContactsInput{FullName: "Иван", Email: "ivan@example.test", Phone: str("  "), Telegram: str("")}
	if err := empty.Normalize(); err != nil || empty.Phone != nil || empty.Telegram != nil {
		t.Fatalf("пустые необязательные поля должны стать nil: %+v %v", empty, err)
	}
	long := strings.Repeat("я", 201)
	for name, in := range map[string]ContactsInput{
		"пустое ФИО":                     {FullName: " ", Email: "a@b.ru"},
		"ФИО 201 символ":                 {FullName: long, Email: "a@b.ru"},
		"ФИО с нулевым символом":         {FullName: "И\x00ван", Email: "a@b.ru"},
		"пустой email":                   {FullName: "Иван"},
		"email с именем":                 {FullName: "Иван", Email: `"A" <a@b.ru>`},
		"email без @":                    {FullName: "Иван", Email: "ivan.example.test"},
		"email длиннее 254":              {FullName: "Иван", Email: strings.Repeat("a", 250) + "@b.ru"},
		"телефон короче 5":               {FullName: "Иван", Email: "a@b.ru", Phone: str("1234")},
		"телефон длиннее 20":             {FullName: "Иван", Email: "a@b.ru", Phone: str("+7 (900) 123-45-67-890")},
		"телефон с буквами":              {FullName: "Иван", Email: "a@b.ru", Phone: str("8900abc4567")},
		"telegram с двумя @":             {FullName: "Иван", Email: "a@b.ru", Telegram: str("@@ivan_dev")},
		"telegram короче 5":              {FullName: "Иван", Email: "a@b.ru", Telegram: str("@iv")},
		"telegram длиннее 32":            {FullName: "Иван", Email: "a@b.ru", Telegram: str(strings.Repeat("a", 33))},
		"telegram с недопустимым знаком": {FullName: "Иван", Email: "a@b.ru", Telegram: str("ivan-dev")},
	} {
		in := in
		var v *ValidationError
		if err := in.Normalize(); !errors.As(err, &v) || v.Message == "" {
			t.Fatalf("%s: ожидали ValidationError, получили %v", name, err)
		}
	}
}
