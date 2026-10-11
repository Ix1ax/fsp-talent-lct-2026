package web

import (
	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func (h companiesHandler) create(c *gin.Context) {
	var in entity.Input
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.service.Create(c.Request.Context(), u.ID, in)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Location", "/api/v1/companies/"+result.ID)
	c.JSON(201, result)
}
func (h companiesHandler) get(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	u, _ := middleware.UserFrom(c)
	result, err := h.service.Get(c.Request.Context(), u.ID, c.Param("company_id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, result)
}
func (h companiesHandler) list(c *gin.Context) {
	c.Header("Cache-Control", "private, no-store")
	limit, offset, err := request.Page(c)
	if err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	items, total, err := h.service.List(c.Request.Context(), u.ID, limit, offset)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items, "total": total, "limit": limit, "offset": offset})
}
func (h companiesHandler) update(c *gin.Context) {
	var patch entity.Patch
	if err := request.JSON(c, &patch); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.service.Update(c.Request.Context(), u.ID, c.Param("company_id"), patch)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, result)
}
