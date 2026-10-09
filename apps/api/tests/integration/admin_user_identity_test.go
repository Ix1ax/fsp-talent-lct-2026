//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

func identityResponse(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var result map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	return result
}

func TestAdminUserNamesSearchAndMembership(t *testing.T) {
	f := newBlockFixture(t)
	f.exec(t, `INSERT INTO candidate_contacts(user_id,full_name,email,phone,telegram) VALUES($1,'Иван НеподходящееИмя','contact@example.test','+7 900 1234567','private_contact')`, f.ids["candidate"])
	f.request(t, "GET", "/api/v1/me", "candidate", "", 200)
	f.request(t, "GET", "/api/v1/me", "owner", "", 200)
	path := "/api/v1/admin/users/" + f.ids["candidate"]
	for _, who := range []string{"root", "staff"} {
		w := f.request(t, "GET", path, who, "", 200)
		v := identityResponse(t, w)
		if v["full_name"] != "Иван НеподходящееИмя" || v["full_name_source"] != "candidate_contacts" || v["email"] != "candidate@example.test" || v["contact_email"] != "contact@example.test" || v["identity_updated_at"] == nil {
			t.Fatal(v)
		}
		for _, secret := range []string{"+7 900", "private_contact", `"subject"`, `"issuer"`, `"password"`} {
			if strings.Contains(w.Body.String(), secret) {
				t.Fatal("Лишние данные в карточке", w.Body)
			}
		}
		if w.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatal("Персональные данные кешируются")
		}
	}
	for _, q := range []string{"НЕПОДХОДЯЩЕЕИМЯ", "CANDIDATE@EXAMPLE.TEST", "contact@example", f.ids["candidate"], f.profiles["candidate"]} {
		taskTotal(t, f.request(t, "GET", "/api/v1/admin/users?role=candidate&q="+url.QueryEscape(q), "staff", "", 200), 1)
	}
	f.request(t, "PATCH", path+"/status", "staff", `{"status":"blocked","reason":"Некорректное имя профиля"}`, 200)
	f.exec(t, `UPDATE candidate_profiles SET search_status='hidden' WHERE user_id=$1`, f.ids["candidate"])
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/users?status=blocked&role=candidate&q="+url.QueryEscape("НеподходящееИмя"), "staff", "", 200), 1)
	f.request(t, "GET", path, "owner", "", 401)
	// Пустой/неизвестный профиль не выдумывает имя или почту.
	v := identityResponse(t, f.request(t, "GET", "/api/v1/admin/users/"+f.ids["no_profile"], "staff", "", 200))
	if v["full_name"] != nil || v["email"] != nil || v["contact_email"] != nil {
		t.Fatal(v)
	}
	taskTotal(t, f.request(t, "GET", "/api/v1/admin/users?q=%25_", "staff", "", 200), 0)
	// Несколько внешних идентичностей не дублируют пользователей и участников.
	f.exec(t, `INSERT INTO external_identities(user_id,issuer,subject,email,display_name,profile_updated_at) VALUES($1,'https://other.test','other-owner','old@example.test','Старое имя',clock_timestamp()-interval '1 day')`, f.ids["owner"])
	newName := f.auth.TokenClaims(t, "owner", map[string]any{"name": "Имя Работодателя", "iat": time.Now().Add(time.Second).Unix()})
	w := f.auth.Do(t, "GET", "/api/v1/me", newName, "")
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body)
	}
	v = identityResponse(t, f.request(t, "GET", "/api/v1/admin/companies/"+f.company+"/members?limit=1", "staff", "", 200))
	if v["total"] != float64(3) {
		t.Fatal(v)
	}
	v = identityResponse(t, f.request(t, "GET", "/api/v1/admin/companies/"+f.company+"/members", "staff", "", 200))
	ownerFound := false
	for _, item := range v["items"].([]any) {
		member := item.(map[string]any)
		if member["user_id"] == f.ids["owner"] {
			ownerFound = true
			if member["full_name"] != "Имя Работодателя" || member["email"] != "owner@example.test" || member["user_role"] != "employer" {
				t.Fatal(member)
			}
		}
	}
	if !ownerFound {
		t.Fatal("Участник потерян")
	}
	f.exec(t, `INSERT INTO company_members(company_id,user_id,role,status) VALUES($1,$2,'viewer','inactive')`, f.otherCompany, f.ids["owner"])
	companies := "/api/v1/admin/users/" + f.ids["owner"] + "/companies"
	taskTotal(t, f.request(t, "GET", companies+"?limit=1&offset=1", "staff", "", 200), 2)
	taskTotal(t, f.request(t, "GET", path+"/companies", "staff", "", 200), 0)
	f.request(t, "GET", "/api/v1/admin/users/00000000-0000-4000-8000-000000000099/companies", "staff", "", 404)
	f.request(t, "GET", companies, "owner", "", 401)
	f.request(t, "GET", companies+"?status=active", "staff", "", 400)
}

func TestIdentityProfileRegistrationRefreshAndOldTokens(t *testing.T) {
	f := newBlockFixture(t)
	ctx := context.Background()
	issued := time.Now().Add(-time.Minute)
	token := f.auth.TokenClaims(t, "registered-profile", map[string]any{"name": "Анна Иванова", "email": "Anna@example.test", "iat": issued.Unix()})
	w := f.auth.Do(t, "POST", "/api/v1/me/register", token, `{"role":"employer","email":"forged@example.test","name":"Поддельное имя"}`)
	if w.Code != 201 {
		t.Fatal(w.Code, w.Body)
	}
	id := identityResponse(t, w)["id"].(string)
	path := "/api/v1/admin/users/" + id
	v := identityResponse(t, f.request(t, "GET", path, "staff", "", 200))
	if v["email"] != "Anna@example.test" || v["full_name"] != "Анна Иванова" || v["full_name_source"] != "identity" {
		t.Fatal(v)
	}
	newToken := f.auth.TokenClaims(t, "registered-profile", map[string]any{"given_name": "Анна", "family_name": "Петрова", "email": "new@example.test", "iat": issued.Add(30 * time.Second).Unix()})
	for _, tok := range []string{newToken, token, newToken} {
		if w := f.auth.Do(t, "GET", "/api/v1/me", tok, ""); w.Code != 200 {
			t.Fatal(w.Code, w.Body)
		}
	}
	v = identityResponse(t, f.request(t, "GET", path, "staff", "", 200))
	if v["email"] != "new@example.test" || v["full_name"] != "Анна Петрова" {
		t.Fatal("Старый JWT откатил профиль", v)
	}
	date := v["identity_updated_at"]
	f.auth.Do(t, "GET", "/api/v1/me", newToken, "")
	if identityResponse(t, f.request(t, "GET", path, "staff", "", 200))["identity_updated_at"] != date {
		t.Fatal("Тот же JWT переписал снимок")
	}
	f.request(t, "PATCH", path+"/status", "staff", `{"status":"blocked","reason":"Нарушение"}`, 200)
	latest := f.auth.TokenClaims(t, "registered-profile", map[string]any{"name": "После блокировки", "email": "newest@example.test", "iat": time.Now().Unix()})
	if w := f.auth.Do(t, "GET", "/api/v1/me", latest, ""); w.Code != 200 {
		t.Fatal(w.Code, w.Body)
	}
	v = identityResponse(t, f.request(t, "GET", path, "staff", "", 200))
	if v["status"] != "blocked" || v["blocked_reason"] != "Нарушение" || v["email"] != "newest@example.test" {
		t.Fatal(v)
	}
	// Синхронизация без времени и со старым токеном не откатывает актуальное состояние.
	r := user.NewRepository(f.db)
	if err := r.SyncIdentityProfile(ctx, "https://issuer.test", "registered-profile", user.IdentityProfile{Email: "old@example.test"}); err != nil {
		t.Fatal(err)
	}
	if identityResponse(t, f.request(t, "GET", path, "staff", "", 200))["email"] != "newest@example.test" {
		t.Fatal("JWT без iat откатил профиль")
	}
	f.exec(t, `UPDATE users SET status='deleted' WHERE id=$1`, id)
	if w := f.auth.Do(t, "GET", "/api/v1/me", latest, ""); w.Code != 403 {
		t.Fatal(w.Code, w.Body)
	}
}

func TestIdentityImportAndAuditActorNames(t *testing.T) {
	f := newBlockFixture(t)
	ctx := context.Background()
	r := user.NewRepository(f.db)
	observed := time.Now().Add(-time.Minute)
	records := []user.IdentityImportUser{{Subject: "owner", Email: "actual-owner@example.test", EmailVerified: true, FirstName: "Иван", LastName: "Владелец"}, {Subject: "missing", Email: "unknown@example.test", EmailVerified: true}, {Subject: "blocked", Email: "blocked@example.test", EmailVerified: true}}
	result, err := r.ImportIdentityProfiles(ctx, "https://issuer.test", records, observed)
	if err != nil || result.Updated != 2 || result.Skipped != 1 {
		t.Fatal(result, err)
	}
	result, err = r.ImportIdentityProfiles(ctx, "https://issuer.test", records, observed)
	if err != nil || result.Updated != 0 {
		t.Fatal("Повтор импорта меняет данные", result, err)
	}
	bad := append(append([]user.IdentityImportUser{}, records...), user.IdentityImportUser{Subject: "candidate", Email: "not-email", EmailVerified: true})
	bad[0].Email = "must-not-persist@example.test"
	if _, err = r.ImportIdentityProfiles(ctx, "https://issuer.test", bad, observed.Add(time.Second)); err == nil {
		t.Fatal("Принята плохая выгрузка")
	}
	v := identityResponse(t, f.request(t, "GET", "/api/v1/admin/users/"+f.ids["owner"], "staff", "", 200))
	if v["email"] != "actual-owner@example.test" || v["full_name"] != "Иван Владелец" {
		t.Fatal(v)
	}
	// Отсутствующий/чужой issuer не переносит чужие данные на аккаунт приложения.
	result, err = r.ImportIdentityProfiles(ctx, "https://different-issuer.test", records, observed)
	if err != nil || result.Updated != 0 {
		t.Fatal(result, err)
	}
	if _, err = r.ImportIdentityProfiles(ctx, "https://issuer.test", append(records, records[0]), observed); err == nil {
		t.Fatal("Повторные идентичности приняты")
	}
	f.request(t, "PATCH", f.adminCompany()+"/status", "staff", `{"status":"blocked","reason":"Проверка"}`, 200)
	f.exec(t, `INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id) VALUES($1,'profile.test','user',$1)`, f.ids["owner"])
	audit := identityResponse(t, f.request(t, "GET", "/api/v1/admin/audit-events?action=company.status_changed", "staff", "", 200))
	item := audit["items"].([]any)[0].(map[string]any)
	if item["actor_id"] != f.adminIDs["staff"] || item["actor_email"] != "staff@ops.test" || item["actor_name"] != nil {
		t.Fatal(item)
	}
	audit = identityResponse(t, f.request(t, "GET", "/api/v1/admin/audit-events?action=profile.test", "staff", "", 200))
	item = audit["items"].([]any)[0].(map[string]any)
	if item["actor_name"] != "Иван Владелец" || item["actor_email"] != "actual-owner@example.test" || item["actor_kind"] != "user" {
		t.Fatal(item)
	}
	// В сохранённых событиях остаются только ID, данные добавляются при разрешённом чтении.
	var leaks int
	if err = f.db.QueryRow(ctx, `SELECT count(*) FROM audit_events WHERE metadata::text LIKE '%actual-owner%'`).Scan(&leaks); err != nil || leaks != 0 {
		t.Fatal(leaks, err)
	}
}

// Наличие административного снимка имени/почты не расширяет видимость работодателя.
func TestAdminIdentityStaysOutOfEmployerResponses(t *testing.T) {
	f := newBlockFixture(t)
	// Fixture заданий уже выдаёт согласия; подтверждение банка начинает свой сценарий с нуля.
	f.exec(t, `DELETE FROM candidate_consents WHERE user_id=$1`, f.ids["candidate"])
	confirmBankCandidate(t, f.offerFixture, "candidate")
	const fullName = "Уникальное ЗакрытоеФИО"
	f.exec(t, `INSERT INTO candidate_contacts(user_id,full_name,email,phone,telegram) VALUES($1,$2,'private-contact@example.test','+7 912 888 7766','secret_telegram')`, f.ids["candidate"], fullName)
	for _, who := range []string{"owner", "candidate"} {
		token := f.auth.TokenClaims(t, who, map[string]any{"name": fullName, "iat": time.Now().Add(time.Second).Unix()})
		w := f.auth.Do(t, "GET", "/api/v1/me", token, "")
		if w.Code != 200 {
			t.Fatal(w.Code, w.Body)
		}
	}
	adminPath := "/api/v1/admin/users/" + f.ids["candidate"]
	v := identityResponse(t, f.request(t, "GET", adminPath, "staff", "", 200))
	if v["full_name"] != fullName || v["email"] != "candidate@example.test" {
		t.Fatal(v)
	}
	offer := f.create(t)
	var need string
	if err := f.db.QueryRow(context.Background(), `INSERT INTO employer_needs(company_id,created_by,specialization_id,title,description,status) VALUES($1,$2,1,'Backend','Команда','active') RETURNING id::text`, f.company, f.ids["owner"]).Scan(&need); err != nil {
		t.Fatal(err)
	}
	base := "/api/v1/companies/" + f.company
	for _, route := range []struct{ method, path string }{
		{"GET", base + "/candidates"},
		{"GET", base + "/candidates/" + f.profiles["candidate"]},
		{"POST", base + "/candidates/" + f.profiles["candidate"] + "/view"},
		{"GET", base + "/needs/" + need + "/candidates"},
		{"GET", base + "/members"},
		{"GET", base + "/offers"},
		{"GET", base + "/offers/" + offer.ID},
		{"GET", "/api/v1/me"},
	} {
		w := f.request(t, route.method, route.path, "owner", "", 200)
		for _, secret := range []string{fullName, "candidate@example.test", "private-contact@example.test", "+7 912 888 7766", "secret_telegram", `"full_name"`, `"display_name"`, `"identity_updated_at"`} {
			if strings.Contains(w.Body.String(), secret) {
				t.Fatalf("%s раскрыл личные данные: %s", route.path, w.Body)
			}
		}
	}
	contacts := base + "/offers/" + offer.ID + "/candidate-contacts"
	f.request(t, "GET", contacts, "owner", "", 404)
	f.request(t, "POST", "/api/v1/me/offers/"+offer.ID+"/respond", "candidate", `{"status":"accepted"}`, 200)
	w := f.request(t, "GET", contacts, "owner", "", 200)
	if !strings.Contains(w.Body.String(), fullName) || !strings.Contains(w.Body.String(), "private-contact@example.test") || strings.Contains(w.Body.String(), "candidate@example.test") {
		t.Fatal(w.Body)
	}
	for _, who := range []string{"owner", "candidate", ""} {
		f.request(t, "GET", adminPath, who, "", 401)
	}
	f.request(t, "GET", base+"/candidates", "", "", 401)
	f.exec(t, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1`, f.ids["candidate"])
	f.request(t, "GET", contacts, "owner", "", 409)
	f.request(t, "GET", adminPath, "staff", "", 200)
}
