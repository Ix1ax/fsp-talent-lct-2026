package demoseed

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestEnsureUserCreatesOnceAndPreservesCredentials(t *testing.T) {
	var user *kcUser
	creates := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-token" {
			t.Error("missing token")
		}
		switch r.Method {
		case "GET":
			if r.URL.Query().Get("exact") != "true" {
				t.Error("lookup must be exact")
			}
			found := []kcUser{}
			if user != nil {
				found = append(found, *user)
			}
			_ = json.NewEncoder(w).Encode(found)
		case "POST":
			creates++
			var u kcUser
			if err := json.NewDecoder(r.Body).Decode(&u); err != nil {
				t.Error(err)
			}
			if !u.EmailVerified || !u.Enabled || len(u.RequiredActions) != 0 || len(u.Credentials) != 1 || u.Credentials[0].Value != "1234" || u.Credentials[0].Temporary {
				t.Errorf("wrong account flags")
			}
			u.ID = "actual-server-subject"
			u.Credentials = nil
			user = &u
			w.WriteHeader(201)
		default:
			t.Errorf("unexpected mutation %s", r.Method)
			w.WriteHeader(500)
		}
	}))
	defer server.Close()
	k := keycloak{base: server.URL, realm: "fsp", token: "test-token", client: server.Client()}
	for range 2 {
		id, err := k.ensureUser(context.Background(), accounts[0])
		if err != nil || id != "actual-server-subject" {
			t.Fatalf("id=%q err=%v", id, err)
		}
	}
	if creates != 1 {
		t.Fatalf("created %d times", creates)
	}
}
func TestEnsureUserRefusesExistingUnmarkedUser(t *testing.T) {
	writes := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			writes++
			w.WriteHeader(500)
			return
		}
		_ = json.NewEncoder(w).Encode([]kcUser{{ID: "existing", Username: accounts[0].Email}})
	}))
	defer server.Close()
	k := keycloak{base: server.URL, realm: "fsp", client: server.Client()}
	if _, err := k.ensureUser(context.Background(), accounts[0]); err == nil {
		t.Fatal("existing user claimed")
	}
	if writes != 0 {
		t.Fatal("existing user modified")
	}
}
func TestKeycloakErrorsDoNotExposeResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(401)
		_, _ = w.Write([]byte("sensitive-password-and-token"))
	}))
	defer server.Close()
	k := keycloak{base: server.URL, client: server.Client()}
	err := k.login(context.Background(), "admin", "private-password")
	if err == nil || strings.Contains(err.Error(), "private-password") || strings.Contains(err.Error(), "sensitive") {
		t.Fatalf("unsafe error: %v", err)
	}
}
