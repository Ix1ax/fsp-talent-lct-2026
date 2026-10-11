//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	adminentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/entity"
	adminrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/repository"
	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

func TestAdminStatusRevokesEverySessionAndAudits(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	admins := adminservice.New(adminrepo.New(db))
	const password = "Admin-Status-Password-2026"
	if err := admins.Bootstrap(ctx, "root@example.test", password); err != nil {
		t.Fatal(err)
	}
	root, err := admins.Login(ctx, adminentity.Credentials{Email: "root@example.test", Password: password}, "root")
	if err != nil {
		t.Fatal(err)
	}
	staff, err := admins.Create(ctx, root.Admin, adminentity.Credentials{Email: "staff@example.test", Password: password})
	if err != nil {
		t.Fatal(err)
	}
	login := func() adminentity.Login {
		t.Helper()
		v, err := admins.Login(ctx, adminentity.Credentials{Email: staff.Email, Password: password}, "staff")
		if err != nil {
			t.Fatal(err)
		}
		return v
	}
	first, second := login(), login()
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Admins: admins})
	path := "/api/v1/admin/admins/" + staff.ID
	patch := func(path, token, body string, status int, code string) {
		t.Helper()
		w := e.Do(t, "PATCH", path, token, body)
		if w.Code != status {
			t.Fatalf("PATCH: %d %s", w.Code, w.Body)
		}
		if w.Header().Get("X-Request-ID") == "" {
			t.Fatal("нет request ID")
		}
		if code != "" && testutil.ErrorCode(t, w) != code {
			t.Fatalf("код: %s", w.Body)
		}
		if status == 200 {
			var a adminentity.Account
			if err := json.Unmarshal(w.Body.Bytes(), &a); err != nil {
				t.Fatal(err)
			}
			if a.ID != staff.ID || strings.Contains(w.Body.String(), "password") {
				t.Fatalf("аккаунт: %s", w.Body)
			}
		}
	}
	patch(path, "", `{"status":"blocked"}`, 401, "unauthorized")
	patch(path, first.AccessToken, `{"status":"blocked"}`, 403, "forbidden")
	patch(path, root.AccessToken, `{"status":"deleted"}`, 400, "validation_error")
	patch(path, root.AccessToken, `{"status":"blocked","role":"admin"}`, 400, "validation_error")
	patch("/api/v1/admin/admins/no-uuid", root.AccessToken, `{"status":"blocked"}`, 400, "validation_error")
	patch("/api/v1/admin/admins/22222222-2222-4222-8222-222222222222", root.AccessToken, `{"status":"blocked"}`, 404, "admin_not_found")
	patch("/api/v1/admin/admins/"+root.Admin.ID, root.AccessToken, `{"status":"blocked"}`, 409, "admin_status_change_forbidden")
	patch(path, root.AccessToken, `{"status":"blocked"}`, 200, "")
	patch(path, root.AccessToken, `{"status":"blocked"}`, 200, "")
	for _, token := range []string{first.AccessToken, second.AccessToken} {
		if w := e.Do(t, "GET", "/api/v1/admin/auth/me", token, ""); w.Code != 401 {
			t.Fatalf("сессия не отозвана: %d", w.Code)
		}
	}
	if _, err := admins.Login(ctx, adminentity.Credentials{Email: staff.Email, Password: password}, "staff"); err == nil {
		t.Fatal("заблокированный вошёл")
	}
	patch(path, root.AccessToken, `{"status":"active"}`, 200, "")
	patch(path, root.AccessToken, `{"status":"active"}`, 200, "")
	login()
	for _, token := range []string{first.AccessToken, second.AccessToken} {
		if w := e.Do(t, "GET", "/api/v1/admin/auth/me", token, ""); w.Code != 401 {
			t.Fatal("старая сессия восстановилась")
		}
	}
	var events, sessions int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM admin_status_events WHERE actor_id=$1 AND admin_id=$2 AND old_status<>new_status`, root.Admin.ID, staff.ID).Scan(&events); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM admin_sessions WHERE admin_id=$1`, staff.ID).Scan(&sessions); err != nil {
		t.Fatal(err)
	}
	if events != 2 || sessions != 1 {
		t.Fatalf("аудит=%d сессии=%d", events, sessions)
	}
}
