package web

import (
	"encoding/json"
	"errors"

	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func (h companiesHandler) needFail(c *gin.Context, err error) {
	if errors.Is(err, entity.ErrNotFound) {
		abortError(c, 404, "not_found", "Компания или потребность не найдены")
		return
	}
	if errors.Is(err, entity.ErrForbidden) {
		abortError(c, 403, "forbidden", "Изменять потребности могут только владелец и рекрутер компании")
		return
	}
	h.fail(c, err)
}
func (h companiesHandler) createNeed(c *gin.Context) {
	var in entity.NeedInput
	if err := request.JSON(c, &in); err != nil {
		h.needFail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.needs.Create(c.Request.Context(), u.ID, c.Param("company_id"), in)
	if err != nil {
		h.needFail(c, err)
		return
	}
	c.Header("Location", "/api/v1/companies/"+result.CompanyID+"/needs/"+result.ID)
	c.JSON(201, result)
}
func (h companiesHandler) getNeed(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	result, err := h.needs.Get(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("need_id"))
	if err != nil {
		h.needFail(c, err)
		return
	}
	c.JSON(200, result)
}
func (h companiesHandler) listNeeds(c *gin.Context) {
	limit, offset, err := request.Page(c)
	if err != nil {
		h.needFail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	items, err := h.needs.List(c.Request.Context(), u.ID, c.Param("company_id"), c.Query("status"), limit, offset)
	if err != nil {
		h.needFail(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items, "limit": limit, "offset": offset})
}
func (h companiesHandler) updateNeed(c *gin.Context) {
	var patch map[string]json.RawMessage
	if err := request.JSON(c, &patch); err != nil {
		h.needFail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.needs.Update(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("need_id"), patch)
	if err != nil {
		h.needFail(c, err)
		return
	}
	c.JSON(200, result)
}
func (h companiesHandler) archiveNeed(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	if err := h.needs.Archive(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("need_id")); err != nil {
		h.needFail(c, err)
		return
	}
	c.Status(204)
}
