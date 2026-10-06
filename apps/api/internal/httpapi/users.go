package httpapi

import (
	"errors"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

const userKey = "user"

func abortError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}

func meResponse(identity auth.Claims, u user.User) gin.H {
	return gin.H{"id": u.ID, "sub": identity.Subject, "email": identity.Email, "email_verified": identity.EmailVerified, "role": u.Role, "status": u.Status}
}

func currentUser(log *slog.Logger, users *user.Service) gin.HandlerFunc {
	return middleware.CurrentUser(log, users)
}
func requireRole(roles ...string) gin.HandlerFunc { return middleware.RequireRole(roles...) }
func getMe(c *gin.Context) {
	identity, _ := auth.IdentityFrom(c)
	v, _ := c.Get(userKey)
	u, _ := v.(user.User)
	c.JSON(200, meResponse(identity, u))
}

// registerUser создаёт пользователя при первом входе: роль выбирает сам пользователь (candidate или employer).
func registerUser(log *slog.Logger, users *user.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		identity, _ := auth.IdentityFrom(c)
		if users == nil {
			abortError(c, 503, "auth_unavailable", "Сервис авторизации не настроен")
			return
		}
		var body struct {
			Role string `json:"role"`
		}
		if c.ShouldBindJSON(&body) != nil {
			abortError(c, 400, "validation_error", "Некорректное тело запроса: ожидается JSON с полем role")
			return
		}
		u, err := users.Register(c.Request.Context(), identity.Issuer, identity.Subject, body.Role)
		switch {
		case errors.Is(err, user.ErrInvalidRole):
			abortError(c, 400, "invalid_role", "Роль должна быть candidate или employer")
		case errors.Is(err, user.ErrExists):
			abortError(c, 409, "already_registered", "Пользователь уже зарегистрирован")
		case err != nil:
			log.Error("Не удалось зарегистрировать пользователя", "error", err)
			abortError(c, 500, "internal_error", "Внутренняя ошибка сервера")
		default:
			c.JSON(201, meResponse(identity, u))
		}
	}
}

func UserFrom(c *gin.Context) (user.User, bool) { return middleware.UserFrom(c) }
