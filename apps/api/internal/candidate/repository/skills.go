package repository

import (
	"context"
	"errors"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

const skillColumns = `s.id::text,s.code,s.name,s.moderation_status,cs.claimed_level,cs.updated_at`
const skillJoin = ` FROM candidate_skills cs JOIN skills s ON s.id=cs.skill_id`

func scanSkill(row pgx.Row) (entity.Skill, error) {
	var sk entity.Skill
	if err := row.Scan(&sk.SkillID, &sk.Code, &sk.Name, &sk.ModerationStatus, &sk.ClaimedLevel, &sk.UpdatedAt); err != nil {
		return sk, err
	}
	// Сейчас единственный источник — самооценка. Подтверждения тестов и ФСП добавят свои источники.
	if sk.ClaimedLevel != nil {
		sk.Source = entity.SourceClaimed
	}
	sk.Confidence = entity.Confidence(sk.Source)
	return sk, nil
}

// lockedProfile блокирует пользователя FOR SHARE, затем профиль (при forUpdate FOR UPDATE): порядок как у отзыва согласия.
// Без профиля возвращает ErrNotFound, не активному кандидату — ErrForbidden.
func lockedProfile(ctx context.Context, tx pgx.Tx, userID string, forUpdate bool) (string, error) {
	if err := lockActiveCandidate(ctx, tx, userID); err != nil {
		return "", err
	}
	lock := ""
	if forUpdate {
		lock = " FOR UPDATE OF p"
	}
	var id string
	err := tx.QueryRow(ctx, `SELECT p.id::text`+ownerFilter+lock, userID).Scan(&id)
	return id, dbError(err)
}

func (r *Repository) ListSkills(ctx context.Context, userID string) ([]entity.Skill, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	profileID, err := lockedProfile(ctx, tx, userID, false)
	if err != nil {
		return nil, err
	}
	items, err := queryCandidateSkills(ctx, tx, profileID)
	if err != nil {
		return nil, err
	}
	return items, tx.Commit(ctx)
}

// queryCandidateSkills читает навыки профиля по названию. Общий запрос для списка навыков и полного профиля.
func queryCandidateSkills(ctx context.Context, q querier, profileID string) ([]entity.Skill, error) {
	rows, err := q.Query(ctx, `SELECT `+skillColumns+skillJoin+` WHERE cs.candidate_id=$1 ORDER BY s.name,s.id`, profileID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []entity.Skill{}
	for rows.Next() {
		sk, err := scanSkill(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, sk)
	}
	return items, rows.Err()
}

// PutSkill добавляет навык или меняет уровень. Лимит и существование навыка проверяются под блокировкой профиля,
// поэтому параллельные запросы не обходят лимит. Уже добавленный навык можно менять, даже если его выключили.
func (r *Repository) PutSkill(ctx context.Context, userID, skillID string, in entity.SkillInput) (entity.Skill, error) {
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
	var exists bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM candidate_skills WHERE candidate_id=$1 AND skill_id=$2)`, profileID, skillID).Scan(&exists); err != nil {
		return entity.Skill{}, err
	}
	var status string
	if err = tx.QueryRow(ctx, `SELECT moderation_status FROM skills WHERE id=$1 FOR SHARE`, skillID).Scan(&status); errors.Is(err, pgx.ErrNoRows) {
		return entity.Skill{}, &entity.ValidationError{Message: "Неизвестный навык: выберите ID из справочника"}
	} else if err != nil {
		return entity.Skill{}, err
	}
	if status == "rejected" || status == "merged" {
		return entity.Skill{}, &entity.ValidationError{Message: "Навык отклонён или объединён с другим"}
	}
	if !exists {
		var active bool
		err = tx.QueryRow(ctx, `SELECT active AND moderation_status='approved' FROM skills WHERE id=$1 FOR SHARE`, skillID).Scan(&active)
		if errors.Is(err, pgx.ErrNoRows) || err == nil && !active {
			return entity.Skill{}, &entity.ValidationError{Message: "Неизвестный навык: выберите ID из справочника"}
		}
		if err != nil {
			return entity.Skill{}, err
		}
		var count int
		if err = tx.QueryRow(ctx, `SELECT count(*) FROM candidate_skills WHERE candidate_id=$1`, profileID).Scan(&count); err != nil {
			return entity.Skill{}, err
		}
		if count >= entity.MaxSkills {
			return entity.Skill{}, &entity.ValidationError{Message: "Не более 50 навыков: удалите ненужные, чтобы добавить новый"}
		}
	}
	// clock_timestamp(), а не now(): транзакции сериализуются блокировкой профиля, и now() более ранней
	// транзакции мог бы вернуть updated_at назад.
	if _, err = tx.Exec(ctx, `INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level,updated_at) VALUES($1,$2,$3,clock_timestamp())
 ON CONFLICT (candidate_id,skill_id) DO UPDATE SET claimed_level=EXCLUDED.claimed_level,updated_at=clock_timestamp()`, profileID, skillID, in.ClaimedLevel); err != nil {
		return entity.Skill{}, err
	}
	sk, err := scanSkill(tx.QueryRow(ctx, `SELECT `+skillColumns+skillJoin+` WHERE cs.candidate_id=$1 AND cs.skill_id=$2`, profileID, skillID))
	if err != nil {
		return sk, err
	}
	return sk, tx.Commit(ctx)
}

func (r *Repository) DeleteSkill(ctx context.Context, userID, skillID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = catalog.LockSkillChanges(ctx, tx); err != nil {
		return err
	}
	profileID, err := lockedProfile(ctx, tx, userID, true)
	if err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `DELETE FROM candidate_skills WHERE candidate_id=$1 AND skill_id=$2`, profileID, skillID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return entity.ErrSkillNotFound
	}
	return tx.Commit(ctx)
}
