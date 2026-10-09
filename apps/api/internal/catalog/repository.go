package catalog

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db} }
func (r *Repository) Catalogs(ctx context.Context) (Catalogs, error) {
	result := Catalogs{Specializations: []CatalogItem{}, Grades: []CatalogGrade{}, WorkFormats: []CatalogItem{}}
	for _, table := range []string{"specializations", "work_formats"} {
		query := `SELECT id,code,name FROM ` + table
		query += ` WHERE active`
		query += ` ORDER BY id`
		rows, err := r.db.Query(ctx, query)
		if err != nil {
			return result, err
		}
		items := []CatalogItem{}
		for rows.Next() {
			var v CatalogItem
			if err := rows.Scan(&v.ID, &v.Code, &v.Name); err != nil {
				rows.Close()
				return result, err
			}
			items = append(items, v)
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return result, err
		}
		if table == "specializations" {
			result.Specializations = items
		} else {
			result.WorkFormats = items
		}
	}
	rows, err := r.db.Query(ctx, `SELECT id,code,name,rank FROM grades WHERE active ORDER BY rank`)
	if err != nil {
		return result, err
	}
	defer rows.Close()
	for rows.Next() {
		var v CatalogGrade
		if err := rows.Scan(&v.ID, &v.Code, &v.Name, &v.Rank); err != nil {
			return result, err
		}
		result.Grades = append(result.Grades, v)
	}
	return result, rows.Err()
}

// Одобренные активные навыки, подходящие под строку поиска. Общий фильтр для страницы и общего числа.
// strpos ищет буквальный текст: % и _ из пользовательского запроса не превращаются в шаблоны.
const skillsSearchFrom = ` FROM skills WHERE active AND moderation_status='approved' AND ($1='' OR strpos(lower(code),lower($1))>0 OR strpos(lower(name),lower($1))>0 OR EXISTS(SELECT 1 FROM unnest(aliases) a WHERE strpos(lower(a),lower($1))>0))`

// SearchSkills возвращает страницу навыков и их общее число по тому же фильтру.
func (r *Repository) SearchSkills(ctx context.Context, q string, limit, offset int) ([]CatalogSkill, int64, error) {
	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback(ctx)
	var total int64
	if err = tx.QueryRow(ctx, `SELECT count(*)`+skillsSearchFrom, q).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := tx.Query(ctx, `SELECT id::text,code,name,aliases`+skillsSearchFrom+` ORDER BY name,id LIMIT $2 OFFSET $3`, q, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	result := []CatalogSkill{}
	for rows.Next() {
		var v CatalogSkill
		if err := rows.Scan(&v.ID, &v.Code, &v.Name, &v.Aliases); err != nil {
			return nil, 0, err
		}
		result = append(result, v)
	}
	return result, total, rows.Err()
}
