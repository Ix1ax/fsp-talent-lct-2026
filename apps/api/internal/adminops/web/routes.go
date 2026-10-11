package web

import (
	"errors"
	"log/slog"
	"mime"
	"net/http"

	"github.com/gin-gonic/gin"
	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	adminweb "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/web"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type handler struct {
	ops *service.Service
	log *slog.Logger
}

func abort(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}
func (h handler) respond(c *gin.Context, v any, err error) {
	var validation *entity.ValidationError
	var binding *request.ValidationError
	var max *http.MaxBytesError
	switch {
	case err == nil:
		c.JSON(200, v)
	case errors.As(err, &validation):
		abort(c, 400, "validation_error", validation.Message)
	case errors.As(err, &binding):
		abort(c, 400, "validation_error", binding.Message)
	case errors.As(err, &max):
		abort(c, 413, "request_too_large", "Превышен допустимый размер запроса")
	case errors.Is(err, entity.ErrNotFound):
		abort(c, 404, "not_found", err.Error())
	case errors.Is(err, entity.ErrForbidden):
		abort(c, 403, "forbidden", err.Error())
	case errors.Is(err, entity.ErrConflict):
		abort(c, 409, "state_conflict", err.Error())
	case errors.Is(err, entity.ErrEvidence):
		abort(c, 409, "verification_evidence_required", err.Error())
	case errors.Is(err, service.ErrStorage):
		abort(c, 503, "storage_unavailable", err.Error())
	default:
		h.log.Error("Не удалось выполнить административное действие", "error", err)
		abort(c, 500, "internal_error", "Внутренняя ошибка сервера")
	}
}
func actor(c *gin.Context) string { a, _ := adminweb.CurrentAccount(c); return a.ID }
func (h handler) guard(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	if h.ops == nil {
		abort(c, 503, "admin_operations_unavailable", "Операционные функции админки не настроены")
		return
	}
	for _, name := range []string{"id", "company_id", "file_id"} {
		if v := c.Param(name); v != "" {
			id, err := entity.ID(v)
			if err != nil {
				h.respond(c, nil, err)
				return
			}
			for i := range c.Params {
				if c.Params[i].Key == name {
					c.Params[i].Value = id
				}
			}
		}
	}
	c.Next()
}
func Register(api *gin.RouterGroup, log *slog.Logger, admins *adminservice.Service, ops *service.Service, verifier auth.Verifier, users *user.Service) {
	h := handler{ops, log}
	g := api.Group("/admin", adminweb.Authenticate(log, admins), h.guard)
	g.GET("/stats", func(c *gin.Context) { v, err := ops.Stats(c.Request.Context(), actor(c)); h.respond(c, v, err) })
	g.GET("/audit-events", func(c *gin.Context) {
		f, err := entity.ParseFilter(c.Request.URL.RawQuery, "audit")
		if err != nil {
			h.respond(c, nil, err)
			return
		}
		v, err := ops.Audit(c.Request.Context(), actor(c), f)
		h.respond(c, v, err)
	})
	for _, kind := range []string{"companies", "users", "needs", "offers", "tasks"} {
		g.GET("/"+kind, h.list(kind))
		param := ":id"
		if kind == "companies" {
			param = ":company_id"
		}
		g.GET("/"+kind+"/"+param, h.get(kind))
	}
	g.GET("/assessments/attempts", h.list("attempts"))
	g.GET("/users/:id/companies", func(c *gin.Context) {
		f, err := entity.ParseFilter(c.Request.URL.RawQuery, "user-companies")
		if err != nil {
			h.respond(c, nil, err)
			return
		}
		v, err := ops.UserCompanies(c.Request.Context(), actor(c), c.Param("id"), f)
		h.respond(c, v, err)
	})
	g.GET("/assessments/attempts/:id", h.get("attempts"))
	for _, kind := range []string{"members", "files"} {
		g.GET("/companies/:company_id/"+kind, h.related(kind))
	}
	g.GET("/companies/:company_id/files/:file_id/download", h.download("company"))
	g.PATCH("/companies/:company_id/verification", func(c *gin.Context) {
		var in entity.Decision
		if err := request.JSON(c, &in); err != nil {
			h.respond(c, nil, err)
			return
		}
		v, err := ops.Decide(c.Request.Context(), actor(c), c.Param("company_id"), in)
		h.respond(c, v, err)
	})
	g.PATCH("/users/:id/status", h.setStatus("user"))
	g.PATCH("/companies/:company_id/status", h.setStatus("company"))
	g.PATCH("/needs/:id/moderation", h.setStatus("need"))
	g.PATCH("/tasks/:id/moderation", h.setStatus("task"))
	g.GET("/tasks/:id/file", h.download("task"))
	employer := api.Group("/companies/:company_id", auth.Middleware(verifier), middleware.CurrentUser(log, users), middleware.RequireRole(user.RoleEmployer), h.guard)
	employer.GET("/verification", h.verification(false))
	employer.POST("/verification/request", h.verification(true))
}
func (h handler) list(kind string) gin.HandlerFunc {
	return func(c *gin.Context) {
		f, err := entity.ParseFilter(c.Request.URL.RawQuery, kind)
		if err != nil {
			h.respond(c, nil, err)
			return
		}
		v, err := h.ops.List(c.Request.Context(), actor(c), kind, f)
		h.respond(c, v, err)
	}
}
func (h handler) get(kind string) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if kind == "companies" {
			id = c.Param("company_id")
		}
		v, err := h.ops.Get(c.Request.Context(), actor(c), kind, id)
		h.respond(c, v, err)
	}
}
func (h handler) related(kind string) gin.HandlerFunc {
	return func(c *gin.Context) {
		f, err := entity.ParseFilter(c.Request.URL.RawQuery, kind)
		if err != nil {
			h.respond(c, nil, err)
			return
		}
		v, err := h.ops.CompanyRelated(c.Request.Context(), actor(c), c.Param("company_id"), kind, f)
		h.respond(c, v, err)
	}
}
func (h handler) setStatus(kind string) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in entity.StatusInput
		if err := request.JSON(c, &in); err != nil {
			h.respond(c, nil, err)
			return
		}
		id := c.Param("id")
		if kind == "company" {
			id = c.Param("company_id")
		}
		v, err := h.ops.SetStatus(c.Request.Context(), actor(c), kind, id, in)
		h.respond(c, v, err)
	}
}
func (h handler) verification(submit bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		u, _ := middleware.UserFrom(c)
		v, err := h.ops.Verification(c.Request.Context(), u.ID, c.Param("company_id"), submit)
		h.respond(c, v, err)
	}
}
func (h handler) download(kind string) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if kind == "company" {
			id = c.Param("company_id")
		}
		f, body, err := h.ops.Download(c.Request.Context(), actor(c), kind, id, c.Param("file_id"))
		if err != nil {
			h.respond(c, nil, err)
			return
		}
		defer body.Close()
		c.Header("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": f.OriginalName}))
		c.Header("X-Content-Type-Options", "nosniff")
		c.DataFromReader(200, f.SizeBytes, f.MediaType, body, nil)
	}
}
