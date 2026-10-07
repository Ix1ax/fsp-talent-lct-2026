// Пакет testutil содержит общие помощники тестов API; рабочий код его не использует.
package testutil

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
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

const Issuer = "https://issuer.test"

type UserStore struct{ Users map[string]user.User }

func (m *UserStore) FindByIdentity(_ context.Context, issuer, subject string) (user.User, error) {
	if u, ok := m.Users[issuer+"|"+subject]; ok {
		return u, nil
	}
	return user.User{}, user.ErrNotFound
}

func (m *UserStore) Create(_ context.Context, issuer, subject, role string) (user.User, error) {
	key := issuer + "|" + subject
	if _, ok := m.Users[key]; ok {
		return user.User{}, user.ErrExists
	}
	u := user.User{ID: "id-" + subject, Role: role, Status: user.StatusActive}
	m.Users[key] = u
	return u, nil
}

type AuthEnv struct {
	Router *gin.Engine
	Store  *UserStore
	signer jose.Signer
}

func NewAuthEnv(t *testing.T, companies ...*service.CompanyService) *AuthEnv {
	opts := httpapi.Options{}
	if len(companies) > 0 {
		opts.Companies = companies[0]
	}
	return NewAuthEnvWithOptions(t, opts)
}

func NewAuthEnvWithOptions(t *testing.T, opts httpapi.Options) *AuthEnv {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	signer, err := jose.NewSigner(jose.SigningKey{Algorithm: jose.RS256, Key: key}, nil)
	if err != nil {
		t.Fatal(err)
	}
	verifier := oidc.NewVerifier(Issuer, &oidc.StaticKeySet{PublicKeys: []crypto.PublicKey{&key.PublicKey}}, &oidc.Config{ClientID: "fsp-api"})
	store := &UserStore{Users: map[string]user.User{}}
	opts.CORSOrigins = "*"
	opts.Users = user.NewService(store)
	router := httpapi.New(slog.New(slog.NewTextHandler(io.Discard, nil)), readyChecker{}, verifier, opts)
	return &AuthEnv{Router: router, Store: store, signer: signer}
}

func (e *AuthEnv) Token(t *testing.T, sub string) string {
	t.Helper()
	payload, _ := json.Marshal(map[string]any{"iss": Issuer, "aud": "fsp-api", "sub": sub, "exp": time.Now().Add(time.Hour).Unix(), "email": sub + "@example.test", "email_verified": true})
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

func (e *AuthEnv) Do(t *testing.T, method, path, token, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	e.Router.ServeHTTP(w, req)
	return w
}

func ErrorCode(t *testing.T, w *httptest.ResponseRecorder) string {
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

// Тестовый роутер не зависит от внешней инфраструктуры.
type readyChecker struct{}

func (readyChecker) Check(context.Context) error { return nil }
