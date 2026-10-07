package web

import (
	"bytes"
	"context"
	"errors"
	"io"
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

// readResumePart читает единственную часть multipart с полем file в память с пределом. Временные файлы не создаются:
// резюме содержит персональные данные и не должно попадать на диск.
func readResumePart(r *http.Request) ([]byte, error) {
	reader, err := r.MultipartReader()
	if err != nil {
		return nil, errResumeForm
	}
	part, err := reader.NextPart()
	if err != nil {
		var max *http.MaxBytesError
		if errors.As(err, &max) {
			return nil, service.ErrResumeTooLarge
		}
		return nil, errResumeForm
	}
	defer part.Close()
	if part.FormName() != "file" || part.FileName() == "" {
		return nil, errResumeForm
	}
	data, err := io.ReadAll(io.LimitReader(part, service.MaxResumeBytes+1))
	if err != nil {
		var max *http.MaxBytesError
		if errors.As(err, &max) {
			return nil, service.ErrResumeTooLarge
		}
		return nil, errResumeForm
	}
	if len(data) > service.MaxResumeBytes {
		return nil, service.ErrResumeTooLarge
	}
	// Больше частей быть не должно: ровно один файл и никаких других полей.
	if _, err := reader.NextPart(); !errors.Is(err, io.EOF) {
		var max *http.MaxBytesError
		if errors.As(err, &max) {
			return nil, service.ErrResumeTooLarge
		}
		return nil, errResumeForm
	}
	return data, nil
}

var errResumeForm = errors.New("Передайте ровно один файл в поле file и никаких других полей (multipart/form-data)")

func (h profileHandler) importResume(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 45*time.Second)
	defer cancel()
	c.Request = c.Request.WithContext(ctx)
	data, err := readResumePart(c.Request)
	if errors.Is(err, errResumeForm) {
		abortError(c, 400, "validation_error", err.Error())
		return
	}
	if err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.resume.Import(ctx, u.ID, bytes.NewReader(data))
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.JSON(200, result)
}
