//go:build integration

package httpapi

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestCandidateContactsDisclosure(t *testing.T) {
	f := newOfferFixture(t)
	ctx := context.Background()
	candidateUser := f.ids["candidate"]
	offer := f.create(t)
	path := f.base() + "/" + offer.ID + "/candidate-contacts"
	const secretEmail = "ivan.secret@example.test"

	// Пока оффер не принят, контакты закрыты для всех сотрудников компании.
	for _, who := range []string{"owner", "recruiter", "viewer"} {
		f.request(t, "GET", path, who, "", 404)
	}
	f.request(t, "POST", "/api/v1/me/offers/"+offer.ID+"/view", "candidate", "", 200)
	f.request(t, "GET", path, "owner", "", 404)
	f.request(t, "POST", "/api/v1/me/offers/"+offer.ID+"/respond", "candidate", `{"status":"accepted"}`, 200)

	// Оффер принят, но у кандидата нет согласия и контактов.
	if w := f.request(t, "GET", path, "owner", "", 409); errorCode(t, w) != "contacts_unavailable" {
		t.Fatalf("без согласия: %s", w.Body)
	}
	grantConsentRows(t, f.db, candidateUser, "processing")
	if w := f.request(t, "GET", path, "owner", "", 409); errorCode(t, w) != "contacts_unavailable" {
		t.Fatalf("без контактов: %s", w.Body)
	}
	f.exec(t, `INSERT INTO candidate_contacts(user_id,full_name,email,phone,telegram) VALUES($1,'Иван Иванов',$2,'+7 900 123-45-67','ivan_secret')`, candidateUser, secretEmail)

	for _, who := range []string{"owner", "recruiter"} {
		w := f.request(t, "GET", path, who, "", 200)
		var got struct{ FullName, Email, Phone, Telegram string }
		var raw map[string]any
		if err := json.Unmarshal(w.Body.Bytes(), &raw); err != nil {
			t.Fatal(err)
		}
		if raw["full_name"] != "Иван Иванов" || raw["email"] != secretEmail || raw["phone"] != "+7 900 123-45-67" || raw["telegram"] != "ivan_secret" || len(raw) != 4 {
			t.Fatalf("%s: неверные контакты %v (%v)", who, raw, got)
		}
		if w.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatalf("%s: Cache-Control %q", who, w.Header().Get("Cache-Control"))
		}
	}

	// Отказы: viewer, чужая компания, не та роль, заблокированный, без токена.
	f.request(t, "GET", path, "viewer", "", 404)
	f.request(t, "GET", path, "outsider", "", 404)
	f.request(t, "GET", "/api/v1/companies/"+f.otherCompany+"/offers/"+offer.ID+"/candidate-contacts", "outsider", "", 404)
	f.request(t, "GET", path, "candidate", "", 403)
	f.request(t, "GET", path, "blocked", "", 403)
	f.request(t, "GET", path, "", "", 401)

	// Журнал: два раскрытия, только идентификаторы.
	var disclosed int
	if err := f.db.QueryRow(ctx, `SELECT count(*) FROM audit_events WHERE action='contacts.disclosed' AND entity_type='candidate_offers' AND entity_id=$1::uuid AND actor_user_id IN ($2::uuid,$3::uuid)`, offer.ID, f.ids["owner"], f.ids["recruiter"]).Scan(&disclosed); err != nil || disclosed != 2 {
		t.Fatalf("события contacts.disclosed: %d (%v)", disclosed, err)
	}
	var badKeys int
	if err := f.db.QueryRow(ctx, `SELECT count(*) FROM audit_events e WHERE e.action='contacts.disclosed' AND EXISTS (SELECT 1 FROM jsonb_object_keys(e.metadata) k WHERE k NOT IN ('company_id','offer_id'))`).Scan(&badKeys); err != nil || badKeys != 0 {
		t.Fatalf("лишние ключи в metadata: %d (%v)", badKeys, err)
	}
	for _, secret := range []string{"Иван", "ivan.secret", "900", "ivan_secret"} {
		var leaks int
		if err := f.db.QueryRow(ctx, `SELECT count(*) FROM audit_events WHERE metadata::text LIKE '%'||$1||'%'`, secret).Scan(&leaks); err != nil || leaks != 0 {
			t.Fatalf("персональные данные %q попали в журнал: %d (%v)", secret, leaks, err)
		}
	}

	// Отклонённый и новый офферы контактов не раскрывают.
	rejected, fresh := f.create(t), f.create(t)
	f.exec(t, `UPDATE candidate_offers SET status='rejected',viewed_at=now(),responded_at=now() WHERE id=$1`, rejected.ID)
	for _, id := range []string{rejected.ID, fresh.ID} {
		f.request(t, "GET", f.base()+"/"+id+"/candidate-contacts", "owner", "", 404)
	}

	// После отзыва согласия контакты закрыты, и в ответе нет персональных данных.
	f.exec(t, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1`, candidateUser)
	w := f.request(t, "GET", path, "owner", "", 409)
	if errorCode(t, w) != "contacts_unavailable" || strings.Contains(w.Body.String(), secretEmail) || strings.Contains(w.Body.String(), "Иван") {
		t.Fatalf("после отзыва: %s", w.Body)
	}
}
