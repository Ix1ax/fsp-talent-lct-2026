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
	"strconv"
)

func abort(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}
func Register(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, users *user.Service, bank *service.Service) {
	g := api.Group("/companies/:company_id/candidates", auth.Middleware(verifier), middleware.CurrentUser(log, users), middleware.RequireRole(user.RoleEmployer))
	g.Use(func(c *gin.Context) {
		if bank == nil {
			abort(c, 503, "candidate_bank_unavailable", "Банк кандидатов не настроен")
			return
		}
		for _, key := range []string{"company_id", "candidate_id"} {
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
		switch {
		case errors.Is(err, entity.ErrNotFound):
			abort(c, 404, "not_found", "Кандидат или компания недоступны")
		case err != nil:
			log.Error("Не удалось прочитать банк кандидатов", "error", err)
			abort(c, 500, "internal_error", "Внутренняя ошибка сервера")
		default:
			c.JSON(200, value)
		}
	}
	g.GET("", func(c *gin.Context) {
		// Не игнорируем опечатки и ещё не реализованные фильтры: фронт должен получить честный ответ.
		for key, values := range c.Request.URL.Query() {
			if (key != "limit" && key != "offset") || len(values) != 1 {
				abort(c, 400, "validation_error", "Допустимы только однократные параметры limit и offset")
				return
			}
		}
		limit, offset := 20, 0
		for _, p := range []struct {
			name     string
			target   *int
			min, max int
		}{{"limit", &limit, 1, 100}, {"offset", &offset, 0, 10000}} {
			if value, exists := c.GetQuery(p.name); exists {
				n, err := strconv.Atoi(value)
				if err != nil || n < p.min || n > p.max {
					abort(c, 400, "validation_error", "Некорректный параметр "+p.name)
					return
				}
				*p.target = n
			} else if _, exists := c.Request.URL.Query()[p.name]; exists {
				abort(c, 400, "validation_error", "Параметр "+p.name+" не должен быть пустым")
				return
			}
		}
		u, _ := middleware.UserFrom(c)
		v, err := bank.List(c.Request.Context(), u.ID, c.Param("company_id"), limit, offset)
		respond(c, v, err)
	})
	g.GET("/:candidate_id", func(c *gin.Context) {
		u, _ := middleware.UserFrom(c)
		v, err := bank.Get(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("candidate_id"))
		respond(c, v, err)
	})
}
