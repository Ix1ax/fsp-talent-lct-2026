package entity

import "testing"

func TestParseFilter(t *testing.T) {
	f, err := ParseFilter("work_format_ids=1,3&experience_min_months=0&experience_max_months=600&salary_max_rub=0&limit=100&offset=10000")
	if err != nil || f.Limit != 100 || f.Offset != 10000 || len(f.WorkFormatIDs) != 2 || *f.SalaryMaxRUB != 0 || *f.ExperienceMinMonths != 0 {
		t.Fatalf("Неверный фильтр: %+v, %v", f, err)
	}
	f, err = ParseFilter("")
	if err != nil || f.Limit != 20 || f.SalaryMaxRUB != nil || f.ExperienceMinMonths != nil {
		t.Fatal("Необязательные условия не должны появляться по умолчанию")
	}
	for _, query := range []string{"limit=0", "limit=101", "offset=-1", "offset=10001", "salary_max_rub=1000000001", "salary_max_rub=-1", "salary_max_rub=abc", "experience_min_months=601", "experience_min_months=20&experience_max_months=10", "work_format_ids=1,1", "work_format_ids=0", "work_format_ids=32768", "work_format_ids=1,", "work_format_ids=1&work_format_ids=2", "limit=", "grade=middle", "limit=1;offset=2", "offset=%zz", "work_format_ids=1,2,3,4,5,6,7,8,9,10,11"} {
		if _, err := ParseFilter(query); err == nil {
			t.Errorf("Принят некорректный фильтр: %s", query)
		}
	}
}

func TestQualificationFilter(t *testing.T) {
	f, err := ParseFilter("specialization_id=1&grade_id=2&skill_id=3fa85f64-5717-4562-b3fc-2c963f66afa6&verified_skill_only=true")
	if err != nil || *f.SpecializationID != 1 || *f.GradeID != 2 || !f.VerifiedSkillOnly || f.SkillID == nil {
		t.Fatalf("Неверный фильтр: %+v, %v", f, err)
	}
	for _, q := range []string{"specialization_id=0", "grade_id=32768", "grade_id=1&grade_id=2", "skill_id=wrong", "verified_skill_only=true", "skill_id=3fa85f64-5717-4562-b3fc-2c963f66afa6&verified_skill_only=1"} {
		if _, err := ParseFilter(q); err == nil {
			t.Errorf("Принят некорректный фильтр: %s", q)
		}
	}
}
