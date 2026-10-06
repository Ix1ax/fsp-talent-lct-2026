package middleware

import (
	"errors"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

const userKey = "user"

func abortError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}

// currentUser находит пользователя приложения по проверенной идентичности и кладёт его в контекст.
func CurrentUser(log *slog.Logger, users *user.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		identity, ok := auth.IdentityFrom(c)
		if !ok || users == nil {
			abortError(c, 503, "auth_unavailable", "Сервис авторизации не настроен")
			return
		}
		u, err := users.Resolve(c.Request.Context(), identity.Issuer, identity.Subject)
		switch {
		case errors.Is(err, user.ErrNotFound):
			abortError(c, 404, "not_registered", "Пользователь не зарегистрирован: выберите роль соискателя или работодателя")
		case errors.Is(err, user.ErrInactive):
			abortError(c, 403, "user_inactive", "Учётная запись заблокирована или удалена")
		case err != nil:
			log.Error("Не удалось получить пользователя", "error", err)
			abortError(c, 500, "internal_error", "Внутренняя ошибка сервера")
		default:
			c.Set(userKey, u)
			c.Next()
		}
	}
}

// requireRole пропускает только пользователей с одной из перечисленных ролей. Ставится после currentUser.
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		v, _ := c.Get(userKey)
		u, ok := v.(user.User)
		if !ok {
			abortError(c, 401, "unauthorized", "Требуется вход в систему")
			return
		}
		for _, role := range roles {
			if u.Role == role {
				c.Next()
				return
			}
		}
		abortError(c, 403, "forbidden", "Недостаточно прав для этого действия")
	}
}

// UserFrom возвращает локальный UUID. Вызывать после currentUser, а не брать sub из JWT.
func UserFrom(c *gin.Context) (user.User, bool) {
	v, _ := c.Get(userKey)
	u, ok := v.(user.User)
	return u, ok
}
