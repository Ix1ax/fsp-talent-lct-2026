package entity

import "testing"

func TestFSPFilter(t *testing.T) {
	for _, raw := range []string{"true", "false"} {
		f, err := ParseFilter("has_fsp_achievements=" + raw)
		if err != nil || f.HasFSPAchievements == nil || *f.HasFSPAchievements != (raw == "true") {
			t.Fatalf("%s: %+v %v", raw, f, err)
		}
	}
	for _, raw := range []string{"", "1", "TRUE", "true&has_fsp_achievements=false"} {
		if _, err := ParseFilter("has_fsp_achievements=" + raw); err == nil {
			t.Fatalf("Принят некорректный фильтр %q", raw)
		}
	}
	f, err := ParseFilter("")
	if err != nil || f.HasFSPAchievements != nil {
		t.Fatal("Неявный фильтр достижений")
	}
}
