package web

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

func Register(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, users *user.Service, s *service.Service) {
	g := api.Group("/me/fsp", auth.Middleware(verifier), middleware.CurrentUser(log, users), middleware.RequireRole(user.RoleCandidate))
	g.Use(func(c *gin.Context) {
		c.Header("Cache-Control", "private, no-store")
		if s == nil {
			fail(c, entity.ErrUnavailable)
			return
		}
		c.Next()
	})
	g.GET("", func(c *gin.Context) {
		u, _ := middleware.UserFrom(c)
		p, err := s.Get(c.Request.Context(), u.ID)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, p)
	})
	for _, action := range []string{"link", "sync"} {
		link := action == "link"
		g.POST("/"+action, func(c *gin.Context) {
			u, _ := middleware.UserFrom(c)
			identity, _ := auth.IdentityFrom(c)
			ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)
			defer cancel()
			p, err := s.Sync(ctx, u.ID, entity.Identity{Issuer: identity.Issuer, Subject: identity.Subject}, link)
			if err != nil {
				fail(c, err)
				return
			}
			c.JSON(200, p)
		})
	}
	g.DELETE("", func(c *gin.Context) {
		u, _ := middleware.UserFrom(c)
		if err := s.Unlink(c.Request.Context(), u.ID); err != nil {
			fail(c, err)
			return
		}
		c.Status(204)
	})
}

func fail(c *gin.Context, err error) {
	status, code, message := 500, "internal_error", "Не удалось обработать данные ФСП"
	switch {
	case errors.Is(err, entity.ErrForbidden):
		status, code, message = 403, "fsp_forbidden", entity.ErrForbidden.Error()
	case errors.Is(err, entity.ErrNotLinked):
		status, code, message = 409, "fsp_not_linked", entity.ErrNotLinked.Error()
	case errors.Is(err, entity.ErrConflict):
		status, code, message = 409, "fsp_conflict", entity.ErrConflict.Error()
	case errors.Is(err, entity.ErrUnavailable):
		status, code, message = 503, "fsp_unavailable", entity.ErrUnavailable.Error()
	}
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}
