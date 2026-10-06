package web

import (
	"context"
	"errors"
	"io"
	"mime"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func (h companiesHandler) listFiles(c *gin.Context) {
	limit, offset, err := request.Page(c)
	if err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	items, err := h.documents.ListFiles(c.Request.Context(), u.ID, c.Param("company_id"), limit, offset)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items, "limit": limit, "offset": offset})
}
func (h companiesHandler) upload(c *gin.Context) {
	// На небольшом сервере ограничиваем одновременное чтение и декодирование файлов.
	select {
	case h.uploads <- struct{}{}:
		defer func() { <-h.uploads }()
	default:
		c.Header("Retry-After", "2")
		abortError(c, 503, "upload_busy", "Сейчас загружается несколько файлов. Повторите запрос через пару секунд")
		return
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 45*time.Second)
	defer cancel()
	c.Request = c.Request.WithContext(ctx)
	if err := c.Request.ParseMultipartForm(1 << 20); err != nil {
		var max *http.MaxBytesError
		if errors.As(err, &max) {
			h.fail(c, err)
		} else {
			abortError(c, 400, "invalid_file", "Ожидается multipart/form-data с одним файлом file и полем purpose")
		}
		return
	}
	defer c.Request.MultipartForm.RemoveAll()
	form := c.Request.MultipartForm
	if len(form.File) != 1 || len(form.File["file"]) != 1 || len(form.Value) != 1 || len(form.Value["purpose"]) != 1 {
		abortError(c, 400, "invalid_file", "Передайте ровно один файл file и одно поле purpose")
		return
	}
	header := form.File["file"][0]
	purpose := form.Value["purpose"][0]
	limit := int64(files.MaxSize)
	if purpose == "company_logo" {
		limit = files.MaxLogoSize
	}
	if header.Size > limit {
		h.fail(c, files.ErrSize)
		return
	}
	src, err := header.Open()
	if err != nil {
		h.fail(c, err)
		return
	}
	defer src.Close()
	data, err := io.ReadAll(io.LimitReader(src, limit+1))
	if err != nil {
		h.fail(c, err)
		return
	}
	if int64(len(data)) > limit {
		h.fail(c, files.ErrSize)
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.documents.Upload(c.Request.Context(), u.ID, c.Param("company_id"), header.Filename, purpose, data)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(201, result)
}
func (h companiesHandler) download(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	f, body, err := h.documents.Download(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("file_id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	defer body.Close()
	disposition := "attachment"
	if f.Purpose == "company_logo" && strings.HasPrefix(f.MediaType, "image/") {
		disposition = "inline"
	}
	c.Header("Content-Disposition", mime.FormatMediaType(disposition, map[string]string{"filename": f.OriginalName}))
	c.Header("Cache-Control", "private, no-store")
	c.DataFromReader(200, f.SizeBytes, f.MediaType, body, nil)
}
func (h companiesHandler) deleteFile(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	if err := h.documents.Delete(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("file_id")); err != nil {
		h.fail(c, err)
		return
	}
	c.Status(204)
}
