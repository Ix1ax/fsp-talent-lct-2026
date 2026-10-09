package entity

import (
	"testing"
	"time"
)

func TestFiltersAndValidation(t *testing.T) {
	for _, tc := range []struct {
		query                string
		submissions, company bool
	}{
		{"status=reviewed", false, false}, {"status=open", true, false}, {"limit=101", false, false},
		{"company_id=nope", false, false}, {"status=all&status=open", false, false}, {"published_to=2026-02-30", false, false},
		{"candidate_id=00000000-0000-4000-8000-000000000001", true, false}, {"sort=score", false, false},
	} {
		if _, err := ParseFilter(tc.query, tc.submissions, tc.company); err == nil {
			t.Fatalf("Принят неверный фильтр: %+v", tc)
		}
	}
	f, err := ParseFilter("status=open&limit=1&offset=4&submitted=false&published_from=2026-10-09&grade_id=1", false, false)
	if err != nil || f.Limit != 1 || f.Offset != 4 || f.Submitted == nil || *f.Submitted || f.GradeID == nil {
		t.Fatalf("Фильтр: %+v %v", f, err)
	}
	now := time.Now()
	past := now.Add(-time.Hour)
	in := Input{Title: "  Задача  ", DeadlineAt: &past}
	if err := in.Validate(now); err == nil {
		t.Fatal("Принят прошлый deadline")
	}
	in.DeadlineAt = nil
	if err := in.Validate(now); err != nil || in.Title != "Задача" {
		t.Fatal(err)
	}
	zero := int16(0)
	review := ReviewInput{Score: &zero}
	if err := review.Validate(); err != nil {
		t.Fatal("Нулевая оценка валидна", err)
	}
	review = ReviewInput{}
	if err := review.Validate(); err == nil {
		t.Fatal("Принята пустая проверка")
	}
}
