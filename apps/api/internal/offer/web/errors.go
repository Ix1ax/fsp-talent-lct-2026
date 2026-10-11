package web

import (
	"errors"
	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
	"net/http"
)

func abort(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}
func (h handler) fail(c *gin.Context, err error) {
	var validation *entity.ValidationError
	var binding *request.ValidationError
	var size *http.MaxBytesError
	switch {
	case errors.As(err, &validation):
		abort(c, 400, "validation_error", validation.Message)
	case errors.As(err, &binding):
		abort(c, 400, "validation_error", binding.Message)
	case errors.As(err, &size):
		abort(c, 413, "request_too_large", "Превышен допустимый размер запроса")
	case errors.Is(err, entity.ErrNotFound):
		abort(c, 404, "not_found", entity.ErrNotFound.Error())
	case errors.Is(err, entity.ErrForbidden):
		abort(c, 403, "forbidden", entity.ErrForbidden.Error())
	case errors.Is(err, entity.ErrContactsUnavailable):
		abort(c, 409, "contacts_unavailable", entity.ErrContactsUnavailable.Error())
	case errors.Is(err, entity.ErrResponseConflict):
		abort(c, 409, "response_conflict", entity.ErrResponseConflict.Error())
	case errors.Is(err, entity.ErrExpired):
		abort(c, 409, "offer_expired", entity.ErrExpired.Error())
	default:
		h.log.Error("Ошибка при работе с предложением", "error", err)
		abort(c, 500, "internal_error", "Внутренняя ошибка сервера")
	}
}
