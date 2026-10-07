// Пакет web описывает отдельный контур авторизации админки.
package web

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
	"log/slog"
	"net/http"
)

func Register(api *gin.RouterGroup, log *slog.Logger, admins *service.Service) {
	fail := func(c *gin.Context, err error) {
		var validation *entity.ValidationError
		var requestValidation *request.ValidationError
		var large *http.MaxBytesError
		status, code, message := 500, "internal_error", "Внутренняя ошибка сервера"
		switch {
		case errors.Is(err, entity.ErrUnauthorized):
			status, code, message = 401, "unauthorized", "Неверная почта, пароль или сессия"
		case errors.Is(err, entity.ErrForbidden):
			status, code, message = 403, "forbidden", "Создавать администраторов может только суперадмин"
		case errors.Is(err, entity.ErrConflict):
			status, code, message = 409, "admin_exists", "Администратор с такой почтой уже существует"
		case errors.Is(err, entity.ErrRateLimited):
			status, code, message = 429, "rate_limited", "Слишком много попыток входа: повторите через 15 минут"
			c.Header("Retry-After", "900")
		case errors.As(err, &large):
			status, code, message = 413, "request_too_large", "Превышен допустимый размер запроса"
		case errors.As(err, &validation):
			status, code, message = 400, "validation_error", validation.Message
		case errors.As(err, &requestValidation):
			status, code, message = 400, "validation_error", requestValidation.Message
		default:
			log.Error("Ошибка при работе с админкой", "error", err)
		}
		c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
	}
	g := api.Group("/admin")
	g.Use(func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		if admins == nil {
			c.AbortWithStatusJSON(503, gin.H{"error": gin.H{"code": "admin_unavailable", "message": "Сервис админки не настроен"}})
			return
		}
		c.Next()
	})
	g.POST("/auth/login", func(c *gin.Context) {
		var in entity.Credentials
		if err := request.JSON(c, &in); err != nil {
			fail(c, err)
			return
		}
		result, err := admins.Login(c.Request.Context(), in, c.ClientIP())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, result)
	})
	protected := g.Group("", Authenticate(log, admins))
	protected.GET("/auth/me", func(c *gin.Context) { a, _ := c.Get("admin_account"); c.JSON(200, a) })
	protected.POST("/auth/logout", func(c *gin.Context) {
		token := c.GetString("admin_token")
		if err := admins.Logout(c.Request.Context(), token); err != nil {
			fail(c, err)
			return
		}
		c.Status(204)
	})
	protected.GET("/admins", func(c *gin.Context) {
		value, _ := c.Get("admin_account")
		a := value.(entity.Account)
		if a.Role != "superadmin" {
			fail(c, entity.ErrForbidden)
			return
		}
		limit, offset, err := request.Page(c)
		if err != nil {
			fail(c, err)
			return
		}
		items, err := admins.List(c.Request.Context(), a, limit, offset)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"items": items, "limit": limit, "offset": offset})
	})
	protected.POST("/admins", func(c *gin.Context) {
		value, _ := c.Get("admin_account")
		a := value.(entity.Account)
		if a.Role != "superadmin" {
			fail(c, entity.ErrForbidden)
			return
		}
		var in entity.Credentials
		if err := request.JSON(c, &in); err != nil {
			fail(c, err)
			return
		}
		created, err := admins.Create(c.Request.Context(), a, in)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(201, created)
	})
}
