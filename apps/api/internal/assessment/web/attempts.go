package web

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	candidateentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

// RegisterAttempts подключает прохождение тестов кандидатом. Ответы содержат задания и результаты, поэтому не кешируются.
func RegisterAttempts(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, users *user.Service, attempts *service.AttemptService) {
	fail := func(c *gin.Context, err error) {
		var validation *entity.ValidationError
		var input *request.ValidationError
		var large *http.MaxBytesError
		var active *entity.ActiveError
		var retake *entity.RetakeError
		var gradeChange *entity.GradeChangeError
		switch {
		case errors.As(err, &active):
			abortWith(c, 409, "attempt_active", err.Error(), gin.H{"attempt_id": active.AttemptID})
		case errors.As(err, &gradeChange):
			abortWith(c, 409, "grade_change_cooldown", err.Error(), gin.H{"retry_at": gradeChange.RetryAt.UTC().Format(time.RFC3339)})
		case errors.As(err, &retake):
			abortWith(c, 409, "retake_cooldown", err.Error(), gin.H{"retry_at": retake.RetryAt.UTC().Format(time.RFC3339)})
		case errors.Is(err, entity.ErrAlreadyConfirmed):
			abort(c, 409, "already_confirmed", err.Error())
		case errors.Is(err, entity.ErrUnavailable):
			abort(c, 409, "assessment_unavailable", err.Error())
		case errors.Is(err, entity.ErrAttemptClosed):
			abort(c, 409, "attempt_closed", err.Error())
		case errors.Is(err, entity.ErrAttemptNotFound):
			abort(c, 404, "attempt_not_found", err.Error())
		case errors.Is(err, entity.ErrQuestionNotFound):
			abort(c, 404, "question_not_found", err.Error())
		case errors.Is(err, candidateentity.ErrNotFound):
			abort(c, 404, "profile_not_found", "Профиль кандидата не найден: сначала создайте его")
		case errors.Is(err, candidateentity.ErrConsentRequired):
			abort(c, 409, "consent_required", "Для прохождения теста нужно согласие на обработку персональных данных")
		case errors.Is(err, candidateentity.ErrForbidden):
			abort(c, 403, "forbidden", "Тесты может проходить только активный кандидат")
		case errors.As(err, &validation):
			abort(c, 400, "validation_error", validation.Message)
		case errors.As(err, &input):
			abort(c, 400, "validation_error", input.Message)
		case errors.As(err, &large):
			abort(c, 413, "request_too_large", "Превышен допустимый размер запроса")
		default:
			log.Error("Не удалось выполнить действие с тестом кандидата", "error", err)
			abort(c, 500, "internal_error", "Внутренняя ошибка сервера")
		}
	}
	g := api.Group("/me/assessments", auth.Middleware(verifier), middleware.CurrentUser(log, users), middleware.RequireRole(user.RoleCandidate))
	g.Use(func(c *gin.Context) {
		if attempts == nil {
			abort(c, 503, "assessments_unavailable", "Тестирование не настроено")
			return
		}
		c.Header("Cache-Control", "private, no-store")
		c.Next()
	})
	owner := func(c *gin.Context) string { u, _ := middleware.UserFrom(c); return u.ID }

	g.GET("/history", func(c *gin.Context) {
		page, err := attempts.History(c.Request.Context(), owner(c), c.Request.URL.RawQuery)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, page)
	})
	g.GET("/available", func(c *gin.Context) {
		items, err := attempts.Available(c.Request.Context(), owner(c))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"items": items})
	})
	g.POST("/attempts", func(c *gin.Context) {
		var in entity.StartInput
		if err := request.JSON(c, &in); err != nil {
			fail(c, err)
			return
		}
		attempt, err := attempts.Start(c.Request.Context(), owner(c), in)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(201, attempt)
	})
	g.GET("/attempts/current", func(c *gin.Context) {
		attempt, err := attempts.Current(c.Request.Context(), owner(c))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, attempt)
	})
	g.GET("/attempts/:id", func(c *gin.Context) {
		attempt, err := attempts.Get(c.Request.Context(), owner(c), c.Param("id"))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, attempt)
	})
	g.PUT("/attempts/:id/answers/:question_id", func(c *gin.Context) {
		var in entity.Answer
		if err := request.JSON(c, &in); err != nil {
			fail(c, err)
			return
		}
		if err := attempts.SaveAnswer(c.Request.Context(), owner(c), c.Param("id"), c.Param("question_id"), in); err != nil {
			fail(c, err)
			return
		}
		c.Status(204)
	})
	g.POST("/attempts/:id/submit", func(c *gin.Context) {
		attempt, err := attempts.Submit(c.Request.Context(), owner(c), c.Param("id"))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, attempt)
	})
}

func abortWith(c *gin.Context, status int, code, message string, extra gin.H) {
	body := gin.H{"code": code, "message": message}
	for k, v := range extra {
		body[k] = v
	}
	c.AbortWithStatusJSON(status, gin.H{"error": body})
}
