// Пакет web публикует управление банком заданий и шаблонами тестов в админской панели.
package web

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	adminweb "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/web"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

const basePath = "/api/v1/admin/assessments"

func Register(api *gin.RouterGroup, log *slog.Logger, admins *adminservice.Service, assessments *service.Service) {
	fail := func(c *gin.Context, err error) {
		var validation *entity.ValidationError
		var input *request.ValidationError
		var large *http.MaxBytesError
		var shortage *entity.InsufficientError
		switch {
		case errors.As(err, &shortage):
			c.AbortWithStatusJSON(409, gin.H{
				"error":     gin.H{"code": "insufficient_questions", "message": shortage.Error()},
				"shortages": shortage.Items,
			})
			return
		case errors.Is(err, entity.ErrNotFound):
			abort(c, 404, "assessment_not_found", err.Error())
		case errors.Is(err, entity.ErrConflict):
			abort(c, 409, "assessment_conflict", err.Error())
		case errors.As(err, &validation):
			abort(c, 400, "validation_error", validation.Message)
		case errors.As(err, &input):
			abort(c, 400, "validation_error", input.Message)
		case errors.As(err, &large):
			abort(c, 413, "request_too_large", "Превышен допустимый размер запроса")
		default:
			log.Error("Не удалось выполнить действие с банком заданий", "error", err)
			abort(c, 500, "internal_error", "Внутренняя ошибка сервера")
		}
	}
	g := api.Group("/admin/assessments", adminweb.Authenticate(log, admins))
	g.Use(func(c *gin.Context) {
		if assessments == nil {
			abort(c, 503, "assessments_unavailable", "Банк заданий не настроен")
			return
		}
		c.Next()
	})
	actor := func(c *gin.Context) string { a, _ := adminweb.CurrentAccount(c); return a.ID }

	g.POST("/questions", func(c *gin.Context) {
		var in entity.QuestionInput
		if err := request.JSON(c, &in); err != nil {
			fail(c, err)
			return
		}
		result, err := assessments.CreateQuestion(c.Request.Context(), actor(c), in)
		if err != nil {
			fail(c, err)
			return
		}
		c.Header("Location", basePath+"/questions/"+result.ID)
		c.JSON(201, result)
	})
	g.GET("/questions", func(c *gin.Context) {
		limit, offset, err := request.Page(c)
		if err != nil {
			fail(c, err)
			return
		}
		f := entity.QuestionFilter{SkillID: c.Query("skill_id"), Kind: c.Query("kind"), Status: c.Query("status"), Limit: limit, Offset: offset}
		if f.Difficulty, err = int16Query(c, "difficulty"); err != nil {
			fail(c, err)
			return
		}
		if value, ok := c.GetQuery("active"); ok {
			switch value {
			case "true", "false":
				active := value == "true"
				f.Active = &active
			default:
				fail(c, &entity.ValidationError{Message: "Параметр active должен быть true или false"})
				return
			}
		}
		page, err := assessments.ListQuestions(c.Request.Context(), f)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, page)
	})
	g.GET("/questions/:id", func(c *gin.Context) {
		result, err := assessments.GetQuestion(c.Request.Context(), c.Param("id"))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, result)
	})
	g.POST("/questions/:id/versions", func(c *gin.Context) {
		var in entity.VersionInput
		if err := request.JSON(c, &in); err != nil {
			fail(c, err)
			return
		}
		result, err := assessments.CreateVersion(c.Request.Context(), actor(c), c.Param("id"), in)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(201, result)
	})
	g.POST("/questions/:id/versions/:version/publish", func(c *gin.Context) {
		version, err := strconv.Atoi(c.Param("version"))
		if err != nil {
			fail(c, &entity.ValidationError{Message: "Номер версии должен быть целым числом от 1"})
			return
		}
		result, err := assessments.PublishVersion(c.Request.Context(), actor(c), c.Param("id"), version)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, result)
	})
	g.POST("/questions/:id/archive", func(c *gin.Context) {
		result, err := assessments.ArchiveQuestion(c.Request.Context(), actor(c), c.Param("id"))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, result)
	})

	g.POST("/templates", func(c *gin.Context) {
		var in entity.TemplateInput
		if err := request.JSON(c, &in); err != nil {
			fail(c, err)
			return
		}
		result, err := assessments.CreateTemplate(c.Request.Context(), actor(c), in)
		if err != nil {
			fail(c, err)
			return
		}
		c.Header("Location", basePath+"/templates/"+result.ID)
		c.JSON(201, result)
	})
	g.GET("/templates", func(c *gin.Context) {
		limit, offset, err := request.Page(c)
		if err != nil {
			fail(c, err)
			return
		}
		f := entity.TemplateFilter{Status: c.Query("status"), Limit: limit, Offset: offset}
		if f.SpecializationID, err = int16Query(c, "specialization_id"); err != nil {
			fail(c, err)
			return
		}
		if f.GradeID, err = int16Query(c, "grade_id"); err != nil {
			fail(c, err)
			return
		}
		page, err := assessments.ListTemplates(c.Request.Context(), f)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, page)
	})
	g.GET("/templates/:id", func(c *gin.Context) {
		result, err := assessments.GetTemplate(c.Request.Context(), c.Param("id"))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, result)
	})
	g.POST("/templates/:id/publish", func(c *gin.Context) {
		result, err := assessments.PublishTemplate(c.Request.Context(), actor(c), c.Param("id"))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, result)
	})
	g.POST("/templates/:id/archive", func(c *gin.Context) {
		result, err := assessments.ArchiveTemplate(c.Request.Context(), actor(c), c.Param("id"))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, result)
	})
}

func abort(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}

// int16Query читает необязательный целочисленный параметр запроса; отсутствие даёт 0.
func int16Query(c *gin.Context, name string) (int16, error) {
	value, ok := c.GetQuery(name)
	if !ok || value == "" {
		return 0, nil
	}
	n, err := strconv.ParseInt(value, 10, 16)
	if err != nil {
		return 0, &entity.ValidationError{Message: "Параметр " + name + " должен быть целым числом"}
	}
	return int16(n), nil
}
