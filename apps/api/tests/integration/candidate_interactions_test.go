//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	offerrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/repository"
	offerservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/migrations"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

func newCandidateInteractionFixture(t *testing.T) (*offerFixture, string, []string) {
	t.Helper()
	f := newOfferFixture(t)
	for _, who := range []string{"candidate", "other_candidate"} {
		grantConsentRows(t, f.db, f.ids[who], "processing", "publication")
	}
	old := f.auth.Store.Users
	f.auth = testutil.NewAuthEnvWithOptions(t, httpapi.Options{
		CandidateBank: service.New(repository.New(f.db)), Offers: offerservice.New(offerrepo.New(f.db)),
	})
	f.auth.Store.Users = old
	for who := range f.tokens {
		f.tokens[who] = f.auth.Token(t, who)
	}
	spec, grade := pairIDs(t, f.db, "backend", "junior")
	var need string
	if err := f.db.QueryRow(context.Background(), `INSERT INTO employer_needs(company_id,created_by,specialization_id,grade_id,title,description,status,salary_to_rub)
 VALUES($1,$2,$3,$4,'Go','Команда','active',200000) RETURNING id::text`, f.company, f.ids["owner"], spec, grade).Scan(&need); err != nil {
		t.Fatal(err)
	}
	base := "/api/v1/companies/" + f.company
	return f, base + "/candidates/" + f.profiles["candidate"], []string{base + "/candidates", base + "/needs/" + need + "/candidates"}
}

func TestCandidateInteractionCooldownAndAccess(t *testing.T) {
	f, cardPath, lists := newCandidateInteractionFixture(t)
	read := func(path string, total int64) entity.Page {
		t.Helper()
		var p entity.Page
		w := f.request(t, "GET", path, "viewer", "", 200)
		if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil || p.Total != total {
			t.Fatalf("Неверная выдача %s: %s, %v", path, w.Body, err)
		}
		return p
	}
	details := func() entity.Details {
		t.Helper()
		var d entity.Details
		w := f.request(t, "GET", cardPath, "viewer", "", 200)
		if err := json.Unmarshal(w.Body.Bytes(), &d); err != nil {
			t.Fatal(err)
		}
		return d
	}
	if details().Viewed {
		t.Fatal("GET не должен регистрировать просмотр")
	}
	for _, path := range lists {
		read(path, 2)
	}
	viewPath := cardPath + "/view"
	f.request(t, "POST", viewPath, "", "", 401)
	f.request(t, "POST", viewPath, "candidate", "", 403)
	f.request(t, "POST", viewPath, "outsider", "", 404)
	f.request(t, "POST", strings.Replace(viewPath, f.profiles["candidate"], "invalid", 1), "owner", "", 400)
	w := f.request(t, "POST", viewPath, "viewer", "", 200)
	var state entity.Interaction
	if err := json.Unmarshal(w.Body.Bytes(), &state); err != nil {
		t.Fatal(err)
	}
	if !state.Viewed || state.HasOffer || state.LastViewedAt == nil || state.LastOfferedAt != nil || state.NextAvailableAt == nil || state.NextAvailableAt.Sub(*state.LastViewedAt) != 30*24*time.Hour {
		t.Fatalf("Неверный срок просмотра: %+v", state)
	}
	for _, path := range lists {
		p := read(path, 1)
		if len(p.Items) != 1 || p.Items[0].ID != f.profiles["other_candidate"] {
			t.Fatal("Просмотренный кандидат остался в обычной выдаче")
		}
		read(path+"?interaction_status=all", 2)
		p = read(path+"?interaction_status=cooldown&viewed=true&has_offer=false", 1)
		if p.Items[0].ID != f.profiles["candidate"] {
			t.Fatal("Просмотр без оффера потерян в истории")
		}
		p = read(path+"?limit=1&offset=1", 1)
		if len(p.Items) != 0 {
			t.Fatal("Пагинация не учитывает скрытие")
		}
	}
	if got := details(); !got.Viewed || !got.LastViewedAt.Equal(*state.LastViewedAt) {
		t.Fatal("Прямая карточка потеряна или GET продлил срок")
	}
	foreign := "/api/v1/companies/" + f.otherCompany + "/candidates"
	w = f.request(t, "GET", foreign, "outsider", "", 200)
	var other entity.Page
	if err := json.Unmarshal(w.Body.Bytes(), &other); err != nil || other.Total != 2 {
		t.Fatalf("Просмотр повлиял на другую компанию: %s, %v", w.Body, err)
	}
	for _, c := range other.Items {
		if c.Viewed || c.HasOffer || c.NextAvailableAt != nil {
			t.Fatal("История раскрыта другой компании")
		}
	}
	// Граница срока: 30 дней минус минута ещё скрыты; ровно 30 дней уже доступны.
	for _, tc := range []struct {
		age   string
		total int64
	}{{"30 days - 1 minute", 1}, {"30 days", 2}, {"31 days", 2}} {
		f.exec(t, `UPDATE company_candidate_interactions SET last_viewed_at=clock_timestamp()-$3::interval WHERE company_id=$1 AND candidate_id=$2`, f.company, f.profiles["candidate"], tc.age)
		for _, path := range lists {
			read(path, tc.total)
		}
	}
	// Оффер запускает новый срок, даже если прежний просмотр уже истёк.
	offer := f.create(t)
	got := details()
	if !got.Viewed || !got.HasOffer || got.LastOfferedAt == nil || !got.LastOfferedAt.Equal(offer.CreatedAt) || got.NextAvailableAt.Sub(offer.CreatedAt) != 30*24*time.Hour {
		t.Fatalf("Отправка не запустила срок: %+v", got.Interaction)
	}
	for _, path := range lists {
		read(path, 1)
		read(path+"?interaction_status=cooldown&has_offer=true", 1)
	}
	f.request(t, "POST", "/api/v1/me/offers/"+offer.ID+"/respond", "candidate", `{"status":"rejected"}`, 200)
	if after := details(); !after.NextAvailableAt.Equal(*got.NextAvailableAt) || !after.HasOffer {
		t.Fatal("Ответ кандидата изменил срок или историю отправки")
	}
	f.request(t, "POST", viewPath, "owner", "", 200)
	if after := details(); !after.HasOffer || !after.LastOfferedAt.Equal(offer.CreatedAt) || after.NextAvailableAt.Before(*got.NextAvailableAt) {
		t.Fatal("Повторный просмотр сбросил оффер или уменьшил срок")
	}
	f.exec(t, `UPDATE company_candidate_interactions SET last_viewed_at=clock_timestamp()-interval '31 days',last_offered_at=clock_timestamp()-interval '31 days' WHERE company_id=$1 AND candidate_id=$2`, f.company, f.profiles["candidate"])
	for _, path := range lists {
		read(path, 2)
		read(path+"?viewed=true&has_offer=true", 1)
	}
	// Неудачная отправка не меняет историю.
	before := details().Interaction
	f.request(t, "POST", f.base(), "owner", strings.Replace(f.body(), `"salary_to_rub":250000`, `"salary_to_rub":1`, 1), 400)
	if after := details(); !after.LastViewedAt.Equal(*before.LastViewedAt) || !after.LastOfferedAt.Equal(*before.LastOfferedAt) {
		t.Fatal("Неудачная отправка обновила историю")
	}
	f.exec(t, `UPDATE candidate_profiles SET search_status='hidden' WHERE id=$1`, f.profiles["candidate"])
	f.request(t, "POST", viewPath, "owner", "", 404)
	for _, path := range lists {
		read(path+"?interaction_status=all", 1)
		for _, query := range []string{"viewed=1", "interaction_status=recent", "interaction_status="} {
			f.request(t, "GET", path+"?"+query, "owner", "", 400)
		}
	}
}

func TestCandidateInteractionRanking(t *testing.T) {
	f, _, lists := newCandidateInteractionFixture(t)
	for _, who := range []string{"candidate", "other_candidate"} {
		f.exec(t, `DELETE FROM candidate_consents WHERE user_id=$1`, f.ids[who])
		confirmBankCandidate(t, f, who)
	}
	f.exec(t, `UPDATE candidate_profiles SET salary_min_rub=150000,created_at=clock_timestamp()-interval '10 days' WHERE id=$1`, f.profiles["candidate"])
	f.exec(t, `UPDATE candidate_profiles SET salary_min_rub=150000,created_at=clock_timestamp()-interval '20 days' WHERE id=$1`, f.profiles["other_candidate"])
	first := func(path, candidate string) {
		t.Helper()
		var p entity.Page
		w := f.request(t, "GET", path, "owner", "", 200)
		if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil || p.Total != 2 || len(p.Items) != 2 || p.Items[0].ID != f.profiles[candidate] {
			t.Fatalf("Неверное ранжирование: %s, %v", w.Body, err)
		}
	}
	for _, path := range lists {
		first(path, "other_candidate") // Равные новые профили: раньше появившийся выше.
	}
	f.exec(t, `INSERT INTO company_candidate_interactions(company_id,candidate_id,last_viewed_at) VALUES($1,$2,clock_timestamp()-interval '50 days')`, f.company, f.profiles["candidate"])
	for _, path := range lists {
		first(path, "other_candidate") // Новый выше уже просмотренного при равной квалификации.
	}
	f.exec(t, `INSERT INTO company_candidate_interactions(company_id,candidate_id,last_viewed_at) VALUES($1,$2,clock_timestamp()-interval '40 days')`, f.company, f.profiles["other_candidate"])
	for _, path := range lists {
		first(path, "candidate") // Оба уже доступны: давний просмотр выше.
	}
	// ТЗ: более сильный подтверждённый профиль имеет приоритет перед давностью просмотра.
	// Закрытые попытки неизменяемы: добавляем отдельный синтетический результат для проверки порядка.
	var original, weaker string
	ctx := context.Background()
	if err := f.db.QueryRow(ctx, `SELECT attempt_id::text FROM candidate_categories WHERE candidate_id=$1`, f.profiles["candidate"]).Scan(&original); err != nil {
		t.Fatal(err)
	}
	if err := f.db.QueryRow(ctx, `INSERT INTO assessment_attempts(candidate_id,template_id,specialization_id,grade_id,status,started_at,deadline_at,finished_at,time_limit_sec,pass_score,score_percent,stack_skill_id,stack_name)
 SELECT candidate_id,template_id,specialization_id,grade_id,'passed',started_at,deadline_at,finished_at,time_limit_sec,pass_score,95,stack_skill_id,stack_name
 FROM assessment_attempts WHERE id=$1 RETURNING id::text`, original).Scan(&weaker); err != nil {
		t.Fatal(err)
	}
	f.exec(t, `UPDATE candidate_categories SET attempt_id=$2 WHERE candidate_id=$1`, f.profiles["candidate"], weaker)
	for _, path := range lists {
		first(path, "other_candidate")
	}
	f.exec(t, `UPDATE candidate_categories SET attempt_id=$2 WHERE candidate_id=$1`, f.profiles["candidate"], original)
	f.exec(t, `INSERT INTO fsp_links(candidate_id,participant_id,source,sync_status) VALUES($1,'ranking-test','fsp_mock','ready')`, f.profiles["other_candidate"])
	f.exec(t, `INSERT INTO fsp_achievements(candidate_id,external_id,event_id,event_name,discipline,occurred_on,result,place,source)
 VALUES($1,'prize','cup','Кубок','Алгоритмы','2026-09-01','Первое место',1,'fsp_mock')`, f.profiles["other_candidate"])
	for _, path := range lists {
		first(path, "other_candidate") // Достижение ФСП в той же категории важнее давности.
	}
	f.exec(t, `UPDATE candidate_profiles SET salary_min_rub=300000 WHERE id=$1`, f.profiles["candidate"])
	first(lists[1], "other_candidate") // Сходство важнее давности.
}

func TestCandidateInteractionMigrationBackfillsOffers(t *testing.T) {
	f, _, lists := newCandidateInteractionFixture(t)
	f.create(t)
	f.create(t)
	f.exec(t, `UPDATE candidate_offers SET created_at=clock_timestamp()-interval '40 days' WHERE company_id=$1`, f.company)
	sqlDB := stdlib.OpenDB(*f.db.Config().ConnConfig)
	defer sqlDB.Close()
	provider, err := goose.NewProvider(goose.DialectPostgres, sqlDB, migrations.Files)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if _, err = provider.Down(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err = provider.Up(ctx); err != nil {
		t.Fatal(err)
	}
	for _, path := range lists {
		w := f.request(t, "GET", path+"?viewed=true&has_offer=true", "owner", "", 200)
		var p entity.Page
		if err := json.Unmarshal(w.Body.Bytes(), &p); err != nil || p.Total != 1 || len(p.Items) != 1 || p.Items[0].ID != f.profiles["candidate"] || p.Items[0].LastOfferedAt == nil {
			t.Fatalf("История старых офферов потеряна: %s, %v", w.Body, err)
		}
	}
}
