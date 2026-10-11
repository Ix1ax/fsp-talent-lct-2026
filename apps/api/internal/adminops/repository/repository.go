// Package repository проверяет полномочия администратора в каждой транзакции.
package repository

import (
	"context"
	"errors"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/adminops/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Repository { return &Repository{db} }
func dbError(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return entity.ErrNotFound
	}
	return err
}
func (r *Repository) begin(ctx context.Context, actor string, read bool) (pgx.Tx, string, error) {
	opts := pgx.TxOptions{}
	if read {
		opts.IsoLevel = pgx.RepeatableRead
	}
	tx, err := r.db.BeginTx(ctx, opts)
	if err != nil {
		return nil, "", err
	}
	var role string
	err = tx.QueryRow(ctx, `SELECT role FROM admin_accounts WHERE id=$1 AND status='active' AND role IN ('admin','superadmin') FOR SHARE`, actor).Scan(&role)
	if err != nil {
		tx.Rollback(ctx)
		if errors.Is(err, pgx.ErrNoRows) {
			err = entity.ErrForbidden
		}
		return nil, "", err
	}
	return tx, role, nil
}
func event(ctx context.Context, tx pgx.Tx, actor, user, action, kind, id, old, status, reason string) error {
	var a, u *string
	if actor != "" {
		a = &actor
	}
	if user != "" {
		u = &user
	}
	_, err := tx.Exec(ctx, `INSERT INTO admin_operation_events(actor_admin_id,actor_user_id,action,entity_type,entity_id,old_status,new_status,reason) VALUES($1,$2,$3,$4,$5,NULLIF($6,''),NULLIF($7,''),NULLIF($8,''))`, a, u, action, kind, id, old, status, reason)
	return err
}

const fileJSON = `jsonb_build_object('id',f.id,'purpose',f.purpose,'original_name',f.original_name,'media_type',f.media_type,'size_bytes',f.size_bytes,'checksum_sha256',f.checksum_sha256,'status',f.status,'created_at',f.created_at)`
const fileColumns = `f.id::text,f.owner_user_id::text,f.bucket,f.object_key,f.purpose,f.original_name,f.media_type,f.size_bytes,f.checksum_sha256,f.status,f.created_at`

func scanFile(row pgx.Row) (files.File, error) {
	var f files.File
	err := row.Scan(&f.ID, &f.OwnerUserID, &f.Bucket, &f.ObjectKey, &f.Purpose, &f.OriginalName, &f.MediaType, &f.SizeBytes, &f.ChecksumSHA256, &f.Status, &f.CreatedAt)
	return f, dbError(err)
}
