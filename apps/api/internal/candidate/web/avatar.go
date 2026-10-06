package web

import (
	"context"
	"errors"
	"io"
	"mime"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
)

func (h profileHandler) uploadAvatar(c *gin.Context) {
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
			abortError(c, 400, "invalid_file", "Ожидается multipart/form-data с одним файлом file")
		}
		return
	}
	defer c.Request.MultipartForm.RemoveAll()
	form := c.Request.MultipartForm
	if len(form.File) != 1 || len(form.File["file"]) != 1 || len(form.Value) != 0 {
		abortError(c, 400, "invalid_file", "Передайте ровно один файл в поле file и никаких других полей")
		return
	}
	header := form.File["file"][0]
	if header.Size > files.MaxLogoSize {
		h.fail(c, files.ErrSize)
		return
	}
	src, err := header.Open()
	if err != nil {
		h.fail(c, err)
		return
	}
	defer src.Close()
	data, err := io.ReadAll(io.LimitReader(src, files.MaxLogoSize+1))
	if err != nil {
		h.fail(c, err)
		return
	}
	if len(data) > files.MaxLogoSize {
		h.fail(c, files.ErrSize)
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.avatars.Upload(c.Request.Context(), u.ID, header.Filename, data)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, result)
}

func (h profileHandler) downloadAvatar(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	f, body, err := h.avatars.Download(c.Request.Context(), u.ID)
	if err != nil {
		h.fail(c, err)
		return
	}
	defer body.Close()
	c.Header("Content-Disposition", mime.FormatMediaType("inline", map[string]string{"filename": f.OriginalName}))
	c.Header("Cache-Control", "private, no-store")
	c.DataFromReader(200, f.SizeBytes, f.MediaType, body, nil)
}

func (h profileHandler) deleteAvatar(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	if err := h.avatars.Delete(c.Request.Context(), u.ID); err != nil {
		h.fail(c, err)
		return
	}
	c.Status(204)
}
