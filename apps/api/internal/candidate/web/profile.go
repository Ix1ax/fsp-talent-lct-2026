package web

import (
	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func (h profileHandler) create(c *gin.Context) {
	var in entity.ProfileInput
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.profiles.Create(c.Request.Context(), u.ID, in)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Location", "/api/v1/me/profile")
	c.JSON(201, result)
}

func (h profileHandler) get(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	result, err := h.profiles.Get(c.Request.Context(), u.ID)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, result)
}

func (h profileHandler) update(c *gin.Context) {
	var patch entity.Patch
	if err := request.JSON(c, &patch); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.profiles.Update(c.Request.Context(), u.ID, patch)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, result)
}
