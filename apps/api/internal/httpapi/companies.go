package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
	"github.com/jackc/pgx/v5/pgtype"
)

type companiesHandler struct {
	service *company.Service
	log     *slog.Logger
	uploads chan struct{}
}

func registerCompanies(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, opts Options) {
	h := companiesHandler{service: opts.Companies, log: log, uploads: make(chan struct{}, 2)}
	g := api.Group("/companies", auth.Middleware(verifier), currentUser(log, opts.Users), requireRole(user.RoleEmployer))
	g.Use(func(c *gin.Context) {
		if h.service == nil {
			abortError(c, 503, "companies_unavailable", "Сервис компаний не настроен")
			return
		}
		for _, key := range []string{"company_id", "file_id"} {
			if value := c.Param(key); value != "" {
				var id pgtype.UUID
				if id.Scan(value) != nil || !id.Valid {
					abortError(c, 400, "validation_error", "Некорректный UUID в адресе запроса")
					return
				}
			}
		}
		c.Next()
	})
	g.POST("", h.create)
	g.GET("", h.list)
	g.GET("/:company_id", h.get)
	g.PATCH("/:company_id", h.update)
	g.POST("/:company_id/files", h.upload)
	g.GET("/:company_id/files", h.listFiles)
	g.GET("/:company_id/files/:file_id/download", h.download)
	g.DELETE("/:company_id/files/:file_id", h.deleteFile)
}
func (h companiesHandler) fail(c *gin.Context, err error) {
	var validation *company.ValidationError
	var maxBytes *http.MaxBytesError
	switch {
	case errors.As(err, &validation):
		abortError(c, 400, "validation_error", validation.Message)
	case errors.Is(err, company.ErrNotFound):
		abortError(c, 404, "not_found", "Компания или файл не найдены")
	case errors.Is(err, company.ErrForbidden):
		abortError(c, 403, "forbidden", "Изменять компанию и файлы может только её владелец")
	case errors.Is(err, company.ErrConflict):
		abortError(c, 409, "company_exists", "Компания с таким ИНН уже существует")
	case errors.Is(err, files.ErrSize) || errors.As(err, &maxBytes):
		abortError(c, 413, "file_too_large", "Документ — не более 10 МиБ, логотип — не более 2 МиБ")
	case errors.Is(err, files.ErrType):
		abortError(c, 415, "unsupported_file_type", files.ErrType.Error())
	case errors.Is(err, files.ErrInvalid):
		abortError(c, 400, "invalid_file", "Проверьте файл и purpose: company_document или company_logo. Изображение — не более 4 мегапикселей")
	case errors.Is(err, company.ErrStorage):
		h.log.Error("Ошибка хранилища файлов", "error", err)
		abortError(c, 503, "storage_unavailable", "Хранилище файлов временно недоступно")
	default:
		h.log.Error("Ошибка при работе с компанией", "error", err)
		abortError(c, 500, "internal_error", "Внутренняя ошибка сервера")
	}
}
func companyJSON(c *gin.Context, target any) error {
	media, _, err := mime.ParseMediaType(c.GetHeader("Content-Type"))
	if err != nil || media != "application/json" {
		return &company.ValidationError{Message: "Ожидается Content-Type: application/json"}
	}
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		var tooLarge *http.MaxBytesError
		if errors.As(err, &tooLarge) {
			return err
		}
		return &company.ValidationError{Message: "Некорректный JSON или неизвестное поле"}
	}
	var extra any
	if decoder.Decode(&extra) != io.EOF {
		return &company.ValidationError{Message: "Ожидается один JSON-объект"}
	}
	return nil
}
func companyPage(c *gin.Context) (int, int, error) {
	limit, offset := 20, 0
	for key, target := range map[string]*int{"limit": &limit, "offset": &offset} {
		if value, ok := c.GetQuery(key); ok {
			n, err := strconv.Atoi(value)
			if err != nil {
				return 0, 0, &company.ValidationError{Message: "limit и offset должны быть целыми числами"}
			}
			*target = n
		}
	}
	if limit < 1 || limit > 100 || offset < 0 || offset > 10000 {
		return 0, 0, &company.ValidationError{Message: "limit: от 1 до 100; offset: от 0 до 10000"}
	}
	return limit, offset, nil
}
func (h companiesHandler) create(c *gin.Context) {
	var in company.Input
	if err := companyJSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := UserFrom(c)
	result, err := h.service.Create(c.Request.Context(), u.ID, in)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Location", "/api/v1/companies/"+result.ID)
	c.JSON(201, result)
}
func (h companiesHandler) get(c *gin.Context) {
	u, _ := UserFrom(c)
	result, err := h.service.Get(c.Request.Context(), u.ID, c.Param("company_id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, result)
}
func (h companiesHandler) list(c *gin.Context) {
	limit, offset, err := companyPage(c)
	if err != nil {
		h.fail(c, err)
		return
	}
	u, _ := UserFrom(c)
	items, err := h.service.List(c.Request.Context(), u.ID, limit, offset)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items, "limit": limit, "offset": offset})
}
func (h companiesHandler) update(c *gin.Context) {
	var patch company.Patch
	if err := companyJSON(c, &patch); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := UserFrom(c)
	result, err := h.service.Update(c.Request.Context(), u.ID, c.Param("company_id"), patch)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, result)
}
func (h companiesHandler) listFiles(c *gin.Context) {
	limit, offset, err := companyPage(c)
	if err != nil {
		h.fail(c, err)
		return
	}
	u, _ := UserFrom(c)
	items, err := h.service.ListFiles(c.Request.Context(), u.ID, c.Param("company_id"), limit, offset)
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
	u, _ := UserFrom(c)
	result, err := h.service.Upload(c.Request.Context(), u.ID, c.Param("company_id"), header.Filename, purpose, data)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(201, result)
}
func (h companiesHandler) download(c *gin.Context) {
	u, _ := UserFrom(c)
	f, body, err := h.service.Download(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("file_id"))
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
	u, _ := UserFrom(c)
	if err := h.service.Delete(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("file_id")); err != nil {
		h.fail(c, err)
		return
	}
	c.Status(204)
}
