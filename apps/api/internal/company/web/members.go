package web

import (
	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func (h companiesHandler) listMembers(c *gin.Context) {
	limit, offset, err := request.Page(c)
	if err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	items, total, err := h.members.List(c.Request.Context(), u.ID, c.Param("company_id"), limit, offset)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items, "total": total, "limit": limit, "offset": offset})
}
func (h companiesHandler) updateMember(c *gin.Context) {
	var in struct {
		Role string `json:"role"`
	}
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	m, err := h.members.Update(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("user_id"), in.Role)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, m)
}
func (h companiesHandler) removeMember(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	if err := h.members.Remove(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("user_id")); err != nil {
		h.fail(c, err)
		return
	}
	c.Status(204)
}
func (h companiesHandler) invite(c *gin.Context) {
	var in entity.InvitationInput
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	i, err := h.members.Invite(c.Request.Context(), u.ID, c.Param("company_id"), in)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(201, i)
}
func (h companiesHandler) listInvitations(c *gin.Context) {
	limit, offset, err := request.Page(c)
	if err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	items, total, err := h.members.Invitations(c.Request.Context(), u.ID, c.Param("company_id"), limit, offset)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, gin.H{"items": items, "total": total, "limit": limit, "offset": offset})
}
func (h companiesHandler) revokeInvitation(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	if err := h.members.Revoke(c.Request.Context(), u.ID, c.Param("company_id"), c.Param("invitation_id")); err != nil {
		h.fail(c, err)
		return
	}
	c.Status(204)
}
func (h companiesHandler) acceptInvitation(c *gin.Context) {
	var in struct {
		Token string `json:"token"`
	}
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	identity, _ := auth.IdentityFrom(c)
	m, err := h.members.Accept(c.Request.Context(), u.ID, identity.Email, in.Token)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.JSON(200, m)
}
