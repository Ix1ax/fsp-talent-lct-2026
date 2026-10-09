package web

import (
	"context"
	"errors"
	"io"
	"mime"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

func (h handler) upload(c *gin.Context, task bool) (entity.Input, string, []byte, error) {
	var in entity.Input
	if err := c.Request.ParseMultipartForm(1 << 20); err != nil {
		if c.Request.MultipartForm != nil {
			c.Request.MultipartForm.RemoveAll()
		}
		var max *http.MaxBytesError
		if errors.As(err, &max) {
			return in, "", nil, err
		}
		return in, "", nil, &entity.ValidationError{Message: "Ожидается multipart/form-data с файлом file"}
	}
	defer c.Request.MultipartForm.RemoveAll()
	form := c.Request.MultipartForm
	if len(form.File) != 1 || len(form.File["file"]) != 1 {
		return in, "", nil, &entity.ValidationError{Message: "Передайте ровно один файл file"}
	}
	allowed := map[string]bool{}
	if task {
		for _, key := range []string{"title", "description", "specialization_id", "grade_id", "deadline_at"} {
			allowed[key] = true
		}
	}
	for key, values := range form.Value {
		if !allowed[key] || len(values) != 1 {
			return in, "", nil, &entity.ValidationError{Message: "Неизвестное или повторное поле: " + key}
		}
	}
	if task {
		value := func(key string) string {
			if values := form.Value[key]; len(values) == 1 {
				return values[0]
			}
			return ""
		}
		in.Title, in.Description = value("title"), value("description")
		for key, dst := range map[string]**int16{"specialization_id": &in.SpecializationID, "grade_id": &in.GradeID} {
			if values, ok := form.Value[key]; ok {
				n, err := strconv.ParseInt(values[0], 10, 16)
				if err != nil || n <= 0 {
					return in, "", nil, &entity.ValidationError{Message: "Некорректный ID: " + key}
				}
				id := int16(n)
				*dst = &id
			}
		}
		if values, ok := form.Value["deadline_at"]; ok {
			at, err := time.Parse(time.RFC3339Nano, values[0])
			if err != nil {
				return in, "", nil, &entity.ValidationError{Message: "deadline_at должен быть датой RFC3339 с часовым поясом"}
			}
			in.DeadlineAt = &at
		}
	}
	header := form.File["file"][0]
	if header.Size > files.MaxSize {
		return in, "", nil, files.ErrSize
	}
	src, err := header.Open()
	if err != nil {
		return in, "", nil, err
	}
	defer src.Close()
	data, err := io.ReadAll(io.LimitReader(src, files.MaxSize+1))
	if err != nil {
		return in, "", nil, err
	}
	if len(data) > files.MaxSize {
		return in, "", nil, files.ErrSize
	}
	return in, header.Filename, data, nil
}

func (h handler) beginUpload(c *gin.Context) (func(), bool) {
	select {
	case h.uploads <- struct{}{}:
	default:
		c.Header("Retry-After", "2")
		abort(c, 503, "upload_busy", "Повторите загрузку через пару секунд")
		return nil, false
	}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 45*time.Second)
	c.Request = c.Request.WithContext(ctx)
	return func() { cancel(); <-h.uploads }, true
}
func (h handler) uploadTask(c *gin.Context) {
	done, ok := h.beginUpload(c)
	if !ok {
		return
	}
	defer done()
	in, name, data, err := h.upload(c, true)
	if err != nil {
		h.fail(c, err)
		return
	}
	v, err := h.tasks.UploadTask(c.Request.Context(), userID(c), c.Param("company_id"), in, name, data)
	h.respond(c, 201, v, err)
}
func (h handler) uploadSolution(c *gin.Context) {
	done, ok := h.beginUpload(c)
	if !ok {
		return
	}
	defer done()
	_, name, data, err := h.upload(c, false)
	if err != nil {
		h.fail(c, err)
		return
	}
	v, err := h.tasks.UploadSolution(c.Request.Context(), userID(c), c.Param("task_id"), name, data)
	h.respond(c, 201, v, err)
}
func download(c *gin.Context, f files.File, body io.ReadCloser) {
	defer body.Close()
	c.Header("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": f.OriginalName}))
	c.Header("X-Content-Type-Options", "nosniff")
	c.Header("Cache-Control", "private, no-store")
	c.DataFromReader(200, f.SizeBytes, f.MediaType, body, nil)
}
func (h handler) downloadTask(c *gin.Context) {
	f, body, err := h.tasks.DownloadTask(c.Request.Context(), userID(c), c.Param("company_id"), c.Param("task_id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	download(c, f, body)
}
func (h handler) downloadSolution(c *gin.Context) {
	f, body, err := h.tasks.DownloadSolution(c.Request.Context(), userID(c), c.Param("company_id"), c.Param("task_id"), c.Param("submission_id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	download(c, f, body)
}
