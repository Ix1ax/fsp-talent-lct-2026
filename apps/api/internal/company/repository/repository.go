// Пакет repository хранит компании, потребности и метаданные файлов в Postgres.
package repository

import (
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

type Repository struct{ db *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{db} }

const companyColumns = `c.id::text,c.name,c.description,c.inn,c.contact_email,c.contact_url,c.logo_file_id::text,c.verification_status,c.created_at,m.role`
const memberJoin = ` FROM companies c JOIN company_members m ON m.company_id=c.id JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND m.status='active' AND u.status='active' AND u.role='employer'`
const fileColumns = `f.id::text,f.owner_user_id::text,f.bucket,f.object_key,f.purpose,f.original_name,f.media_type,f.size_bytes,f.checksum_sha256,f.status,f.created_at`

func scanCompany(row pgx.Row) (entity.Company, error) {
	var c entity.Company
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
		return entity.ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "companies_inn_unique" {
		return entity.ErrConflict
	}
	return err
}

func validationError(message string) error { return &entity.ValidationError{Message: message} }
