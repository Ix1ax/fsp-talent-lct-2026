package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
	"strings"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/jackc/pgx/v5"
)

// SubmitSkill переиспользует название, код или альтернативное название существующего навыка.
// Новый навык и связь с резюме создаются одной транзакцией, без дублей при параллельных запросах.
func (r *Repository) SubmitSkill(ctx context.Context, userID string, in entity.SkillSubmissionInput) (entity.Skill, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Skill{}, err
	}
	defer tx.Rollback(ctx)
	if err = catalog.LockSkillChanges(ctx, tx); err != nil {
		return entity.Skill{}, err
	}
	profileID, err := lockedProfile(ctx, tx, userID, true)
	if err != nil {
		return entity.Skill{}, err
	}
	key := strings.ToLower(in.Name)
	rows, err := tx.Query(ctx, `SELECT id::text,merged_into::text FROM skills WHERE name_key=$1 OR lower(code)=$1 OR EXISTS(SELECT 1 FROM unnest(aliases) a WHERE lower(regexp_replace(btrim(a),'\s+',' ','g'))=$1) ORDER BY id FOR SHARE`, key)
	if err != nil {
		return entity.Skill{}, err
	}
	ids := []string{}
	seen := map[string]bool{}
	for rows.Next() {
		var id string
		var merged *string
		if err = rows.Scan(&id, &merged); err != nil {
			rows.Close()
			return entity.Skill{}, err
		}
		if merged != nil {
			id = *merged
		}
		if !seen[id] {
			ids = append(ids, id)
			seen[id] = true
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return entity.Skill{}, err
	}
	if len(ids) > 1 {
		return entity.Skill{}, &entity.ValidationError{Message: "Название подходит нескольким навыкам: выберите нужный из справочника"}
	}
	var skillID, status string
	var active bool
	if len(ids) == 1 {
		skillID = ids[0]
	} else {
		var count int
		if err = tx.QueryRow(ctx, `SELECT count(*) FROM skills WHERE submitted_by=$1 AND submitted_at>clock_timestamp()-interval '24 hours'`, userID).Scan(&count); err != nil {
			return entity.Skill{}, err
		}
		if count >= 20 {
			return entity.Skill{}, &entity.ValidationError{Message: "Можно предложить не более 20 новых навыков за 24 часа"}
		}
		// Уникальный ключ названия сериализует одинаковые предложения от разных кандидатов.
		random := make([]byte, 16)
		if _, err = rand.Read(random); err != nil {
			return entity.Skill{}, err
		}
		err = tx.QueryRow(ctx, `INSERT INTO skills(code,name,active,moderation_status,submitted_by,submitted_at)
   VALUES($1,$2,false,'pending',$3,clock_timestamp())
   ON CONFLICT(name_key) DO UPDATE SET name=skills.name RETURNING id::text`, "custom_"+hex.EncodeToString(random), in.Name, userID).Scan(&skillID)
		if err != nil {
			return entity.Skill{}, err
		}
	}
	if err = tx.QueryRow(ctx, `SELECT moderation_status,active FROM skills WHERE id=$1 FOR SHARE`, skillID).Scan(&status, &active); err != nil {
		return entity.Skill{}, err
	}
	if status == "rejected" || status == "merged" {
		return entity.Skill{}, &entity.ValidationError{Message: "Этот навык отклонён или объединён: выберите другой из справочника"}
	}
	if status == "approved" && !active {
		return entity.Skill{}, &entity.ValidationError{Message: "Этот навык архивирован и недоступен для добавления"}
	}
	if err = attachSubmittedSkill(ctx, tx, profileID, skillID, in.ClaimedLevel); err != nil {
		return entity.Skill{}, err
	}
	skill, err := scanSkill(tx.QueryRow(ctx, `SELECT `+skillColumns+skillJoin+` WHERE cs.candidate_id=$1 AND cs.skill_id=$2`, profileID, skillID))
	if err != nil {
		return skill, err
	}
	return skill, tx.Commit(ctx)
}

func attachSubmittedSkill(ctx context.Context, tx pgx.Tx, profileID, skillID string, level *int16) error {
	var count int
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT count(*),COALESCE(bool_or(skill_id=$2),false) FROM candidate_skills WHERE candidate_id=$1`, profileID, skillID).Scan(&count, &exists); err != nil {
		return err
	}
	if !exists && count >= entity.MaxSkills {
		return &entity.ValidationError{Message: "Не более 50 навыков: удалите ненужные, чтобы добавить новый"}
	}
	_, err := tx.Exec(ctx, `INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level,updated_at) VALUES($1,$2,$3,clock_timestamp())
 ON CONFLICT(candidate_id,skill_id) DO UPDATE SET claimed_level=EXCLUDED.claimed_level,updated_at=clock_timestamp()`, profileID, skillID, level)
	return err
}
