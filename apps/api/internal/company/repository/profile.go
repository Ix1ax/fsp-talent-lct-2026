package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
)

func (r *Repository) Create(ctx context.Context, user string, in entity.Input) (entity.Company, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Company{}, err
	}
	defer tx.Rollback(ctx)
	var active bool
	if err = tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='employer' AND status='active' FOR SHARE`, user).Scan(&active); errors.Is(err, pgx.ErrNoRows) {
		return entity.Company{}, entity.ErrForbidden
	} else if err != nil {
		return entity.Company{}, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO companies(name,description,inn,contact_email,contact_url) VALUES($1,$2,$3,$4,$5) RETURNING id::text`, in.Name, in.Description, in.INN, in.ContactEmail, in.ContactURL).Scan(&id)
	if err != nil {
		return entity.Company{}, dbError(err)
	}
	if _, err = tx.Exec(ctx, `INSERT INTO company_members(company_id,user_id,role) VALUES($1,$2,'owner')`, id, user); err != nil {
		return entity.Company{}, err
	}
	c, err := scanCompany(tx.QueryRow(ctx, `SELECT `+companyColumns+memberJoin+` AND c.id=$2`, user, id))
	if err != nil {
		return c, err
	}
	return c, tx.Commit(ctx)
}
func (r *Repository) Get(ctx context.Context, user, id string) (entity.Company, error) {
	return scanCompany(r.db.QueryRow(ctx, `SELECT `+companyColumns+memberJoin+` AND c.id=$2`, user, id))
}
func (r *Repository) List(ctx context.Context, user string, limit, offset int) ([]entity.Company, error) {
	rows, err := r.db.Query(ctx, `SELECT `+companyColumns+memberJoin+` ORDER BY c.created_at DESC,c.id DESC LIMIT $2 OFFSET $3`, user, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []entity.Company{}
	for rows.Next() {
		c, err := scanCompany(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, rows.Err()
}

// Изменения компании сериализуем: параллельные PATCH не затирают поля друг друга.
func owned(ctx context.Context, tx pgx.Tx, user, id string) (entity.Company, error) {
	c, err := scanCompany(tx.QueryRow(ctx, `SELECT `+companyColumns+memberJoin+` AND c.id=$2 FOR UPDATE OF c,m FOR SHARE OF u`, user, id))
	if err != nil {
		return c, err
	}
	if c.MemberRole != "owner" {
		return c, entity.ErrForbidden
	}
	return c, nil
}
func (r *Repository) Update(ctx context.Context, user, id string, patch entity.Patch) (entity.Company, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Company{}, err
	}
	defer tx.Rollback(ctx)
	c, err := owned(ctx, tx, user, id)
	if err != nil {
		return c, err
	}
	in, err := patch.Apply(c)
	if err != nil {
		return c, err
	}
	_, err = tx.Exec(ctx, `UPDATE companies SET name=$2,description=$3,inn=$4,contact_email=$5,contact_url=$6 WHERE id=$1`, id, in.Name, in.Description, in.INN, in.ContactEmail, in.ContactURL)
	if err != nil {
		return c, dbError(err)
	}
	c.Name = in.Name
	c.Description = in.Description
	c.INN = in.INN
	c.ContactEmail = in.ContactEmail
	c.ContactURL = in.ContactURL
	return c, tx.Commit(ctx)
}
