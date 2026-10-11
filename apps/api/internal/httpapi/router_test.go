package httpapi_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
)

type checker struct{ err error }

func (c checker) Check(context.Context) error { return c.err }
func TestRoutes(t *testing.T) {
	for _, tc := range []struct {
		name, path      string
		dependencyError error
		status          int
	}{
		{"live", "/healthz", errors.New("offline"), 200},
		{"ready", "/readyz", nil, 200},
		{"unready", "/readyz", errors.New("offline"), 503},
		{"info", "/api/v1/info", nil, 200},
		{"auth fails closed", "/api/v1/me", nil, 503},
		{"missing", "/missing", nil, 404},
	} {
		t.Run(tc.name, func(t *testing.T) {
			r := httpapi.New(slog.New(slog.NewTextHandler(io.Discard, nil)), checker{tc.dependencyError}, nil)
			w := httptest.NewRecorder()
			r.ServeHTTP(w, httptest.NewRequest("GET", tc.path, nil))
			if w.Code != tc.status {
				t.Fatalf("Получен статус %d: %s", w.Code, w.Body)
			}
			if w.Header().Get("X-Request-ID") == "" {
				t.Fatal("Нет идентификатора запроса")
			}
		})
	}
}

// Страница возврата после входа через Keycloak подключает скрипт; без него Swagger остаётся с белым экраном.
func TestSwaggerOAuthRedirectScript(t *testing.T) {
	r := httpapi.New(slog.New(slog.NewTextHandler(io.Discard, nil)), checker{}, nil)
	page := httptest.NewRecorder()
	r.ServeHTTP(page, httptest.NewRequest("GET", "/docs/oauth2-redirect.html", nil))
	if page.Code != 200 || !strings.Contains(page.Body.String(), `src="assets/oauth2-redirect.js"`) {
		t.Fatalf("страница возврата: %d %s", page.Code, page.Body)
	}
	script := httptest.NewRecorder()
	r.ServeHTTP(script, httptest.NewRequest("GET", "/docs/assets/oauth2-redirect.js", nil))
	if script.Code != 200 || script.Body.Len() == 0 {
		t.Fatalf("скрипт возврата недоступен: %d", script.Code)
	}
}
