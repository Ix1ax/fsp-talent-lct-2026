//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"

	bankentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	bankrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
	bankservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/service"
	fspentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/entity"
	fsprepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/repository"
	fspservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

type fspRegistryStub struct {
	err   error
	empty bool
}

func (r *fspRegistryStub) Lookup(_ context.Context, i fspentity.Identity) (fspentity.Record, error) {
	if r.err != nil {
		return fspentity.Record{}, r.err
	}
	record := fspentity.Record{ParticipantID: "mock-" + i.Subject, Source: "fsp_mock", Items: []fspentity.Achievement{}}
	if !r.empty {
		place := 1
		record.Items = append(record.Items, fspentity.Achievement{ID: "prize", EventID: "cup", EventName: "Тестовый кубок", Discipline: "Алгоритмы", OccurredOn: "2026-09-01", Result: "Первое место", Place: &place, Source: "fsp_mock"})
	}
	return record, nil
}

func TestFSPLifecyclePrivacyAndRanking(t *testing.T) {
	f := newOfferFixture(t)
	ctx := context.Background()
	confirmBankCandidate(t, f, "candidate")
	confirmBankCandidate(t, f, "other_candidate")
	for _, who := range []string{"candidate", "other_candidate"} {
		f.exec(t, `INSERT INTO external_identities(user_id,issuer,subject) VALUES($1,$2,$3)`, f.ids[who], testutil.Issuer, who)
	}
	registry := &fspRegistryStub{}
	store := fsprepo.New(f.db)
	s := fspservice.New(store, registry)
	old := f.auth.Store.Users
	f.auth = testutil.NewAuthEnvWithOptions(t, httpapi.Options{FSP: s, CandidateBank: bankservice.New(bankrepo.New(f.db))})
	f.auth.Store.Users = old
	for who := range f.tokens {
		f.tokens[who] = f.auth.Token(t, who)
	}
	get := func() fspentity.Profile {
		t.Helper()
		w := f.request(t, "GET", "/api/v1/me/fsp", "candidate", "", 200)
		if w.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatal("Кеширование ФСП")
		}
		var p fspentity.Profile
		if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil {
			t.Fatal(err)
		}
		return p
	}
	if p := get(); p.Link != nil || len(p.Items) != 0 {
		t.Fatal("Непривязанный профиль неверен")
	}
	f.request(t, "POST", "/api/v1/me/fsp/sync", "candidate", "", 409)
	f.request(t, "POST", "/api/v1/me/fsp/link", "owner", "", 403)
	f.request(t, "POST", "/api/v1/me/fsp/link", "no_profile", "", 403)
	for i := 0; i < 2; i++ {
		f.request(t, "POST", "/api/v1/me/fsp/link", "candidate", "", 200)
	}
	p := get()
	if p.Link == nil || p.Link.SyncStatus != "ready" || len(p.Items) != 1 {
		t.Fatalf("Привязка: %+v", p)
	}
	linked := p.Link.LinkedAt
	f.request(t, "POST", "/api/v1/me/fsp/sync", "candidate", "", 200)
	if !get().Link.LinkedAt.Equal(linked) {
		t.Fatal("Повтор изменил дату привязки")
	}
	// Два подтверждённых кандидата одной категории, бонус меняет только их порядок.
	var need string
	spec, grade := pairIDs(t, f.db, "backend", "junior")
	if err := f.db.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,grade_id,title,description,status) VALUES($1,$2,$3,$4,'Go','Команда','active') RETURNING id::text`, f.company, f.ids["owner"], spec, grade).Scan(&need); err != nil {
		t.Fatal(err)
	}
	page, err := bankrepo.New(f.db).Recommend(ctx, f.ids["owner"], f.company, need, bankentity.Filter{Limit: 20})
	if err != nil {
		t.Fatal(err)
	}
	if page.Items[0].ID != f.profiles["candidate"] || page.Items[0].FSPBonus != 5 || page.Items[0].AchievementsCount != 1 {
		t.Fatalf("Нет приоритета ФСП: %+v", page)
	}
	yes := true
	list, err := bankrepo.New(f.db).List(ctx, f.ids["owner"], f.company, bankentity.Filter{Limit: 20, HasFSPAchievements: &yes})
	if err != nil || list.Total != 1 {
		t.Fatalf("Фильтр: %+v %v", list, err)
	}
	no := false
	without, err := bankrepo.New(f.db).List(ctx, f.ids["owner"], f.company, bankentity.Filter{Limit: 20, HasFSPAchievements: &no})
	if err != nil || without.Total != 1 || without.Items[0].ID != f.profiles["other_candidate"] {
		t.Fatalf("Фильтр отсутствия достижений: %+v %v", without, err)
	}
	_, err = store.Save(ctx, f.ids["other_candidate"], fspentity.Identity{Issuer: testutil.Issuer, Subject: "candidate"}, fspentity.Record{ParticipantID: "forged", Source: "fsp_mock"}, true)
	if !errors.Is(err, fspentity.ErrForbidden) {
		t.Fatalf("Чужая идентичность принята: %v", err)
	}
	detail := f.request(t, "GET", "/api/v1/companies/"+f.company+"/candidates/"+f.profiles["candidate"], "owner", "", 200)
	if !strings.Contains(detail.Body.String(), "Тестовый кубок") || strings.Contains(detail.Body.String(), "participant_id") {
		t.Fatal("Неверный публичный состав ФСП")
	}
	registry.err = errors.New("источник упал")
	f.request(t, "POST", "/api/v1/me/fsp/sync", "candidate", "", 503)
	p = get()
	if p.Link.SyncStatus != "unavailable" || len(p.Items) != 1 {
		t.Fatal("Ошибка источника стёрла историю")
	}
	registry.err = nil
	registry.empty = true
	f.request(t, "POST", "/api/v1/me/fsp/sync", "candidate", "", 200)
	p = get()
	if p.Link.SyncStatus != "empty" || len(p.Items) != 0 {
		t.Fatal("Пустая история не обработана")
	}
	registry.empty = false
	f.request(t, "POST", "/api/v1/me/fsp/sync", "candidate", "", 200)
	f.exec(t, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1 AND kind='publication'`, f.ids["candidate"])
	f.request(t, "GET", "/api/v1/companies/"+f.company+"/candidates/"+f.profiles["candidate"], "owner", "", 404)
	f.exec(t, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1 AND kind='processing'`, f.ids["candidate"])
	f.request(t, "POST", "/api/v1/me/fsp/sync", "candidate", "", 403)
	f.request(t, "DELETE", "/api/v1/me/fsp", "candidate", "", 204)
	var count int
	if err = f.db.QueryRow(ctx, `SELECT count(*) FROM fsp_achievements WHERE candidate_id=$1`, f.profiles["candidate"]).Scan(&count); err != nil || count != 0 {
		t.Fatal("Отключение не удалило достижения")
	}
	if err = f.db.QueryRow(ctx, `SELECT count(*) FROM candidate_categories WHERE candidate_id=$1 AND specialization_id=$2 AND grade_id=$3`, f.profiles["candidate"], spec, grade).Scan(&count); err != nil || count != 1 {
		t.Fatal("ФСП изменил категорию")
	}
}
