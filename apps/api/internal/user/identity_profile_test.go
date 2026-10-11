package user

import (
	"strings"
	"testing"
)

func TestIdentityProfileNormalization(t *testing.T) {
	p, err := (IdentityProfile{Email: "  User@example.test ", DisplayName: " Иван Иванов "}).normalized()
	if err != nil || p.Email != "User@example.test" || p.DisplayName != "Иван Иванов" {
		t.Fatal(p, err)
	}
	for _, value := range []string{"Person <user@example.test>", "not-email", "x\x00@example.test", strings.Repeat("x", 255) + "@example.test"} {
		if _, err := (IdentityProfile{Email: value}).normalized(); err == nil {
			t.Fatal("Принята некорректная почта")
		}
	}
	for _, name := range []string{strings.Repeat("я", 201), "x\x00y", string([]byte{255})} {
		p, err := (IdentityProfile{Email: "user@example.test", DisplayName: name}).normalized()
		if err != nil || p.DisplayName != "" {
			t.Fatal("Необязательное имя сломало вход", p, err)
		}
	}
}

func TestDecodeIdentityImport(t *testing.T) {
	for _, input := range []string{`[{"id":"subject","email":"user@example.test","emailVerified":true,"firstName":"Иван","lastName":"Петров"}]`, `{"realm":"fsp","users":[{"id":"subject","email":"user@example.test","emailVerified":true,"firstName":"Иван","lastName":"Петров","credentials":[]}]}`} {
		users, err := DecodeIdentityImport(strings.NewReader(input))
		if err != nil || len(users) != 1 || users[0].Subject != "subject" || !users[0].EmailVerified {
			t.Fatal(users, err)
		}
	}
	for _, input := range []string{"null", "{}", `{"users":null}`, `[{"id":123}]`, `[{"id":"secret-profile"}] trailing`} {
		if _, err := DecodeIdentityImport(strings.NewReader(input)); err == nil || strings.Contains(err.Error(), "secret-profile") {
			t.Fatal("Некорректная выгрузка или данные в ошибке", err)
		}
	}
}
