package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"io/fs"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/docs"

	"github.com/gin-gonic/gin"

	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	adminweb "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/web"
	admincatalogservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/service"
	admincatalogweb "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/web"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	candidateweb "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/web"
	bankservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/service"
	bankweb "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/web"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
	catalogweb "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog/web"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	companyweb "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/web"
	consentservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/service"
	consentweb "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/consent/web"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	offerservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/service"
	offerweb "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/web"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type Checker interface{ Check(context.Context) error }

type Options struct {
	Admins                  *adminservice.Service
	AdminCatalogs           *admincatalogservice.Service
	CORSOrigins, OIDCIssuer string
	Users                   *user.Service
	Companies               *service.CompanyService
	Candidates              *candidateservice.ProfileService
	Avatars                 *candidateservice.AvatarService
	CandidateContacts       *candidateservice.ContactsService
	CandidateSkills         *candidateservice.SkillsService
	CandidateFull           *candidateservice.FullProfileService
	Documents               *service.DocumentService
	Needs                   *service.NeedsService
	Members                 *service.MemberService
	Catalogs                *catalog.Service
	Offers                  *offerservice.Service
	CandidateBank           *bankservice.Service
	Consents                *consentservice.Service
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
		limit := int64(2 << 20)
		if c.Request.Method == http.MethodPost && c.FullPath() == "/api/v1/companies/:company_id/files" {
			limit = files.MaxSize + (64 << 10)
		}
		if c.Request.Method == http.MethodPut && c.FullPath() == "/api/v1/me/profile/avatar" {
			limit = files.MaxLogoSize + (64 << 10)
		}
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit)
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
	adminweb.Register(api, log, opts.Admins)
	admincatalogweb.Register(api, log, opts.Admins, opts.AdminCatalogs)
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
	companyweb.Register(api, log, verifier, companyweb.Options{Users: opts.Users, Companies: opts.Companies, Documents: opts.Documents, Needs: opts.Needs, Members: opts.Members})
	catalogweb.Register(api, log, opts.Catalogs)
	bankweb.Register(api, log, verifier, opts.Users, opts.CandidateBank)
	offerweb.Register(api, log, verifier, opts.Users, opts.Offers)
	consentweb.Register(api, log, verifier, opts.Users, opts.Consents)
	candidateweb.Register(api, log, verifier, candidateweb.Options{Users: opts.Users, Profiles: opts.Candidates, Avatars: opts.Avatars, Contacts: opts.CandidateContacts, Skills: opts.CandidateSkills, Full: opts.CandidateFull})
	r.NoRoute(func(c *gin.Context) {
		c.JSON(404, gin.H{"error": gin.H{"code": "not_found", "message": "Маршрут не найден"}})
	})
	return r
}
