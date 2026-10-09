package entity

import "testing"

func TestFilterAndDecisionValidation(t *testing.T) {
	for _, tc := range []struct{ kind, query string }{
		{"users", "q=anything"}, {"companies", "status=active"}, {"tasks", "status=open"},
		{"offers", "candidate_id=bad"}, {"audit", "source=secret"}, {"audit", "from=2026-10-10T00:00:00Z&to=2026-10-09T00:00:00Z"},
		{"companies", "limit=1&limit=2"}, {"files", "status=ready"}, {"needs", "grade_id=-1"}, {"companies", "q=%00"},
	} {
		if _, err := ParseFilter(tc.query, tc.kind); err == nil {
			t.Fatalf("Принят фильтр %+v", tc)
		}
	}
	f, err := ParseFilter("source=catalogs&entity_id=1&limit=10", "audit")
	if err != nil || f.EntityID == nil || *f.EntityID != "1" {
		t.Fatal(f, err)
	}
	one := 1
	in := Decision{Status: "verified", ExpectedVersion: &one}
	if err := in.Validate(); err != nil {
		t.Fatal(err)
	}
	for _, in := range []Decision{{Status: "verified"}, {Status: "pending", ExpectedVersion: &one}, {Status: "rejected", ExpectedVersion: &one}} {
		if err := in.Validate(); err == nil {
			t.Fatal(in)
		}
	}
	block := StatusInput{Status: "blocked", Reason: "  нарушение  "}
	if err := block.Validate("user"); err != nil || block.Reason != "нарушение" {
		t.Fatal(err)
	}
	if err := block.Validate("task"); err == nil {
		t.Fatal("Статус пользователя принят для задания")
	}
	if err := block.Validate("company"); err != nil {
		t.Fatal(err)
	}
	if _, err := ParseFilter("status=verified&access_status=blocked", "companies"); err != nil {
		t.Fatal(err)
	}
	for _, query := range []string{"access_status=deleted", "access_status=blocked&access_status=active", "access_status="} {
		if _, err := ParseFilter(query, "companies"); err == nil {
			t.Fatal("Принят неверный access_status", query)
		}
	}
}
