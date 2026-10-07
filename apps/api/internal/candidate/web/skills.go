package web

import (
	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func (h profileHandler) listSkills(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	items, err := h.skills.List(c.Request.Context(), u.ID)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items})
}

func (h profileHandler) putSkill(c *gin.Context) {
	var in entity.SkillInput
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	skill, err := h.skills.Put(c.Request.Context(), u.ID, c.Param("skill_id"), in)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, skill)
}

func (h profileHandler) deleteSkill(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	if err := h.skills.Delete(c.Request.Context(), u.ID, c.Param("skill_id")); err != nil {
		h.fail(c, err)
		return
	}
	c.Status(204)
}

func (h profileHandler) submitSkill(c *gin.Context) {
	var in entity.SkillSubmissionInput
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	skill, err := h.skills.Submit(c.Request.Context(), u.ID, in)
	if err != nil {
		h.fail(c, err)
		return
	}
	// Метод идемпотентен по названию: может вернуть и уже существующий навык.
	c.JSON(200, skill)
}
