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

func TestStatusInputValidation(t *testing.T) {
	const id = "11111111-1111-4111-8111-111111111111"
	for _, status := range []string{"active", "blocked"} {
		if got, err := NormalizeStatusID(id, StatusInput{Status: status}); err != nil || got != id {
			t.Fatalf("%s: %s %v", status, got, err)
		}
	}
	if _, err := NormalizeStatusID("not-a-uuid", StatusInput{Status: "active"}); err == nil {
		t.Fatal("принят неверный UUID")
	}
	for _, status := range []string{"", "deleted", "ACTIVE"} {
		if _, err := NormalizeStatusID(id, StatusInput{Status: status}); err == nil {
			t.Fatalf("принят статус %s", status)
		}
	}
}
