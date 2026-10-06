//go:build integration

package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
	consententity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
	consentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/repository"
)

func TestCandidateProfileConsentGate(t *testing.T) {
	db := companyTestDB(t)
	repo := candidaterepo.NewRepository(db)
	consents := consentrepo.NewRepository(db)
	ctx := context.Background()
	newUser := func() string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	hidden := entity.ProfileInput{SearchStatus: "hidden", WorkFormatIDs: []int16{}}
	open := entity.ProfileInput{SearchStatus: "open", WorkFormatIDs: []int16{}}
	patch := func(body string) entity.Patch {
		var p entity.Patch
		if err := json.Unmarshal([]byte(body), &p); err != nil {
			t.Fatal(err)
		}
		return p
	}

	user := newUser()
	if _, err := repo.Create(ctx, user, hidden); !errors.Is(err, entity.ErrConsentRequired) {
		t.Fatalf("создание без согласий: %v", err)
	}
	grantConsentRows(t, db, user, "processing")
	if _, err := repo.Create(ctx, user, hidden); err != nil {
		t.Fatalf("создание скрытого профиля с processing: %v", err)
	}
	if _, err := repo.Update(ctx, user, patch(`{"city":"Казань"}`)); err != nil {
		t.Fatalf("изменение без смены статуса не требует publication: %v", err)
	}
	for _, status := range []string{"open", "passive"} {
		if _, err := repo.Update(ctx, user, patch(`{"search_status":"`+status+`"}`)); !errors.Is(err, entity.ErrConsentRequired) {
			t.Fatalf("публикация %s без publication: %v", status, err)
		}
	}
	grantConsentRows(t, db, user, "publication")
	if p, err := repo.Update(ctx, user, patch(`{"search_status":"open"}`)); err != nil || p.SearchStatus != "open" {
		t.Fatalf("публикация с обоими согласиями: %+v %v", p, err)
	}

	// Создание сразу с публикацией требует обоих согласий.
	direct := newUser()
	grantConsentRows(t, db, direct, "processing")
	if _, err := repo.Create(ctx, direct, open); !errors.Is(err, entity.ErrConsentRequired) {
		t.Fatalf("создание с open без publication: %v", err)
	}
	grantConsentRows(t, db, direct, "publication")
	if p, err := repo.Create(ctx, direct, open); err != nil || p.SearchStatus != "open" {
		t.Fatalf("создание с open и обоими согласиями: %+v %v", p, err)
	}

	// После отзыва publication профиль скрыт, и вернуться в open без нового согласия нельзя.
	if err := consents.Revoke(ctx, user, consententity.KindPublication, nil); err != nil {
		t.Fatal(err)
	}
	if p, err := repo.Get(ctx, user); err != nil || p.SearchStatus != "hidden" {
		t.Fatalf("профиль после отзыва publication: %+v %v", p, err)
	}
	if _, err := repo.Update(ctx, user, patch(`{"search_status":"open"}`)); !errors.Is(err, entity.ErrConsentRequired) {
		t.Fatalf("возврат в open после отзыва: %v", err)
	}
}

// Отзыв processing и публикация одновременно: профиль не должен остаться опубликованным без согласия.
func TestCandidateConsentRevokeVsPublish(t *testing.T) {
	db := companyTestDB(t)
	repo := candidaterepo.NewRepository(db)
	consents := consentrepo.NewRepository(db)
	ctx := context.Background()
	var user string
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
		t.Fatal(err)
	}
	grantConsentRows(t, db, user, "processing", "publication")
	if _, err := repo.Create(ctx, user, entity.ProfileInput{SearchStatus: "hidden", WorkFormatIDs: []int16{}}); err != nil {
		t.Fatal(err)
	}
	var open entity.Patch
	if err := json.Unmarshal([]byte(`{"search_status":"open"}`), &open); err != nil {
		t.Fatal(err)
	}
	for round := 0; round < 20; round++ {
		var wg sync.WaitGroup
		wg.Add(2)
		go func() {
			defer wg.Done()
			if _, err := repo.Update(ctx, user, open); err != nil && !errors.Is(err, entity.ErrConsentRequired) {
				t.Errorf("раунд %d: публикация: %v", round, err)
			}
		}()
		go func() {
			defer wg.Done()
			if err := consents.Revoke(ctx, user, consententity.KindProcessing, nil); err != nil {
				t.Errorf("раунд %d: отзыв: %v", round, err)
			}
		}()
		wg.Wait()
		var broken int
		if err := db.QueryRow(ctx, `SELECT count(*) FROM candidate_profiles p WHERE p.user_id=$1 AND p.search_status IN ('open','passive')
 AND NOT EXISTS (SELECT 1 FROM candidate_consents c WHERE c.user_id=p.user_id AND c.kind='processing' AND c.revoked_at IS NULL)`, user).Scan(&broken); err != nil || broken != 0 {
			t.Fatalf("раунд %d: профиль опубликован без активного processing (%d, %v)", round, broken, err)
		}
		// Возвращаем исходное состояние для следующего раунда.
		if _, err := db.Exec(ctx, `UPDATE candidate_profiles SET search_status='hidden' WHERE user_id=$1`, user); err != nil {
			t.Fatal(err)
		}
		for _, kind := range []string{consententity.KindProcessing, consententity.KindPublication} {
			if _, err := consents.Grant(ctx, user, consententity.GrantInput{Kind: kind, PolicyVersion: "v1"}); err != nil && !errors.Is(err, consententity.ErrConsentExists) {
				t.Fatal(err)
			}
		}
	}
}
