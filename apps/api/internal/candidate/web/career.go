package web

import (
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

// registerCareer подключает места работы и образование. Ответы личные, поэтому не кешируются.
func registerCareer(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, opts Options, h profileHandler) {
	group := func(path string) *gin.RouterGroup {
		g := api.Group(path, auth.Middleware(verifier), middleware.CurrentUser(log, opts.Users), middleware.RequireRole(user.RoleCandidate))
		g.Use(func(c *gin.Context) {
			if h.career == nil {
				abortError(c, 503, "candidate_unavailable", "Сервис профилей кандидатов не настроен")
				return
			}
			c.Header("Cache-Control", "private, no-store")
			c.Next()
		})
		return g
	}
	owner := func(c *gin.Context) string { u, _ := middleware.UserFrom(c); return u.ID }

	exp := group("/me/experience")
	exp.GET("", func(c *gin.Context) {
		items, err := h.career.ListExperience(c.Request.Context(), owner(c))
		if err != nil {
			h.fail(c, err)
			return
		}
		c.JSON(200, gin.H{"items": items})
	})
	exp.POST("", func(c *gin.Context) {
		var in entity.ExperienceInput
		if err := request.JSON(c, &in); err != nil {
			h.fail(c, err)
			return
		}
		item, err := h.career.CreateExperience(c.Request.Context(), owner(c), in)
		if err != nil {
			h.fail(c, err)
			return
		}
		c.JSON(201, item)
	})
	exp.PUT("/:id", func(c *gin.Context) {
		var in entity.ExperienceInput
		if err := request.JSON(c, &in); err != nil {
			h.fail(c, err)
			return
		}
		item, err := h.career.ReplaceExperience(c.Request.Context(), owner(c), c.Param("id"), in)
		if err != nil {
			h.fail(c, err)
			return
		}
		c.JSON(200, item)
	})
	exp.DELETE("/:id", func(c *gin.Context) {
		if err := h.career.DeleteExperience(c.Request.Context(), owner(c), c.Param("id")); err != nil {
			h.fail(c, err)
			return
		}
		c.Status(204)
	})

	edu := group("/me/education")
	edu.GET("", func(c *gin.Context) {
		items, err := h.career.ListEducation(c.Request.Context(), owner(c))
		if err != nil {
			h.fail(c, err)
			return
		}
		c.JSON(200, gin.H{"items": items})
	})
	edu.POST("", func(c *gin.Context) {
		var in entity.EducationInput
		if err := request.JSON(c, &in); err != nil {
			h.fail(c, err)
			return
		}
		item, err := h.career.CreateEducation(c.Request.Context(), owner(c), in)
		if err != nil {
			h.fail(c, err)
			return
		}
		c.JSON(201, item)
	})
	edu.PUT("/:id", func(c *gin.Context) {
		var in entity.EducationInput
		if err := request.JSON(c, &in); err != nil {
			h.fail(c, err)
			return
		}
		item, err := h.career.ReplaceEducation(c.Request.Context(), owner(c), c.Param("id"), in)
		if err != nil {
			h.fail(c, err)
			return
		}
		c.JSON(200, item)
	})
	edu.DELETE("/:id", func(c *gin.Context) {
		if err := h.career.DeleteEducation(c.Request.Context(), owner(c), c.Param("id")); err != nil {
			h.fail(c, err)
			return
		}
		c.Status(204)
	})
}
