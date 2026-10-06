package httpapi

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gin-gonic/gin"
	"github.com/go-jose/go-jose/v4"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

const testIssuer = "https://issuer.test"

type memStore struct{ users map[string]user.User }

func (m *memStore) FindByIdentity(_ context.Context, issuer, subject string) (user.User, error) {
	if u, ok := m.users[issuer+"|"+subject]; ok {
		return u, nil
	}
	return user.User{}, user.ErrNotFound
}

func (m *memStore) Create(_ context.Context, issuer, subject, role string) (user.User, error) {
	key := issuer + "|" + subject
	if _, ok := m.users[key]; ok {
		return user.User{}, user.ErrExists
	}
	u := user.User{ID: "id-" + subject, Role: role, Status: user.StatusActive}
	m.users[key] = u
	return u, nil
}

type authEnv struct {
	router *gin.Engine
	store  *memStore
	signer jose.Signer
}

func newAuthEnv(t *testing.T, companies ...*service.CompanyService) *authEnv {
	opts := Options{}
	if len(companies) > 0 {
		opts.Companies = companies[0]
	}
	return newAuthEnvWithOptions(t, opts)
}

func newAuthEnvWithOptions(t *testing.T, opts Options) *authEnv {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	signer, err := jose.NewSigner(jose.SigningKey{Algorithm: jose.RS256, Key: key}, nil)
	if err != nil {
		t.Fatal(err)
	}
	verifier := oidc.NewVerifier(testIssuer, &oidc.StaticKeySet{PublicKeys: []crypto.PublicKey{&key.PublicKey}}, &oidc.Config{ClientID: "fsp-api"})
	store := &memStore{users: map[string]user.User{}}
	opts.CORSOrigins = "*"
	opts.Users = user.NewService(store)
	router := New(slog.New(slog.NewTextHandler(io.Discard, nil)), checker{}, verifier, opts)
	return &authEnv{router: router, store: store, signer: signer}
}

func (e *authEnv) token(t *testing.T, sub string) string {
	t.Helper()
	payload, _ := json.Marshal(map[string]any{"iss": testIssuer, "aud": "fsp-api", "sub": sub, "exp": time.Now().Add(time.Hour).Unix(), "email": sub + "@example.test", "email_verified": true})
	signed, err := e.signer.Sign(payload)
	if err != nil {
		t.Fatal(err)
	}
	s, err := signed.CompactSerialize()
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func (e *authEnv) do(t *testing.T, method, path, token, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	e.router.ServeHTTP(w, req)
	return w
}

func errorCode(t *testing.T, w *httptest.ResponseRecorder) string {
	t.Helper()
	var body struct {
		Error struct{ Code, Message string }
	}
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("не JSON: %s", w.Body)
	}
	if body.Error.Message == "" {
		t.Fatalf("нет сообщения об ошибке: %s", w.Body)
	}
	return body.Error.Code
}

func TestRegistrationFlow(t *testing.T) {
	e := newAuthEnv(t)
	token := e.token(t, "alice")

	if w := e.do(t, "GET", "/api/v1/me", token, ""); w.Code != 404 || errorCode(t, w) != "not_registered" {
		t.Fatalf("до регистрации ожидали 404 not_registered: %d %s", w.Code, w.Body)
	}
	w := e.do(t, "POST", "/api/v1/me/register", token, `{"role":"employer"}`)
	if w.Code != 201 {
		t.Fatalf("регистрация: %d %s", w.Code, w.Body)
	}
	var created map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &created)
	if created["role"] != "employer" || created["status"] != "active" || created["email"] != "alice@example.test" || created["id"] == "" {
		t.Fatalf("неверный ответ: %v", created)
	}
	w = e.do(t, "GET", "/api/v1/me", token, "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"role":"employer"`) {
		t.Fatalf("после регистрации: %d %s", w.Code, w.Body)
	}
	if w := e.do(t, "POST", "/api/v1/me/register", token, `{"role":"candidate"}`); w.Code != 409 || errorCode(t, w) != "already_registered" {
		t.Fatalf("повторная регистрация: %d %s", w.Code, w.Body)
	}
	if e.store.users[testIssuer+"|alice"].Role != "employer" {
		t.Fatal("повторная регистрация изменила роль")
	}
}

func TestRegistrationValidation(t *testing.T) {
	e := newAuthEnv(t)
	token := e.token(t, "bob")
	for name, body := range map[string]string{"admin": `{"role":"admin"}`, "пустая роль": `{"role":""}`, "нет поля": `{}`, "не JSON": `oops`, "чужая роль": `{"role":"root"}`} {
		w := e.do(t, "POST", "/api/v1/me/register", token, body)
		if w.Code != 400 {
			t.Fatalf("%s: ожидали 400, получили %d %s", name, w.Code, w.Body)
		}
		errorCode(t, w)
	}
	if len(e.store.users) != 0 {
		t.Fatal("при ошибке валидации пользователь не должен создаваться")
	}
	if w := e.do(t, "POST", "/api/v1/me/register", "", `{"role":"candidate"}`); w.Code != 401 {
		t.Fatalf("без токена ожидали 401, получили %d", w.Code)
	}
}

func TestBlockedUser(t *testing.T) {
	e := newAuthEnv(t)
	e.store.users[testIssuer+"|eve"] = user.User{ID: "1", Role: "candidate", Status: "blocked"}
	w := e.do(t, "GET", "/api/v1/me", e.token(t, "eve"), "")
	if w.Code != 403 || errorCode(t, w) != "user_inactive" {
		t.Fatalf("заблокированный пользователь: %d %s", w.Code, w.Body)
	}
}

func TestRequireRole(t *testing.T) {
	r := gin.New()
	r.GET("/", func(c *gin.Context) { c.Set(userKey, user.User{Role: c.Query("role")}) }, requireRole("employer"), func(c *gin.Context) { c.Status(200) })
	for role, status := range map[string]int{"employer": 200, "candidate": 403, "admin": 403} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest("GET", "/?role="+role, nil))
		if w.Code != status {
			t.Fatalf("%s: ожидали %d, получили %d", role, status, w.Code)
		}
	}
	// Без currentUser в контексте доступа быть не должно.
	r2 := gin.New()
	r2.GET("/", requireRole("employer"), func(c *gin.Context) { c.Status(200) })
	w := httptest.NewRecorder()
	r2.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	if w.Code != 401 {
		t.Fatalf("без пользователя ожидали 401, получили %d", w.Code)
	}
}
