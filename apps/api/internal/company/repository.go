package company

import (
	"context"
	"errors"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db} }

const companyColumns = `c.id::text,c.name,c.description,c.inn,c.contact_email,c.contact_url,c.logo_file_id::text,c.verification_status,c.created_at,m.role`
const memberJoin = ` FROM companies c JOIN company_members m ON m.company_id=c.id JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.status='active' AND u.status='active' AND u.role='employer'`
const fileColumns = `f.id::text,f.owner_user_id::text,f.bucket,f.object_key,f.purpose,f.original_name,f.media_type,f.size_bytes,f.checksum_sha256,f.status,f.created_at`

func scanCompany(row pgx.Row) (Company, error) {
	var c Company
	err := row.Scan(&c.ID, &c.Name, &c.Description, &c.INN, &c.ContactEmail, &c.ContactURL, &c.LogoFileID, &c.VerificationStatus, &c.CreatedAt, &c.MemberRole)
	return c, dbError(err)
}
func scanFile(row pgx.Row) (files.File, error) {
	var f files.File
	err := row.Scan(&f.ID, &f.OwnerUserID, &f.Bucket, &f.ObjectKey, &f.Purpose, &f.OriginalName, &f.MediaType, &f.SizeBytes, &f.ChecksumSHA256, &f.Status, &f.CreatedAt)
	return f, dbError(err)
}
func dbError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "companies_inn_unique" {
		return ErrConflict
	}
	return err
}
func (r *Repository) Create(ctx context.Context, user string, in Input) (Company, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Company{}, err
	}
	defer tx.Rollback(ctx)
	var active bool
	if err = tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='employer' AND status='active' FOR SHARE`, user).Scan(&active); errors.Is(err, pgx.ErrNoRows) {
		return Company{}, ErrForbidden
	} else if err != nil {
		return Company{}, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO companies(name,description,inn,contact_email,contact_url) VALUES($1,$2,$3,$4,$5) RETURNING id::text`, in.Name, in.Description, in.INN, in.ContactEmail, in.ContactURL).Scan(&id)
	if err != nil {
		return Company{}, dbError(err)
	}
	if _, err = tx.Exec(ctx, `INSERT INTO company_members(company_id,user_id,role) VALUES($1,$2,'owner')`, id, user); err != nil {
		return Company{}, err
	}
	c, err := scanCompany(tx.QueryRow(ctx, `SELECT `+companyColumns+memberJoin+` AND c.id=$2`, user, id))
	if err != nil {
		return c, err
	}
	return c, tx.Commit(ctx)
}
func (r *Repository) Get(ctx context.Context, user, id string) (Company, error) {
	return scanCompany(r.db.QueryRow(ctx, `SELECT `+companyColumns+memberJoin+` AND c.id=$2`, user, id))
}
func (r *Repository) List(ctx context.Context, user string, limit, offset int) ([]Company, error) {
	rows, err := r.db.Query(ctx, `SELECT `+companyColumns+memberJoin+` ORDER BY c.created_at DESC,c.id DESC LIMIT $2 OFFSET $3`, user, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []Company{}
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
func owned(ctx context.Context, tx pgx.Tx, user, id string) (Company, error) {
	c, err := scanCompany(tx.QueryRow(ctx, `SELECT `+companyColumns+memberJoin+` AND c.id=$2 FOR UPDATE OF c,m FOR SHARE OF u`, user, id))
	if err != nil {
		return c, err
	}
	if c.MemberRole != "owner" {
		return c, ErrForbidden
	}
	return c, nil
}
func (r *Repository) Update(ctx context.Context, user, id string, patch Patch) (Company, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Company{}, err
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
func (r *Repository) ReserveFile(ctx context.Context, user, id string, f files.File) (files.File, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return f, err
	}
	defer tx.Rollback(ctx)
	if _, err = owned(ctx, tx, user, id); err != nil {
		return f, err
	}
	err = tx.QueryRow(ctx, `INSERT INTO files(owner_user_id,bucket,object_key,purpose,original_name,media_type,size_bytes,checksum_sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text,created_at`, user, f.Bucket, f.ObjectKey, f.Purpose, f.OriginalName, f.MediaType, f.SizeBytes, f.ChecksumSHA256).Scan(&f.ID, &f.CreatedAt)
	if err != nil {
		return f, err
	}
	if _, err = tx.Exec(ctx, `INSERT INTO company_documents(company_id,file_id) VALUES($1,$2)`, id, f.ID); err != nil {
		return f, err
	}
	return f, tx.Commit(ctx)
}
func (r *Repository) CompleteFile(ctx context.Context, user, id, fileID string) (files.File, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return files.File{}, err
	}
	defer tx.Rollback(ctx)
	if _, err = owned(ctx, tx, user, id); err != nil {
		return files.File{}, err
	}
	f, err := scanFile(tx.QueryRow(ctx, `UPDATE files f SET status='ready' FROM company_documents d WHERE d.company_id=$1 AND d.file_id=f.id AND f.id=$2 AND f.status='pending' RETURNING `+fileColumns, id, fileID))
	if err != nil {
		return f, err
	}
	if f.Purpose == "company_logo" {
		if _, err = tx.Exec(ctx, `UPDATE companies SET logo_file_id=$2 WHERE id=$1`, id, f.ID); err != nil {
			return f, err
		}
	}
	return f, tx.Commit(ctx)
}
func (r *Repository) File(ctx context.Context, user, id, fileID string) (files.File, error) {
	return scanFile(r.db.QueryRow(ctx, `SELECT `+fileColumns+` FROM files f JOIN company_documents d ON d.file_id=f.id JOIN company_members m ON m.company_id=d.company_id JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND d.company_id=$2 AND f.id=$3 AND m.status='active' AND u.status='active' AND u.role='employer' AND f.status='ready'`, user, id, fileID))
}
func (r *Repository) ListFiles(ctx context.Context, user, id string, limit, offset int) ([]files.File, error) {
	if _, err := r.Get(ctx, user, id); err != nil {
		return nil, err
	}
	rows, err := r.db.Query(ctx, `SELECT `+fileColumns+` FROM files f JOIN company_documents d ON d.file_id=f.id JOIN company_members m ON m.company_id=d.company_id JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND d.company_id=$2 AND m.status='active' AND u.status='active' AND u.role='employer' AND f.status<>'deleted' ORDER BY f.created_at DESC,f.id DESC LIMIT $3 OFFSET $4`, user, id, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []files.File{}
	for rows.Next() {
		f, err := scanFile(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, f)
	}
	return result, rows.Err()
}
func (r *Repository) MarkDeleting(ctx context.Context, user, id, fileID string) (files.File, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return files.File{}, err
	}
	defer tx.Rollback(ctx)
	if _, err = owned(ctx, tx, user, id); err != nil {
		return files.File{}, err
	}
	f, err := scanFile(tx.QueryRow(ctx, `SELECT `+fileColumns+` FROM files f JOIN company_documents d ON d.file_id=f.id WHERE d.company_id=$1 AND f.id=$2 FOR UPDATE OF f`, id, fileID))
	if err != nil {
		return f, err
	}
	if f.Status != "deleted" {
		if _, err = tx.Exec(ctx, `UPDATE files SET status='deleting' WHERE id=$1`, fileID); err != nil {
			return f, err
		}
		f.Status = "deleting"
		if _, err = tx.Exec(ctx, `UPDATE companies SET logo_file_id=NULL WHERE id=$1 AND logo_file_id=$2`, id, fileID); err != nil {
			return f, err
		}
	}
	return f, tx.Commit(ctx)
}
func (r *Repository) FinishDelete(ctx context.Context, fileID string) error {
	_, err := r.db.Exec(ctx, `UPDATE files SET status='deleted',deleted_at=now() WHERE id=$1 AND status='deleting'`, fileID)
	return err
}
