//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	offerrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/repository"
	offerservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

func TestCandidateBankOfferHistory(t *testing.T) {
	f := newOfferFixture(t)
	ctx := context.Background()
	for _, who := range []string{"candidate", "other_candidate"} {
		grantConsentRows(t, f.db, f.ids[who], "processing", "publication")
	}
	// Ранее отправленное предложение другой компании не влияет на нашу выдачу.
	foreignBase := "/api/v1/companies/" + f.otherCompany
	foreignBody := strings.Replace(f.body(), f.profiles["candidate"], f.profiles["other_candidate"], 1)
	f.request(t, "POST", foreignBase+"/offers", "outsider", foreignBody, 201)
	old := f.auth.Store.Users
	bank := repository.New(f.db)
	f.auth = testutil.NewAuthEnvWithOptions(t, httpapi.Options{
		CandidateBank: service.New(bank), Offers: offerservice.New(offerrepo.New(f.db)),
	})
	f.auth.Store.Users = old
	for who := range f.tokens {
		f.tokens[who] = f.auth.Token(t, who)
	}
	spec, _ := pairIDs(t, f.db, "backend", "junior")
	var need string
	if err := f.db.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,title,description,status)
 VALUES($1,$2,$3,'Go','Команда','active') RETURNING id::text`, f.company, f.ids["owner"], spec).Scan(&need); err != nil {
		t.Fatal(err)
	}
	base := "/api/v1/companies/" + f.company
	paths := []string{base + "/candidates", base + "/needs/" + need + "/candidates"}
	read := func(path, who string, wantTotal int64, wantFlags map[string]bool) {
		t.Helper()
		w := f.request(t, "GET", path+querySeparator(path)+"interaction_status=all", who, "", 200)
		var page entity.Page // Общие поля карточек есть и в подборке.
		if err := json.Unmarshal(w.Body.Bytes(), &page); err != nil {
			t.Fatal(err)
		}
		if page.Total != wantTotal || len(page.Items) != len(wantFlags) {
			t.Fatalf("%s: неверная страница %+v", path, page)
		}
		seen := map[string]bool{}
		for _, card := range page.Items {
			want, ok := wantFlags[card.ID]
			if !ok || seen[card.ID] || card.HasOffer != want {
				t.Fatalf("%s: неверная карточка %+v", path, card)
			}
			seen[card.ID] = true
		}
		if len(page.Items) > 0 && !strings.Contains(w.Body.String(), `"has_offer":`) {
			t.Fatal("has_offer должен присутствовать даже при false")
		}
	}
	check := func(sent bool) {
		t.Helper()
		all := map[string]bool{f.profiles["candidate"]: sent, f.profiles["other_candidate"]: false}
		invited, fresh := map[string]bool{}, map[string]bool{}
		for id, flag := range all {
			if flag {
				invited[id] = flag
			} else {
				fresh[id] = flag
			}
		}
		for _, path := range paths {
			read(path, "viewer", 2, all)
			read(path+"?has_offer=true", "owner", int64(len(invited)), invited)
			read(path+"?has_offer=false", "recruiter", int64(len(fresh)), fresh)
			read(path+"?has_offer=false&limit=1&offset=100", "owner", int64(len(fresh)), map[string]bool{})
		}
		for who, flag := range all {
			w := f.request(t, "GET", base+"/candidates/"+who, "viewer", "", 200)
			var details entity.Details
			if err := json.Unmarshal(w.Body.Bytes(), &details); err != nil || details.HasOffer != flag {
				t.Fatalf("Неверная отметка в подробной карточке: %s, %v", w.Body, err)
			}
			card, err := bank.Get(ctx, f.ids["owner"], f.company, who)
			if err != nil || card.HasOffer != flag {
				t.Fatalf("Неверная отметка в репозитории: %+v, %v", card, err)
			}
		}
		read(foreignBase+"/candidates?has_offer=true", "outsider", 1, map[string]bool{f.profiles["other_candidate"]: true})
	}
	check(false)
	// Ошибка отправки не должна устанавливать признак.
	f.request(t, "POST", f.base(), "owner", strings.Replace(f.body(), `"salary_to_rub":250000`, `"salary_to_rub":1`, 1), 400)
	check(false)
	// Предложение без привязки к потребности видно также в её подборке.
	offer := f.create(t)
	check(true)
	// Повторное предложение не дублирует кандидата и не меняет total.
	f.create(t)
	check(true)
	incoming := "/api/v1/me/offers/" + offer.ID
	f.request(t, "POST", incoming+"/view", "candidate", "", 200)
	check(true)
	f.request(t, "POST", incoming+"/respond", "candidate", `{"status":"rejected"}`, 200)
	// Завершаем все предложения, чтобы признак не зависел от активного статуса.
	f.exec(t, `UPDATE candidate_offers SET status='accepted',viewed_at=now(),responded_at=now()
 WHERE company_id=$1 AND status='sent'`, f.company)
	check(true)
	for _, path := range paths {
		for _, query := range []string{"has_offer=", "has_offer=1", "has_offer=TRUE", "has_offer=true&has_offer=false"} {
			f.request(t, "GET", path+"?"+query, "owner", "", 400)
		}
	}
}
