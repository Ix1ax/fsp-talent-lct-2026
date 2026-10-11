package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

func TestRequireRole(t *testing.T) {
	r := gin.New()
	r.GET("/", func(c *gin.Context) { c.Set(userKey, user.User{Role: c.Query("role")}) }, RequireRole("employer"), func(c *gin.Context) { c.Status(200) })
	for role, status := range map[string]int{"employer": 200, "candidate": 403, "admin": 403} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest("GET", "/?role="+role, nil))
		if w.Code != status {
			t.Fatalf("%s: ожидали %d, получили %d", role, status, w.Code)
		}
	}
	// Без currentUser в контексте доступа быть не должно.
	r2 := gin.New()
	r2.GET("/", RequireRole("employer"), func(c *gin.Context) { c.Status(200) })
	w := httptest.NewRecorder()
	r2.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	if w.Code != 401 {
		t.Fatalf("без пользователя ожидали 401, получили %d", w.Code)
	}
}
