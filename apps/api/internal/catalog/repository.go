package catalog

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db} }
func (r *Repository) Catalogs(ctx context.Context) (Catalogs, error) {
	result := Catalogs{Specializations: []CatalogItem{}, Grades: []CatalogGrade{}, WorkFormats: []CatalogItem{}}
	for _, table := range []string{"specializations", "work_formats"} {
		query := `SELECT id,code,name FROM ` + table
		if table == "specializations" {
			query += ` WHERE active`
		}
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
	rows, err := r.db.Query(ctx, `SELECT id,code,name,rank FROM grades ORDER BY rank`)
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
func (r *Repository) SearchSkills(ctx context.Context, q string, limit, offset int) ([]CatalogSkill, error) {
	// strpos ищет буквальный текст: % и _ из пользовательского запроса не превращаются в шаблоны.
	rows, err := r.db.Query(ctx, `SELECT id::text,code,name,aliases FROM skills WHERE active AND moderation_status='approved' AND ($1='' OR strpos(lower(code),lower($1))>0 OR strpos(lower(name),lower($1))>0 OR EXISTS(SELECT 1 FROM unnest(aliases) a WHERE strpos(lower(a),lower($1))>0)) ORDER BY name,id LIMIT $2 OFFSET $3`, q, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []CatalogSkill{}
	for rows.Next() {
		var v CatalogSkill
		if err := rows.Scan(&v.ID, &v.Code, &v.Name, &v.Aliases); err != nil {
			return nil, err
		}
		result = append(result, v)
	}
	return result, rows.Err()
}
