package repository

import (
	"context"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/jackc/pgx/v5"
)

const submissionColumns = `s.id::text,s.task_id::text,t.title,t.company_id::text,c.name,s.candidate_id::text,` + fileJSON + `,s.status,s.submitted_at,s.score,s.feedback,s.reviewed_at`
const submissionFrom = ` FROM company_task_submissions s JOIN company_daily_tasks t ON t.id=s.task_id
 JOIN companies c ON c.id=t.company_id JOIN candidate_profiles p ON p.id=s.candidate_id
 JOIN users cu ON cu.id=p.user_id JOIN files f ON f.id=s.file_id WHERE f.status='ready'`

// Компания видит решение только при действующих согласиях. Своя история доступна автору и после отзыва.
const submissionScope = ` AND (($2::uuid IS NULL AND p.user_id=$1) OR (t.company_id=$2 AND cu.status='active'
 AND (SELECT count(DISTINCT kind) FROM candidate_consents WHERE user_id=p.user_id AND kind IN ('processing','publication') AND company_id IS NULL AND revoked_at IS NULL)=2))
 AND ($3::uuid IS NULL OR s.task_id=$3)`

func scanSubmission(row pgx.Row) (entity.Submission, error) {
	var s entity.Submission
	err := row.Scan(&s.ID, &s.TaskID, &s.TaskTitle, &s.CompanyID, &s.CompanyName, &s.CandidateID, &s.File, &s.Status, &s.SubmittedAt, &s.Score, &s.Feedback, &s.ReviewedAt)
	return s, dbError(err)
}

func submissionAccess(ctx context.Context, tx pgx.Tx, user, company, task string, write bool) error {
	if company == "" {
		return candidateAccess(ctx, tx, user)
	}
	if err := companyAccess(ctx, tx, user, company, write); err != nil {
		return err
	}
	var id string
	err := tx.QueryRow(ctx, `SELECT id::text FROM company_daily_tasks WHERE id=$1 AND company_id=$2`, task, company).Scan(&id)
	return dbError(err)
}

func canSubmit(ctx context.Context, tx pgx.Tx, user, task string) (string, error) {
	// Компания блокируется первой: бан ждёт завершения уже допущенной записи ответа.
	var company string
	if err := tx.QueryRow(ctx, `SELECT c.id::text FROM companies c JOIN company_daily_tasks t ON t.company_id=c.id WHERE t.id=$1 AND c.status='active' AND t.moderation_status='published' FOR SHARE OF c`, task).Scan(&company); err != nil {
		return "", dbError(err)
	}
	candidate, err := candidateProfile(ctx, tx, user, true)
	if err != nil {
		return "", err
	}
	var status string
	var open bool
	// SHARE удерживает задание открытым до вставки ответа и сериализует закрытие.
	err = tx.QueryRow(ctx, `SELECT status,deadline_at IS NULL OR deadline_at>clock_timestamp() FROM company_daily_tasks WHERE id=$1 AND moderation_status='published' FOR SHARE`, task).Scan(&status, &open)
	if err != nil {
		return "", dbError(err)
	}
	if status != "open" || !open {
		return "", entity.ErrClosed
	}
	var exists bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM company_task_submissions WHERE task_id=$1 AND candidate_id=$2)`, task, candidate).Scan(&exists); err != nil {
		return "", err
	}
	if exists {
		return "", entity.ErrAlreadySubmitted
	}
	return candidate, nil
}

func (r *Repository) CanSubmit(ctx context.Context, user, task string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = canSubmit(ctx, tx, user, task); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repository) Submit(ctx context.Context, user, task string, file files.File) (entity.Submission, error) {
	var result entity.Submission
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)
	candidate, err := canSubmit(ctx, tx, user, task)
	if err != nil {
		return result, err
	}
	file, err = insertFile(ctx, tx, user, file)
	if err != nil {
		return result, err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO company_task_submissions(task_id,candidate_id,file_id,submitted_at) VALUES($1,$2,$3,clock_timestamp()) RETURNING id::text`, task, candidate, file.ID).Scan(&id)
	if err != nil {
		return result, dbError(err)
	}
	result, err = scanSubmission(tx.QueryRow(ctx, `SELECT `+submissionColumns+submissionFrom+` AND s.id=$1`, id))
	if err != nil {
		return result, err
	}
	return result, tx.Commit(ctx)
}

func scopes(company, task string) (*string, *string) {
	var c, t *string
	if company != "" {
		c = &company
	}
	if task != "" {
		t = &task
	}
	return c, t
}

func (r *Repository) ListSubmissions(ctx context.Context, user, company, task string, f entity.Filter) (entity.SubmissionPage, error) {
	p := entity.SubmissionPage{Items: []entity.Submission{}, Limit: f.Limit, Offset: f.Offset}
	tx, err := r.readTx(ctx)
	if err != nil {
		return p, err
	}
	defer tx.Rollback(ctx)
	if err = submissionAccess(ctx, tx, user, company, task, false); err != nil {
		return p, err
	}
	c, t := scopes(company, task)
	where := submissionFrom + submissionScope + ` AND ($4::uuid IS NULL OR t.company_id=$4) AND ($5::uuid IS NULL OR s.task_id=$5)
 AND ($6::uuid IS NULL OR s.candidate_id=$6) AND ($7::text='all' OR s.status=$7)`
	args := []any{user, c, t, f.CompanyID, f.TaskID, f.CandidateID, f.Status}
	if err = tx.QueryRow(ctx, `SELECT count(*)`+where, args...).Scan(&p.Total); err != nil {
		return p, err
	}
	order := `s.submitted_at DESC,s.id DESC`
	if f.Sort == "score" {
		order = `s.score DESC NULLS LAST,s.submitted_at DESC,s.id DESC`
	}
	rows, err := tx.Query(ctx, `SELECT `+submissionColumns+where+` ORDER BY `+order+` LIMIT $8 OFFSET $9`, append(args, f.Limit, f.Offset)...)
	if err != nil {
		return p, err
	}
	for rows.Next() {
		s, e := scanSubmission(rows)
		if e != nil {
			rows.Close()
			return p, e
		}
		p.Items = append(p.Items, s)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return p, err
	}
	return p, tx.Commit(ctx)
}

func (r *Repository) GetSubmission(ctx context.Context, user, company, task, id string) (entity.Submission, error) {
	var result entity.Submission
	tx, err := r.readTx(ctx)
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)
	if err = submissionAccess(ctx, tx, user, company, task, false); err != nil {
		return result, err
	}
	c, t := scopes(company, task)
	result, err = scanSubmission(tx.QueryRow(ctx, `SELECT `+submissionColumns+submissionFrom+submissionScope+` AND s.id=$4`, user, c, t, id))
	if err != nil {
		return result, err
	}
	return result, tx.Commit(ctx)
}

func (r *Repository) Review(ctx context.Context, user, company, task, id string, in entity.ReviewInput) (entity.Submission, error) {
	var result entity.Submission
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return result, err
	}
	defer tx.Rollback(ctx)
	if err = submissionAccess(ctx, tx, user, company, task, true); err != nil {
		return result, err
	}
	// Удерживаем пользователя автора, чтобы отзыв согласий не обогнал проверку.
	var author string
	err = tx.QueryRow(ctx, `SELECT u.id::text FROM company_task_submissions s JOIN candidate_profiles p ON p.id=s.candidate_id JOIN users u ON u.id=p.user_id WHERE s.id=$1 AND s.task_id=$2 FOR SHARE OF u`, id, task).Scan(&author)
	if err != nil {
		return result, dbError(err)
	}
	if _, err = candidateProfile(ctx, tx, author, true); err != nil {
		return result, err
	}
	err = tx.QueryRow(ctx, `UPDATE company_task_submissions SET status='reviewed',score=$2,feedback=$3,reviewed_at=greatest(clock_timestamp(),submitted_at),reviewed_by=$4 WHERE id=$1 RETURNING id::text`, id, in.Score, in.Feedback, user).Scan(&id)
	if err != nil {
		return result, dbError(err)
	}
	result, err = scanSubmission(tx.QueryRow(ctx, `SELECT `+submissionColumns+submissionFrom+` AND s.id=$1`, id))
	if err != nil {
		return result, err
	}
	return result, tx.Commit(ctx)
}

func (r *Repository) SubmissionFile(ctx context.Context, user, company, task, id string) (files.File, error) {
	var file files.File
	tx, err := r.readTx(ctx)
	if err != nil {
		return file, err
	}
	defer tx.Rollback(ctx)
	if err = submissionAccess(ctx, tx, user, company, task, false); err != nil {
		return file, err
	}
	c, t := scopes(company, task)
	file, err = scanFile(tx.QueryRow(ctx, `SELECT `+fileColumns+submissionFrom+submissionScope+` AND s.id=$4`, user, c, t, id))
	if err != nil {
		return file, err
	}
	return file, tx.Commit(ctx)
}

// FileExists защищает файл успешной публикации при неоднозначном результате COMMIT.
func (r *Repository) FileExists(ctx context.Context, f files.File) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM files WHERE bucket=$1 AND object_key=$2)`, f.Bucket, f.ObjectKey).Scan(&exists)
	return exists, err
}
