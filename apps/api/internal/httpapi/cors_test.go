package httpapi

import (
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCORSPreflightAndProtectedRoute(t *testing.T) {
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	for _, tc := range []struct {
		origins, origin string
		status          int
		header          string
	}{
		{"*", "https://any.example", 204, "*"},
		{"https://allowed.example", "https://allowed.example", 204, "https://allowed.example"},
		{"https://allowed.example", "https://other.example", 403, ""},
	} {
		router := New(log, checker{}, nil, Options{CORSOrigins: tc.origins})
		request := httptest.NewRequest("OPTIONS", "/api/v1/me", nil)
		request.Header.Set("Origin", tc.origin)
		request.Header.Set("Access-Control-Request-Method", "GET")
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if response.Code != tc.status || response.Header().Get("Access-Control-Allow-Origin") != tc.header {
			t.Fatalf("preflight: %d, %v", response.Code, response.Header())
		}
		if response.Header().Get("Access-Control-Allow-Credentials") != "" {
			t.Fatal("cookies не должны включаться")
		}
	}
}

func TestSwaggerUsesPublicIssuer(t *testing.T) {
	router := New(slog.New(slog.NewTextHandler(io.Discard, nil)), checker{}, nil, Options{CORSOrigins: "*", OIDCIssuer: "https://auth.example/realms/fsp"})
	for _, path := range []string{"/docs/", "/docs/oauth2-redirect.html", "/docs/assets/swagger-ui.css", "/openapi.yaml", "/api/v1/auth/config"} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest("GET", path, nil))
		if response.Code != 200 {
			t.Fatalf("%s: %d", path, response.Code)
		}
		if path == "/openapi.yaml" && (!strings.Contains(response.Body.String(), "https://auth.example/realms/fsp/protocol/openid-connect/auth") || strings.Contains(response.Body.String(), "__OIDC_ISSUER__")) {
			t.Fatal("не подставлен issuer")
		}
	}
}
