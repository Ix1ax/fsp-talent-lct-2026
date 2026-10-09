package web

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/auth"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/middleware"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi/request"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
	"github.com/jackc/pgx/v5/pgtype"
)

type handler struct {
	tasks   *service.Service
	log     *slog.Logger
	uploads chan struct{}
}

func Register(api *gin.RouterGroup, log *slog.Logger, verifier auth.Verifier, users *user.Service, tasks *service.Service) {
	h := handler{tasks, log, make(chan struct{}, 2)}
	guard := func(c *gin.Context) {
		c.Header("Cache-Control", "private, no-store")
		if tasks == nil {
			abort(c, 503, "daily_tasks_unavailable", "Задания компаний не настроены")
			return
		}
		for _, key := range []string{"company_id", "task_id", "submission_id"} {
			if v := c.Param(key); v != "" {
				var id pgtype.UUID
				if id.Scan(v) != nil || !id.Valid {
					abort(c, 400, "validation_error", "Некорректный UUID в адресе запроса")
					return
				}
			}
		}
		c.Next()
	}
	employer := api.Group("/companies/:company_id", auth.Middleware(verifier), middleware.CurrentUser(log, users), middleware.RequireRole(user.RoleEmployer), guard)
	employer.POST("/tasks", h.uploadTask)
	employer.GET("/tasks", h.list)
	employer.GET("/tasks/:task_id", h.get)
	employer.GET("/tasks/:task_id/file", h.downloadTask)
	employer.POST("/tasks/:task_id/close", h.close)
	employer.GET("/tasks/:task_id/submissions", h.listSubmissions)
	employer.GET("/tasks/:task_id/submissions/:submission_id", h.getSubmission)
	employer.GET("/tasks/:task_id/submissions/:submission_id/file", h.downloadSolution)
	employer.PATCH("/tasks/:task_id/submissions/:submission_id/review", h.review)
	candidate := api.Group("", auth.Middleware(verifier), middleware.CurrentUser(log, users), middleware.RequireRole(user.RoleCandidate), guard)
	candidate.GET("/tasks", h.list)
	candidate.GET("/tasks/:task_id", h.get)
	candidate.GET("/tasks/:task_id/file", h.downloadTask)
	candidate.POST("/tasks/:task_id/submissions", h.uploadSolution)
	candidate.GET("/me/task-submissions", h.listSubmissions)
	candidate.GET("/me/task-submissions/:submission_id", h.getSubmission)
	candidate.GET("/me/task-submissions/:submission_id/file", h.downloadSolution)
}

func userID(c *gin.Context) string { u, _ := middleware.UserFrom(c); return u.ID }
func (h handler) list(c *gin.Context) {
	f, err := entity.ParseFilter(c.Request.URL.RawQuery, false, c.Param("company_id") != "")
	if err != nil {
		h.fail(c, err)
		return
	}
	v, err := h.tasks.List(c.Request.Context(), userID(c), c.Param("company_id"), f)
	h.respond(c, 200, v, err)
}
func (h handler) get(c *gin.Context) {
	v, err := h.tasks.Get(c.Request.Context(), userID(c), c.Param("company_id"), c.Param("task_id"))
	h.respond(c, 200, v, err)
}
func (h handler) close(c *gin.Context) {
	v, err := h.tasks.Close(c.Request.Context(), userID(c), c.Param("company_id"), c.Param("task_id"))
	h.respond(c, 200, v, err)
}
func (h handler) listSubmissions(c *gin.Context) {
	f, err := entity.ParseFilter(c.Request.URL.RawQuery, true, c.Param("company_id") != "")
	if err != nil {
		h.fail(c, err)
		return
	}
	v, err := h.tasks.ListSubmissions(c.Request.Context(), userID(c), c.Param("company_id"), c.Param("task_id"), f)
	h.respond(c, 200, v, err)
}
func (h handler) getSubmission(c *gin.Context) {
	v, err := h.tasks.GetSubmission(c.Request.Context(), userID(c), c.Param("company_id"), c.Param("task_id"), c.Param("submission_id"))
	h.respond(c, 200, v, err)
}
func (h handler) review(c *gin.Context) {
	var in entity.ReviewInput
	if err := request.JSON(c, &in); err != nil {
		h.fail(c, err)
		return
	}
	v, err := h.tasks.Review(c.Request.Context(), userID(c), c.Param("company_id"), c.Param("task_id"), c.Param("submission_id"), in)
	h.respond(c, 200, v, err)
}
