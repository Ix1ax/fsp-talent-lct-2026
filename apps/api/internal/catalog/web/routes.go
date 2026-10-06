// Пакет web публикует общие справочники для работодателей и соискателей.
package web

import (
	"errors"
	"log/slog"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func Register(api *gin.RouterGroup, log *slog.Logger, service *catalog.Service) {
	fail := func(c *gin.Context, err error) {
		var input *request.ValidationError
		var validation *catalog.ValidationError
		if errors.As(err, &input) {
			c.AbortWithStatusJSON(400, gin.H{"error": gin.H{"code": "validation_error", "message": input.Message}})
			return
		}
		if errors.As(err, &validation) {
			c.AbortWithStatusJSON(400, gin.H{"error": gin.H{"code": "validation_error", "message": validation.Message}})
			return
		}
		log.Error("Не удалось прочитать справочники", "error", err)
		c.AbortWithStatusJSON(500, gin.H{"error": gin.H{"code": "internal_error", "message": "Внутренняя ошибка сервера"}})
	}
	g := api.Group("/catalogs", func(c *gin.Context) {
		if service == nil {
			c.AbortWithStatusJSON(503, gin.H{"error": gin.H{"code": "catalogs_unavailable", "message": "Справочники не настроены"}})
			return
		}
		c.Next()
	})
	g.GET("", func(c *gin.Context) {
		result, err := service.Get(c.Request.Context())
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, result)
	})
	g.GET("/skills", func(c *gin.Context) {
		limit, offset, err := request.Page(c)
		if err != nil {
			fail(c, err)
			return
		}
		items, err := service.Skills(c.Request.Context(), c.Query("q"), limit, offset)
		if err != nil {
			fail(c, err)
			return
		}
		c.JSON(200, gin.H{"items": items, "limit": limit, "offset": offset})
	})
}
