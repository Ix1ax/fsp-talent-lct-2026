package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
)

type Checker interface{ Check(context.Context) error }

func New(log *slog.Logger, deps Checker, verifier auth.Verifier) *gin.Engine {
	r := gin.New()
	_ = r.SetTrustedProxies(nil)
	r.Use(func(c *gin.Context) {
		b := make([]byte, 16)
		_, _ = rand.Read(b)
		id := hex.EncodeToString(b)
		c.Header("X-Request-ID", id)
		c.Header("X-Content-Type-Options", "nosniff")
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 2<<20)
		start := time.Now()
		c.Next()
		// Параметры URL и тело запроса могут содержать персональные данные, поэтому их не пишем.
		log.Info("http request", "request_id", id, "method", c.Request.Method, "route", c.FullPath(), "status", c.Writer.Status(), "duration_ms", time.Since(start).Milliseconds())
	})
	r.Use(func(c *gin.Context) {
		defer func() {
			if recover() != nil {
				log.Error("request panic")
				c.AbortWithStatusJSON(500, gin.H{"error": gin.H{"code": "internal_error", "message": "Internal server error"}})
			}
		}()
		c.Next()
	})
	r.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	r.GET("/readyz", func(c *gin.Context) {
		if deps.Check(c.Request.Context()) != nil {
			c.JSON(503, gin.H{"status": "unavailable"})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
	})
	api := r.Group("/api/v1")
	api.GET("/info", func(c *gin.Context) { c.JSON(200, gin.H{"name": "fsp-api", "version": "0.1.0"}) })
	api.GET("/me", auth.Middleware(verifier), func(c *gin.Context) { identity, _ := c.Get("identity"); c.JSON(200, identity) })
	r.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{"error": gin.H{"code": "not_found", "message": "Route not found"}})
	})
	return r
}
