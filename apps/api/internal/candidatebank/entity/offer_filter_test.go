package entity

import "testing"

func TestHasOfferFilter(t *testing.T) {
	for _, raw := range []string{"true", "false"} {
		f, err := ParseFilter("has_offer=" + raw)
		if err != nil || f.HasOffer == nil || *f.HasOffer != (raw == "true") {
			t.Fatalf("%s: %+v %v", raw, f, err)
		}
	}
	for _, raw := range []string{"", "1", "TRUE", "true&has_offer=false"} {
		if _, err := ParseFilter("has_offer=" + raw); err == nil {
			t.Fatalf("Принят некорректный фильтр %q", raw)
		}
	}
	f, err := ParseFilter("")
	if err != nil || f.HasOffer != nil {
		t.Fatal("Без параметра должны возвращаться и приглашённые, и новые кандидаты")
	}
}
