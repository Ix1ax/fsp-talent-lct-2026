// Пакет web описывает маршруты и HTTP-обработчики согласий кандидата.
package web

import (
	"errors"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type handler struct {
	consents *service.Service
	log      *slog.Logger
}

func Register(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, users *user.Service, consents *service.Service) {
	h := handler{consents: consents, log: log}
	g := api.Group("/me/consents", auth.Middleware(verifier), middleware.CurrentUser(log, users), middleware.RequireRole(user.RoleCandidate))
	g.Use(func(c *gin.Context) {
		if h.consents == nil {
			abortError(c, 503, "consent_unavailable", "Сервис согласий не настроен")
			return
		}
		c.Next()
	})
	g.GET("", h.list)
	g.POST("", h.grant)
	g.DELETE("/:kind", h.revoke)
}

func (h handler) list(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	items, err := h.consents.List(c.Request.Context(), u.ID)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, gin.H{"current_policy_version": h.consents.PolicyVersion(), "items": items})
}

func (h handler) grant(c *gin.Context) {
	var in entity.GrantInput
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.consents.Grant(c.Request.Context(), u.ID, in)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Location", "/api/v1/me/consents")
	c.JSON(201, result)
}

func (h handler) revoke(c *gin.Context) {
	var company *string
	if value, ok := c.GetQuery("company_id"); ok {
		company = &value
	}
	u, _ := middleware.UserFrom(c)
	if err := h.consents.Revoke(c.Request.Context(), u.ID, c.Param("kind"), company); err != nil {
		h.fail(c, err)
		return
	}
	c.Status(204)
}

func abortError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}

func (h handler) fail(c *gin.Context, err error) {
	var validation *entity.ValidationError
	var requestValidation *request.ValidationError
	switch {
	case errors.As(err, &requestValidation):
		abortError(c, 400, "validation_error", requestValidation.Message)
	case errors.As(err, &validation):
		abortError(c, 400, "validation_error", validation.Message)
	case errors.Is(err, entity.ErrPolicyOutdated):
		abortError(c, 409, "policy_outdated", "Версия политики устарела: обновите страницу и подтвердите актуальную версию")
	case errors.Is(err, entity.ErrConsentExists):
		abortError(c, 409, "consent_exists", "Это согласие уже дано")
	case errors.Is(err, entity.ErrNotFound):
		abortError(c, 404, "consent_not_found", "Активное согласие такого вида не найдено")
	case errors.Is(err, entity.ErrCompanyNotFound):
		abortError(c, 404, "company_not_found", "Компания не найдена")
	case errors.Is(err, entity.ErrForbidden):
		abortError(c, 403, "forbidden", "Согласиями управляет только активный кандидат")
	default:
		h.log.Error("Ошибка при работе с согласиями", "error", err)
		abortError(c, 500, "internal_error", "Внутренняя ошибка сервера")
	}
}
