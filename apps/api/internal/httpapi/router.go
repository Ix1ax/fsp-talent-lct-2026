package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/docs"
	"io/fs"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type Checker interface{ Check(context.Context) error }

type Options struct {
	CORSOrigins, OIDCIssuer string
	Users                   *user.Service
}

func New(log *slog.Logger, deps Checker, verifier auth.Verifier, options ...Options) *gin.Engine {
	opts := Options{CORSOrigins: "*"}
	if len(options) > 0 {
		opts = options[0]
	}
	r := gin.New()
	r.Use(cors(opts.CORSOrigins))
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
		log.Info("Обработан HTTP-запрос", "request_id", id, "method", c.Request.Method, "route", c.FullPath(), "status", c.Writer.Status(), "duration_ms", time.Since(start).Milliseconds())
	})
	r.Use(func(c *gin.Context) {
		defer func() {
			if recover() != nil {
				log.Error("Неожиданная ошибка при обработке запроса")
				c.AbortWithStatusJSON(500, gin.H{"error": gin.H{"code": "internal_error", "message": "Внутренняя ошибка сервера"}})
			}
		}()
		c.Next()
	})
	r.GET("/healthz", func(c *gin.Context) { c.JSON(200, gin.H{"status": "ok"}) })
	r.GET("/readyz", func(c *gin.Context) {
		if deps.Check(c.Request.Context()) != nil {
			c.JSON(503, gin.H{"status": "unavailable", "error": gin.H{"code": "dependencies_unavailable", "message": "База данных, кеш или хранилище файлов недоступны"}})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
	})
	assetFS, _ := fs.Sub(docs.Files, "assets")
	r.StaticFS("/docs/assets", http.FS(assetFS))
	r.GET("/docs", func(c *gin.Context) { c.Redirect(302, "/docs/") })
	r.GET("/docs/", func(c *gin.Context) {
		b, _ := docs.Files.ReadFile("index.html")
		c.Data(200, "text/html; charset=utf-8", b)
	})
	r.GET("/docs/oauth2-redirect.html", func(c *gin.Context) {
		b, _ := docs.Files.ReadFile("assets/oauth2-redirect.html")
		c.Data(200, "text/html; charset=utf-8", b)
	})
	r.GET("/openapi.yaml", func(c *gin.Context) {
		b, _ := docs.Files.ReadFile("openapi.yaml")
		b = []byte(strings.ReplaceAll(string(b), "__OIDC_ISSUER__", opts.OIDCIssuer))
		c.Data(200, "application/yaml; charset=utf-8", b)
	})
	api := r.Group("/api/v1")
	api.GET("/auth/config", func(c *gin.Context) {
		if opts.OIDCIssuer == "" {
			c.JSON(503, gin.H{"error": gin.H{"code": "auth_unavailable", "message": "Сервис авторизации не настроен"}})
			return
		}
		c.JSON(200, gin.H{"issuer": opts.OIDCIssuer, "client_id": "fsp-web"})
	})
	api.GET("/info", func(c *gin.Context) { c.JSON(200, gin.H{"name": "fsp-api", "version": "0.1.0"}) })
	api.GET("/me", auth.Middleware(verifier), currentUser(log, opts.Users), getMe)
	api.POST("/me/register", auth.Middleware(verifier), registerUser(log, opts.Users))
	r.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{"error": gin.H{"code": "not_found", "message": "Маршрут не найден"}})
	})
	return r
}
