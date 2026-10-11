package web

import (
	"github.com/gin-gonic/gin"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
)

func (h profileHandler) putContacts(c *gin.Context) {
	var in entity.ContactsInput
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	u, _ := middleware.UserFrom(c)
	result, err := h.contacts.Put(c.Request.Context(), u.ID, in)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.JSON(200, result)
}

func (h profileHandler) getContacts(c *gin.Context) {
	u, _ := middleware.UserFrom(c)
	result, err := h.contacts.Get(c.Request.Context(), u.ID)
	if err != nil {
		h.fail(c, err)
		return
	}
	c.Header("Cache-Control", "private, no-store")
	c.JSON(200, result)
}
