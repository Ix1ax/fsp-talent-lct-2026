//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	bankentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

func TestOfferExpirationReadFilterAndResponse(t *testing.T) {
	f := newOfferFixture(t)
	for _, original := range []string{entity.StatusSent, entity.StatusViewed} {
		t.Run(original, func(t *testing.T) {
			o := f.create(t)
			incoming := "/api/v1/me/offers/" + o.ID
			if original == entity.StatusViewed {
				f.request(t, "POST", incoming+"/view", "candidate", "", 200)
			}
			f.exec(t, `UPDATE candidate_offers SET created_at=clock_timestamp()-interval '336 hours' WHERE id=$1`, o.ID)
			var expected entity.Offer
			read := func(method, path, who string) {
				t.Helper()
				w := f.request(t, method, path, who, "", 200)
				var got entity.Offer
				if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil || got.Status != entity.StatusExpired || got.RespondedAt != nil {
					t.Fatalf("Неверное истечение: %s, %v", w.Body, err)
				}
				if got.ID != o.ID || got.Title != o.Title || got.ContactEmail != o.ContactEmail || (original == entity.StatusSent && got.ViewedAt != nil) {
					t.Fatalf("Истечение изменило условия/просмотр: %+v", got)
				}
				expected = got
			}
			read("GET", incoming, "candidate")
			read("GET", f.base()+"/"+o.ID, "viewer")
			read("POST", incoming+"/view", "candidate")
			f.request(t, "GET", f.base()+"/"+o.ID+"/candidate-contacts", "owner", "", 404)
			for _, decision := range []string{"accepted", "rejected"} {
				w := f.request(t, "POST", incoming+"/respond", "candidate", `{"status":"`+decision+`"}`, 409)
				if testutil.ErrorCode(t, w) != "offer_expired" {
					t.Fatalf("Неверный код: %s", w.Body)
				}
			}
			f.request(t, "POST", incoming+"/respond", "other_candidate", `{"status":"accepted"}`, 404)
			// Чтение, просмотр и отказ в ответе не подменяют историю решением кандидата.
			var stored string
			var unchanged bool
			if err := f.db.QueryRow(context.Background(), `SELECT status,responded_at IS NULL AND viewed_at IS NOT DISTINCT FROM $2::timestamptz FROM candidate_offers WHERE id=$1`, o.ID, expected.ViewedAt).Scan(&stored, &unchanged); err != nil || stored != original || !unchanged {
				t.Fatalf("История изменилась: %s %v %v", stored, unchanged, err)
			}
		})
	}
	// Возраст сам по себе не отменяет принятое/отклонённое решение.
	for _, decision := range []string{"accepted", "rejected"} {
		o := f.create(t)
		path := "/api/v1/me/offers/" + o.ID
		f.request(t, "POST", path+"/respond", "candidate", `{"status":"`+decision+`"}`, 200)
		f.exec(t, `UPDATE candidate_offers SET created_at=clock_timestamp()-interval '40 days' WHERE id=$1`, o.ID)
		f.request(t, "POST", path+"/respond", "candidate", `{"status":"`+decision+`"}`, 200)
	}
	f.create(t) // Ещё одно свежее предложение.
	for _, path := range []struct{ url, who string }{{"/api/v1/me/offers", "candidate"}, {f.base(), "viewer"}} {
		wantPage(t, "истёкшие", f.request(t, "GET", path.url+"?status=expired&limit=1", path.who, "", 200), 1, 2, 1, 0)
		wantPage(t, "истёкшие, вторая страница", f.request(t, "GET", path.url+"?status=expired&limit=1&offset=1", path.who, "", 200), 1, 2, 1, 1)
		wantPage(t, "отправленные", f.request(t, "GET", path.url+"?status=sent", path.who, "", 200), 1, 1, 20, 0)
		wantPage(t, "просмотренные", f.request(t, "GET", path.url+"?status=viewed", path.who, "", 200), 0, 0, 20, 0)
		wantPage(t, "принятые", f.request(t, "GET", path.url+"?status=accepted", path.who, "", 200), 1, 1, 20, 0)
		wantPage(t, "отклонённые", f.request(t, "GET", path.url+"?status=rejected", path.who, "", 200), 1, 1, 20, 0)
	}
}

func TestExpiredOfferReleasesCooldown(t *testing.T) {
	f, card, lists := newCandidateInteractionFixture(t)
	o := f.create(t)
	f.exec(t, `UPDATE candidate_offers SET created_at=clock_timestamp()-interval '335 hours' WHERE id=$1`, o.ID)
	f.exec(t, `UPDATE company_candidate_interactions SET last_viewed_at=o.created_at,last_offered_at=o.created_at FROM candidate_offers o
 WHERE company_candidate_interactions.company_id=o.company_id AND company_candidate_interactions.candidate_id=o.candidate_id AND o.id=$1`, o.ID)
	check := func(total int64, cooldown bool) {
		t.Helper()
		for _, path := range lists {
			wantPage(t, "доступные", f.request(t, "GET", path, "viewer", "", 200), int(total), total, 20, 0)
		}
		w := f.request(t, "GET", card, "viewer", "", 200)
		var d bankentity.Details
		if err := json.Unmarshal(w.Body.Bytes(), &d); err != nil || !d.HasOffer || !d.Viewed || (d.NextAvailableAt != nil) != cooldown || d.LastOfferedAt == nil || d.LastViewedAt == nil {
			t.Fatalf("Неверная история/кулдаун: %s %v", w.Body, err)
		}
	}
	check(1, true)
	f.exec(t, `UPDATE candidate_offers SET created_at=created_at-interval '2 hours' WHERE id=$1`, o.ID)
	f.exec(t, `UPDATE company_candidate_interactions SET last_viewed_at=o.created_at,last_offered_at=o.created_at FROM candidate_offers o
 WHERE company_candidate_interactions.company_id=o.company_id AND company_candidate_interactions.candidate_id=o.candidate_id AND o.id=$1`, o.ID)
	check(2, false)
	for _, path := range lists {
		wantPage(t, "нет кулдауна", f.request(t, "GET", path+"?interaction_status=cooldown&has_offer=true", "viewer", "", 200), 0, 0, 20, 0)
		wantPage(t, "история сохранена", f.request(t, "GET", path+"?has_offer=true&viewed=true", "viewer", "", 200), 1, 1, 20, 0)
	}
	// Другой, отвеченный оффер имеет собственный 30-дневный срок.
	answered := f.create(t)
	f.request(t, "POST", "/api/v1/me/offers/"+answered.ID+"/respond", "candidate", `{"status":"accepted"}`, 200)
	f.exec(t, `UPDATE candidate_offers SET created_at=clock_timestamp()-interval '20 days' WHERE id=$1`, answered.ID)
	f.exec(t, `UPDATE company_candidate_interactions SET last_viewed_at=o.created_at,last_offered_at=o.created_at FROM candidate_offers o
 WHERE company_candidate_interactions.company_id=o.company_id AND company_candidate_interactions.candidate_id=o.candidate_id AND o.id=$1`, o.ID)
	check(1, true)
	// Ручной просмотр после отправки истёкшего предложения также сохраняет срок.
	f.request(t, "POST", card+"/view", "owner", "", 200)
	check(1, true)
	// Новый оффер снова запускает срок, история старого остаётся expired.
	f.create(t)
	check(1, true)
}

func TestAdminOfferExpirationAndMetrics(t *testing.T) {
	f := newOpsFixture(t)
	o := f.create(t)
	f.exec(t, `UPDATE candidate_offers SET created_at=clock_timestamp()-interval '14 days' WHERE id=$1`, o.ID)
	wantPage(t, "истёкшие в админке", f.request(t, "GET", "/api/v1/admin/offers?status=expired", "staff", "", 200), 1, 1, 20, 0)
	w := f.request(t, "GET", "/api/v1/admin/offers/"+o.ID, "staff", "", 200)
	var offer map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &offer); err != nil || offer["status"] != "expired" || offer["contact_email"] != nil {
		t.Fatalf("Карточка админки: %s %v", w.Body, err)
	}
	stats, err := f.ops.Stats(context.Background(), f.adminIDs["staff"])
	if err != nil {
		t.Fatal(err)
	}
	counts := stats["offers"].(map[string]any)
	if counts["expired"] != float64(1) || counts["rejected"] != float64(0) || counts["accepted"] != float64(0) {
		t.Fatalf("Истечение подменяет ответ в метриках: %+v", counts)
	}
}

func TestOfferExpirationWhileWaitingForLock(t *testing.T) {
	for _, action := range []string{"respond", "view"} {
		t.Run(action, func(t *testing.T) {
			f := newOfferFixture(t)
			o := f.create(t)
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			locked, err := f.db.Begin(ctx)
			if err != nil {
				t.Fatal(err)
			}
			defer locked.Rollback(context.Background())
			var deadline time.Time
			if err = locked.QueryRow(ctx, `UPDATE candidate_offers SET created_at=clock_timestamp()-interval '336 hours'+interval '3 seconds' WHERE id=$1 RETURNING created_at+interval '336 hours'`, o.ID).Scan(&deadline); err != nil {
				t.Fatal(err)
			}
			result := make(chan *httptest.ResponseRecorder, 1)
			body := ""
			if action == "respond" {
				body = `{"status":"accepted"}`
			}
			go func() {
				result <- f.auth.Do(t, "POST", "/api/v1/me/offers/"+o.ID+"/"+action, f.tokens["candidate"], body)
			}()
			// Дожидаемся реального ожидания row lock, а не полагаемся на задержку запуска goroutine.
			for {
				var waiting, beforeDeadline bool
				if err = f.db.QueryRow(ctx, `SELECT count(*)>0,COALESCE(bool_and(xact_start<$1),false) FROM pg_stat_activity
 WHERE wait_event_type='Lock' AND query LIKE '%FOR UPDATE OF o%' AND pid<>pg_backend_pid()`, deadline).Scan(&waiting, &beforeDeadline); err != nil {
					t.Fatal(err)
				}
				if waiting {
					if !beforeDeadline {
						t.Fatal("Тестовый запрос должен начать транзакцию до дедлайна")
					}
					break
				}
				if ctx.Err() != nil {
					t.Fatal(ctx.Err())
				}
				time.Sleep(10 * time.Millisecond)
			}
			for {
				var expired bool
				if err = locked.QueryRow(ctx, `SELECT clock_timestamp()>=$1`, deadline).Scan(&expired); err != nil {
					t.Fatal(err)
				}
				if expired {
					break
				}
				time.Sleep(10 * time.Millisecond)
			}
			if err = locked.Commit(ctx); err != nil {
				t.Fatal(err)
			}
			select {
			case w := <-result:
				if action == "respond" {
					if w.Code != 409 || testutil.ErrorCode(t, w) != "offer_expired" {
						t.Fatalf("Поздний ответ сохранён: %d %s", w.Code, w.Body)
					}
				} else {
					var got entity.Offer
					if err = json.Unmarshal(w.Body.Bytes(), &got); w.Code != 200 || err != nil || got.Status != "expired" || got.ViewedAt != nil {
						t.Fatalf("Поздний просмотр сохранён: %d %s %v", w.Code, w.Body, err)
					}
				}
			case <-ctx.Done():
				t.Fatal(ctx.Err())
			}
			var unchanged bool
			if err = f.db.QueryRow(ctx, `SELECT status='sent' AND viewed_at IS NULL AND responded_at IS NULL FROM candidate_offers WHERE id=$1`, o.ID).Scan(&unchanged); err != nil || !unchanged {
				t.Fatalf("Истёкшее предложение изменено: %v %v", unchanged, err)
			}
		})
	}
}
