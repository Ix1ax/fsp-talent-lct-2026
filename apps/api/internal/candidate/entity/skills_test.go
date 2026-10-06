package entity

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestConfidence(t *testing.T) {
	for source, want := range map[string]float64{SourceClaimed: 0.3, SourceTest: 0.8, SourceFSP: 1.0, "": 0, "other": 0} {
		if got := Confidence(source); got != want {
			t.Fatalf("Confidence(%q) = %v, ожидали %v", source, got, want)
		}
	}
}

func TestSkillInputNormalize(t *testing.T) {
	level := func(n int16) *int16 { return &n }
	for _, n := range []int16{1, 2, 3, 4, 5} {
		in := SkillInput{ClaimedLevel: level(n)}
		if err := in.Normalize(); err != nil {
			t.Fatalf("уровень %d: %v", n, err)
		}
	}
	var v *ValidationError
	for name, in := range map[string]SkillInput{"нет уровня": {}, "ноль": {ClaimedLevel: level(0)}, "шесть": {ClaimedLevel: level(6)}, "минус один": {ClaimedLevel: level(-1)}} {
		if err := in.Normalize(); !errors.As(err, &v) || v.Message == "" {
			t.Fatalf("%s: ожидали ValidationError, получили %v", name, err)
		}
	}
}

// Уровень приходит из JSON: строка, дробь и null не должны давать допустимого значения.
func TestSkillInputJSON(t *testing.T) {
	var ok SkillInput
	if err := json.Unmarshal([]byte(`{"claimed_level":3}`), &ok); err != nil || ok.Normalize() != nil || *ok.ClaimedLevel != 3 {
		t.Fatalf("уровень 3: %+v %v", ok, err)
	}
	for _, body := range []string{`{"claimed_level":"3"}`, `{"claimed_level":3.5}`, `{"claimed_level":null}`, `{}`, `{"claimed_level":70000}`} {
		var in SkillInput
		if err := json.Unmarshal([]byte(body), &in); err == nil && in.Normalize() == nil {
			t.Fatalf("%s принят как допустимый уровень: %+v", body, in)
		}
	}
}

func TestNormalizeSkillID(t *testing.T) {
	got, err := NormalizeSkillID("00000000-0000-4000-8000-00000000AB01")
	if err != nil || got != "00000000-0000-4000-8000-00000000ab01" {
		t.Fatalf("UUID должен приводиться к нижнему регистру: %q %v", got, err)
	}
	var v *ValidationError
	for _, bad := range []string{"", "abc", "00000000-0000-4000-8000-00000000ab01x", " 00000000-0000-4000-8000-00000000ab01", "00000000000040008000000000000001"} {
		if _, err := NormalizeSkillID(bad); !errors.As(err, &v) {
			t.Fatalf("%q: ожидали ValidationError, получили %v", bad, err)
		}
	}
}
