package entity

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
	"time"
)

func month(t *testing.T, s string) Month {
	t.Helper()
	m, err := ParseMonth(s)
	if err != nil {
		t.Fatal(err)
	}
	return m
}

func TestParseMonth(t *testing.T) {
	m, err := ParseMonth("2024-05")
	if err != nil || m.String() != "2024-05" || !m.Time().Equal(time.Date(2024, 5, 1, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("2024-05: %v %v", m, err)
	}
	var v *ValidationError
	for _, bad := range []string{"2024-5", "2024-13", "2024-00", "24-05", "", "2024-05-01", "2024/05", " 2024-05"} {
		if _, err := ParseMonth(bad); !errors.As(err, &v) {
			t.Errorf("%q принят или не ValidationError: %v", bad, err)
		}
	}
}

func TestMonthJSON(t *testing.T) {
	var in struct {
		Started Month  `json:"started"`
		Ended   *Month `json:"ended"`
	}
	if err := json.Unmarshal([]byte(`{"started":"2022-11","ended":null}`), &in); err != nil || in.Started.String() != "2022-11" || in.Ended != nil {
		t.Fatalf("разбор: %+v %v", in, err)
	}
	raw, err := json.Marshal(struct {
		Started Month  `json:"started"`
		Ended   *Month `json:"ended"`
	}{in.Started, nil})
	if err != nil || string(raw) != `{"started":"2022-11","ended":null}` {
		t.Fatalf("запись: %s %v", raw, err)
	}
	for _, bad := range []string{`{"started":"2022-13"}`, `{"started":5}`, `{"started":"2022-1"}`} {
		if err := json.Unmarshal([]byte(bad), &in); err == nil {
			t.Errorf("%s принят", bad)
		}
	}
}

func TestExperienceNormalize(t *testing.T) {
	now := time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)
	ok := func() ExperienceInput {
		return ExperienceInput{Company: "  Компания ", Position: "Разработчик", StartedOn: month(t, "2022-11"), Description: ""}
	}
	in := ok()
	if err := in.Normalize(now); err != nil || in.Company != "Компания" {
		t.Fatalf("обрезка: %+v %v", in, err)
	}
	end := month(t, "2026-10")
	in = ok()
	in.EndedOn = &end
	if err := in.Normalize(now); err != nil {
		t.Fatalf("текущий месяц допустим: %v", err)
	}
	early, future := month(t, "2022-10"), month(t, "2026-11")
	var v *ValidationError
	for name, mutate := range map[string]func(*ExperienceInput){
		"пустая компания":     func(i *ExperienceInput) { i.Company = "   " },
		"пустая должность":    func(i *ExperienceInput) { i.Position = "" },
		"длинная компания":    func(i *ExperienceInput) { i.Company = strings.Repeat("я", 201) },
		"длинная должность":   func(i *ExperienceInput) { i.Position = strings.Repeat("я", 201) },
		"длинное описание":    func(i *ExperienceInput) { i.Description = strings.Repeat("я", 2001) },
		"NUL":                 func(i *ExperienceInput) { i.Description = "a\x00b" },
		"конец раньше начала": func(i *ExperienceInput) { i.EndedOn = &early },
		"будущее начало":      func(i *ExperienceInput) { i.StartedOn = future },
		"будущий конец":       func(i *ExperienceInput) { i.EndedOn = &future },
	} {
		in := ok()
		mutate(&in)
		if err := in.Normalize(now); !errors.As(err, &v) {
			t.Errorf("%s: %v", name, err)
		}
	}
	in = ok()
	in.Description = strings.Repeat("я", 2000)
	if err := in.Normalize(now); err != nil {
		t.Errorf("описание ровно 2000 символов: %v", err)
	}
}

func TestEducationNormalize(t *testing.T) {
	ok := func() EducationInput {
		return EducationInput{Level: "higher", Institution: "  Университет ", Specialty: "", GraduationYear: 2027}
	}
	in := ok()
	if err := in.Normalize(); err != nil || in.Institution != "Университет" {
		t.Fatalf("обрезка и будущий год: %+v %v", in, err)
	}
	for _, level := range []string{"secondary", "vocational", "incomplete_higher", "higher", "bachelor", "master", "phd", "doctor"} {
		in := ok()
		in.Level = level
		if err := in.Normalize(); err != nil {
			t.Errorf("уровень %s: %v", level, err)
		}
	}
	var v *ValidationError
	for name, mutate := range map[string]func(*EducationInput){
		"неизвестный уровень":   func(i *EducationInput) { i.Level = "bogus" },
		"год 1949":              func(i *EducationInput) { i.GraduationYear = 1949 },
		"год 2101":              func(i *EducationInput) { i.GraduationYear = 2101 },
		"пустое заведение":      func(i *EducationInput) { i.Institution = " " },
		"длинное заведение":     func(i *EducationInput) { i.Institution = strings.Repeat("я", 201) },
		"длинная специальность": func(i *EducationInput) { i.Specialty = strings.Repeat("я", 201) },
		"NUL": func(i *EducationInput) { i.Specialty = "a\x00" },
	} {
		in := ok()
		mutate(&in)
		if err := in.Normalize(); !errors.As(err, &v) {
			t.Errorf("%s: %v", name, err)
		}
	}
}

func TestEstimateExperienceMonths(t *testing.T) {
	now := time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)
	period := func(from, to string) Experience {
		e := Experience{}
		e.StartedOn = month(t, from)
		if to != "" {
			end := month(t, to)
			e.EndedOn = &end
		}
		return e
	}
	for name, tc := range map[string]struct {
		items []Experience
		want  int
	}{
		"пусто": {nil, 0},
		"один период включительно": {[]Experience{period("2022-11", "2023-01")}, 3},
		"один месяц":               {[]Experience{period("2022-11", "2022-11")}, 1},
		"пересечение":              {[]Experience{period("2020-01", "2020-12"), period("2020-07", "2021-06")}, 18},
		"вложенный период":         {[]Experience{period("2020-01", "2021-12"), period("2020-06", "2020-08")}, 24},
		"разрыв":                   {[]Experience{period("2020-01", "2020-03"), period("2020-06", "2020-08")}, 6},
		"текущая работа":           {[]Experience{period("2026-08", "")}, 3},
		"потолок":                  {[]Experience{period("1960-01", "")}, 600},
	} {
		if got := EstimateExperienceMonths(tc.items, now); got != tc.want {
			t.Errorf("%s: %d, ожидали %d", name, got, tc.want)
		}
	}
}
