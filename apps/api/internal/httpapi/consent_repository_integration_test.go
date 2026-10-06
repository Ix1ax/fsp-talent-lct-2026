//go:build integration

package httpapi

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
	consentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/repository"
)

func TestConsentRepository(t *testing.T) {
	db := companyTestDB(t)
	repo := consentrepo.NewRepository(db)
	ctx := context.Background()
	newUser := func(role, status string) string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES($1,$2) RETURNING id::text`, role, status).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	newCompany := func() string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO companies(name,contact_email) VALUES('Компания','hr@example.test') RETURNING id::text`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	grant := func(user, kind string, company *string) (entity.Consent, error) {
		return repo.Grant(ctx, user, entity.GrantInput{Kind: kind, PolicyVersion: "v1", CompanyID: company})
	}
	profile := func(user, status string) {
		if _, err := db.Exec(ctx, `INSERT INTO candidate_profiles(user_id,search_status) VALUES($1,$2)`, user, status); err != nil {
			t.Fatal(err)
		}
	}
	profileStatus := func(user string) (s string) {
		if err := db.QueryRow(ctx, `SELECT search_status FROM candidate_profiles WHERE user_id=$1`, user).Scan(&s); err != nil {
			t.Fatal(err)
		}
		return
	}

	for _, other := range []string{newUser("employer", "active"), newUser("candidate", "blocked")} {
		if _, err := grant(other, entity.KindProcessing, nil); !errors.Is(err, entity.ErrForbidden) {
			t.Fatalf("выдача не активному кандидату: %v", err)
		}
		if err := repo.Revoke(ctx, other, entity.KindProcessing, nil); !errors.Is(err, entity.ErrForbidden) {
			t.Fatalf("отзыв не активным кандидатом: %v", err)
		}
	}

	user := newUser("candidate", "active")
	first, err := grant(user, entity.KindProcessing, nil)
	if err != nil || first.ID == "" || first.RevokedAt != nil || first.PolicyVersion != "v1" || first.GrantedAt.IsZero() {
		t.Fatalf("выдача: %+v %v", first, err)
	}
	if _, err := grant(user, entity.KindProcessing, nil); !errors.Is(err, entity.ErrConsentExists) {
		t.Fatalf("повторная выдача: %v", err)
	}
	if err := repo.Revoke(ctx, user, entity.KindPublication, nil); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("отзыв без активного согласия: %v", err)
	}
	if err := repo.Revoke(ctx, user, entity.KindProcessing, nil); err != nil {
		t.Fatal(err)
	}
	second, err := grant(user, entity.KindProcessing, nil)
	if err != nil || second.ID == first.ID {
		t.Fatalf("выдача после отзыва должна создать новую строку: %+v %v", second, err)
	}
	history, err := repo.List(ctx, user)
	if err != nil || len(history) != 2 || history[0].ID != second.ID || history[0].RevokedAt != nil || history[1].RevokedAt == nil {
		t.Fatalf("история: %+v %v", history, err)
	}

	unknown := "0b7d3b1e-8f3a-4c58-9d3e-5a1f2c3d4e5f"
	if _, err := grant(user, entity.KindATSTransfer, &unknown); !errors.Is(err, entity.ErrCompanyNotFound) {
		t.Fatalf("несуществующая компания: %v", err)
	}
	if err := repo.Revoke(ctx, user, entity.KindATSTransfer, nil); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("отзыв ats_transfer без компании: %v", err)
	}

	// Отзыв processing отзывает все активные согласия и скрывает профиль.
	cascade := newUser("candidate", "active")
	company := newCompany()
	profile(cascade, "open")
	for _, kind := range []string{entity.KindProcessing, entity.KindPublication} {
		if _, err := grant(cascade, kind, nil); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := grant(cascade, entity.KindATSTransfer, &company); err != nil {
		t.Fatal(err)
	}
	if err := repo.Revoke(ctx, cascade, entity.KindProcessing, nil); err != nil {
		t.Fatal(err)
	}
	var active int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM candidate_consents WHERE user_id=$1 AND revoked_at IS NULL`, cascade).Scan(&active); err != nil || active != 0 || profileStatus(cascade) != "hidden" {
		t.Fatalf("каскад отзыва: активных %d, статус профиля %q (%v)", active, profileStatus(cascade), err)
	}

	// Отзыв publication скрывает профиль, но оставляет processing.
	partial := newUser("candidate", "active")
	profile(partial, "passive")
	for _, kind := range []string{entity.KindProcessing, entity.KindPublication} {
		if _, err := grant(partial, kind, nil); err != nil {
			t.Fatal(err)
		}
	}
	if err := repo.Revoke(ctx, partial, entity.KindPublication, nil); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM candidate_consents WHERE user_id=$1 AND revoked_at IS NULL AND kind='processing'`, partial).Scan(&active); err != nil || active != 1 || profileStatus(partial) != "hidden" {
		t.Fatalf("отзыв publication: processing активных %d, статус %q (%v)", active, profileStatus(partial), err)
	}

	// Журнал: события есть, а в metadata только допустимые ключи.
	var revoked, badKeys int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM audit_events WHERE action='consent.revoked' AND actor_user_id=$1`, cascade).Scan(&revoked); err != nil || revoked != 3 {
		t.Fatalf("события отзыва каскада: %d (%v)", revoked, err)
	}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM audit_events e WHERE e.action LIKE 'consent.%' AND EXISTS (SELECT 1 FROM jsonb_object_keys(e.metadata) k WHERE k NOT IN ('kind','policy_version','company_id'))`).Scan(&badKeys); err != nil || badKeys != 0 {
		t.Fatalf("лишние ключи в metadata: %d (%v)", badKeys, err)
	}
}

func TestConsentConcurrency(t *testing.T) {
	db := companyTestDB(t)
	repo := consentrepo.NewRepository(db)
	ctx := context.Background()
	var user string
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
		t.Fatal(err)
	}
	var created, exists, other int32
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := repo.Grant(ctx, user, entity.GrantInput{Kind: entity.KindProcessing, PolicyVersion: "v1"})
			switch {
			case err == nil:
				atomic.AddInt32(&created, 1)
			case errors.Is(err, entity.ErrConsentExists):
				atomic.AddInt32(&exists, 1)
			default:
				atomic.AddInt32(&other, 1)
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if created != 1 || exists != 19 || other != 0 {
		t.Fatalf("параллельная выдача: создано=%d повторов=%d прочее=%d", created, exists, other)
	}
	// Выдача и отзыв одновременно: допустимы только «уже есть» и «не найдено», но не нарушение CHECK по времени.
	for round := 0; round < 20; round++ {
		for _, run := range []func() error{
			func() error {
				_, err := repo.Grant(ctx, user, entity.GrantInput{Kind: entity.KindPublication, PolicyVersion: "v1"})
				return err
			},
			func() error { return repo.Revoke(ctx, user, entity.KindPublication, nil) },
		} {
			run := run
			wg.Add(1)
			go func() {
				defer wg.Done()
				if err := run(); err != nil && !errors.Is(err, entity.ErrConsentExists) && !errors.Is(err, entity.ErrNotFound) {
					t.Errorf("раунд %d: неожиданная ошибка %v", round, err)
				}
			}()
		}
		wg.Wait()
	}
}
