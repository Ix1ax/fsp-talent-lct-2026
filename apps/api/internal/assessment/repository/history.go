package repository

import (
	"context"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
)

func (r *Repository) History(ctx context.Context, userID string, limit, offset int) (entity.HistoryPage, error) {
	page := entity.HistoryPage{Items: []entity.HistoryItem{}, Limit: limit, Offset: offset}
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return page, err
	}
	defer tx.Rollback(ctx)
	profile, err := lockCandidate(ctx, tx, userID)
	if err != nil {
		return page, err
	}
	if err = closeExpired(ctx, tx, profile); err != nil {
		return page, err
	}
	if err = tx.QueryRow(ctx, `SELECT count(*) FROM assessment_attempts WHERE candidate_id=$1`, profile).Scan(&page.Total); err != nil {
		return page, err
	}
	rows, err := tx.Query(ctx, `SELECT a.id::text,a.status,a.specialization_id,a.grade_id,a.started_at,a.finished_at,a.score_percent::float8,
 CASE WHEN h.id IS NOT NULL THEN jsonb_build_object('specialization_id',h.specialization_id,'specialization',s.name,'grade_id',h.grade_id,'grade',g.name,'confirmed_at',h.achieved_at) END
 FROM assessment_attempts a LEFT JOIN grade_history h ON h.attempt_id=a.id LEFT JOIN specializations s ON s.id=h.specialization_id LEFT JOIN grades g ON g.id=h.grade_id
 WHERE a.candidate_id=$1 ORDER BY a.started_at DESC,a.id DESC LIMIT $2 OFFSET $3`, profile, limit, offset)
	if err != nil {
		return page, err
	}
	for rows.Next() {
		var item entity.HistoryItem
		if err = rows.Scan(&item.ID, &item.Status, &item.SpecializationID, &item.GradeID, &item.StartedAt, &item.FinishedAt, &item.ScorePercent, &item.Category); err != nil {
			rows.Close()
			return page, err
		}
		page.Items = append(page.Items, item)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return page, err
	}
	return page, tx.Commit(ctx)
}
