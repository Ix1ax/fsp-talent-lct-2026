// Пакет web описывает маршруты и HTTP-обработчики компаний.
package web

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type Options struct {
	Users     *user.Service
	Companies *service.CompanyService
	Documents *service.DocumentService
	Needs     *service.NeedsService
	Members   *service.MemberService
}
type companiesHandler struct {
	service   *service.CompanyService
	documents *service.DocumentService
	needs     *service.NeedsService
	members   *service.MemberService
	log       *slog.Logger
	uploads   chan struct{}
}

func Register(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, opts Options) {
	h := companiesHandler{service: opts.Companies, needs: opts.Needs, documents: opts.Documents, members: opts.Members, log: log, uploads: make(chan struct{}, 2)}
	memberAvailable := func(c *gin.Context) {
		if h.members == nil {
			abortError(c, 503, "members_unavailable", "Сервис команды компании не настроен")
			return
		}
		c.Next()
	}
	api.POST("/company-invitations/accept", auth.Middleware(verifier), middleware.CurrentUser(log, opts.Users), middleware.RequireRole(user.RoleEmployer), memberAvailable, h.acceptInvitation)
	g := api.Group("/companies", auth.Middleware(verifier), middleware.CurrentUser(log, opts.Users), middleware.RequireRole(user.RoleEmployer))
	g.Use(func(c *gin.Context) {
		if h.service == nil {
			abortError(c, 503, "companies_unavailable", "Сервис компаний не настроен")
			return
		}
		for _, key := range []string{"company_id", "file_id", "need_id", "user_id", "invitation_id"} {
			if value := c.Param(key); value != "" {
				var id pgtype.UUID
				if id.Scan(value) != nil || !id.Valid {
					abortError(c, 400, "validation_error", "Некорректный UUID в адресе запроса")
					return
				}
			}
		}
		c.Next()
	})
	g.POST("", h.create)
	g.GET("", h.list)
	g.GET("/:company_id", h.get)
	g.PATCH("/:company_id", h.update)
	members := g.Group("/:company_id/members", memberAvailable)
	members.GET("", h.listMembers)
	members.PATCH("/:user_id", h.updateMember)
	members.DELETE("/:user_id", h.removeMember)
	invitations := g.Group("/:company_id/invitations", memberAvailable)
	invitations.POST("", h.invite)
	invitations.GET("", h.listInvitations)
	invitations.DELETE("/:invitation_id", h.revokeInvitation)
	fileRoutes := g.Group("/:company_id/files", func(c *gin.Context) {
		if h.documents == nil {
			abortError(c, 503, "documents_unavailable", "Сервис документов не настроен")
			return
		}
		c.Next()
	})
	fileRoutes.POST("", h.upload)
	fileRoutes.GET("", h.listFiles)
	fileRoutes.GET("/:file_id/download", h.download)
	fileRoutes.DELETE("/:file_id", h.deleteFile)
	needs := g.Group("/:company_id/needs", func(c *gin.Context) {
		if h.needs == nil {
			abortError(c, 503, "needs_unavailable", "Сервис потребностей не настроен")
			return
		}
		c.Next()
	})
	needs.POST("", h.createNeed)
	needs.GET("", h.listNeeds)
	needs.GET("/:need_id", h.getNeed)
	needs.PATCH("/:need_id", h.updateNeed)
	needs.DELETE("/:need_id", h.archiveNeed)
}
