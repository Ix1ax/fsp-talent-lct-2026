package entity

import "testing"

func TestInteractionFilters(t *testing.T) {
	f, err := ParseFilter("")
	if err != nil || f.InteractionStatus != "available" || f.Viewed != nil {
		t.Fatalf("Неверный поиск по умолчанию: %+v, %v", f, err)
	}
	for _, status := range []string{"available", "cooldown", "all"} {
		f, err := ParseFilter("interaction_status=" + status + "&viewed=true&has_offer=false")
		if err != nil || f.InteractionStatus != status || f.Viewed == nil || !*f.Viewed || f.HasOffer == nil || *f.HasOffer {
			t.Fatalf("Неверный фильтр истории: %+v, %v", f, err)
		}
	}
	f, err = ParseFilter("viewed=false")
	if err != nil || f.Viewed == nil || *f.Viewed {
		t.Fatalf("Неверный фильтр новых кандидатов: %+v, %v", f, err)
	}
	for _, query := range []string{"viewed=", "viewed=1", "viewed=TRUE", "viewed=true&viewed=false", "interaction_status=", "interaction_status=recent", "interaction_status=all&interaction_status=available"} {
		if _, err := ParseFilter(query); err == nil {
			t.Fatalf("Принят неверный фильтр: %s", query)
		}
	}
}
