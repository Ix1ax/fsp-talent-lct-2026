package web

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func abortError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}

func (h profileHandler) fail(c *gin.Context, err error) {
	var validation *entity.ValidationError
	var requestValidation *request.ValidationError
	var maxBytes *http.MaxBytesError
	switch {
	case errors.As(err, &requestValidation):
		abortError(c, 400, "validation_error", requestValidation.Message)
	case errors.As(err, &validation):
		abortError(c, 400, "validation_error", validation.Message)
	case errors.Is(err, files.ErrSize) || errors.As(err, &maxBytes):
		abortError(c, 413, "file_too_large", "Аватар — не более 2 МиБ")
	case errors.Is(err, files.ErrType):
		abortError(c, 415, "unsupported_file_type", files.ErrType.Error())
	case errors.Is(err, files.ErrInvalid):
		abortError(c, 400, "invalid_file", "Файл пустой, повреждён или превышает 4 мегапикселя")
	case errors.Is(err, service.ErrStorage):
		h.log.Error("Ошибка хранилища файлов", "error", err)
		abortError(c, 503, "storage_unavailable", "Хранилище файлов временно недоступно")
	case errors.Is(err, entity.ErrNotFound):
		abortError(c, 404, "profile_not_found", "Профиль кандидата не найден: сначала создайте его")
	case errors.Is(err, entity.ErrAvatarNotFound):
		abortError(c, 404, "avatar_not_found", "Аватар не загружен")
	case errors.Is(err, entity.ErrForbidden):
		abortError(c, 403, "forbidden", "Профилем может управлять только активный кандидат")
	case errors.Is(err, entity.ErrConflict):
		abortError(c, 409, "profile_exists", "Профиль кандидата уже создан")
	default:
		h.log.Error("Ошибка при работе с профилем кандидата", "error", err)
		abortError(c, 500, "internal_error", "Внутренняя ошибка сервера")
	}
}
