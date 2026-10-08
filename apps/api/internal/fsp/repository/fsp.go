package repository

import (
	"context"
	"errors"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/entity"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Repository { return &Repository{db: db} }

// Блокировка пользователя согласована с отзывом согласия; профиль сериализует синхронизацию и отключение.
func lock(ctx context.Context, tx pgx.Tx, user string, processing bool) (string, error) {
	var active bool
	err := tx.QueryRow(ctx, `SELECT true FROM users WHERE id=$1 AND role='candidate' AND status='active' FOR UPDATE`, user).Scan(&active)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", entity.ErrForbidden
	}
	if err != nil {
		return "", err
	}
	var id string
	err = tx.QueryRow(ctx, `SELECT id::text FROM candidate_profiles WHERE user_id=$1 FOR UPDATE`, user).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", entity.ErrForbidden
	}
	if err != nil {
		return "", err
	}
	if processing {
		var consent bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM candidate_consents WHERE user_id=$1 AND kind='processing' AND company_id IS NULL AND revoked_at IS NULL)`, user).Scan(&consent); err != nil {
			return "", err
		}
		if !consent {
			return "", entity.ErrForbidden
		}
	}
	return id, nil
}

type Querier interface {
	Query(context.Context, string, ...any) (pgx.Rows, error)
}

// Achievements читает только структурированные сведения реестра, без привязки и персональных идентификаторов.
func Achievements(ctx context.Context, q Querier, id string) ([]entity.Achievement, error) {
	rows, err := q.Query(ctx, `SELECT external_id,event_id,event_name,discipline,to_char(occurred_on,'YYYY-MM-DD'),result,place,source FROM fsp_achievements WHERE candidate_id=$1 ORDER BY occurred_on DESC,external_id`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []entity.Achievement{}
	for rows.Next() {
		var a entity.Achievement
		if err = rows.Scan(&a.ID, &a.EventID, &a.EventName, &a.Discipline, &a.OccurredOn, &a.Result, &a.Place, &a.Source); err != nil {
			return nil, err
		}
		items = append(items, a)
	}
	return items, rows.Err()
}

func load(ctx context.Context, tx pgx.Tx, id string) (entity.Profile, error) {
	p := entity.Profile{Items: []entity.Achievement{}}
	var l entity.Link
	err := tx.QueryRow(ctx, `SELECT participant_id,source,linked_at,synced_at,sync_status FROM fsp_links WHERE candidate_id=$1`, id).Scan(&l.ParticipantID, &l.Source, &l.LinkedAt, &l.SyncedAt, &l.SyncStatus)
	if errors.Is(err, pgx.ErrNoRows) {
		return p, nil
	}
	if err != nil {
		return p, err
	}
	p.Link = &l
	p.Items, err = Achievements(ctx, tx, id)
	return p, err
}

func (r *Repository) Get(ctx context.Context, user string) (entity.Profile, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Profile{}, err
	}
	defer tx.Rollback(ctx)
	id, err := lock(ctx, tx, user, true)
	if err != nil {
		return entity.Profile{}, err
	}
	p, err := load(ctx, tx, id)
	if err != nil {
		return p, err
	}
	return p, tx.Commit(ctx)
}

func (r *Repository) Save(ctx context.Context, user string, identity entity.Identity, record entity.Record, allowLink bool) (entity.Profile, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return entity.Profile{}, err
	}
	defer tx.Rollback(ctx)
	id, err := lock(ctx, tx, user, true)
	if err != nil {
		return entity.Profile{}, err
	}
	// Повторно проверяем принадлежность идентичности, даже если HTTP middleware уже разрешил запрос.
	var owned bool
	if err = tx.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM external_identities WHERE user_id=$1 AND issuer=$2 AND subject=$3)`, user, identity.Issuer, identity.Subject).Scan(&owned); err != nil {
		return entity.Profile{}, err
	}
	if !owned {
		return entity.Profile{}, entity.ErrForbidden
	}
	previous, err := load(ctx, tx, id)
	if err != nil {
		return previous, err
	}
	if previous.Link == nil && !allowLink {
		return previous, entity.ErrNotLinked
	}
	if previous.Link != nil && (previous.Link.ParticipantID != record.ParticipantID || previous.Link.Source != record.Source) {
		return previous, entity.ErrConflict
	}
	status := "ready"
	if len(record.Items) == 0 {
		status = "empty"
	}
	_, err = tx.Exec(ctx, `INSERT INTO fsp_links(candidate_id,participant_id,source,synced_at,sync_status) VALUES($1,$2,$3,clock_timestamp(),$4)
 ON CONFLICT(candidate_id) DO UPDATE SET synced_at=EXCLUDED.synced_at,sync_status=EXCLUDED.sync_status`, id, record.ParticipantID, record.Source, status)
	var pgerr *pgconn.PgError
	if errors.As(err, &pgerr) && pgerr.Code == "23505" {
		return previous, entity.ErrConflict
	}
	if err != nil {
		return previous, err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM fsp_achievements WHERE candidate_id=$1`, id); err != nil {
		return previous, err
	}
	for _, a := range record.Items {
		if _, err = tx.Exec(ctx, `INSERT INTO fsp_achievements(candidate_id,external_id,event_id,event_name,discipline,occurred_on,result,place,source) VALUES($1,$2,$3,$4,$5,$6::date,$7,$8,$9)`, id, a.ID, a.EventID, a.EventName, a.Discipline, a.OccurredOn, a.Result, a.Place, a.Source); err != nil {
			return previous, err
		}
	}
	p, err := load(ctx, tx, id)
	if err != nil {
		return p, err
	}
	return p, tx.Commit(ctx)
}

func (r *Repository) Failure(ctx context.Context, user string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	id, err := lock(ctx, tx, user, true)
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `UPDATE fsp_links SET sync_status='unavailable' WHERE candidate_id=$1`, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *Repository) Unlink(ctx context.Context, user string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	// Удаление связи разрешено и после отзыва processing.
	id, err := lock(ctx, tx, user, false)
	if err != nil {
		return err
	}
	if _, err = tx.Exec(ctx, `DELETE FROM fsp_links WHERE candidate_id=$1`, id); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
