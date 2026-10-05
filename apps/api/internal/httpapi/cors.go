package httpapi

import (
	"github.com/gin-gonic/gin"
	"strings"
)

// Bearer-токен передаётся явно. Cookies и Access-Control-Allow-Credentials не используем.
func cors(origins string) gin.HandlerFunc {
	allowed := map[string]bool{}
	for _, origin := range strings.Split(origins, ",") {
		allowed[strings.TrimSpace(origin)] = true
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			if allowed["*"] {
				c.Header("Access-Control-Allow-Origin", "*")
			} else if allowed[origin] {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Vary", "Origin")
			} else {
				c.AbortWithStatusJSON(403, gin.H{"error": gin.H{"code": "origin_not_allowed", "message": "Запросы с этого адреса сайта запрещены"}})
				return
			}
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID, Idempotency-Key")
			c.Header("Access-Control-Expose-Headers", "X-Request-ID, Content-Disposition, Location, Retry-After")
			c.Header("Access-Control-Max-Age", "600")
		}
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
