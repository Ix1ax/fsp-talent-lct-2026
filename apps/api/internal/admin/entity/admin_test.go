package entity

import (
	"strings"
	"testing"
)

func TestCredentialsValidation(t *testing.T) {
	email, err := NormalizeEmail(" Root@Example.test ")
	if err != nil || email != "root@example.test" {
		t.Fatal("Почта не нормализована")
	}
	for _, value := range []string{"no-email", "Name <root@example.test>", ""} {
		if _, err := NormalizeEmail(value); err == nil {
			t.Errorf("Принята почта %q", value)
		}
	}
	for _, value := range []string{"short", strings.Repeat("a", 73), strings.Repeat("я", 37)} {
		if ValidatePassword(value) == nil {
			t.Error("Принят недопустимый пароль")
		}
	}
	if err := ValidatePassword("Valid-Password-2026"); err != nil {
		t.Fatal(err)
	}
}
