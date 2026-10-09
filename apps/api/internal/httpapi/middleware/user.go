package middleware

import (
	"errors"
	"log/slog"
	"strings"

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
	return currentUser(log, users, false)
}

// CurrentAccount используется только для GET /me: блокировка не мешает прочитать свою причину.
func CurrentAccount(log *slog.Logger, users *user.Service) gin.HandlerFunc {
	return currentUser(log, users, true)
}

func currentUser(log *slog.Logger, users *user.Service, accountOnly bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		identity, ok := auth.IdentityFrom(c)
		if !ok || users == nil {
			abortError(c, 503, "auth_unavailable", "Сервис авторизации не настроен")
			return
		}
		resolve := users.Resolve
		if accountOnly {
			resolve = users.Account
			if err := users.SyncIdentityProfile(c.Request.Context(), identity.Issuer, identity.Subject, user.IdentityProfile{Email: identity.Email, DisplayName: identity.DisplayName(), IssuedAt: identity.IssuedAt}); err != nil {
				log.Error("Не удалось обновить сведения идентичности", "error", err)
				abortError(c, 500, "internal_error", "Внутренняя ошибка сервера")
				return
			}
		}
		u, err := resolve(c.Request.Context(), identity.Issuer, identity.Subject)
		switch {
		case errors.Is(err, user.ErrNotFound):
			abortError(c, 404, "not_registered", "Пользователь не зарегистрирован: выберите роль соискателя или работодателя")
		case errors.Is(err, user.ErrInactive):
			if u.Status == user.StatusBlocked {
				c.Header("Cache-Control", "private, no-store")
				c.AbortWithStatusJSON(403, gin.H{"error": gin.H{"code": "user_inactive", "message": "Учётная запись заблокирована", "status": "blocked", "entity_type": "user", "entity_id": u.ID, "reason": u.BlockedReason, "blocked_at": u.BlockedAt}})
			} else {
				abortError(c, 403, "user_inactive", "Учётная запись заблокирована или удалена")
			}
		case err != nil:
			log.Error("Не удалось получить пользователя", "error", err)
			abortError(c, 500, "internal_error", "Внутренняя ошибка сервера")
		default:
			// Разрешена только карточка компании с причиной; рабочие методы закрыты всем участникам.
			for _, block := range u.BlockedCompanies {
				if strings.EqualFold(c.Param("company_id"), block.ID) && !(c.Request.Method == "GET" && c.FullPath() == "/api/v1/companies/:company_id") {
					c.Header("Cache-Control", "private, no-store")
					c.AbortWithStatusJSON(403, gin.H{"error": gin.H{"code": "company_blocked", "message": "Компания заблокирована", "entity_type": "company", "entity_id": block.ID, "reason": block.Reason, "blocked_at": block.BlockedAt}})
					return
				}
			}
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
