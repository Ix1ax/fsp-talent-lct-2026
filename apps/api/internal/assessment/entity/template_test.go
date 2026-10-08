package entity

import "testing"

func validTemplate() TemplateInput {
	return TemplateInput{StackSkillID: "00000000-0000-4000-8000-000000000001", SpecializationID: 1, GradeID: 2, TimeLimitSec: 1800, PassScore: 60, Blueprint: []BlueprintRow{
		{SkillID: "00000000-0000-4000-8000-000000000001", Difficulty: 1, QuestionCount: 4, Weight: 1},
		{SkillID: "00000000-0000-4000-8000-000000000001", Difficulty: 2, QuestionCount: 2, Weight: 2.5},
	}}
}

func TestTemplateInputNormalize(t *testing.T) {
	in := validTemplate()
	in.Blueprint[0].SkillID = "00000000-0000-4000-8000-00000000AB01"
	if err := in.Normalize(); err != nil || in.Blueprint[0].SkillID != "00000000-0000-4000-8000-00000000ab01" {
		t.Fatalf("допустимый шаблон: %+v %v", in, err)
	}
	for name, mutate := range map[string]func(*TemplateInput){
		"время 299":            func(t *TemplateInput) { t.TimeLimitSec = 299 },
		"время 14401":          func(t *TemplateInput) { t.TimeLimitSec = 14401 },
		"балл 0":               func(t *TemplateInput) { t.PassScore = 0 },
		"балл 101":             func(t *TemplateInput) { t.PassScore = 101 },
		"балл с тремя знаками": func(t *TemplateInput) { t.PassScore = 60.005 },
		"специализация 0":      func(t *TemplateInput) { t.SpecializationID = 0 },
		"грейд 0":              func(t *TemplateInput) { t.GradeID = 0 },
		"пустой состав":        func(t *TemplateInput) { t.Blueprint = nil },
		"31 строка":            func(t *TemplateInput) { t.Blueprint = manyRows(31) },
		"повтор навыка и сложности": func(t *TemplateInput) { t.Blueprint[1] = t.Blueprint[0] },
		"количество 0":              func(t *TemplateInput) { t.Blueprint[0].QuestionCount = 0 },
		"количество 51":             func(t *TemplateInput) { t.Blueprint[0].QuestionCount = 51 },
		"вес 0":                     func(t *TemplateInput) { t.Blueprint[0].Weight = 0 },
		"вес 101":                   func(t *TemplateInput) { t.Blueprint[0].Weight = 101 },
		"вес 1.005":                 func(t *TemplateInput) { t.Blueprint[0].Weight = 1.005 },
		"сложность 0":               func(t *TemplateInput) { t.Blueprint[0].Difficulty = 0 },
		"сложность 6":               func(t *TemplateInput) { t.Blueprint[0].Difficulty = 6 },
		"плохой UUID навыка":        func(t *TemplateInput) { t.Blueprint[0].SkillID = "abc" },
	} {
		in := validTemplate()
		mutate(&in)
		if err := in.Normalize(); !isInvalid(err) {
			t.Fatalf("%s: ожидали ValidationError, получили %v", name, err)
		}
	}
	edge := validTemplate()
	edge.TimeLimitSec, edge.PassScore = 300, 1
	edge.Blueprint = manyRows(30)
	if err := edge.Normalize(); err != nil {
		t.Fatalf("граничные значения: %v", err)
	}
}

func manyRows(n int) []BlueprintRow {
	rows := make([]BlueprintRow, n)
	for i := range rows {
		rows[i] = BlueprintRow{SkillID: "00000000-0000-4000-8000-0000000000" + string(rune('0'+i/10)) + string(rune('0'+i%10)), Difficulty: 1, QuestionCount: 1, Weight: 1}
	}
	return rows
}

func TestInsufficientError(t *testing.T) {
	err := &InsufficientError{Items: []Shortage{{SkillID: "s", Difficulty: 1, Required: 4, Available: 2}}}
	if err.Error() == "" || len(err.Items) != 1 {
		t.Fatalf("сообщение об ошибке пустое: %+v", err)
	}
}
