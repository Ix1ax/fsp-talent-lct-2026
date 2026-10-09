package web

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func abort(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}
func (h handler) respond(c *gin.Context, status int, value any, err error) {
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(status, value)
}
func (h handler) fail(c *gin.Context, err error) {
	var validation *entity.ValidationError
	var binding *request.ValidationError
	var max *http.MaxBytesError
	switch {
	case errors.As(err, &validation):
		abort(c, 400, "validation_error", validation.Message)
	case errors.As(err, &binding):
		abort(c, 400, "validation_error", binding.Message)
	case errors.Is(err, entity.ErrNotFound):
		abort(c, 404, "not_found", err.Error())
	case errors.Is(err, entity.ErrForbidden):
		abort(c, 403, "forbidden", err.Error())
	case errors.Is(err, entity.ErrConsentRequired):
		abort(c, 403, "consent_required", err.Error())
	case errors.Is(err, entity.ErrDailyLimit):
		abort(c, 409, "daily_task_limit", err.Error())
	case errors.Is(err, entity.ErrAlreadySubmitted):
		abort(c, 409, "already_submitted", err.Error())
	case errors.Is(err, entity.ErrClosed):
		abort(c, 409, "task_closed", err.Error())
	case errors.As(err, &max), errors.Is(err, files.ErrSize):
		abort(c, 413, "file_too_large", "Файл должен быть непустым и не больше 10 МБ")
	case errors.Is(err, files.ErrTaskType), errors.Is(err, files.ErrType):
		abort(c, 415, "unsupported_file_type", files.ErrTaskType.Error())
	case errors.Is(err, files.ErrInvalid):
		abort(c, 400, "invalid_file", err.Error())
	case errors.Is(err, service.ErrStorage):
		abort(c, 503, "storage_unavailable", err.Error())
	default:
		h.log.Error("Не удалось обработать задание компании", "error", err)
		abort(c, 500, "internal_error", "Внутренняя ошибка сервера")
	}
}
