package web

import (
	"errors"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func abortError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}

func (h profileHandler) fail(c *gin.Context, err error) {
	var validation *entity.ValidationError
	var requestValidation *request.ValidationError
	switch {
	case errors.As(err, &requestValidation):
		abortError(c, 400, "validation_error", requestValidation.Message)
	case errors.As(err, &validation):
		abortError(c, 400, "validation_error", validation.Message)
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
