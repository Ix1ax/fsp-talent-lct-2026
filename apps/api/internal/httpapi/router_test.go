package httpapi

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http/httptest"
	"testing"
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
			r := New(slog.New(slog.NewTextHandler(io.Discard, nil)), checker{tc.dependencyError}, nil)
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
