// Пакет web описывает маршруты и HTTP-обработчики профиля кандидата.
package web

import (
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type Options struct {
	Users    *user.Service
	Profiles *service.ProfileService
}

type profileHandler struct {
	profiles *service.ProfileService
	log      *slog.Logger
}

func Register(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, opts Options) {
	h := profileHandler{profiles: opts.Profiles, log: log}
	g := api.Group("/me/profile", auth.Middleware(verifier), middleware.CurrentUser(log, opts.Users), middleware.RequireRole(user.RoleCandidate))
	g.Use(func(c *gin.Context) {
		if h.profiles == nil {
			abortError(c, 503, "candidate_unavailable", "Сервис профилей кандидатов не настроен")
			return
		}
		c.Next()
	})
	g.POST("", h.create)
	g.GET("", h.get)
	g.PATCH("", h.update)
}
