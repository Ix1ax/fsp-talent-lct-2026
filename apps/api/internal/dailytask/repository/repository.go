package repository

import (
	"context"
	"errors"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Repository { return &Repository{db} }

func dbError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrNotFound
	}
	var p *pgconn.PgError
	if errors.As(err, &p) && p.Code == "23505" {
		switch p.ConstraintName {
		case "company_daily_tasks_day_unique":
			return entity.ErrDailyLimit
		case "company_task_submissions_candidate_unique":
			return entity.ErrAlreadySubmitted
		}
	}
	return err
}

func companyAccess(ctx context.Context, tx pgx.Tx, user, company string, write bool) error {
	var role string
	lock := " FOR SHARE OF c,m,u"
	if write {
		lock = " FOR UPDATE OF c,m FOR SHARE OF u"
	}
	err := tx.QueryRow(ctx, `SELECT m.role FROM companies c JOIN company_members m ON m.company_id=c.id JOIN users u ON u.id=m.user_id
 WHERE c.id=$2 AND m.user_id=$1 AND m.status='active' AND u.role='employer' AND u.status='active'`+lock, user, company).Scan(&role)
	if err != nil {
		return dbError(err)
	}
	if write && role != "owner" && role != "recruiter" {
		return entity.ErrForbidden
	}
	return nil
}

func candidateAccess(ctx context.Context, tx pgx.Tx, user string) error {
	var ok bool
	err := tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='candidate' AND status='active' FOR SHARE`, user).Scan(&ok)
	return dbError(err)
}

func candidateProfile(ctx context.Context, tx pgx.Tx, user string, consents bool) (string, error) {
	// Сначала пользователь, затем профиль: тот же порядок, что при отзыве согласий.
	if err := candidateAccess(ctx, tx, user); err != nil {
		return "", err
	}
	var profile string
	if err := tx.QueryRow(ctx, `SELECT id::text FROM candidate_profiles WHERE user_id=$1 FOR SHARE`, user).Scan(&profile); err != nil {
		return "", dbError(err)
	}
	if consents {
		var count int
		if err := tx.QueryRow(ctx, `SELECT count(DISTINCT kind) FROM candidate_consents WHERE user_id=$1 AND kind IN ('processing','publication') AND company_id IS NULL AND revoked_at IS NULL`, user).Scan(&count); err != nil {
			return "", err
		}
		if count != 2 {
			return "", entity.ErrConsentRequired
		}
	}
	return profile, nil
}

const fileJSON = `jsonb_build_object('id',f.id::text,'purpose',f.purpose,'original_name',f.original_name,'media_type',f.media_type,
 'size_bytes',f.size_bytes,'checksum_sha256',f.checksum_sha256,'status',f.status,'created_at',f.created_at)`
const fileColumns = `f.id::text,f.owner_user_id::text,f.bucket,f.object_key,f.purpose,f.original_name,f.media_type,f.size_bytes,f.checksum_sha256,f.status,f.created_at`

func insertFile(ctx context.Context, tx pgx.Tx, user string, f files.File) (files.File, error) {
	f.OwnerUserID = user
	f.Status = "ready"
	err := tx.QueryRow(ctx, `INSERT INTO files(owner_user_id,bucket,object_key,purpose,original_name,media_type,size_bytes,checksum_sha256,status)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,'ready') RETURNING id::text,created_at`, user, f.Bucket, f.ObjectKey, f.Purpose, f.OriginalName, f.MediaType, f.SizeBytes, f.ChecksumSHA256).Scan(&f.ID, &f.CreatedAt)
	return f, err
}

func scanFile(row pgx.Row) (files.File, error) {
	var f files.File
	err := row.Scan(&f.ID, &f.OwnerUserID, &f.Bucket, &f.ObjectKey, &f.Purpose, &f.OriginalName, &f.MediaType, &f.SizeBytes, &f.ChecksumSHA256, &f.Status, &f.CreatedAt)
	return f, dbError(err)
}

func references(ctx context.Context, tx pgx.Tx, in entity.Input) error {
	for _, item := range []struct {
		table string
		id    *int16
	}{{"specializations", in.SpecializationID}, {"grades", in.GradeID}} {
		if item.id == nil {
			continue
		}
		var ok bool
		if err := tx.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM "+item.table+" WHERE id=$1 AND active FOR SHARE)", *item.id).Scan(&ok); err != nil {
			return err
		}
		if !ok {
			return &entity.ValidationError{Message: "Специализация или грейд не существуют либо отключены"}
		}
	}
	return nil
}

func (r *Repository) readTx(ctx context.Context) (pgx.Tx, error) {
	return r.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead})
}
