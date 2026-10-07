package entity

import "testing"

func TestCatalogValidation(t *testing.T) {
	rank := int16(5)
	active := false
	cases := []struct {
		kind  string
		input CreateInput
		ok    bool
	}{
		{"skills", CreateInput{Code: "new_skill", Name: " Навык ", Aliases: []string{"Go", "go"}}, true},
		{"grades", CreateInput{Code: "lead", Name: "Lead", Rank: &rank}, true},
		{"grades", CreateInput{Code: "lead", Name: "Lead"}, false},
		{"work_formats", CreateInput{Code: "bad code", Name: "Формат"}, false},
		{"roles", CreateInput{Code: "admin", Name: "Админ"}, false},
		{"specializations", CreateInput{Code: "design", Name: "Дизайн", Aliases: []string{}}, false},
	}
	for _, tc := range cases {
		_, err := NormalizeCreate(tc.kind, tc.input)
		if (err == nil) != tc.ok {
			t.Errorf("%s: %v", tc.kind, err)
		}
	}
	in, err := NormalizeCreate("skills", cases[0].input)
	if err != nil || in.Name != "Навык" || len(in.Aliases) != 1 {
		t.Fatalf("Нормализация: %+v %v", in, err)
	}
	if _, err := NormalizeUpdate("grades", UpdateInput{Name: "Senior", Active: &active}); err == nil {
		t.Fatal("Отключение грейда должно быть запрещено")
	}
	if _, err := NormalizeUpdate("skills", UpdateInput{Name: "Go", Aliases: []string{}}); err != nil {
		t.Fatal(err)
	}
}
