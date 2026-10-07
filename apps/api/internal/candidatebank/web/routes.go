// Пакет web описывает API банка кандидатов для участников компании.
package web

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
	"github.com/jackc/pgx/v5/pgtype"
	"log/slog"
)

func abort(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}
func Register(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, users *user.Service, bank *service.Service) {
	g := api.Group("/companies/:company_id", auth.Middleware(verifier), middleware.CurrentUser(log, users), middleware.RequireRole(user.RoleEmployer))
	g.Use(func(c *gin.Context) {
		c.Header("Cache-Control", "private, no-store")
		if bank == nil {
			abort(c, 503, "candidate_bank_unavailable", "Банк кандидатов не настроен")
			return
		}
		for _, key := range []string{"company_id", "candidate_id", "need_id"} {
			if v := c.Param(key); v != "" {
				var id pgtype.UUID
				if id.Scan(v) != nil || !id.Valid {
					abort(c, 400, "validation_error", "Некорректный UUID в адресе запроса")
					return
				}
			}
		}
		c.Next()
	})
	respond := func(c *gin.Context, value any, err error) {
		var validation *entity.ValidationError
		switch {
		case errors.As(err, &validation):
			abort(c, 400, "validation_error", validation.Message)
		case errors.Is(err, entity.ErrNotFound):
			abort(c, 404, "not_found", "Кандидат или компания недоступны")
		case err != nil:
			log.Error("Не удалось прочитать банк кандидатов", "error", err)
			abort(c, 500, "internal_error", "Внутренняя ошибка сервера")
		default:
			c.JSON(200, value)
		}
	}
	g.GET("/candidates", func(c *gin.Context) {
		filter, err := entity.ParseFilter(c.Request.URL.RawQuery)
		if err != nil {
			abort(c, 400, "validation_error", err.Error())
			return
		}
		u, _ := middleware.UserFrom(c)
		v, err := bank.List(c.Request.Context(), u.ID, c.Param("company_id"), filter)
		respond(c, v, err)
	})
	g.GET("/needs/:need_id/candidates", func(c *gin.Context) {
		filter, err := entity.ParseFilter(c.Request.URL.RawQuery)
		if err != nil {
			abort(c, 400, "validation_error", err.Error())
			return
		}
		u, _ := middleware.UserFrom(c)
		v, err := bank.Recommend(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("need_id"), filter)
		respond(c, v, err)
	})
	g.GET("/candidates/:candidate_id", func(c *gin.Context) {
		u, _ := middleware.UserFrom(c)
		v, err := bank.Get(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("candidate_id"))
		respond(c, v, err)
	})
}
