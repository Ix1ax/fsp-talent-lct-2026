//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	adminentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/entity"
	adminrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/repository"
	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/service"
	companyrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/repository"
	companyservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	offerrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/repository"
	offerservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type opsFixture struct {
	*taskFixture
	ops       *service.Service
	documents *companyservice.DocumentService
	admins    *adminservice.Service
	adminIDs  map[string]string
}

func newOpsFixture(t *testing.T) *opsFixture {
	t.Helper()
	f := newTaskFixture(t)
	ctx := context.Background()
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	admins := adminservice.New(adminrepo.New(f.db))
	password := "Admin-Operations-Test-2026"
	if err := admins.Bootstrap(ctx, "root@ops.test", password); err != nil {
		t.Fatal(err)
	}
	root, err := admins.Login(ctx, adminentity.Credentials{Email: "root@ops.test", Password: password}, "root")
	if err != nil {
		t.Fatal(err)
	}
	staff, err := admins.Create(ctx, root.Admin, adminentity.Credentials{Email: "staff@ops.test", Password: password})
	if err != nil {
		t.Fatal(err)
	}
	staffLogin, err := admins.Login(ctx, adminentity.Credentials{Email: staff.Email, Password: password}, "staff")
	if err != nil {
		t.Fatal(err)
	}
	ops := service.New(repository.New(f.db), f.objects, log)
	companies := companyrepo.NewRepository(f.db)
	docs := companyservice.NewDocumentService(companies, f.objects, "tasks-test", log)
	users := f.auth.Store.Users
	f.auth = testutil.NewAuthEnvWithOptions(t, httpapi.Options{Admins: admins, AdminOperations: ops, DailyTasks: f.tasks, Companies: companyservice.NewCompanyService(companies), Documents: docs, Needs: companyservice.NewNeedsService(companies), Offers: offerservice.New(offerrepo.New(f.db))})
	f.auth.Store.Users = users
	for name := range f.ids {
		f.tokens[name] = f.auth.Token(t, name)
	}
	f.tokens["root"], f.tokens["staff"] = root.AccessToken, staffLogin.AccessToken
	return &opsFixture{f, ops, docs, admins, map[string]string{"root": root.Admin.ID, "staff": staff.ID}}
}
func (f *opsFixture) verificationPath() string {
	return "/api/v1/companies/" + f.company + "/verification"
}
func (f *opsFixture) adminCompany() string { return "/api/v1/admin/companies/" + f.company }
func (f *opsFixture) proof(t *testing.T) string {
	t.Helper()
	f.exec(t, `UPDATE companies SET inn='7707083893' WHERE id=$1`, f.company)
	file, err := f.documents.Upload(context.Background(), f.ids["owner"], f.company, "company.pdf", "company_document", []byte("%PDF-1.7\nДокумент компании\n%%EOF"))
	if err != nil {
		t.Fatal(err)
	}
	return file.ID
}
func (f *opsFixture) verification(t *testing.T) entity.Verification {
	t.Helper()
	w := f.request(t, "GET", f.verificationPath(), "owner", "", 200)
	var v entity.Verification
	if err := json.Unmarshal(w.Body.Bytes(), &v); err != nil {
		t.Fatal(err)
	}
	return v
}
func decisionBody(status string, version int) string {
	return fmt.Sprintf(`{"status":%q,"expected_version":%d,"reason":"Проверено администратором"}`, status, version)
}
func (f *opsFixture) requestVerification(t *testing.T) entity.Verification {
	t.Helper()
	w := f.request(t, "POST", f.verificationPath()+"/request", "owner", "", 200)
	var v entity.Verification
	if err := json.Unmarshal(w.Body.Bytes(), &v); err != nil {
		t.Fatal(err)
	}
	return v
}

func TestAdminOperationsVerificationLifecycle(t *testing.T) {
	f := newOpsFixture(t)
	path := f.adminCompany() + "/verification"
	f.request(t, "POST", f.verificationPath()+"/request", "owner", "", 409)
	file := f.proof(t)
	f.request(t, "POST", f.verificationPath()+"/request", "recruiter", "", 403)
	f.request(t, "POST", f.verificationPath()+"/request", "outsider", "", 404)
	for _, who := range []string{"owner", "recruiter", "viewer"} {
		f.request(t, "GET", f.verificationPath(), who, "", 200)
	}
	v := f.requestVerification(t)
	if v.Status != "pending" || v.Version != 1 || len(v.DocumentIDs) != 1 || v.DocumentIDs[0] != file {
		t.Fatalf("Заявка: %+v", v)
	}
	repeat := f.requestVerification(t)
	if repeat.Version != v.Version || !repeat.RequestedAt.Equal(*v.RequestedAt) {
		t.Fatal("Повтор создал новую заявку")
	}
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/companies?status=pending", "staff", "", 200), 1)
	f.request(t, "GET", f.adminCompany()+"/files/"+file+"/download", "staff", "", 200)
	f.request(t, "GET", "/api/v1/admin/companies/"+f.otherCompany+"/files/"+file+"/download", "staff", "", 404)
	for _, body := range []string{`{"status":"verified"}`, `{"status":"pending","expected_version":1}`, `{"status":"rejected","expected_version":1}`, `{"status":"verified","expected_version":1,"actor_id":"forged"}`} {
		f.request(t, "PATCH", path, "staff", body, 400)
	}
	f.request(t, "PATCH", path, "staff", decisionBody("verified", 0), 409)
	f.request(t, "PATCH", path, "staff", decisionBody("verified", v.Version), 200)
	v = f.verification(t)
	if v.Status != "verified" || v.ReviewedAt == nil || v.Version != 2 {
		t.Fatalf("Подтверждение: %+v", v)
	}
	// Старое решение не проходит после новой версии; повтор актуального состояния не меняет историю.
	f.request(t, "PATCH", path, "staff", decisionBody("rejected", 1), 409)
	f.request(t, "PATCH", path, "staff", decisionBody("verified", 2), 200)
	var events int
	if err := f.db.QueryRow(context.Background(), `SELECT count(*) FROM admin_operation_events WHERE entity_id=$1`, f.company).Scan(&events); err != nil || events != 2 {
		t.Fatalf("История: %d %v", events, err)
	}
	// Обновление реквизитов сбрасывает подтверждение и возвращает актуальный статус старому company API.
	w := f.request(t, "PATCH", "/api/v1/companies/"+f.company, "owner", `{"name":"Другая организация"}`, 200)
	if !strings.Contains(w.Body.String(), `"verification_status":"unverified"`) {
		t.Fatalf("Старый API вернул старый статус: %s", w.Body)
	}
	v = f.verification(t)
	if v.Status != "unverified" || v.Version != 3 {
		t.Fatal(v)
	}
	f.request(t, "PATCH", path, "staff", decisionBody("verified", 2), 409)
	v = f.requestVerification(t)
	f.request(t, "PATCH", path, "staff", decisionBody("rejected", v.Version), 200)
	if v = f.verification(t); v.Status != "rejected" || v.Reason == nil {
		t.Fatal(v)
	}
	v = f.requestVerification(t)
	f.request(t, "PATCH", path, "staff", decisionBody("verified", v.Version), 200)
	// Отзыв подтверждения требует причины. После новой заявки подтверждаем повторно.
	current := f.verification(t)
	f.request(t, "PATCH", path, "staff", fmt.Sprintf(`{"status":"unverified","expected_version":%d}`, current.Version), 400)
	f.request(t, "PATCH", path, "staff", decisionBody("unverified", current.Version), 200)
	v = f.requestVerification(t)
	f.request(t, "PATCH", path, "staff", decisionBody("verified", v.Version), 200)
	before := f.verification(t)
	if err := f.documents.Delete(context.Background(), f.ids["owner"], f.company, file); err != nil {
		t.Fatal(err)
	}
	after := f.verification(t)
	if after.Status != "unverified" || after.Version != before.Version+1 || len(after.DocumentIDs) != 0 {
		t.Fatalf("Удаление доказательства: %+v", after)
	}
	f.request(t, "GET", f.adminCompany()+"/files/"+file+"/download", "root", "", 404)
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/audit-events?source=operations&entity_type=company&entity_id="+f.company, "staff", "", 200), 11)
}

func TestAdminOperationsAccessFiltersAndStatistics(t *testing.T) {
	f := newOpsFixture(t)
	f.proof(t)
	f.requestVerification(t)
	task := f.publish(t)
	f.submit(t, task, "candidate")
	offer := f.create(t)
	f.request(t, "GET", "/api/v1/admin/offers/"+offer.ID, "staff", "", 200)
	var need string
	if err := f.db.QueryRow(context.Background(), `INSERT INTO employer_needs(company_id,created_by,specialization_id,title,description) VALUES($1,$2,1,'Go','Описание') RETURNING id::text`, f.company, f.ids["owner"]).Scan(&need); err != nil {
		t.Fatal(err)
	}
	var attempt string
	if err := f.db.QueryRow(context.Background(), `INSERT INTO assessment_attempts(candidate_id,template_id,specialization_id,grade_id,status,deadline_at,time_limit_sec,pass_score) VALUES($1,'b0000000-0000-4000-8000-000000000001',1,1,'active',clock_timestamp()+interval '1 hour',600,60) RETURNING id::text`, f.profiles["candidate"]).Scan(&attempt); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/stats", "/companies", "/companies/" + f.company, "/companies/" + f.company + "/members", "/companies/" + f.company + "/files", "/users", "/users/" + f.ids["candidate"], "/needs", "/needs/" + need, "/offers", "/tasks", "/tasks/" + task.ID, "/tasks/" + task.ID + "/file", "/assessments/attempts", "/assessments/attempts/" + attempt, "/audit-events"} {
		path = "/api/v1/admin" + path
		f.request(t, "GET", path, "", "", 401)
		f.request(t, "GET", path, "owner", "", 401)
		w := f.request(t, "GET", path, "staff", "", 200)
		if w.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatal("Ответ кешируется")
		}
		if strings.HasSuffix(path, "/file") {
			continue
		}
		secrets := []string{`"object_key"`, `"bucket"`, `"password_hash"`, `"subject"`, `"phone"`}
		if !strings.Contains(path, "/users") && !strings.HasSuffix(path, "/members") && !strings.Contains(path, "/audit-events") {
			secrets = append(secrets, "candidate@example.test")
		}
		for _, secret := range secrets {
			if strings.Contains(w.Body.String(), secret) {
				t.Fatalf("Секрет в административном ответе: %s", w.Body)
			}
		}
	}
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/companies?status=pending&q=Компания", "root", "", 200), 1)
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/users?role=candidate&status=active", "staff", "", 200), 3)
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/tasks?company_id="+f.otherCompany, "staff", "", 200), 0)
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/assessments/attempts?status=active&candidate_id="+f.profiles["candidate"], "staff", "", 200), 1)
	for _, path := range []string{"/users?role=superadmin", "/companies?status=wrong", "/companies?limit=1&limit=2", "/tasks?company_id=bad", "/audit-events?source=bad", "/audit-events?from=2026-10-10T00:00:00Z&to=2026-10-09T00:00:00Z", "/users?unknown=1", "/companies/bad"} {
		f.request(t, "GET", "/api/v1/admin"+path, "root", "", 400)
	}
	stats := f.request(t, "GET", "/api/v1/admin/stats", "root", "", 200)
	var s struct {
		Companies   struct{ Pending int }
		Tasks       struct{ Total int }
		Submissions struct{ Total int }
	}
	if err := json.Unmarshal(stats.Body.Bytes(), &s); err != nil || s.Companies.Pending != 1 || s.Tasks.Total != 1 || s.Submissions.Total != 1 {
		t.Fatalf("Статистика: %s %v", stats.Body, err)
	}
	// Даже при поддельном actor аргументе репозиторий проверяет реального активного администратора.
	_, err := f.ops.Stats(context.Background(), f.ids["owner"])
	if !errors.Is(err, entity.ErrForbidden) {
		t.Fatal(err)
	}
	f.request(t, "PATCH", "/api/v1/admin/admins/"+f.adminIDs["staff"], "root", `{"status":"blocked"}`, 200)
	f.request(t, "GET", "/api/v1/admin/stats", "staff", "", 401)
	_, err = f.ops.Stats(context.Background(), f.adminIDs["staff"])
	if !errors.Is(err, entity.ErrForbidden) {
		t.Fatal(err)
	}
}

func TestAdminOperationsUserBlockAndContentModeration(t *testing.T) {
	f := newOpsFixture(t)
	task := f.publish(t)
	var need string
	if err := f.db.QueryRow(context.Background(), `INSERT INTO employer_needs(company_id,created_by,specialization_id,title,description) VALUES($1,$2,1,'Go','Описание') RETURNING id::text`, f.company, f.ids["owner"]).Scan(&need); err != nil {
		t.Fatal(err)
	}
	for _, kind := range []struct{ path, id string }{{"tasks", task.ID}, {"needs", need}} {
		path := "/api/v1/admin/" + kind.path + "/" + kind.id + "/moderation"
		f.request(t, "PATCH", path, "staff", `{"status":"hidden"}`, 400)
		f.request(t, "PATCH", path, "staff", `{"status":"hidden","reason":"Нарушение правил"}`, 200)
		f.request(t, "PATCH", path, "staff", `{"status":"hidden","reason":"Нарушение правил"}`, 200)
	}
	f.request(t, "GET", "/api/v1/tasks/"+task.ID, "candidate", "", 404)
	f.request(t, "GET", "/api/v1/tasks/"+task.ID+"/file", "candidate", "", 404)
	f.upload(t, "/api/v1/tasks/"+task.ID+"/submissions", "candidate", nil, 404)
	taskTotal(t, f.request(t, "GET", "/api/v1/tasks", "candidate", "", 200), 0)
	w := f.request(t, "GET", f.taskBase()+"/"+task.ID, "owner", "", 200)
	if !strings.Contains(w.Body.String(), `"moderation_status":"hidden"`) {
		t.Fatalf("Компания не видит статус: %s", w.Body)
	}
	f.request(t, "PATCH", "/api/v1/companies/"+f.company+"/needs/"+need, "owner", `{"status":"active"}`, 403)
	f.request(t, "PATCH", "/api/v1/admin/needs/"+need+"/moderation", "staff", `{"status":"published","reason":"Исправлено"}`, 200)
	f.request(t, "PATCH", "/api/v1/companies/"+f.company+"/needs/"+need, "owner", `{"status":"draft"}`, 200)
	f.request(t, "PATCH", "/api/v1/admin/tasks/"+task.ID+"/moderation", "staff", `{"status":"published","reason":"Исправлено"}`, 200)
	f.request(t, "GET", "/api/v1/tasks/"+task.ID, "candidate", "", 200)
	f.upload(t, "/api/v1/tasks/"+task.ID+"/submissions", "candidate", nil, 409)
	path := "/api/v1/admin/users/" + f.ids["candidate"] + "/status"
	for _, body := range []string{`{"status":"deleted","reason":"test"}`, `{"status":"blocked"}`, `{"status":"blocked","reason":"test","role":"admin"}`} {
		f.request(t, "PATCH", path, "staff", body, 400)
	}
	f.exec(t, `INSERT INTO external_identities(user_id,issuer,subject) VALUES($1,$2,'candidate')`, f.ids["candidate"], testutil.Issuer)
	f.request(t, "PATCH", path, "staff", `{"status":"blocked","reason":"Нарушение правил"}`, 200)
	f.request(t, "PATCH", path, "staff", `{"status":"blocked","reason":"Нарушение правил"}`, 200)
	users := user.NewService(user.NewRepository(f.db))
	if _, err := users.Resolve(context.Background(), testutil.Issuer, "candidate"); !errors.Is(err, user.ErrInactive) {
		t.Fatal("Блокировка не действует для JWT", err)
	}
	f.request(t, "GET", "/api/v1/tasks", "candidate", "", 404) // DB-защита при устаревшей тестовой идентичности.
	f.request(t, "PATCH", path, "staff", `{"status":"active","reason":"Разблокировано"}`, 200)
	if _, err := users.Resolve(context.Background(), testutil.Issuer, "candidate"); err != nil {
		t.Fatal(err)
	}
	f.exec(t, `UPDATE users SET status='deleted' WHERE id=$1`, f.ids["candidate"])
	f.request(t, "PATCH", path, "root", `{"status":"active","reason":"restore"}`, 409)
	var legacy string
	if err := f.db.QueryRow(context.Background(), `INSERT INTO users(role) VALUES('admin') RETURNING id::text`).Scan(&legacy); err != nil {
		t.Fatal(err)
	}
	f.request(t, "PATCH", "/api/v1/admin/users/"+legacy+"/status", "staff", `{"status":"blocked","reason":"test"}`, 403)
	f.request(t, "PATCH", "/api/v1/admin/users/"+legacy+"/status", "root", `{"status":"blocked","reason":"test"}`, 200)
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/audit-events?source=operations&entity_type=user&entity_id="+f.ids["candidate"], "staff", "", 200), 2)
}

func TestAdminOperationsConcurrentDecisions(t *testing.T) {
	f := newOpsFixture(t)
	f.proof(t)
	v := f.requestVerification(t)
	var wg sync.WaitGroup
	start := make(chan struct{})
	results := make(chan *httptest.ResponseRecorder, 2)
	for _, status := range []string{"verified", "rejected"} {
		wg.Add(1)
		go func(status string) {
			defer wg.Done()
			<-start
			results <- f.auth.Do(t, "PATCH", f.adminCompany()+"/verification", f.tokens["staff"], decisionBody(status, v.Version))
		}(status)
	}
	close(start)
	wg.Wait()
	close(results)
	ok, conflict := 0, 0
	for w := range results {
		if w.Code == 200 {
			ok++
		} else if w.Code == 409 {
			conflict++
		} else {
			t.Fatalf("Решение: %d %s", w.Code, w.Body)
		}
	}
	if ok != 1 || conflict != 1 {
		t.Fatalf("Решения: ok=%d conflict=%d", ok, conflict)
	}
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/audit-events?source=operations&entity_id="+f.company, "staff", "", 200), 2)
}
