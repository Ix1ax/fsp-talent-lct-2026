package entity

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func str(s string) *string { return &s }
func num(n int64) *int64   { return &n }

func TestProfileInputNormalize(t *testing.T) {
	in := ProfileInput{}
	if err := in.Normalize(); err != nil {
		t.Fatal(err)
	}
	if in.SearchStatus != "hidden" || in.ExperienceMonths != 0 || in.WorkFormatIDs == nil || len(in.WorkFormatIDs) != 0 {
		t.Fatalf("значения по умолчанию: %+v", in)
	}
	blank := ProfileInput{Headline: str("  "), City: str(" Москва ")}
	if err := blank.Normalize(); err != nil || blank.Headline != nil || *blank.City != "Москва" {
		t.Fatalf("пустая строка должна стать nil, пробелы обрезаться: %+v %v", blank, err)
	}
	for name, in := range map[string]ProfileInput{
		"заголовок 201 символ": {Headline: str(strings.Repeat("я", 201))},
		"о себе 10001 символ":  {Summary: str(strings.Repeat("я", 10001))},
		"город 201 символ":     {City: str(strings.Repeat("я", 201))},
		"пояс Local":           {Timezone: str("Local")},
		"неизвестный пояс":     {Timezone: str("Mars/Base")},
		"стаж меньше нуля":     {ExperienceMonths: -1},
		"стаж больше 600":      {ExperienceMonths: 601},
		"плата меньше нуля":    {SalaryMinRUB: num(-1)},
		"плата больше лимита":  {SalaryMinRUB: num(1_000_000_001)},
		"статус public":        {SearchStatus: "public"},
		"нулевой символ":       {Summary: str("a\x00b")},
		"дубль формата":        {WorkFormatIDs: []int16{1, 1}},
		"нулевой формат":       {WorkFormatIDs: []int16{0}},
		"11 форматов":          {WorkFormatIDs: []int16{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}},
	} {
		in := in
		err := in.Normalize()
		var v *ValidationError
		if !errors.As(err, &v) || v.Message == "" {
			t.Fatalf("%s: ожидали ValidationError, получили %v", name, err)
		}
	}
	ok := ProfileInput{Timezone: str("Europe/Moscow"), ExperienceMonths: 600, SalaryMinRUB: num(1_000_000_000), SearchStatus: "open", WorkFormatIDs: []int16{1, 3}}
	if err := ok.Normalize(); err != nil {
		t.Fatalf("допустимые границы отвергнуты: %v", err)
	}
}

func TestPatchApply(t *testing.T) {
	current := Profile{ProfileInput: ProfileInput{Headline: str("Go"), Summary: str("О себе"), City: str("Казань"), Timezone: str("Europe/Moscow"), ExperienceMonths: 24, SalaryMinRUB: num(100000), SearchStatus: "open", WorkFormatIDs: []int16{1, 2}}}
	apply := func(body string) (ProfileInput, error) {
		var p Patch
		if err := json.Unmarshal([]byte(body), &p); err != nil {
			t.Fatal(err)
		}
		return p.Apply(current)
	}
	in, err := apply(`{"city":"Самара"}`)
	if err != nil || *in.City != "Самара" || *in.Headline != "Go" || in.ExperienceMonths != 24 || len(in.WorkFormatIDs) != 2 {
		t.Fatalf("отсутствующие поля должны сохраниться: %+v %v", in, err)
	}
	in, err = apply(`{"headline":null,"summary":null,"city":null,"timezone":null,"salary_min_rub":null}`)
	if err != nil || in.Headline != nil || in.Summary != nil || in.City != nil || in.Timezone != nil || in.SalaryMinRUB != nil {
		t.Fatalf("null должен очищать необязательные поля: %+v %v", in, err)
	}
	in, err = apply(`{"work_format_ids":[]}`)
	if err != nil || in.WorkFormatIDs == nil || len(in.WorkFormatIDs) != 0 {
		t.Fatalf("пустой список очищает форматы: %+v %v", in, err)
	}
	in, err = apply(`{"work_format_ids":[2,3]}`)
	if err != nil || len(in.WorkFormatIDs) != 2 || in.WorkFormatIDs[0] != 2 || in.WorkFormatIDs[1] != 3 {
		t.Fatalf("непустой список заменяет набор: %+v %v", in, err)
	}
	for _, body := range []string{`{}`, `{"experience_months":null}`, `{"search_status":null}`, `{"search_status":"public"}`, `{"user_id":"x"}`, `{"id":"x"}`, `{"avatar_file_id":"x"}`, `{"updated_at":"x"}`, `{"city":5}`, `{"experience_months":"много"}`} {
		var v *ValidationError
		if _, err := apply(body); !errors.As(err, &v) {
			t.Fatalf("%s: ожидали ValidationError, получили %v", body, err)
		}
	}
}
