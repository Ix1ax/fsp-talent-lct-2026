package repository

import (
	"context"
	"errors"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

const memberColumns = `company_id::text,user_id::text,role,status,joined_at`
const invitationColumns = `id::text,company_id::text,email,role,CASE WHEN status='pending' AND expires_at<=now() THEN 'expired' ELSE status END,created_at,expires_at`

func scanMember(row pgx.Row) (entity.Member, error) {
	var m entity.Member
	err := row.Scan(&m.CompanyID, &m.UserID, &m.Role, &m.Status, &m.JoinedAt)
	return m, dbError(err)
}
func scanInvitation(row pgx.Row) (entity.Invitation, error) {
	var i entity.Invitation
	err := row.Scan(&i.ID, &i.CompanyID, &i.Email, &i.Role, &i.Status, &i.CreatedAt, &i.ExpiresAt)
	return i, dbError(err)
}

func (r *Repository) ListMembers(ctx context.Context, user, company string, limit, offset int) ([]entity.Member, int64, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback(ctx)
	// Общий порядок блокировок: компания, затем участники. Удаление доступа ждёт завершения чтения.
	if _, err = scanCompany(tx.QueryRow(ctx, `SELECT `+companyColumns+memberJoin+` AND c.id=$2 FOR SHARE OF c,m,u`, user, company)); err != nil {
		return nil, 0, err
	}
	var total int64
	if err = tx.QueryRow(ctx, `SELECT count(*) FROM company_members WHERE company_id=$1`, company).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := tx.Query(ctx, `SELECT `+memberColumns+` FROM company_members WHERE company_id=$1 ORDER BY joined_at,user_id LIMIT $2 OFFSET $3`, company, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	items := []entity.Member{}
	for rows.Next() {
		m, err := scanMember(rows)
		if err != nil {
			rows.Close()
			return nil, 0, err
		}
		items = append(items, m)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, tx.Commit(ctx)
}

func (r *Repository) UpdateMember(ctx context.Context, user, company, target, role string) (entity.Member, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Member{}, err
	}
	defer tx.Rollback(ctx)
	if _, err = owned(ctx, tx, user, company); err != nil {
		return entity.Member{}, err
	}
	m, err := scanMember(tx.QueryRow(ctx, `SELECT `+memberColumns+` FROM company_members WHERE company_id=$1 AND user_id=$2 FOR UPDATE`, company, target))
	if err != nil {
		return m, err
	}
	if m.Role == "owner" {
		return m, entity.ErrForbidden
	}
	if m.Status != "active" {
		return m, validationError("Сотрудник отключён: создайте новое приглашение для восстановления доступа")
	}
	m, err = scanMember(tx.QueryRow(ctx, `UPDATE company_members SET role=$3 WHERE company_id=$1 AND user_id=$2 RETURNING `+memberColumns, company, target, role))
	if err != nil {
		return m, err
	}
	return m, tx.Commit(ctx)
}
func (r *Repository) RemoveMember(ctx context.Context, user, company, target string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = owned(ctx, tx, user, company); err != nil {
		return err
	}
	m, err := scanMember(tx.QueryRow(ctx, `SELECT `+memberColumns+` FROM company_members WHERE company_id=$1 AND user_id=$2 FOR UPDATE`, company, target))
	if err != nil {
		return err
	}
	if m.Role == "owner" {
		return entity.ErrForbidden
	}
	if _, err = tx.Exec(ctx, `UPDATE company_members SET status='inactive' WHERE company_id=$1 AND user_id=$2`, company, target); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func (r *Repository) CreateInvitation(ctx context.Context, user, company string, in entity.InvitationInput, hash string) (entity.Invitation, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Invitation{}, err
	}
	defer tx.Rollback(ctx)
	if _, err = owned(ctx, tx, user, company); err != nil {
		return entity.Invitation{}, err
	}
	if _, err = tx.Exec(ctx, `UPDATE company_invitations SET status='expired' WHERE company_id=$1 AND email=$2 AND status='pending' AND expires_at<=now()`, company, in.Email); err != nil {
		return entity.Invitation{}, err
	}
	i, err := scanInvitation(tx.QueryRow(ctx, `INSERT INTO company_invitations(company_id,created_by,email,role,token_hash) VALUES($1,$2,$3,$4,$5) RETURNING `+invitationColumns, company, user, in.Email, in.Role, hash))
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == "company_invitations_pending_email_idx" {
		return i, entity.ErrMemberConflict
	}
	if err != nil {
		return i, err
	}
	return i, tx.Commit(ctx)
}
func (r *Repository) ListInvitations(ctx context.Context, user, company string, limit, offset int) ([]entity.Invitation, int64, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback(ctx)
	if _, err = owned(ctx, tx, user, company); err != nil {
		return nil, 0, err
	}
	var total int64
	if err = tx.QueryRow(ctx, `SELECT count(*) FROM company_invitations WHERE company_id=$1`, company).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := tx.Query(ctx, `SELECT `+invitationColumns+` FROM company_invitations WHERE company_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`, company, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	items := []entity.Invitation{}
	for rows.Next() {
		i, err := scanInvitation(rows)
		if err != nil {
			rows.Close()
			return nil, 0, err
		}
		items = append(items, i)
	}
	rows.Close()
	if err = rows.Err(); err != nil {
		return nil, 0, err
	}
	return items, total, tx.Commit(ctx)
}
func (r *Repository) RevokeInvitation(ctx context.Context, user, company, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = owned(ctx, tx, user, company); err != nil {
		return err
	}
	i, err := scanInvitation(tx.QueryRow(ctx, `SELECT `+invitationColumns+` FROM company_invitations WHERE company_id=$1 AND id=$2 FOR UPDATE`, company, id))
	if err != nil {
		return err
	}
	if i.Status == "accepted" {
		return entity.ErrMemberConflict
	}
	if _, err = tx.Exec(ctx, `UPDATE company_invitations SET status='revoked' WHERE id=$1`, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
func (r *Repository) AcceptInvitation(ctx context.Context, user, email, hash string) (entity.Member, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Member{}, err
	}
	defer tx.Rollback(ctx)
	var company string
	if err = tx.QueryRow(ctx, `SELECT company_id::text FROM company_invitations WHERE token_hash=$1`, hash).Scan(&company); errors.Is(err, pgx.ErrNoRows) {
		return entity.Member{}, entity.ErrInvitationInvalid
	} else if err != nil {
		return entity.Member{}, err
	}
	// Та же блокировка компании, что в смене ролей и записи потребностей: принятие и отзыв не расходятся.
	var exists bool
	if err = tx.QueryRow(ctx, `SELECT true FROM companies WHERE id=$1 AND status='active' FOR UPDATE`, company).Scan(&exists); err != nil {
		return entity.Member{}, dbError(err)
	}
	var role, status, recipient string
	var accepted *string
	var expired bool
	err = tx.QueryRow(ctx, `SELECT role,status,email,accepted_by::text,expires_at<=now() FROM company_invitations WHERE token_hash=$1 FOR UPDATE`, hash).Scan(&role, &status, &recipient, &accepted, &expired)
	if err != nil {
		return entity.Member{}, dbError(err)
	}
	if recipient != email {
		return entity.Member{}, entity.ErrInvitationInvalid
	}
	if err = tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='employer' AND status='active' FOR SHARE`, user).Scan(&exists); errors.Is(err, pgx.ErrNoRows) {
		return entity.Member{}, entity.ErrForbidden
	} else if err != nil {
		return entity.Member{}, err
	}
	if status == "accepted" && accepted != nil && *accepted == user {
		m, err := scanMember(tx.QueryRow(ctx, `SELECT `+memberColumns+` FROM company_members WHERE company_id=$1 AND user_id=$2 AND status='active'`, company, user))
		if errors.Is(err, entity.ErrNotFound) {
			return m, entity.ErrInvitationInvalid
		}
		if err != nil {
			return m, err
		}
		return m, tx.Commit(ctx)
	}
	if status != "pending" || expired {
		return entity.Member{}, entity.ErrInvitationInvalid
	}
	// Активному участнику приглашение не меняет роль. Отключённый может принять новое приглашение.
	m, err := scanMember(tx.QueryRow(ctx, `INSERT INTO company_members(company_id,user_id,role) VALUES($1,$2,$3)
 ON CONFLICT(company_id,user_id) DO UPDATE SET role=excluded.role,status='active',joined_at=now()
 WHERE company_members.status='inactive' AND company_members.role<>'owner' RETURNING `+memberColumns, company, user, role))
	if errors.Is(err, entity.ErrNotFound) {
		return m, entity.ErrMemberConflict
	}
	if err != nil {
		return m, err
	}
	if _, err = tx.Exec(ctx, `UPDATE company_invitations SET status='accepted',accepted_by=$2,accepted_at=now() WHERE token_hash=$1`, hash, user); err != nil {
		return m, err
	}
	return m, tx.Commit(ctx)
}
