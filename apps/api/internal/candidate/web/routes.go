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
	Avatars  *service.AvatarService
	Contacts *service.ContactsService
	Skills   *service.SkillsService
}

type profileHandler struct {
	profiles *service.ProfileService
	avatars  *service.AvatarService
	contacts *service.ContactsService
	skills   *service.SkillsService
	log      *slog.Logger
	uploads  chan struct{}
}

func Register(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, opts Options) {
	h := profileHandler{profiles: opts.Profiles, avatars: opts.Avatars, contacts: opts.Contacts, skills: opts.Skills, log: log, uploads: make(chan struct{}, 2)}
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
	avatar := g.Group("/avatar", func(c *gin.Context) {
		if h.avatars == nil {
			abortError(c, 503, "avatar_unavailable", "Сервис аватаров не настроен")
			return
		}
		c.Next()
	})
	avatar.PUT("", h.uploadAvatar)
	avatar.GET("", h.downloadAvatar)
	avatar.DELETE("", h.deleteAvatar)
	registerContacts(api, log, verifier, opts, h)
	registerSkills(api, log, verifier, opts, h)
}

func registerContacts(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, opts Options, h profileHandler) {
	g := api.Group("/me/contacts", auth.Middleware(verifier), middleware.CurrentUser(log, opts.Users), middleware.RequireRole(user.RoleCandidate))
	g.Use(func(c *gin.Context) {
		if h.contacts == nil {
			abortError(c, 503, "contacts_unavailable", "Сервис контактов не настроен")
			return
		}
		c.Next()
	})
	g.PUT("", h.putContacts)
	g.GET("", h.getContacts)
}

func registerSkills(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, opts Options, h profileHandler) {
	g := api.Group("/me/skills", auth.Middleware(verifier), middleware.CurrentUser(log, opts.Users), middleware.RequireRole(user.RoleCandidate))
	g.Use(func(c *gin.Context) {
		if h.skills == nil {
			abortError(c, 503, "candidate_unavailable", "Сервис профилей кандидатов не настроен")
			return
		}
		c.Next()
	})
	g.GET("", h.listSkills)
	g.POST("", h.submitSkill)
	g.PUT("/:skill_id", h.putSkill)
	g.DELETE("/:skill_id", h.deleteSkill)
}
