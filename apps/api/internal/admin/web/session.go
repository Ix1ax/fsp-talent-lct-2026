package web

import (
	"errors"
	"log/slog"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
)

// Authenticate используется только в админских маршрутах. Токены сайта сюда не подходят.
func Authenticate(log *slog.Logger, admins *service.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		abort := func(status int, code, message string) {
			c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
		}
		if admins == nil {
			abort(503, "admin_unavailable", "Сервис админки не настроен")
			return
		}
		fields := strings.Fields(c.GetHeader("Authorization"))
		if len(fields) != 2 || !strings.EqualFold(fields[0], "Bearer") {
			abort(401, "unauthorized", "Неверная почта, пароль или сессия")
			return
		}
		account, err := admins.Resolve(c.Request.Context(), fields[1])
		if err != nil {
			if errors.Is(err, entity.ErrUnauthorized) {
				abort(401, "unauthorized", "Неверная почта, пароль или сессия")
			} else {
				log.Error("Не удалось проверить сессию администратора", "error", err)
				abort(500, "internal_error", "Внутренняя ошибка сервера")
			}
			return
		}
		c.Set("admin_account", account)
		c.Set("admin_token", fields[1])
		c.Next()
	}
}
func CurrentAccount(c *gin.Context) (entity.Account, bool) {
	value, exists := c.Get("admin_account")
	if !exists {
		return entity.Account{}, false
	}
	account, ok := value.(entity.Account)
	return account, ok
}
