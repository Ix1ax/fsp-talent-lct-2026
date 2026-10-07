// Пакет web публикует управление справочниками в отдельной админской панели.
package web

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	adminweb "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/web"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func Register(api *gin.RouterGroup, log *slog.Logger, admins *adminservice.Service, catalogs *service.Service) {
	fail := func(c *gin.Context, err error) {
		var validation *entity.ValidationError
		var input *request.ValidationError
		var large *http.MaxBytesError
		status, code, message := 500, "internal_error", "Внутренняя ошибка сервера"
		switch {
		case errors.Is(err, entity.ErrInvalidTransition):
			status, code, message = 409, "skill_moderation_conflict", err.Error()
		case errors.Is(err, entity.ErrNotFound):
			status, code, message = 404, "catalog_item_not_found", err.Error()
		case errors.Is(err, entity.ErrInUse):
			status, code, message = 409, "catalog_item_in_use", err.Error()
		case errors.Is(err, entity.ErrModerationRequired):
			status, code, message = 409, "skill_moderation_required", err.Error()
		case errors.Is(err, entity.ErrConflict):
			status, code, message = 409, "catalog_conflict", err.Error()
		case errors.Is(err, entity.ErrForbidden):
			status, code, message = 403, "forbidden", err.Error()
		case errors.As(err, &validation):
			status, code, message = 400, "validation_error", validation.Message
		case errors.As(err, &input):
			status, code, message = 400, "validation_error", input.Message
		case errors.As(err, &large):
			status, code, message = 413, "request_too_large", "Превышен допустимый размер запроса"
		default:
			log.Error("Не удалось изменить справочник", "error", err)
		}
		c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
	}
	g := api.Group("/admin/catalogs", adminweb.Authenticate(log, admins))
	g.Use(func(c *gin.Context) {
		if catalogs == nil {
			c.AbortWithStatusJSON(503, gin.H{"error": gin.H{"code": "catalogs_unavailable", "message": "Управление справочниками не настроено"}})
			return
		}
		c.Next()
	})
	g.GET("", func(c *gin.Context) {
		c.JSON(200, gin.H{"items": []gin.H{
			{"code": "specializations", "name": "Специализации", "id_type": "integer"},
			{"code": "skills", "name": "Навыки", "id_type": "uuid"},
			{"code": "grades", "name": "Грейды", "id_type": "integer"},
			{"code": "work_formats", "name": "Форматы работы", "id_type": "integer"},
		}})
	})
	actor := func(c *gin.Context) string { a, _ := adminweb.CurrentAccount(c); return a.ID }
	g.GET("/:kind", func(c *gin.Context) {
		limit, offset, err := request.Page(c)
		if err != nil {
			fail(c, err)
			return
		}
		items, err := catalogs.List(c.Request.Context(), actor(c), c.Param("kind"), c.Query("q"), limit, offset)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"items": items, "limit": limit, "offset": offset})
	})
	g.GET("/:kind/:id", func(c *gin.Context) {
		item, err := catalogs.Get(c.Request.Context(), actor(c), c.Param("kind"), c.Param("id"))
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, item)
	})
	g.POST("/:kind", func(c *gin.Context) {
		var in entity.CreateInput
		if err := request.JSON(c, &in); err != nil {
			fail(c, err)
			return
		}
		item, err := catalogs.Create(c.Request.Context(), actor(c), c.Param("kind"), in)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(201, item)
	})
	g.PATCH("/:kind/:id", func(c *gin.Context) {
		var in entity.UpdateInput
		if err := request.JSON(c, &in); err != nil {
			fail(c, err)
			return
		}
		item, err := catalogs.Update(c.Request.Context(), actor(c), c.Param("kind"), c.Param("id"), in)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, item)
	})
	g.DELETE("/:kind/:id", func(c *gin.Context) {
		if err := catalogs.Delete(c.Request.Context(), actor(c), c.Param("kind"), c.Param("id")); err != nil {
			fail(c, err)
			return
		}
		c.Status(204)
	})
	g.GET("/skills/pending", func(c *gin.Context) {
		limit, offset, err := request.Page(c)
		if err != nil {
			fail(c, err)
			return
		}
		items, err := catalogs.Pending(c.Request.Context(), actor(c), limit, offset)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"items": items, "limit": limit, "offset": offset})
	})
	for _, entry := range []struct{ path, action string }{{"approve", "approved"}, {"reject", "rejected"}, {"merge", "merged"}} {
		g.POST("/skills/:id/"+entry.path, func(c *gin.Context) {
			var in entity.ModerationInput
			if c.Request.ContentLength != 0 {
				if err := request.JSON(c, &in); err != nil {
					fail(c, err)
					return
				}
			}
			result, err := catalogs.Moderate(c.Request.Context(), actor(c), c.Param("id"), entry.action, in)
			if err != nil {
				fail(c, err)
				return
			}
			c.JSON(200, result)
		})
	}

}
