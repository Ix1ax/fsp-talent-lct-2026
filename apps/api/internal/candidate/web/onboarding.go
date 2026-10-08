package web

import (
	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func (h profileHandler) getOnboarding(c *gin.Context) {
	if h.full == nil {
		abortError(c, 503, "candidate_unavailable", "Сервис профиля не настроен")
		return
	}
	u, _ := middleware.UserFrom(c)
	p, err := h.full.Get(c.Request.Context(), u.ID)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.JSON(200, p.Onboarding)
}
func (h profileHandler) putOnboarding(c *gin.Context) {
	if h.full == nil {
		abortError(c, 503, "candidate_unavailable", "Сервис профиля не настроен")
		return
	}
	var in entity.SurveyInput
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	survey, err := h.full.PutSurvey(c.Request.Context(), u.ID, in)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.JSON(200, survey)
}
