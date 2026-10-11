package repository

import (
	"context"
	"encoding/json"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
)

// Pending возвращает страницу навыков на модерации и их общее число.
func (r *Repository) Pending(ctx context.Context, actor string, limit, offset int) ([]entity.Item, int64, error) {
	tx, err := r.begin(ctx, actor)
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback(ctx)
	cols, _ := columns("skills")
	var total int64
	if err = tx.QueryRow(ctx, `SELECT count(*) FROM skills WHERE moderation_status='pending'`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := tx.Query(ctx, `SELECT `+cols+` FROM skills WHERE moderation_status='pending' ORDER BY submitted_at NULLS LAST,id LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	items := []entity.Item{}
	for rows.Next() {
		item, e := scan(rows)
		if e != nil {
			rows.Close()
			return nil, 0, e
		}
		items = append(items, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, 0, err
	}
	return items, total, tx.Commit(ctx)
}

func (r *Repository) Moderate(ctx context.Context, actor, id, action string, in entity.ModerationInput) (entity.ModerationResult, error) {
	result := entity.ModerationResult{}
	tx, err := r.begin(ctx, actor)
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)
	if err = catalog.LockSkillModeration(ctx, tx); err != nil {
		return result, err
	}
	cols, _ := columns("skills")
	source, err := scan(tx.QueryRow(ctx, `SELECT `+cols+` FROM skills WHERE id=$1 FOR UPDATE`, id))
	if err != nil {
		return result, err
	}
	status := *source.ModerationStatus
	switch action {
	case "approved":
		if status != "pending" {
			return result, entity.ErrInvalidTransition
		}
	case "rejected", "merged":
		if status != "pending" && status != "approved" {
			return result, entity.ErrInvalidTransition
		}
	default:
		return result, entity.ErrInvalidTransition
	}
	if action == "merged" {
		target, err := scan(tx.QueryRow(ctx, `SELECT `+cols+` FROM skills WHERE id=$1 FOR UPDATE`, in.TargetID))
		if err != nil {
			return result, err
		}
		if in.TargetID == id || *target.ModerationStatus != "approved" || !*target.Active {
			return result, entity.ErrInvalidTransition
		}
		// При дубле не теряем более высокий заявленный уровень. Подтверждения уровня здесь нет.
		tag, err := tx.Exec(ctx, `INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level,updated_at)
   SELECT candidate_id,$2,claimed_level,clock_timestamp() FROM candidate_skills WHERE skill_id=$1
   ON CONFLICT(candidate_id,skill_id) DO UPDATE SET
    claimed_level=GREATEST(candidate_skills.claimed_level,EXCLUDED.claimed_level),updated_at=clock_timestamp()`, id, in.TargetID)
		if err != nil {
			return result, err
		}
		result.CandidateLinks = int(tag.RowsAffected())
		tag, err = tx.Exec(ctx, `INSERT INTO need_skills(need_id,skill_id,required,weight)
   SELECT need_id,$2,required,weight FROM need_skills WHERE skill_id=$1
   ON CONFLICT(need_id,skill_id) DO UPDATE SET required=need_skills.required OR EXCLUDED.required,weight=GREATEST(need_skills.weight,EXCLUDED.weight)`, id, in.TargetID)
		if err != nil {
			return result, err
		}
		result.NeedLinks = int(tag.RowsAffected())
		// Подтверждения тестов переезжают на целевой навык с сохранением лучшего уровня.
		if _, err = tx.Exec(ctx, `INSERT INTO skill_evidence(candidate_id,skill_id,source,level,attempt_id,updated_at)
   SELECT candidate_id,$2,source,level,attempt_id,clock_timestamp() FROM skill_evidence WHERE skill_id=$1
   ON CONFLICT(candidate_id,skill_id,source) DO UPDATE SET level=EXCLUDED.level,attempt_id=EXCLUDED.attempt_id,updated_at=clock_timestamp()
    WHERE skill_evidence.level<EXCLUDED.level`, id, in.TargetID); err != nil {
			return result, err
		}
		if _, err = tx.Exec(ctx, `DELETE FROM skill_evidence WHERE skill_id=$1`, id); err != nil {
			return result, err
		}
		if _, err = tx.Exec(ctx, `DELETE FROM candidate_skills WHERE skill_id=$1`, id); err != nil {
			return result, err
		}
		if _, err = tx.Exec(ctx, `DELETE FROM need_skills WHERE skill_id=$1`, id); err != nil {
			return result, err
		}
		// Предыдущие объединения тоже ведут сразу к текущему каноническому навыку, без цепочек.
		if _, err = tx.Exec(ctx, `UPDATE skills SET merged_into=$2 WHERE merged_into=$1`, id, in.TargetID); err != nil {
			return result, err
		}
	}
	if action == "rejected" {
		tag, err := tx.Exec(ctx, `DELETE FROM candidate_skills WHERE skill_id=$1`, id)
		if err != nil {
			return result, err
		}
		result.CandidateLinks = int(tag.RowsAffected())
		// После удаления последнего навыка активная потребность становится черновиком.
		rows, err := tx.Query(ctx, `DELETE FROM need_skills WHERE skill_id=$1 RETURNING need_id::text`, id)
		if err != nil {
			return result, err
		}
		needs := []string{}
		for rows.Next() {
			var need string
			if err = rows.Scan(&need); err != nil {
				rows.Close()
				return result, err
			}
			needs = append(needs, need)
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return result, err
		}
		result.NeedLinks = len(needs)
		tag, err = tx.Exec(ctx, `UPDATE employer_needs n SET status='draft' WHERE n.id=ANY($1::uuid[]) AND n.status='active' AND NOT EXISTS(SELECT 1 FROM need_skills ns WHERE ns.need_id=n.id)`, needs)
		if err != nil {
			return result, err
		}
		result.DraftedNeeds = int(tag.RowsAffected())
	}
	var target any
	if action == "merged" {
		target = in.TargetID
	}
	result.Skill, err = scan(tx.QueryRow(ctx, `UPDATE skills SET moderation_status=$2::varchar,active=($2::varchar='approved'),merged_into=$3,moderated_by=$4,moderated_at=clock_timestamp(),moderation_reason=NULLIF($5,'') WHERE id=$1 RETURNING `+cols, id, action, target, actor, in.Reason))
	if err != nil {
		return result, err
	}
	details, err := json.Marshal(map[string]any{"target_id": target, "candidate_links": result.CandidateLinks, "need_links": result.NeedLinks, "drafted_needs": result.DraftedNeeds})
	if err != nil {
		return result, err
	}
	// Причина хранится в карточке навыка, в аудит пишем только IDs и число затронутых связей.
	if _, err = tx.Exec(ctx, `INSERT INTO admin_catalog_events(actor_id,action,catalog,item_id,details) VALUES($1,$2,'skills',$3,$4)`, actor, action, id, details); err != nil {
		return result, err
	}
	return result, tx.Commit(ctx)
}
