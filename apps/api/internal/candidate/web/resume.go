package web

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

// registerResume подключает импорт резюме из PDF. Метод ничего не сохраняет, ответ с персональными данными не кешируется.
func registerResume(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, opts Options, h profileHandler) {
	g := api.Group("/me/profile/import", auth.Middleware(verifier), middleware.CurrentUser(log, opts.Users), middleware.RequireRole(user.RoleCandidate))
	g.Use(func(c *gin.Context) {
		if h.resume == nil {
			abortError(c, 503, "candidate_unavailable", "Сервис профилей кандидатов не настроен")
			return
		}
		c.Next()
	})
	g.POST("/resume", h.importResume)
}

func (h profileHandler) importResume(c *gin.Context) {
	// Разбор PDF нагружает процессор и память: больше двух одновременно не берём.
	select {
	case h.imports <- struct{}{}:
		defer func() { <-h.imports }()
	default:
		c.Header("Retry-After", "5")
		abortError(c, 503, "import_busy", "Сейчас разбираются другие резюме. Повторите запрос через несколько секунд")
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 45*time.Second)
	defer cancel()
	c.Request = c.Request.WithContext(ctx)
	if err := c.Request.ParseMultipartForm(1 << 20); err != nil {
		var max *http.MaxBytesError
		if errors.As(err, &max) {
			h.fail(c, service.ErrResumeTooLarge)
		} else {
			abortError(c, 400, "validation_error", "Ожидается multipart/form-data с одним файлом file")
		}
		return
	}
	defer c.Request.MultipartForm.RemoveAll()
	form := c.Request.MultipartForm
	if len(form.File) != 1 || len(form.File["file"]) != 1 || len(form.Value) != 0 {
		abortError(c, 400, "validation_error", "Передайте ровно один файл в поле file и никаких других полей")
		return
	}
	header := form.File["file"][0]
	if header.Size > service.MaxResumeBytes {
		h.fail(c, service.ErrResumeTooLarge)
		return
	}
	src, err := header.Open()
	if err != nil {
		h.fail(c, err)
		return
	}
	defer src.Close()
	u, _ := middleware.UserFrom(c)
	result, err := h.resume.Import(ctx, u.ID, src)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.JSON(200, result)
}
