// Пакет auth проверяет OIDC-токены. Права на конкретные записи проверяются в доменных сервисах.
package auth

import (
	"context"
	"net/mail"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/gin-gonic/gin"
)

type Claims struct {
	Subject       string    `json:"sub"`
	Email         string    `json:"email"`
	EmailVerified bool      `json:"email_verified"`
	Name          string    `json:"name"`
	GivenName     string    `json:"given_name"`
	FamilyName    string    `json:"family_name"`
	IssuedAt      time.Time `json:"-"`
	// Issuer берём из проверенного токена; вместе с Subject он однозначно определяет аккаунт.
	Issuer string `json:"-"`
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
		if token.Claims(&claims) != nil || claims.Subject == "" || !claims.EmailVerified || !validEmail(claims.Email) {
			unauthorized(c)
			return
		}
		claims.Issuer = token.Issuer
		claims.IssuedAt = token.IssuedAt
		c.Set("identity", claims)
		c.Next()
	}
}

func validEmail(value string) bool {
	value = strings.TrimSpace(value)
	address, err := mail.ParseAddress(value)
	return err == nil && address.Address == value && strings.Contains(value, "@") && len(value) <= 254 && utf8.ValidString(value)
}

func (c Claims) DisplayName() string {
	if name := strings.TrimSpace(c.Name); name != "" {
		return name
	}
	return strings.TrimSpace(strings.TrimSpace(c.GivenName) + " " + strings.TrimSpace(c.FamilyName))
}
func unauthorized(c *gin.Context) {
	c.AbortWithStatusJSON(401, gin.H{"error": gin.H{"code": "unauthorized", "message": "Нужен действующий токен с подтверждённым адресом электронной почты"}})
}

// IdentityFrom возвращает идентичность, которую положил Middleware.
func IdentityFrom(c *gin.Context) (Claims, bool) {
	v, ok := c.Get("identity")
	claims, isClaims := v.(Claims)
	return claims, ok && isClaims
}
