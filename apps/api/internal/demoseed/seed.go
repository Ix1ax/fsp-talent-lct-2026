// Package demoseed provisions the synthetic jury dataset after schema migrations.
package demoseed

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	fspentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/registry"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/migrations"
	"github.com/pressly/goose/v3"
	"golang.org/x/crypto/bcrypt"
)

func Provider(db *sql.DB) (*goose.Provider, error) {
	source, err := fs.Sub(migrations.DemoFiles, "demo")
	if err != nil {
		return nil, err
	}
	return goose.NewProvider(goose.DialectPostgres, db, source, goose.WithTableName("goose_demo_version"))
}

// Apply is restartable: SQL is versioned, passwords are set only on creation, and
// only pending demo objects are uploaded. Jury edits are never reset on redeploy.
func Apply(ctx context.Context, db *sql.DB) error {
	required := []string{"OIDC_ISSUER", "KEYCLOAK_URL", "KEYCLOAK_ADMIN_USER", "KEYCLOAK_ADMIN_PASSWORD", "S3_ENDPOINT", "S3_ACCESS_KEY", "S3_SECRET_KEY", "S3_BUCKET"}
	for _, key := range required {
		if os.Getenv(key) == "" {
			return fmt.Errorf("для демо-набора нужна переменная %s", key)
		}
	}
	issuer := strings.TrimRight(os.Getenv("OIDC_ISSUER"), "/")
	u, err := url.Parse(issuer)
	if err != nil || u.Host == "" || !strings.Contains(u.Path, "/realms/") {
		return fmt.Errorf("OIDC_ISSUER должен содержать /realms/<realm>")
	}
	realm := strings.TrimPrefix(u.Path, "/realms/")
	if realm == "" || strings.Contains(realm, "/") {
		return fmt.Errorf("некорректный realm в OIDC_ISSUER")
	}
	// Hold the lock on a dedicated connection, including external provisioning.
	conn, err := db.Conn(ctx)
	if err != nil {
		return err
	}
	defer conn.Close()
	if _, err = conn.ExecContext(ctx, `SELECT pg_advisory_lock(20261011,221547)`); err != nil {
		return err
	}
	defer func() {
		cleanup, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, _ = conn.ExecContext(cleanup, `SELECT pg_advisory_unlock(20261011,221547)`)
	}()
	provider, err := Provider(db)
	if err != nil {
		return err
	}
	if _, err = provider.Up(ctx); err != nil {
		return err
	}
	k := keycloak{base: strings.TrimRight(os.Getenv("KEYCLOAK_URL"), "/"), realm: realm, client: &http.Client{Timeout: 20 * time.Second}}
	if err = k.login(ctx, os.Getenv("KEYCLOAK_ADMIN_USER"), os.Getenv("KEYCLOAK_ADMIN_PASSWORD")); err != nil {
		return err
	}
	if err = k.ensureMarkerProfile(ctx); err != nil {
		return err
	}
	for _, a := range accounts {
		subject, err := k.ensureUser(ctx, a)
		if err != nil {
			return err
		}
		// Conflict with another local identity is rejected rather than reassigned.
		result, err := db.ExecContext(ctx, `INSERT INTO external_identities(user_id,issuer,subject,email,display_name,profile_updated_at)
   VALUES($1,$2,$3,$4,$5,clock_timestamp()) ON CONFLICT(issuer,subject) DO UPDATE SET provider=external_identities.provider
   WHERE external_identities.user_id=EXCLUDED.user_id`, fmt.Sprintf("de000001-0000-4000-8000-%012d", a.Number), issuer, subject, a.Email, a.FirstName+" "+a.LastName)
		if err != nil {
			return fmt.Errorf("привязка %s: %w", a.Email, err)
		}
		n, err := result.RowsAffected()
		if err != nil {
			return err
		}
		if n != 1 {
			return fmt.Errorf("идентичность %s связана с другим пользователем", a.Email)
		}
		if a.Number == 1 {
			record, err := (registry.Mock{}).Lookup(ctx, fspentity.Identity{Issuer: issuer, Subject: subject})
			if err != nil {
				return err
			}
			// Only replace the initial placeholder. Subsequent unlink/sync remains the user's choice.
			if _, err = db.ExecContext(ctx, `UPDATE fsp_links SET participant_id=$1 WHERE candidate_id='de000002-0000-4000-8000-000000000001' AND participant_id='jury-demo-000000000001'`, record.ParticipantID); err != nil {
				return err
			}
		}
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("adminadminadmin"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if _, err = db.ExecContext(ctx, `UPDATE admin_accounts SET password_hash=$1 WHERE id='de000010-0000-4000-8000-000000000001' AND password_hash='demo-account-not-activated'`, string(hash)); err != nil {
		return err
	}
	region := os.Getenv("S3_REGION")
	if region == "" {
		region = "us-east-1"
	}
	client := s3.New(s3.Options{Region: region, BaseEndpoint: aws.String(os.Getenv("S3_ENDPOINT")), UsePathStyle: true, Credentials: credentials.NewStaticCredentialsProvider(os.Getenv("S3_ACCESS_KEY"), os.Getenv("S3_SECRET_KEY"), ""), RetryMaxAttempts: 3})
	return uploadPending(ctx, db, files.NewS3(client), os.Getenv("S3_BUCKET"))
}

func uploadPending(ctx context.Context, db *sql.DB, objects files.Objects, bucket string) error {
	rows, err := db.QueryContext(ctx, `SELECT id::text FROM files WHERE id::text LIKE 'de000005-%' AND status='pending' ORDER BY id`)
	if err != nil {
		return err
	}
	var ids []string
	for rows.Next() {
		var id string
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	for _, id := range ids {
		if err = uploadOne(ctx, db, objects, bucket, id); err != nil {
			return err
		}
	}
	return nil
}
func uploadOne(ctx context.Context, db *sql.DB, objects files.Objects, bucket, id string) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var f files.File
	err = tx.QueryRowContext(ctx, `SELECT original_name,purpose,object_key FROM files WHERE id=$1 AND status='pending' FOR UPDATE`, id).Scan(&f.OriginalName, &f.Purpose, &f.ObjectKey)
	if err == sql.ErrNoRows {
		return nil
	}
	if err != nil {
		return err
	}
	data, err := fixture(f)
	if err != nil {
		return err
	}
	prepared, err := files.Prepare(f.OriginalName, f.Purpose, data)
	if err != nil {
		return err
	}
	prepared.Bucket = bucket
	prepared.ObjectKey = f.ObjectKey
	if err = objects.Put(ctx, prepared, data); err != nil {
		return fmt.Errorf("загрузка демо-файла %s не удалась", id)
	}
	if _, err = tx.ExecContext(ctx, `UPDATE files SET bucket=$2,size_bytes=$3,media_type=$4,checksum_sha256=$5,status='ready' WHERE id=$1`, id, bucket, prepared.SizeBytes, prepared.MediaType, prepared.ChecksumSHA256); err != nil {
		return err
	}
	return tx.Commit()
}
