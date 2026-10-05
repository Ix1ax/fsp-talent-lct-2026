// Пакет auth проверяет OIDC-токены. Права на конкретные записи проверяются в доменных сервисах.
package auth

import (
	"context"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gin-gonic/gin"
)

type Claims struct {
	Subject       string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
}
type Verifier interface {
	Verify(context.Context, string) (*oidc.IDToken, error)
}

func Middleware(v Verifier) gin.HandlerFunc {
	return func(c *gin.Context) {
		if v == nil {
			c.AbortWithStatusJSON(503, gin.H{"error": gin.H{"code": "auth_unavailable", "message": "Сервис авторизации не настроен"}})
			return
		}
		parts := strings.Fields(c.GetHeader("Authorization"))
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			unauthorized(c)
			return
		}
		token, err := v.Verify(c.Request.Context(), parts[1])
		if err != nil {
			unauthorized(c)
			return
		}
		var claims Claims
		if token.Claims(&claims) != nil || claims.Subject == "" || !claims.EmailVerified {
			unauthorized(c)
			return
		}
		c.Set("identity", claims)
		c.Next()
	}
}
func unauthorized(c *gin.Context) {
	c.AbortWithStatusJSON(401, gin.H{"error": gin.H{"code": "unauthorized", "message": "Нужен действующий токен с подтверждённым адресом электронной почты"}})
}
