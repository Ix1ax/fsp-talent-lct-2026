package web

import (
	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
)

// getFull отдаёт профиль, согласия, контакты, навыки и готовность одним ответом. В нём контакты, поэтому ответ не кешируется.
func (h profileHandler) getFull(c *gin.Context) {
	if h.full == nil {
		abortError(c, 503, "candidate_unavailable", "Сервис профилей кандидатов не настроен")
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.full.Get(c.Request.Context(), u.ID)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.JSON(200, result)
}
