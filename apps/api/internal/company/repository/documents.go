package repository

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

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

// Документы компании, видимые участнику: без удалённых файлов. Общий фильтр для страницы и общего числа.
const documentsListFrom = ` FROM files f JOIN company_documents d ON d.file_id=f.id JOIN company_members m ON m.company_id=d.company_id JOIN users u ON u.id=m.user_id WHERE m.user_id=$1 AND d.company_id=$2 AND m.status='active' AND u.status='active' AND u.role='employer' AND f.status<>'deleted'`

// ListFiles возвращает страницу документов компании и их общее число.
func (r *Repository) ListFiles(ctx context.Context, user, id string, limit, offset int) ([]files.File, int64, error) {
	if _, err := r.Get(ctx, user, id); err != nil {
		return nil, 0, err
	}
	tx, err := r.readTx(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback(ctx)
	var total int64
	if err = tx.QueryRow(ctx, `SELECT count(*)`+documentsListFrom, user, id).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := tx.Query(ctx, `SELECT `+fileColumns+documentsListFrom+` ORDER BY f.created_at DESC,f.id DESC LIMIT $3 OFFSET $4`, user, id, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	result := []files.File{}
	for rows.Next() {
		f, err := scanFile(rows)
		if err != nil {
			return nil, 0, err
		}
		result = append(result, f)
	}
	return result, total, rows.Err()
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
