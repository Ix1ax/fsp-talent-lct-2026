//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	consententity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
	consentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/repository"
)

func readinessDone(r entity.Readiness) map[string]bool {
	done := map[string]bool{}
	for _, item := range r.Items {
		done[item.Code] = item.Done
	}
	return done
}

func TestCandidateFullProfile(t *testing.T) {
	db := testDB(t)
	repo := candidaterepo.NewRepository(db)
	full := candidateservice.NewFullProfileService(repo, "v1")
	consents := consentrepo.NewRepository(db)
	ctx := context.Background()
	newUser := func(role, status string) string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES($1,$2) RETURNING id::text`, role, status).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	get := func(user string) entity.FullProfile {
		t.Helper()
		got, err := full.Get(ctx, user)
		if err != nil {
			t.Fatal(err)
		}
		return got
	}
	patch := func(body string) entity.Patch {
		var p entity.Patch
		if err := json.Unmarshal([]byte(body), &p); err != nil {
			t.Fatal(err)
		}
		return p
	}

	for _, other := range []string{newUser("employer", "active"), newUser("candidate", "blocked")} {
		if _, err := full.Get(ctx, other); !errors.Is(err, entity.ErrForbidden) {
			t.Fatalf("не активный кандидат: %v", err)
		}
	}

	// Кандидат без профиля: 200-состояние с пустыми частями.
	user := newUser("candidate", "active")
	empty := get(user)
	if empty.Profile != nil || empty.Contacts != nil || empty.Category != nil || empty.Skills == nil || empty.Achievements == nil || empty.Consents.Items == nil || empty.Readiness.Percent != 0 {
		t.Fatalf("пустое состояние: %+v", empty)
	}

	// Шаг за шагом до готовности к публикации.
	grantConsentRows(t, db, user, "processing")
	if got := get(user); got.Readiness.Percent != 9 || !readinessDone(got.Readiness)["consent_processing"] || len(got.Consents.Items) != 1 {
		t.Fatalf("после согласия: %+v", got.Readiness)
	}
	if _, err := repo.Create(ctx, user, entity.ProfileInput{SearchStatus: "hidden", WorkFormatIDs: []int16{}}); err != nil {
		t.Fatal(err)
	}
	if got := get(user); got.Profile == nil || !readinessDone(got.Readiness)["profile"] || got.Readiness.ReadyToPublish {
		t.Fatalf("после создания профиля: %+v", got.Readiness)
	}
	if _, err := repo.PutContacts(ctx, user, entity.ContactsInput{FullName: "Иван Иванов", Email: "ivan@example.test"}); err != nil {
		t.Fatal(err)
	}
	if got := get(user); got.Contacts == nil || got.Contacts.FullName != "Иван Иванов" || !readinessDone(got.Readiness)["contacts"] {
		t.Fatalf("после контактов: %+v", got)
	}
	if _, err := repo.PutSkill(ctx, user, goSkill, skillLevel(4)); err != nil {
		t.Fatal(err)
	}
	if got := get(user); len(got.Skills) != 1 || got.Skills[0].Code != "go" || !readinessDone(got.Readiness)["skills"] {
		t.Fatalf("после навыка: %+v", got)
	}
	if _, err := repo.Update(ctx, user, patch(`{"work_format_ids":[1]}`)); err != nil {
		t.Fatal(err)
	}
	grantConsentRows(t, db, user, "publication")
	ready := get(user)
	if !ready.Readiness.ReadyToPublish || ready.Readiness.Percent != 55 || len(ready.Consents.Items) != 2 {
		t.Fatalf("готов к публикации: %+v %+v", ready.Readiness, ready.Consents)
	}
	if _, err := repo.Update(ctx, user, patch(`{"headline":"Go","city":"Казань","summary":"О себе"}`)); err != nil {
		t.Fatal(err)
	}
	if got := get(user); got.Readiness.Percent != 82 {
		t.Fatalf("после необязательных полей ожидали 82%% (9 из 11), получили %d", got.Readiness.Percent)
	}

	// Отзыв processing: согласий нет, профиль скрыт, контакты закрыты, готовность упала.
	if _, err := repo.Update(ctx, user, patch(`{"search_status":"open"}`)); err != nil {
		t.Fatal(err)
	}
	if err := consents.Revoke(ctx, user, consententity.KindProcessing, nil); err != nil {
		t.Fatal(err)
	}
	after := get(user)
	done := readinessDone(after.Readiness)
	if len(after.Consents.Items) != 0 || after.Profile.SearchStatus != "hidden" || after.Contacts != nil || after.Readiness.ReadyToPublish || done["consent_processing"] || done["contacts"] || done["consent_publication"] {
		t.Fatalf("после отзыва processing: %+v", after)
	}

	// Навыки в любом статусе модерации засчитываются.
	moderated := newUser("candidate", "active")
	grantConsentRows(t, db, moderated, "processing", "publication")
	if _, err := repo.Create(ctx, moderated, entity.ProfileInput{SearchStatus: "hidden", WorkFormatIDs: []int16{1}}); err != nil {
		t.Fatal(err)
	}
	for i, status := range []string{"pending", "rejected", "merged"} {
		var skill string
		merged := any(nil)
		if status == "merged" {
			merged = goSkill
		}
		if err := db.QueryRow(ctx, `INSERT INTO skills(code,name,active,moderation_status,merged_into) VALUES($1,$2,false,$3,$4) RETURNING id::text`, "m"+string(rune('a'+i)), "Навык "+status, status, merged).Scan(&skill); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(ctx, `INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level) SELECT p.id,$2,3 FROM candidate_profiles p WHERE p.user_id=$1`, moderated, skill); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := repo.PutContacts(ctx, moderated, entity.ContactsInput{FullName: "Пётр", Email: "p@example.test"}); err != nil {
		t.Fatal(err)
	}
	if got := get(moderated); len(got.Skills) != 3 || !readinessDone(got.Readiness)["skills"] || !got.Readiness.ReadyToPublish {
		t.Fatalf("навыки на модерации: %d навыков, %+v", len(got.Skills), got.Readiness)
	}

	// Другой кандидат не видит чужие данные, а список навыков совпадает с GET /me/skills.
	other := newUser("candidate", "active")
	if got := get(other); got.Profile != nil || got.Contacts != nil || len(got.Skills) != 0 || len(got.Consents.Items) != 0 {
		t.Fatalf("чужие данные в ответе: %+v", got)
	}
	listed, err := repo.ListSkills(ctx, moderated)
	if err != nil {
		t.Fatal(err)
	}
	fromFull := get(moderated).Skills
	a, _ := json.Marshal(listed)
	b, _ := json.Marshal(fromFull)
	if string(a) != string(b) {
		t.Fatalf("навыки полного профиля отличаются от GET /me/skills:\n%s\n%s", a, b)
	}
}

// Параллельные изменения согласий и контактов не должны давать противоречивых ответов.
func TestCandidateFullProfileConsistency(t *testing.T) {
	db := testDB(t)
	repo := candidaterepo.NewRepository(db)
	full := candidateservice.NewFullProfileService(repo, "v1")
	consents := consentrepo.NewRepository(db)
	ctx := context.Background()
	var user string
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
		t.Fatal(err)
	}
	grantConsentRows(t, db, user, "processing", "publication")
	if _, err := repo.Create(ctx, user, entity.ProfileInput{SearchStatus: "hidden", WorkFormatIDs: []int16{1}}); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.PutSkill(ctx, user, goSkill, skillLevel(3)); err != nil {
		t.Fatal(err)
	}
	contacts := entity.ContactsInput{FullName: "Иван Иванов", Email: "ivan@example.test"}
	allowed := func(err error) bool {
		return err == nil || errors.Is(err, entity.ErrConsentRequired) || errors.Is(err, consententity.ErrConsentExists) || errors.Is(err, consententity.ErrNotFound)
	}
	for round := 0; round < 20; round++ {
		var wg sync.WaitGroup
		wg.Add(5)
		go func() {
			defer wg.Done()
			for i := 0; i < 5; i++ {
				var open entity.Patch
				if err := json.Unmarshal([]byte(`{"search_status":"open"}`), &open); err != nil {
					t.Error(err)
					return
				}
				if _, err := repo.Update(ctx, user, open); !allowed(err) {
					t.Errorf("раунд %d: публикация: %v", round, err)
				}
			}
		}()
		go func() {
			defer wg.Done()
			if err := consents.Revoke(ctx, user, consententity.KindProcessing, nil); !allowed(err) {
				t.Errorf("раунд %d: отзыв: %v", round, err)
			}
		}()
		go func() {
			defer wg.Done()
			for _, kind := range []string{consententity.KindProcessing, consententity.KindPublication} {
				if _, err := consents.Grant(ctx, user, consententity.GrantInput{Kind: kind, PolicyVersion: "v1"}); !allowed(err) {
					t.Errorf("раунд %d: выдача: %v", round, err)
				}
			}
		}()
		go func() {
			defer wg.Done()
			if _, err := repo.PutContacts(ctx, user, contacts); !allowed(err) {
				t.Errorf("раунд %d: контакты: %v", round, err)
			}
		}()
		go func() {
			defer wg.Done()
			for i := 0; i < 5; i++ {
				got, err := full.Get(ctx, user)
				if err != nil {
					t.Errorf("раунд %d: чтение: %v", round, err)
					return
				}
				hasProcessing, hasPublication := false, false
				for _, c := range got.Consents.Items {
					if c.Kind == consententity.KindProcessing && c.CompanyID == nil {
						hasProcessing = true
					}
					if c.Kind == consententity.KindPublication && c.CompanyID == nil {
						hasPublication = true
					}
				}
				// Части снимка согласованы: публичный профиль возможен только при обоих активных согласиях.
				if got.Profile != nil && got.Profile.SearchStatus != "hidden" && !(hasProcessing && hasPublication) {
					t.Errorf("раунд %d: профиль %s при согласиях processing=%v publication=%v", round, got.Profile.SearchStatus, hasProcessing, hasPublication)
				}
				if got.Contacts != nil && !hasProcessing {
					t.Errorf("раунд %d: контакты показаны без активного processing", round)
				}
				if got.Readiness.ReadyToPublish {
					for _, item := range got.Readiness.Items {
						if item.Required && !item.Done {
							t.Errorf("раунд %d: готов к публикации без пункта %q", round, item.Code)
						}
					}
				}
			}
		}()
		wg.Wait()
	}
}
