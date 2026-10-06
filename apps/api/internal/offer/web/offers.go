package web

import (
	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
)

func (h handler) create(c *gin.Context) {
	var in entity.Input
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	o, err := h.offers.Create(c.Request.Context(), u.ID, c.Param("company_id"), in)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Location", "/api/v1/companies/"+o.CompanyID+"/offers/"+o.ID)
	c.JSON(201, o)
}
func (h handler) companyList(c *gin.Context)   { h.list(c, true) }
func (h handler) candidateList(c *gin.Context) { h.list(c, false) }
func (h handler) list(c *gin.Context, company bool) {
	limit, offset, err := request.Page(c)
	if err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	var items []entity.Offer
	if company {
		items, err = h.offers.CompanyList(c.Request.Context(), u.ID, c.Param("company_id"), c.Query("status"), limit, offset)
	} else {
		items, err = h.offers.CandidateList(c.Request.Context(), u.ID, c.Query("status"), limit, offset)
	}
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items, "limit": limit, "offset": offset})
}
func (h handler) companyGet(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	o, err := h.offers.CompanyGet(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("offer_id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, o)
}
func (h handler) candidateGet(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	o, err := h.offers.CandidateGet(c.Request.Context(), u.ID, c.Param("offer_id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, o)
}
func (h handler) view(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	o, err := h.offers.View(c.Request.Context(), u.ID, c.Param("offer_id"))
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, o)
}
func (h handler) respond(c *gin.Context) {
	var in struct {
		Status string `json:"status"`
	}
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	o, err := h.offers.Respond(c.Request.Context(), u.ID, c.Param("offer_id"), in.Status)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, o)
}
