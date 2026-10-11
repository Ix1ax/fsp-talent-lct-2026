package repository

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/entity"
)

func (r *Repository) SetStatus(ctx context.Context, actor, kind, id string, in entity.StatusInput) (map[string]any, error) {
	tx, role, err := r.begin(ctx, actor, false)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	table, column, entityType, action := "users", "status", "user", "user.status_changed"
	switch kind {
	case "company":
		table, column, entityType, action = "companies", "status", "company", "company.status_changed"
	case "need":
		table, column, entityType, action = "employer_needs", "moderation_status", "need", "need.moderated"
	case "task":
		table, column, entityType, action = "company_daily_tasks", "moderation_status", "company_task", "task.moderated"
	case "user":
	default:
		return nil, entity.ErrNotFound
	}
	var old string
	if err = tx.QueryRow(ctx, `SELECT `+column+` FROM `+table+` WHERE id=$1 FOR UPDATE`, id).Scan(&old); err != nil {
		return nil, dbError(err)
	}
	if kind == "user" {
		var userRole string
		if err = tx.QueryRow(ctx, `SELECT role FROM users WHERE id=$1`, id).Scan(&userRole); err != nil {
			return nil, err
		}
		if userRole == "admin" && role != "superadmin" {
			return nil, entity.ErrForbidden
		}
		if old == "deleted" {
			return nil, entity.ErrConflict
		}
	}
	if old != in.Status {
		set := column + `=$2`
		if kind == "user" {
			set += `,updated_at=clock_timestamp()`
		}
		if kind == "user" || kind == "company" {
			set += `,blocked_reason=CASE WHEN $2::varchar='blocked' THEN $3::text END,blocked_at=CASE WHEN $2::varchar='blocked' THEN clock_timestamp() END`
		}
		// Скрытие останавливает приём; восстановление публикации не открывает его автоматически.
		if in.Status == "hidden" {
			if kind == "task" {
				set += `,status='closed'`
			}
			if kind == "need" {
				set += `,status='archived'`
			}
		}
		args := []any{id, in.Status}
		if kind == "user" || kind == "company" {
			args = append(args, in.Reason)
		}
		if _, err = tx.Exec(ctx, `UPDATE `+table+` SET `+set+` WHERE id=$1`, args...); err != nil {
			return nil, err
		}
		if err = event(ctx, tx, actor, "", action, entityType, id, old, in.Status, in.Reason); err != nil {
			return nil, err
		}
	}
	value, from, _, idColumn, _ := plan(map[string]string{"user": "users", "company": "companies", "need": "needs", "task": "tasks"}[kind])
	var result map[string]any
	if err = tx.QueryRow(ctx, `SELECT `+value+from+` WHERE `+idColumn+`=$1`, id).Scan(&result); err != nil {
		return nil, err
	}
	return result, tx.Commit(ctx)
}
