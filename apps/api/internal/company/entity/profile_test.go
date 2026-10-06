package entity

import (
	"encoding/json"
	"testing"
)

func str(s string) *string { return &s }
func TestInputValidation(t *testing.T) {
	for _, tt := range []struct {
		name  string
		in    Input
		valid bool
	}{
		{"минимум", Input{Name: " Компания ", ContactEmail: "hr@example.test"}, true},
		{"ИНН", Input{Name: "Компания", ContactEmail: "hr@example.test", INN: str("7707083893")}, true},
		{"физлицо", Input{Name: "Компания", ContactEmail: "hr@example.test", INN: str("500100732259")}, true},
		{"неверная сумма", Input{Name: "Компания", ContactEmail: "hr@example.test", INN: str("7707083894")}, false},
		{"нули", Input{Name: "Компания", ContactEmail: "hr@example.test", INN: str("0000000000")}, false},
		{"имя", Input{Name: " ", ContactEmail: "hr@example.test"}, false},
		{"email", Input{Name: "Компания", ContactEmail: "Имя <hr@example.test>"}, false},
		{"ссылка", Input{Name: "Компания", ContactEmail: "hr@example.test", ContactURL: str("javascript:alert(1)")}, false},
		{"пароль в ссылке", Input{Name: "Компания", ContactEmail: "hr@example.test", ContactURL: str("https://user:pass@example.test")}, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.in.Normalize()
			if (err == nil) != tt.valid {
				t.Fatalf("результат валидации: %v", err)
			}
		})
	}
}
func TestPatch(t *testing.T) {
	current := Company{Name: "Компания", ContactEmail: "hr@example.test", Description: str("Описание")}
	var p Patch
	if err := json.Unmarshal([]byte(`{"description":null}`), &p); err != nil {
		t.Fatal(err)
	}
	got, err := p.Apply(current)
	if err != nil || got.Description != nil || got.Name != current.Name {
		t.Fatalf("очистка: %+v, %v", got, err)
	}
	for _, body := range []string{`{}`, `null`, `{"name":null}`, `{"name":true}`, `{"verification_status":"verified"}`, `{"logo_file_id":"foreign-file"}`, `{"owner_user_id":"foreign-user"}`} {
		var patch Patch
		if err := json.Unmarshal([]byte(body), &patch); err != nil {
			t.Fatal(err)
		}
		if _, err := patch.Apply(current); err == nil {
			t.Fatalf("разрешён недопустимый PATCH: %s", body)
		}
	}
}
