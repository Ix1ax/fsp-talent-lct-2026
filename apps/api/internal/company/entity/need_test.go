package entity

import (
	"encoding/json"
	"testing"
)

const goSkillID = "00000000-0000-4000-8000-000000000001"

func baseNeed() NeedInput {
	return NeedInput{SpecializationID: 1, Title: "Go-разработчик", Description: "Разработка сервиса", Status: "active", Skills: []NeedSkill{{SkillID: goSkillID, Required: true, Weight: 1}}, WorkFormatIDs: []int16{3}}
}
func TestNeedValidation(t *testing.T) {
	cases := []struct {
		name   string
		change func(*NeedInput)
		valid  bool
	}{
		{"основа", func(n *NeedInput) {}, true},
		{"черновик", func(n *NeedInput) { n.Status = ""; n.Skills = nil; n.WorkFormatIDs = nil }, true},
		{"без навыков", func(n *NeedInput) { n.Skills = nil }, false},
		{"без формата", func(n *NeedInput) { n.WorkFormatIDs = nil }, false},
		{"дубликат", func(n *NeedInput) { n.Skills = append(n.Skills, n.Skills[0]) }, false},
		{"uuid", func(n *NeedInput) { n.Skills[0].SkillID = "bad" }, false},
		{"вес", func(n *NeedInput) { n.Skills[0].Weight = 0 }, false},
		{"точность", func(n *NeedInput) { n.Skills[0].Weight = 0.001 }, false},
		{"статус", func(n *NeedInput) { n.Status = "published" }, false},
		{"таймзона", func(n *NeedInput) { n.Timezone = str("Mars/Olympus") }, false},
		{"таймзона IANA", func(n *NeedInput) { n.Timezone = str("Europe/Moscow") }, true},
		{"зарплата", func(n *NeedInput) { from, to := int64(200), int64(100); n.SalaryFromRUB = &from; n.SalaryToRUB = &to }, false},
	}
	for _, tt := range cases {
		t.Run(tt.name, func(t *testing.T) {
			n := baseNeed()
			tt.change(&n)
			if err := n.Normalize(); (err == nil) != tt.valid {
				t.Fatalf("валидация: %v", err)
			}
		})
	}
}
func TestNeedPatch(t *testing.T) {
	n := Need{NeedInput: baseNeed()}
	n.City = str("Москва")
	var patch map[string]json.RawMessage
	if err := json.Unmarshal([]byte(`{"city":null,"title":"Новое название"}`), &patch); err != nil {
		t.Fatal(err)
	}
	in, err := ApplyNeedPatch(n, patch)
	if err != nil || in.City != nil || in.Description != n.Description || in.Title != "Новое название" {
		t.Fatalf("PATCH: %+v %v", in, err)
	}
	for _, body := range []string{`{}`, `{"company_id":"foreign"}`, `{"created_by":"foreign"}`, `{"skills":null}`, `{"title":null}`, `{"skills":[]}`, `{"status":""}`} {
		patch = nil
		if err := json.Unmarshal([]byte(body), &patch); err != nil {
			t.Fatal(err)
		}
		if _, err := ApplyNeedPatch(n, patch); err == nil {
			t.Fatalf("недопустимый PATCH: %s", body)
		}
	}
}
