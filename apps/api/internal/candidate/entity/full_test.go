package entity

import "testing"

var wantCodes = []string{"consent_processing", "profile", "contacts", "skills", "work_formats", "consent_publication", "headline", "summary", "city", "salary", "avatar"}

func fullInput() ReadinessInput {
	avatar := "file-1"
	salary := int64(150000)
	return ReadinessInput{
		ProcessingConsent: true, PublicationConsent: true, HasContacts: true, SkillCount: 1,
		Profile: &Profile{ID: "p", AvatarFileID: &avatar, ProfileInput: ProfileInput{Headline: str("Go"), Summary: str("О себе"), City: str("Казань"), SalaryMinRUB: &salary, WorkFormatIDs: []int16{1}}},
	}
}

func requiredOnly() ReadinessInput {
	in := fullInput()
	in.Profile.AvatarFileID = nil
	in.Profile.Headline, in.Profile.Summary, in.Profile.City, in.Profile.SalaryMinRUB = nil, nil, nil, nil
	return in
}

func TestBuildReadinessItems(t *testing.T) {
	r := BuildReadiness(ReadinessInput{})
	if len(r.Items) != len(wantCodes) {
		t.Fatalf("пунктов %d, ожидали %d", len(r.Items), len(wantCodes))
	}
	for i, item := range r.Items {
		if item.Code != wantCodes[i] || item.Title == "" {
			t.Fatalf("пункт %d: %+v, ожидали код %q и название", i, item, wantCodes[i])
		}
		if item.Required != (i < 6) {
			t.Fatalf("пункт %q: required=%v, обязательными должны быть первые шесть", item.Code, item.Required)
		}
	}
}

func TestBuildReadinessEmpty(t *testing.T) {
	r := BuildReadiness(ReadinessInput{})
	if r.Percent != 0 || r.ReadyToPublish {
		t.Fatalf("пустой ввод: %+v", r)
	}
	for _, item := range r.Items {
		if item.Done {
			t.Fatalf("пункт %q выполнен при пустом вводе", item.Code)
		}
	}
}

func TestBuildReadinessWithoutProfile(t *testing.T) {
	r := BuildReadiness(ReadinessInput{ProcessingConsent: true, PublicationConsent: true})
	done := map[string]bool{}
	for _, item := range r.Items {
		done[item.Code] = item.Done
	}
	if !done["consent_processing"] || !done["consent_publication"] || len(done) != 11 {
		t.Fatalf("согласия должны отражаться и без профиля: %+v", done)
	}
	for _, code := range wantCodes {
		if code != "consent_processing" && code != "consent_publication" && done[code] {
			t.Fatalf("пункт %q не может быть выполнен без профиля", code)
		}
	}
	if r.Percent != 18 || r.ReadyToPublish {
		t.Fatalf("2 из 11 пунктов: percent=%d ready=%v", r.Percent, r.ReadyToPublish)
	}
}

func TestBuildReadinessReady(t *testing.T) {
	r := BuildReadiness(requiredOnly())
	if !r.ReadyToPublish || r.Percent != 55 {
		t.Fatalf("только обязательные: percent=%d ready=%v", r.Percent, r.ReadyToPublish)
	}
	r = BuildReadiness(fullInput())
	if !r.ReadyToPublish || r.Percent != 100 {
		t.Fatalf("всё заполнено: percent=%d ready=%v", r.Percent, r.ReadyToPublish)
	}
	for _, item := range r.Items {
		if !item.Done {
			t.Fatalf("пункт %q не выполнен при полном вводе", item.Code)
		}
	}
}

func TestBuildReadinessEachRequiredBlocksPublication(t *testing.T) {
	for name, mutate := range map[string]func(*ReadinessInput){
		"consent_processing":  func(in *ReadinessInput) { in.ProcessingConsent = false },
		"profile":             func(in *ReadinessInput) { in.Profile = nil },
		"contacts":            func(in *ReadinessInput) { in.HasContacts = false },
		"skills":              func(in *ReadinessInput) { in.SkillCount = 0 },
		"work_formats":        func(in *ReadinessInput) { in.Profile.WorkFormatIDs = []int16{} },
		"consent_publication": func(in *ReadinessInput) { in.PublicationConsent = false },
	} {
		in := requiredOnly()
		mutate(&in)
		r := BuildReadiness(in)
		if r.ReadyToPublish {
			t.Fatalf("без пункта %q профиль не может быть готов", name)
		}
		for _, item := range r.Items {
			if item.Code == name && item.Done {
				t.Fatalf("пункт %q должен быть не выполнен", name)
			}
		}
	}
}

// Любой навык засчитывается: статус модерации в расчёт не передаётся.
func TestBuildReadinessSkillsAnyCount(t *testing.T) {
	for _, n := range []int{1, 2, 50} {
		in := requiredOnly()
		in.SkillCount = n
		if !BuildReadiness(in).ReadyToPublish {
			t.Fatalf("навыков %d: профиль должен быть готов", n)
		}
	}
}
