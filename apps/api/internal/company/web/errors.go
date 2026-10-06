package web

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func abortError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}
func (h companiesHandler) fail(c *gin.Context, err error) {
	var validation *entity.ValidationError
	var requestValidation *request.ValidationError
	var maxBytes *http.MaxBytesError
	switch {
	case errors.As(err, &requestValidation):
		abortError(c, 400, "validation_error", requestValidation.Message)
	case errors.As(err, &validation):
		abortError(c, 400, "validation_error", validation.Message)
	case errors.Is(err, entity.ErrNotFound):
		abortError(c, 404, "not_found", "Компания или файл не найдены")
	case errors.Is(err, entity.ErrForbidden):
		abortError(c, 403, "forbidden", "Изменять компанию и файлы может только её владелец")
	case errors.Is(err, entity.ErrConflict):
		abortError(c, 409, "company_exists", "Компания с таким ИНН уже существует")
	case errors.Is(err, files.ErrSize) || errors.As(err, &maxBytes):
		abortError(c, 413, "file_too_large", "Документ — не более 10 МиБ, логотип — не более 2 МиБ")
	case errors.Is(err, files.ErrType):
		abortError(c, 415, "unsupported_file_type", files.ErrType.Error())
	case errors.Is(err, files.ErrInvalid):
		abortError(c, 400, "invalid_file", "Проверьте файл и purpose: company_document или company_logo. Изображение — не более 4 мегапикселей")
	case errors.Is(err, service.ErrStorage):
		h.log.Error("Ошибка хранилища файлов", "error", err)
		abortError(c, 503, "storage_unavailable", "Хранилище файлов временно недоступно")
	default:
		h.log.Error("Ошибка при работе с компанией", "error", err)
		abortError(c, 500, "internal_error", "Внутренняя ошибка сервера")
	}
}
