//go:build integration

package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
)

func TestCandidateRepositoryProfile(t *testing.T) {
	db := companyTestDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()
	newUser := func(role, status string) string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES($1,$2) RETURNING id::text`, role, status).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	s := func(v string) *string { return &v }
	user := newUser("candidate", "active")

	if _, err := repo.Get(ctx, user); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("Get без профиля: %v", err)
	}
	if _, err := repo.Update(ctx, user, entity.Patch{"city": json.RawMessage(`"Казань"`)}); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("Update без профиля: %v", err)
	}
	in := entity.ProfileInput{Headline: s("Go-разработчик"), ExperienceMonths: 30, SearchStatus: "open", WorkFormatIDs: []int16{1, 3}}
	if err := in.Normalize(); err != nil {
		t.Fatal(err)
	}
	grantConsentRows(t, db, user, "processing", "publication")
	created, err := repo.Create(ctx, user, in)
	if err != nil {
		t.Fatal(err)
	}
	if created.ID == "" || *created.Headline != "Go-разработчик" || created.SearchStatus != "open" || len(created.WorkFormatIDs) != 2 || created.AvatarFileID != nil || created.UpdatedAt.IsZero() {
		t.Fatalf("созданный профиль: %+v", created)
	}
	got, err := repo.Get(ctx, user)
	if err != nil || got.ID != created.ID || len(got.WorkFormatIDs) != 2 {
		t.Fatalf("Get: %+v %v", got, err)
	}
	if _, err := repo.Create(ctx, user, entity.ProfileInput{SearchStatus: "hidden", WorkFormatIDs: []int16{}}); !errors.Is(err, entity.ErrConflict) {
		t.Fatalf("повторное создание: %v", err)
	}
	for _, other := range []string{newUser("employer", "active"), newUser("candidate", "blocked")} {
		if _, err := repo.Create(ctx, other, entity.ProfileInput{SearchStatus: "hidden", WorkFormatIDs: []int16{}}); !errors.Is(err, entity.ErrForbidden) {
			t.Fatalf("не активный кандидат: %v", err)
		}
	}
	var validation *entity.ValidationError
	withConsent := newUser("candidate", "active")
	grantConsentRows(t, db, withConsent, "processing")
	if _, err := repo.Create(ctx, withConsent, entity.ProfileInput{SearchStatus: "hidden", WorkFormatIDs: []int16{999}}); !errors.As(err, &validation) {
		t.Fatalf("неизвестный формат работы: %v", err)
	}

	updated, err := repo.Update(ctx, user, entity.Patch{"city": json.RawMessage(`"Казань"`), "work_format_ids": json.RawMessage(`[2]`)})
	if err != nil || *updated.City != "Казань" || *updated.Headline != "Go-разработчик" || len(updated.WorkFormatIDs) != 1 || updated.WorkFormatIDs[0] != 2 {
		t.Fatalf("частичное изменение: %+v %v", updated, err)
	}
	cleared, err := repo.Update(ctx, user, entity.Patch{"headline": json.RawMessage(`null`), "work_format_ids": json.RawMessage(`[]`)})
	if err != nil || cleared.Headline != nil || len(cleared.WorkFormatIDs) != 0 || cleared.WorkFormatIDs == nil {
		t.Fatalf("очистка: %+v %v", cleared, err)
	}
	if _, err := repo.Update(ctx, user, entity.Patch{"work_format_ids": json.RawMessage(`[999]`)}); !errors.As(err, &validation) {
		t.Fatalf("неизвестный формат при изменении: %v", err)
	}
	if after, _ := repo.Get(ctx, user); after.City == nil || *after.City != "Казань" {
		t.Fatalf("неудачный PATCH не должен менять профиль: %+v", after)
	}
}

func TestCandidateRepositoryConcurrency(t *testing.T) {
	db := companyTestDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()
	var user string
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
		t.Fatal(err)
	}
	grantConsentRows(t, db, user, "processing")
	var created, conflicts, other int32
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := repo.Create(ctx, user, entity.ProfileInput{SearchStatus: "hidden", WorkFormatIDs: []int16{}})
			switch {
			case err == nil:
				atomic.AddInt32(&created, 1)
			case errors.Is(err, entity.ErrConflict):
				atomic.AddInt32(&conflicts, 1)
			default:
				atomic.AddInt32(&other, 1)
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if created != 1 || conflicts != 19 || other != 0 {
		t.Fatalf("параллельное создание: создано=%d конфликтов=%d прочее=%d", created, conflicts, other)
	}
	for round := 0; round < 10; round++ {
		city, headline := json.RawMessage(`"Город`+string(rune('A'+round))+`"`), json.RawMessage(`"Заголовок`+string(rune('A'+round))+`"`)
		for _, patch := range []entity.Patch{{"city": city}, {"headline": headline}} {
			wg.Add(1)
			go func() {
				defer wg.Done()
				if _, err := repo.Update(ctx, user, patch); err != nil {
					t.Error(err)
				}
			}()
		}
		wg.Wait()
		got, err := repo.Get(ctx, user)
		if err != nil || got.City == nil || got.Headline == nil || string(json.RawMessage(`"`+*got.City+`"`)) != string(city) || string(json.RawMessage(`"`+*got.Headline+`"`)) != string(headline) {
			t.Fatalf("раунд %d: параллельные PATCH потеряли поля: %+v %v", round, got, err)
		}
	}
}
