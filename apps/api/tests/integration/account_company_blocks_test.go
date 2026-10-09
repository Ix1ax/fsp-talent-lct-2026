//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"strings"
	"testing"
	"time"

	opsentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/entity"
	bankentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	bankrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
	bankservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/service"
	companyentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	companyrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/repository"
	companyservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	consententity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
	consentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	offerrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/repository"
	offerservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/migrations"
)

// Здесь JWT разрешается через настоящую БД: изменения статуса видны старым токенам сразу.
func newBlockFixture(t *testing.T) *opsFixture {
	t.Helper()
	f := newOpsFixture(t)
	for name, id := range f.ids {
		f.exec(t, `INSERT INTO external_identities(user_id,issuer,subject) VALUES($1,$2,$3)`, id, testutil.Issuer, name)
	}
	r := companyrepo.NewRepository(f.db)
	f.auth = testutil.NewAuthEnvWithOptions(t, httpapi.Options{
		Users: user.NewService(user.NewRepository(f.db)), Admins: f.admins, AdminOperations: f.ops,
		Companies: companyservice.NewCompanyService(r), Documents: f.documents, Needs: companyservice.NewNeedsService(r), Members: companyservice.NewMemberService(r),
		Offers: offerservice.New(offerrepo.New(f.db)), DailyTasks: f.tasks, CandidateBank: bankservice.New(bankrepo.New(f.db)),
	})
	for name := range f.ids {
		f.tokens[name] = f.auth.Token(t, name)
	}
	return f
}

func TestCompanyBlockLifecycleAndAllMemberRoutes(t *testing.T) {
	f := newBlockFixture(t)
	ctx := context.Background()
	file := f.proof(t)
	v := f.requestVerification(t)
	f.request(t, "PATCH", f.adminCompany()+"/verification", "staff", decisionBody("verified", v.Version), 200)
	task := f.publish(t)
	submission := f.submit(t, task, "candidate")
	offer := f.create(t)
	invitations := companyservice.NewMemberService(companyrepo.NewRepository(f.db))
	invitation, err := invitations.Invite(ctx, f.ids["owner"], f.company, companyentity.InvitationInput{Email: "outsider@example.test", Role: "recruiter"})
	if err != nil {
		t.Fatal(err)
	}
	path := f.adminCompany() + "/status"
	for _, body := range []string{`{"status":"blocked"}`, `{"status":"deleted","reason":"test"}`, `{"status":"blocked","reason":"test","actor_id":"forged"}`, `{"status":"blocked","reason":"   "}`} {
		f.request(t, "PATCH", path, "staff", body, 400)
	}
	f.request(t, "PATCH", path, "owner", `{"status":"blocked","reason":"test"}`, 401)
	body := `{"status":"blocked","reason":"  Нарушение правил компании  "}`
	w := f.request(t, "PATCH", path, "staff", body, 200)
	var company companyentity.Company
	if err = json.Unmarshal(w.Body.Bytes(), &company); err != nil || company.Status != "blocked" || company.BlockedReason == nil || *company.BlockedReason != "Нарушение правил компании" || company.BlockedAt == nil || company.VerificationStatus != "verified" {
		t.Fatalf("Блокировка: %s %v", w.Body, err)
	}
	w2 := f.request(t, "PATCH", path, "staff", `{"status":"blocked","reason":"Другая причина повторного запроса"}`, 200)
	if w.Body.String() != w2.Body.String() {
		t.Fatal("Повтор изменил причину/дату блокировки")
	}
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/companies?status=verified&access_status=blocked", "staff", "", 200), 1)
	var stats struct{ Companies struct{ Blocked int } }
	if err = json.Unmarshal(f.request(t, "GET", "/api/v1/admin/stats", "staff", "", 200).Body.Bytes(), &stats); err != nil || stats.Companies.Blocked != 1 {
		t.Fatal("Счётчик заблокированных компаний", stats, err)
	}
	for _, who := range []string{"owner", "recruiter", "viewer"} {
		w = f.request(t, "GET", "/api/v1/me", who, "", 200)
		if !strings.Contains(w.Body.String(), "Нарушение правил компании") {
			t.Fatalf("Нет плашки в /me: %s", w.Body)
		}
		w = f.request(t, "GET", "/api/v1/companies/"+f.company, who, "", 200)
		if !strings.Contains(w.Body.String(), `"status":"blocked"`) {
			t.Fatal(w.Body)
		}
		w = f.request(t, "GET", "/api/v1/companies", who, "", 200)
		if !strings.Contains(w.Body.String(), "Нарушение правил компании") {
			t.Fatal(w.Body)
		}
		for _, route := range f.auth.Router.Routes() {
			if !strings.HasPrefix(route.Path, "/api/v1/companies/:company_id") || route.Method == "GET" && route.Path == "/api/v1/companies/:company_id" {
				continue
			}
			url := strings.NewReplacer(":company_id", f.company, ":file_id", file, ":task_id", task.ID, ":submission_id", submission.ID, ":offer_id", offer.ID, ":candidate_id", f.profiles["candidate"], ":user_id", f.ids["recruiter"], ":need_id", task.ID, ":invitation_id", invitation.ID).Replace(route.Path)
			w = f.request(t, route.Method, url, who, `{}`, 403)
			if testutil.ErrorCode(t, w) != "company_blocked" || !strings.Contains(w.Body.String(), "Нарушение правил компании") {
				t.Fatal(w.Body)
			}
		}
	}
	// Постороннему не раскрывается факт блокировки и причина компании.
	w = f.request(t, "GET", "/api/v1/companies/"+f.company, "outsider", "", 404)
	if strings.Contains(w.Body.String(), "Нарушение правил компании") {
		t.Fatal("Причина раскрыта постороннему")
	}
	f.request(t, "POST", "/api/v1/company-invitations/accept", "outsider", `{"token":"`+invitation.Token+`"}`, 404)
	taskTotal(t, f.request(t, "GET", "/api/v1/tasks", "candidate", "", 200), 0)
	for _, url := range []string{"/api/v1/tasks/" + task.ID, "/api/v1/tasks/" + task.ID + "/file", "/api/v1/me/offers/" + offer.ID} {
		f.request(t, "GET", url, "candidate", "", 404)
	}
	f.upload(t, "/api/v1/tasks/"+task.ID+"/submissions", "other_candidate", nil, 404)
	f.request(t, "POST", "/api/v1/me/offers/"+offer.ID+"/view", "candidate", "", 404)
	f.request(t, "POST", "/api/v1/me/offers/"+offer.ID+"/respond", "candidate", `{"status":"accepted"}`, 404)
	taskTotal(t, f.request(t, "GET", "/api/v1/me/offers", "candidate", "", 200), 0)
	// Своё уже отправленное решение остаётся в истории; действия компании закрыты.
	f.request(t, "GET", "/api/v1/me/task-submissions/"+submission.ID, "candidate", "", 200)
	f.request(t, "GET", f.adminCompany()+"/files/"+file+"/download", "staff", "", 200)
	// Блокировка участника независима от статуса компании.
	userPath := "/api/v1/admin/users/" + f.ids["recruiter"] + "/status"
	f.request(t, "PATCH", userPath, "staff", `{"status":"blocked","reason":"Нарушение правил участником"}`, 200)
	f.request(t, "PATCH", path, "staff", `{"status":"active","reason":"Компания исправила нарушения"}`, 200)
	w = f.request(t, "GET", "/api/v1/companies/"+f.company, "owner", "", 200)
	if !strings.Contains(w.Body.String(), `"blocked_reason":null`) {
		t.Fatal(w.Body)
	}
	f.request(t, "GET", f.taskBase(), "owner", "", 200)
	w = f.request(t, "GET", f.taskBase(), "recruiter", "", 403)
	if testutil.ErrorCode(t, w) != "user_inactive" {
		t.Fatal(w.Body)
	}
	f.request(t, "GET", "/api/v1/tasks/"+task.ID, "candidate", "", 200)
	f.request(t, "POST", "/api/v1/me/offers/"+offer.ID+"/respond", "candidate", `{"status":"accepted"}`, 200)
	f.request(t, "POST", "/api/v1/company-invitations/accept", "outsider", `{"token":"`+invitation.Token+`"}`, 200)
	f.request(t, "PATCH", userPath, "staff", `{"status":"active","reason":"Участник исправил нарушения"}`, 200)
	f.request(t, "GET", f.taskBase(), "recruiter", "", 200)
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/audit-events?source=operations&action=company.status_changed&entity_id="+f.company, "staff", "", 200), 2)
}

func TestUserBlockReasonsOldJWTAndProtectedRoutes(t *testing.T) {
	f := newBlockFixture(t)
	for _, who := range []string{"candidate", "owner"} {
		path := "/api/v1/admin/users/" + f.ids[who] + "/status"
		f.request(t, "PATCH", path, "staff", `{"status":"blocked","reason":"Нарушение правил аккаунтом"}`, 200)
		w := f.request(t, "GET", "/api/v1/me", who, "", 200)
		if !strings.Contains(w.Body.String(), `"status":"blocked"`) || !strings.Contains(w.Body.String(), "Нарушение правил аккаунтом") {
			t.Fatal(w.Body)
		}
		for _, route := range f.auth.Router.Routes() {
			protected := strings.HasPrefix(route.Path, "/api/v1/me/") && route.Path != "/api/v1/me/register" || strings.HasPrefix(route.Path, "/api/v1/companies") || strings.HasPrefix(route.Path, "/api/v1/tasks") || strings.HasPrefix(route.Path, "/api/v1/company-invitations")
			if !protected {
				continue
			}
			w = f.request(t, route.Method, route.Path, who, `{}`, 403)
			if testutil.ErrorCode(t, w) != "user_inactive" || !strings.Contains(w.Body.String(), "Нарушение правил аккаунтом") {
				t.Fatal(w.Body)
			}
		}
		f.request(t, "POST", "/api/v1/me/register", who, `{"role":"employer"}`, 409)
		f.request(t, "PATCH", path, "staff", `{"status":"active","reason":"Исправлено"}`, 200)
		w = f.request(t, "GET", "/api/v1/me", who, "", 200)
		if !strings.Contains(w.Body.String(), `"blocked_reason":null`) || !strings.Contains(w.Body.String(), `"blocked_at":null`) {
			t.Fatal(w.Body)
		}
	}
}

func TestCompanyBlockRepositoryDefenseAndConcurrentUpload(t *testing.T) {
	f := newOpsFixture(t)
	ctx := context.Background()
	task := f.publish(t)
	offer := f.create(t)
	if _, err := f.ops.SetStatus(ctx, f.adminIDs["staff"], "company", f.company, opsentity.StatusInput{Status: "blocked", Reason: "Нарушение"}); err != nil {
		t.Fatal(err)
	}
	r := companyrepo.NewRepository(f.db)
	if _, err := r.Update(ctx, f.ids["owner"], f.company, companyentity.Patch{"name": json.RawMessage(`"Обход"`)}); !errors.Is(err, companyentity.ErrNotFound) {
		t.Fatal("Редактирование заблокированной компании", err)
	}
	if _, err := offerrepo.New(f.db).CompanyGet(ctx, f.ids["owner"], f.company, offer.ID); err == nil {
		t.Fatal("Чтение оффера обошло бан")
	}
	if _, err := bankrepo.New(f.db).List(ctx, f.ids["owner"], f.company, bankentity.Filter{Limit: 20}); err == nil {
		t.Fatal("Банк кандидатов обошёл бан")
	}
	if _, err := f.tasks.Close(ctx, f.ids["owner"], f.company, task.ID); err == nil {
		t.Fatal("Изменение задания обошло бан")
	}
	if _, err := f.ops.Verification(ctx, f.ids["owner"], f.company, true); err == nil {
		t.Fatal("Заявка на проверку обошла бан")
	}
	if _, err := f.tasks.Submit(ctx, f.ids["other_candidate"], task.ID, files.File{}); err == nil {
		t.Fatal("Отправка решения обошла бан")
	}
	if _, err := consentrepo.NewRepository(f.db).Grant(ctx, f.ids["candidate"], consententity.GrantInput{Kind: "ats_transfer", PolicyVersion: "1", CompanyID: &f.company}); !errors.Is(err, consententity.ErrCompanyNotFound) {
		t.Fatal("Согласие для заблокированной компании", err)
	}
	f.request(t, "PATCH", f.adminCompany()+"/status", "staff", `{"status":"active","reason":"Исправлено"}`, 200)
	// После предварительной проверки и загрузки S3 бан успевает зафиксироваться до записи решения.
	f.objects.afterPut = func() {
		_, err := f.ops.SetStatus(ctx, f.adminIDs["staff"], "company", f.company, opsentity.StatusInput{Status: "blocked", Reason: "Блокировка во время загрузки"})
		if err != nil {
			t.Error(err)
		}
	}
	before := f.objects.count()
	f.upload(t, "/api/v1/tasks/"+task.ID+"/submissions", "other_candidate", nil, 404)
	if f.objects.count() != before {
		t.Fatal("Файл отклонённого решения остался в S3")
	}
	var count int
	if err := f.db.QueryRow(ctx, `SELECT count(*) FROM company_task_submissions WHERE task_id=$1`, task.ID).Scan(&count); err != nil || count != 0 {
		t.Fatal("Запись решения после бана", count, err)
	}
}

func TestCompanyBlockWaitsForAuthorizedTransaction(t *testing.T) {
	f := newOpsFixture(t)
	ctx := context.Background()
	tx, err := f.db.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	var id string
	if err = tx.QueryRow(ctx, `SELECT id::text FROM companies WHERE id=$1 FOR SHARE`, f.company).Scan(&id); err != nil {
		t.Fatal(err)
	}
	deadline, cancel := context.WithTimeout(ctx, 150*time.Millisecond)
	defer cancel()
	_, err = f.ops.SetStatus(deadline, f.adminIDs["staff"], "company", f.company, opsentity.StatusInput{Status: "blocked", Reason: "Нарушение"})
	if err == nil {
		t.Fatal("Бан не дождался транзакционной проверки компании")
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	f.request(t, "PATCH", f.adminCompany()+"/status", "staff", `{"status":"blocked","reason":"Нарушение"}`, 200)
}

func TestBlockMigrationPreservesExistingUserBlocks(t *testing.T) {
	f := newBlockFixture(t)
	ctx := context.Background()
	f.request(t, "PATCH", "/api/v1/admin/users/"+f.ids["candidate"]+"/status", "staff", `{"status":"blocked","reason":"Сохранённая причина блокировки"}`, 200)
	db := stdlib.OpenDB(*f.db.Config().ConnConfig)
	defer db.Close()
	provider, err := goose.NewProvider(goose.DialectPostgres, db, migrations.Files)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = provider.Down(ctx); err != nil {
		t.Fatal(err)
	}
	var legacy string
	if err = f.db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES('employer','blocked') RETURNING id::text`).Scan(&legacy); err != nil {
		t.Fatal(err)
	}
	if _, err = provider.Up(ctx); err != nil {
		t.Fatal(err)
	}
	w := f.request(t, "GET", "/api/v1/me", "candidate", "", 200)
	if !strings.Contains(w.Body.String(), "Сохранённая причина блокировки") {
		t.Fatal("Миграция потеряла причину", w.Body)
	}
	var reason string
	var at time.Time
	if err = f.db.QueryRow(ctx, `SELECT blocked_reason,blocked_at FROM users WHERE id=$1`, legacy).Scan(&reason, &at); err != nil || reason == "" || at.IsZero() {
		t.Fatal("Блокировка без аудита потеряна", reason, at, err)
	}
}
