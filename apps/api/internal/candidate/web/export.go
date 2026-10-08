package web

import (
	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
)

func (h profileHandler) exportPDF(c *gin.Context) {
	if h.full == nil {
		abortError(c, 503, "candidate_unavailable", "Экспорт профиля не настроен")
		return
	}
	select {
	case h.uploads <- struct{}{}:
		defer func() { <-h.uploads }()
	default:
		abortError(c, 503, "export_busy", "Экспорт занят; повторите запрос позже")
		return
	}
	u, _ := middleware.UserFrom(c)
	data, err := h.full.ExportPDF(c.Request.Context(), u.ID)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.Header("Content-Disposition", `attachment; filename="resume.pdf"`)
	c.Header("X-Content-Type-Options", "nosniff")
	c.Data(200, "application/pdf", data)
}
