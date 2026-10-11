package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

// ImportAccess проверяет, что импортировать резюме может активный кандидат с активным общим согласием processing.
// Профиль не нужен: импорт помогает заполнить его при онбординге.
func (r *Repository) ImportAccess(ctx context.Context, userID string) error {
	var ok bool
	err := r.db.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='candidate' AND status='active'`, userID).Scan(&ok)
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrForbidden
	}
	if err != nil {
		return err
	}
	return requireConsents(ctx, r.db, userID, "processing")
}

// MatchSkills сопоставляет названия из резюме с одобренными активными навыками справочника по названию, коду и алиасам
// без учёта регистра. Ключ результата — название в нижнем регистре. Если подходят несколько навыков, побеждает совпадение
// по названию, затем по коду, затем по алиасу.
func (r *Repository) MatchSkills(ctx context.Context, names []string) (map[string]string, error) {
	matched := map[string]string{}
	seen := map[string]bool{}
	var lowered []string
	for _, n := range names {
		l := strings.ToLower(strings.TrimSpace(n))
		if l != "" && !seen[l] {
			seen[l] = true
			lowered = append(lowered, l)
		}
	}
	if len(lowered) == 0 {
		return matched, nil
	}
	rows, err := r.db.Query(ctx, `SELECT DISTINCT ON (n) n, s.id::text
 FROM unnest($1::text[]) AS n
 JOIN skills s ON s.active AND s.moderation_status='approved'
  AND (lower(s.name)=n OR lower(s.code)=n OR EXISTS (SELECT 1 FROM unnest(s.aliases) a WHERE lower(a)=n))
 ORDER BY n, (CASE WHEN lower(s.name)=n THEN 0 WHEN lower(s.code)=n THEN 1 ELSE 2 END), s.id`, lowered)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var name, id string
		if err = rows.Scan(&name, &id); err != nil {
			return nil, err
		}
		matched[name] = id
	}
	return matched, rows.Err()
}

// WorkFormatIDs возвращает id форматов работы по кодам в порядке кодов; неизвестные коды и повторы пропускаются.
func (r *Repository) WorkFormatIDs(ctx context.Context, codes []string) ([]int16, error) {
	ids := []int16{}
	if len(codes) == 0 {
		return ids, nil
	}
	rows, err := r.db.Query(ctx, `SELECT f.id FROM unnest($1::text[]) WITH ORDINALITY AS u(code, ord) JOIN work_formats f ON f.code=u.code ORDER BY u.ord`, codes)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	seen := map[int16]bool{}
	for rows.Next() {
		var id int16
		if err = rows.Scan(&id); err != nil {
			return nil, err
		}
		if !seen[id] {
			seen[id] = true
			ids = append(ids, id)
		}
	}
	return ids, rows.Err()
}
