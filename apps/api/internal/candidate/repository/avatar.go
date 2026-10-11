package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

const fileColumns = `f.id::text,f.owner_user_id::text,f.bucket,f.object_key,f.purpose,f.original_name,f.media_type,f.size_bytes,f.checksum_sha256,f.status,f.created_at`

func scanFile(row pgx.Row) (files.File, error) {
	var f files.File
	err := row.Scan(&f.ID, &f.OwnerUserID, &f.Bucket, &f.ObjectKey, &f.Purpose, &f.OriginalName, &f.MediaType, &f.SizeBytes, &f.ChecksumSHA256, &f.Status, &f.CreatedAt)
	return f, dbError(err)
}

// ReserveAvatar создаёт запись pending для нового аватара. Нужен активный кандидат с профилем.
func (r *Repository) ReserveAvatar(ctx context.Context, userID string, f files.File) (files.File, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return f, err
	}
	defer tx.Rollback(ctx)
	var allowed, hasProfile bool
	err = tx.QueryRow(ctx, `SELECT u.role='candidate' AND u.status='active', p.id IS NOT NULL FROM users u LEFT JOIN candidate_profiles p ON p.user_id=u.id WHERE u.id=$1 FOR SHARE OF u`, userID).Scan(&allowed, &hasProfile)
	switch {
	case errors.Is(err, pgx.ErrNoRows) || err == nil && !allowed:
		return f, entity.ErrForbidden
	case err != nil:
		return f, err
	case !hasProfile:
		return f, entity.ErrNotFound
	}
	err = tx.QueryRow(ctx, `INSERT INTO files(owner_user_id,bucket,object_key,purpose,original_name,media_type,size_bytes,checksum_sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text,created_at`,
		userID, f.Bucket, f.ObjectKey, f.Purpose, f.OriginalName, f.MediaType, f.SizeBytes, f.ChecksumSHA256).Scan(&f.ID, &f.CreatedAt)
	if err != nil {
		return f, err
	}
	return f, tx.Commit(ctx)
}

// CompleteAvatar в одной транзакции делает новый файл рабочим и переключает на него профиль.
// Прежний аватар помечается deleting и возвращается, чтобы сервис удалил его объект.
func (r *Repository) CompleteAvatar(ctx context.Context, userID, fileID string) (*files.File, entity.Profile, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, entity.Profile{}, err
	}
	defer tx.Rollback(ctx)
	if err = lockActiveCandidate(ctx, tx, userID); err != nil {
		return nil, entity.Profile{}, err
	}
	var profileID string
	var oldID *string
	if err = tx.QueryRow(ctx, `SELECT p.id::text,p.avatar_file_id::text`+ownerFilter+` FOR UPDATE OF p FOR SHARE OF u`, userID).Scan(&profileID, &oldID); err != nil {
		return nil, entity.Profile{}, dbError(err)
	}
	if _, err = scanFile(tx.QueryRow(ctx, `UPDATE files f SET status='ready' WHERE f.id=$1 AND f.owner_user_id=$2 AND f.purpose='candidate_avatar' AND f.status='pending' RETURNING `+fileColumns, fileID, userID)); err != nil {
		return nil, entity.Profile{}, err
	}
	if _, err = tx.Exec(ctx, `UPDATE candidate_profiles SET avatar_file_id=$2,updated_at=now() WHERE id=$1`, profileID, fileID); err != nil {
		return nil, entity.Profile{}, err
	}
	var replaced *files.File
	if oldID != nil {
		old, err := scanFile(tx.QueryRow(ctx, `UPDATE files f SET status='deleting' WHERE f.id=$1 AND f.status='ready' RETURNING `+fileColumns, *oldID))
		if err != nil && !errors.Is(err, entity.ErrNotFound) {
			return nil, entity.Profile{}, err
		}
		if err == nil {
			replaced = &old
		}
	}
	p, err := scanProfile(ctx, tx, tx.QueryRow(ctx, `SELECT `+profileColumns+ownerFilter, userID))
	if err != nil {
		return nil, p, err
	}
	return replaced, p, tx.Commit(ctx)
}

// Avatar возвращает рабочий аватар владельца: ErrNotFound без профиля, ErrAvatarNotFound без аватара.
func (r *Repository) Avatar(ctx context.Context, userID string) (files.File, error) {
	f, err := scanFile(r.db.QueryRow(ctx, `SELECT `+fileColumns+` FROM files f JOIN candidate_profiles p ON p.avatar_file_id=f.id JOIN users u ON u.id=p.user_id WHERE p.user_id=$1 AND u.role='candidate' AND u.status='active' AND f.status='ready'`, userID))
	if !errors.Is(err, entity.ErrNotFound) {
		return f, err
	}
	var exists bool
	if err := r.db.QueryRow(ctx, `SELECT true`+ownerFilter, userID).Scan(&exists); err != nil {
		return f, dbError(err)
	}
	return f, entity.ErrAvatarNotFound
}

// DetachAvatar отвязывает аватар от профиля и помечает файл deleting.
func (r *Repository) DetachAvatar(ctx context.Context, userID string) (files.File, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return files.File{}, err
	}
	defer tx.Rollback(ctx)
	if err = lockActiveCandidate(ctx, tx, userID); err != nil {
		return files.File{}, err
	}
	var profileID string
	var fileID *string
	if err = tx.QueryRow(ctx, `SELECT p.id::text,p.avatar_file_id::text`+ownerFilter+` FOR UPDATE OF p FOR SHARE OF u`, userID).Scan(&profileID, &fileID); err != nil {
		return files.File{}, dbError(err)
	}
	if fileID == nil {
		return files.File{}, entity.ErrAvatarNotFound
	}
	if _, err = tx.Exec(ctx, `UPDATE candidate_profiles SET avatar_file_id=NULL,updated_at=now() WHERE id=$1`, profileID); err != nil {
		return files.File{}, err
	}
	f, err := scanFile(tx.QueryRow(ctx, `UPDATE files f SET status='deleting' WHERE f.id=$1 RETURNING `+fileColumns, *fileID))
	if err != nil {
		return f, err
	}
	return f, tx.Commit(ctx)
}

// DiscardFile закрывает незавершённую загрузку, чтобы её объект можно было удалить.
// Если запись уже не pending (например, коммит всё же прошёл), возвращает ErrFileNotPending,
// и объект удалять нельзя: он может принадлежать живому аватару.
func (r *Repository) DiscardFile(ctx context.Context, fileID string) error {
	tag, err := r.db.Exec(ctx, `UPDATE files SET status='deleting' WHERE id=$1 AND status='pending'`, fileID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return entity.ErrFileNotPending
	}
	return nil
}

func (r *Repository) FinishDelete(ctx context.Context, fileID string) error {
	_, err := r.db.Exec(ctx, `UPDATE files SET status='deleted',deleted_at=now() WHERE id=$1 AND status='deleting'`, fileID)
	return err
}
