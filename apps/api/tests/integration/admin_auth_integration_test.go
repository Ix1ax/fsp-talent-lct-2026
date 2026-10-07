//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

func TestAdminAuthIsolationAndPermissions(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	admins := service.New(repository.New(db))
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Admins: admins})
	const password = "Test-Admin-Password-2026"
	login := func(email, password string, status int) entity.Login {
		t.Helper()
		body, _ := json.Marshal(entity.Credentials{Email: email, Password: password})
		w := e.Do(t, "POST", "/api/v1/admin/auth/login", "", string(body))
		if w.Code != status {
			t.Fatalf("Вход: %d %s, ожидали %d", w.Code, w.Body, status)
		}
		var result entity.Login
		if status == 200 {
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if w.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("Токен можно кешировать")
			}
		}
		return result
	}
	// Миграция создаёт запись, но вход до безопасной активации невозможен.
	login("superadmin@fsp.local", password, 401)
	if err := admins.Bootstrap(ctx, "Root@Example.test", password); err != nil {
		t.Fatal(err)
	}
	root := login("ROOT@example.test", password, 200)
	if root.Admin.Role != "superadmin" || root.ExpiresAt.Before(time.Now()) || len(root.AccessToken) != 43 {
		t.Fatalf("Неверная сессия: %+v", root)
	}
	var hash string
	if err := db.QueryRow(ctx, `SELECT password_hash FROM admin_accounts WHERE id=$1`, root.Admin.ID).Scan(&hash); err != nil {
		t.Fatal(err)
	}
	if hash == password || bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		t.Fatal("Пароль не захеширован")
	}
	if err := admins.Bootstrap(ctx, "changed@example.test", "Another-Password-2026"); err != nil {
		t.Fatal(err)
	}
	login("root@example.test", password, 200)
	login("root@example.test", "incorrect", 401)
	request := func(method, path, token, body string, status int) string {
		t.Helper()
		w := e.Do(t, method, path, token, body)
		if w.Code != status {
			t.Fatalf("%s %s: %d %s, ожидали %d", method, path, w.Code, w.Body, status)
		}
		return w.Body.String()
	}
	request("GET", "/api/v1/admin/auth/me", root.AccessToken, "", 200)
	request("GET", "/api/v1/admin/auth/me", e.Token(t, "candidate"), "", 401)
	request("GET", "/api/v1/me", root.AccessToken, "", 401)
	request("POST", "/api/v1/admin/auth/register", "", `{}`, 404)
	body := `{"email":"staff@example.test","password":"Staff-Password-2026"}`
	request("POST", "/api/v1/admin/admins", "", body, 401)
	created := request("POST", "/api/v1/admin/admins", root.AccessToken, body, 201)
	if strings.Contains(created, "password") || strings.Contains(created, "hash") {
		t.Fatal("Ответ раскрыл пароль")
	}
	request("POST", "/api/v1/admin/admins", root.AccessToken, body, 409)
	request("POST", "/api/v1/admin/admins", root.AccessToken, `{"email":"x@example.test","password":"Staff-Password-2026","role":"superadmin"}`, 400)
	request("POST", "/api/v1/admin/admins", root.AccessToken, `{"email":"x@example.test","password":"short"}`, 400)
	staff := login("staff@example.test", "Staff-Password-2026", 200)
	request("GET", "/api/v1/admin/admins", root.AccessToken, "", 200)
	request("GET", "/api/v1/admin/admins", staff.AccessToken, "", 403)
	if staff.Admin.Role != "admin" {
		t.Fatal("Создан второй суперадмин")
	}
	request("POST", "/api/v1/admin/admins", staff.AccessToken, body, 403)
	if _, err := db.Exec(ctx, `UPDATE admin_accounts SET status='blocked' WHERE id=$1`, staff.Admin.ID); err != nil {
		t.Fatal(err)
	}
	request("GET", "/api/v1/admin/auth/me", staff.AccessToken, "", 401)
	login("staff@example.test", "Staff-Password-2026", 401)
	expired := login("root@example.test", password, 200)
	if _, err := db.Exec(ctx, `UPDATE admin_sessions SET created_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE admin_id=$1`, root.Admin.ID); err != nil {
		t.Fatal(err)
	}
	request("GET", "/api/v1/admin/auth/me", expired.AccessToken, "", 401)
	root = login("root@example.test", password, 200)
	request("POST", "/api/v1/admin/auth/logout", root.AccessToken, "", 204)
	request("GET", "/api/v1/admin/auth/me", root.AccessToken, "", 401)
}

func TestAdminLoginRateLimit(t *testing.T) {
	db := testDB(t)
	admins := service.New(repository.New(db))
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Admins: admins})
	for i := 0; i < 11; i++ {
		w := e.Do(t, "POST", "/api/v1/admin/auth/login", "", `{"email":"unknown@example.test","password":"Test-Password-2026"}`)
		want := 401
		if i == 10 {
			want = 429
		}
		if w.Code != want {
			t.Fatalf("Попытка %d: %d %s, ожидали %d", i, w.Code, w.Body, want)
		}
	}
}
