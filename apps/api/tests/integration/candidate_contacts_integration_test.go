//go:build integration

package integration

import (
	"context"
	"errors"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
)

func TestCandidateContactsRepository(t *testing.T) {
	db := testDB(t)
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
	in := entity.ContactsInput{FullName: "Иван Иванов", Email: "ivan.secret@example.test", Phone: s("+7 900 123-45-67"), Telegram: s("ivan_secret")}

	for _, other := range []string{newUser("employer", "active"), newUser("candidate", "blocked")} {
		if _, err := repo.PutContacts(ctx, other, in); !errors.Is(err, entity.ErrForbidden) {
			t.Fatalf("не активный кандидат: %v", err)
		}
	}
	user := newUser("candidate", "active")
	if _, err := repo.PutContacts(ctx, user, in); !errors.Is(err, entity.ErrConsentRequired) {
		t.Fatalf("сохранение без согласия: %v", err)
	}
	if _, err := repo.Contacts(ctx, user); !errors.Is(err, entity.ErrConsentRequired) {
		t.Fatalf("чтение без согласия: %v", err)
	}
	grantConsentRows(t, db, user, "processing")
	if _, err := repo.Contacts(ctx, user); !errors.Is(err, entity.ErrContactsNotFound) {
		t.Fatalf("контактов ещё нет: %v", err)
	}
	saved, err := repo.PutContacts(ctx, user, in)
	if err != nil || saved.FullName != in.FullName || saved.UpdatedAt.IsZero() {
		t.Fatalf("сохранение: %+v %v", saved, err)
	}
	in.FullName, in.Phone = "Иван Петров", nil
	updated, err := repo.PutContacts(ctx, user, in)
	if err != nil || updated.FullName != "Иван Петров" || updated.Phone != nil || *updated.Telegram != "ivan_secret" {
		t.Fatalf("обновление (PUT заменяет объект целиком): %+v %v", updated, err)
	}
	if got, err := repo.Contacts(ctx, user); err != nil || got.FullName != "Иван Петров" {
		t.Fatalf("чтение: %+v %v", got, err)
	}

	// Другой кандидат с согласием не видит чужие контакты.
	other := newUser("candidate", "active")
	grantConsentRows(t, db, other, "processing")
	if _, err := repo.Contacts(ctx, other); !errors.Is(err, entity.ErrContactsNotFound) {
		t.Fatalf("чужие контакты не должны быть видны: %v", err)
	}

	// После отзыва согласия контакты закрыты, но остаются в БД.
	if _, err := db.Exec(ctx, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1`, user); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.Contacts(ctx, user); !errors.Is(err, entity.ErrConsentRequired) {
		t.Fatalf("чтение после отзыва: %v", err)
	}
	var stored int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM candidate_contacts WHERE user_id=$1`, user).Scan(&stored); err != nil || stored != 1 {
		t.Fatalf("контакты должны остаться в БД: %d (%v)", stored, err)
	}

	// Журнал: два события обновления, а персональных данных в metadata нет.
	var events int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM audit_events WHERE action='contacts.updated' AND actor_user_id=$1`, user).Scan(&events); err != nil || events != 2 {
		t.Fatalf("события contacts.updated: %d (%v)", events, err)
	}
	for _, secret := range []string{"Иван", "Петров", "ivan.secret", "900", "ivan_secret"} {
		var leaks int
		if err := db.QueryRow(ctx, `SELECT count(*) FROM audit_events WHERE metadata::text LIKE '%'||$1||'%'`, secret).Scan(&leaks); err != nil || leaks != 0 {
			t.Fatalf("персональные данные %q попали в журнал: %d (%v)", secret, leaks, err)
		}
	}
}
