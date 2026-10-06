// Пакет web описывает API предложений компании и входящих предложений кандидата.
package web

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
	"github.com/jackc/pgx/v5/pgtype"
)

type handler struct {
	offers *service.Service
	log    *slog.Logger
}

func Register(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, users *user.Service, offers *service.Service) {
	h := handler{offers: offers, log: log}
	company := api.Group("/companies/:company_id/offers", auth.Middleware(verifier), middleware.CurrentUser(log, users), middleware.RequireRole(user.RoleEmployer), h.available)
	company.POST("", h.create)
	company.GET("", h.companyList)
	company.GET("/:offer_id", h.companyGet)
	candidate := api.Group("/me/offers", auth.Middleware(verifier), middleware.CurrentUser(log, users), middleware.RequireRole(user.RoleCandidate), h.available)
	candidate.GET("", h.candidateList)
	candidate.GET("/:offer_id", h.candidateGet)
	// GET не меняет состояние. Фронт отмечает просмотр после открытия карточки отдельным запросом.
	candidate.POST("/:offer_id/view", h.view)
	candidate.POST("/:offer_id/respond", h.respond)
}
func (h handler) available(c *gin.Context) {
	if h.offers == nil {
		abort(c, 503, "offers_unavailable", "Сервис предложений не настроен")
		return
	}
	for _, key := range []string{"company_id", "offer_id"} {
		if value := c.Param(key); value != "" {
			var id pgtype.UUID
			if id.Scan(value) != nil || !id.Valid {
				abort(c, 400, "validation_error", "Некорректный UUID в адресе запроса")
				return
			}
		}
	}
	c.Next()
}
