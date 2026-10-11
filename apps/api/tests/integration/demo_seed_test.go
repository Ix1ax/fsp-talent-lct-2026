//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/demoseed"
)

func TestJuryDemoMigrations(t *testing.T) {
	pool := testDB(t)
	ctx := context.Background()
	db := stdlib.OpenDB(*pool.Config().ConnConfig)
	defer db.Close()
	provider, err := demoseed.Provider(db)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = provider.Up(ctx); err != nil {
		t.Fatal(err)
	}
	assertCount := func(table, where string, want int) {
		t.Helper()
		var n int
		if err := pool.QueryRow(ctx, "SELECT count(*) FROM "+table+" WHERE "+where).Scan(&n); err != nil {
			t.Fatal(err)
		}
		if n != want {
			t.Fatalf("%s count=%d want=%d", table, n, want)
		}
	}
	assertCount("users", "id::text LIKE 'de000001-%'", 37)
	assertCount("candidate_profiles", "id::text LIKE 'de000002-%'", 33)
	assertCount("employer_needs", "id::text LIKE 'de000004-%'", 28)
	assertCount("candidate_offers", "id::text LIKE 'de000008-%'", 32)
	assertCount("files", "id::text LIKE 'de000005-%' AND status='pending'", 22)
	assertCount("assessment_attempts", "id::text LIKE 'de000009-%'", 33)
	assertCount("assessment_attempts", "id::text LIKE 'de000009-%' AND status='active'", 0)
	assertCount("candidate_categories", "candidate_id::text LIKE 'de000002-%'", 27)
	assertCount("company_task_submissions", "id::text LIKE 'de000007-%'", 12)
	var accepted string
	if err = pool.QueryRow(ctx, `SELECT status FROM candidate_offers WHERE id='de000008-0000-4000-8000-000000000003'`).Scan(&accepted); err != nil || accepted != "accepted" {
		t.Fatalf("old accepted=%s err=%v", accepted, err)
	}
	// Juror edits survive restart; no repeated fixture mutation.
	_, err = pool.Exec(ctx, `UPDATE candidate_profiles SET summary='Изменено жюри' WHERE id='de000002-0000-4000-8000-000000000001'`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = provider.Up(ctx); err != nil {
		t.Fatal(err)
	}
	var summary string
	_ = pool.QueryRow(ctx, `SELECT summary FROM candidate_profiles WHERE id='de000002-0000-4000-8000-000000000001'`).Scan(&summary)
	if summary != "Изменено жюри" {
		t.Fatal("restart reset data")
	}
	if _, err = provider.DownTo(ctx, 0); err != nil {
		t.Fatal(err)
	}
	assertCount("users", "id::text LIKE 'de000001-%'", 0)
	if _, err = provider.Up(ctx); err != nil {
		t.Fatal(err)
	}
}

func TestJuryProvisioningRestartKeepsEditsAndRetriesFiles(t *testing.T) {
	pool := testDB(t)
	db := stdlib.OpenDB(*pool.Config().ConnConfig)
	defer db.Close()
	ctx := context.Background()
	users := map[string]map[string]any{}
	created, uploads, profileWrites := 0, 0, 0
	marker := false
	failUpload := true
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/token"):
			_ = json.NewEncoder(w).Encode(map[string]string{"access_token": "test-admin"})
		case strings.HasSuffix(r.URL.Path, "/users/profile"):
			if r.Method == "PUT" {
				var profile map[string]any
				_ = json.NewDecoder(r.Body).Decode(&profile)
				if profile["preserve"] != "existing" {
					t.Error("profile config lost")
				}
				marker = true
				profileWrites++
				w.WriteHeader(204)
				return
			}
			attributes := []map[string]any{{"name": "username"}}
			if marker {
				attributes = append(attributes, map[string]any{"name": "fsp_demo", "permissions": map[string]any{"view": []string{"admin"}, "edit": []string{"admin"}}})
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"attributes": attributes, "preserve": "existing"})
		case strings.HasSuffix(r.URL.Path, "/users"):
			if r.Method == "POST" {
				var u map[string]any
				_ = json.NewDecoder(r.Body).Decode(&u)
				if !marker {
					t.Error("created before marker configured")
					w.WriteHeader(500)
					return
				}
				email := u["username"].(string)
				u["id"] = fmt.Sprintf("actual-keycloak-id-%d", len(users)+1)
				delete(u, "credentials")
				users[email] = u
				created++
				w.WriteHeader(201)
				return
			}
			found := []map[string]any{}
			if u := users[r.URL.Query().Get("username")]; u != nil {
				found = append(found, u)
			}
			_ = json.NewEncoder(w).Encode(found)
		case r.Method == "PUT":
			if failUpload {
				w.WriteHeader(403)
				return
			}
			uploads++
			b, _ := io.ReadAll(r.Body)
			if len(b) < 8 {
				t.Error("empty fixture")
			}
			w.WriteHeader(200)
		default:
			t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
			w.WriteHeader(500)
		}
	}))
	defer server.Close()
	for key, value := range map[string]string{"OIDC_ISSUER": "http://identity.test/realms/fsp", "KEYCLOAK_URL": server.URL, "KEYCLOAK_ADMIN_USER": "admin", "KEYCLOAK_ADMIN_PASSWORD": "secret", "S3_ENDPOINT": server.URL, "S3_ACCESS_KEY": "access", "S3_SECRET_KEY": "secret", "S3_BUCKET": "test-bucket"} {
		t.Setenv(key, value)
	}
	if err := demoseed.Apply(ctx, db); err == nil {
		t.Fatal("upload failure ignored")
	}
	var hash string
	if err := pool.QueryRow(ctx, `SELECT password_hash FROM admin_accounts WHERE email='admin@demo.fsp.test'`).Scan(&hash); err != nil {
		t.Fatal(err)
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte("adminadminadmin")); err != nil {
		t.Fatal(err)
	}
	failUpload = false
	if err := demoseed.Apply(ctx, db); err != nil {
		t.Fatal(err)
	}
	if created != 5 || uploads != 22 || profileWrites != 1 {
		t.Fatalf("created=%d uploads=%d profile writes=%d", created, uploads, profileWrites)
	}
	if _, err := pool.Exec(ctx, `UPDATE files SET status='deleted' WHERE id='de000005-0000-4000-8000-000000000201'`); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `UPDATE admin_accounts SET password_hash='jury-changed-password' WHERE email='admin@demo.fsp.test'`); err != nil {
		t.Fatal(err)
	}
	if err := demoseed.Apply(ctx, db); err != nil {
		t.Fatal(err)
	}
	var state string
	_ = pool.QueryRow(ctx, `SELECT status FROM files WHERE id='de000005-0000-4000-8000-000000000201'`).Scan(&state)
	_ = pool.QueryRow(ctx, `SELECT password_hash FROM admin_accounts WHERE email='admin@demo.fsp.test'`).Scan(&hash)
	if state != "deleted" || hash != "jury-changed-password" || created != 5 || uploads != 22 {
		t.Fatal("restart reset a juror's changes")
	}
}
