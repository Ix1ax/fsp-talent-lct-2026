//go:build integration

package httpapi

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/color"
	"image/png"
	"io"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

func testS3(t *testing.T, db *pgxpool.Pool) (*s3.Client, string) {
	t.Helper()
	endpoint, bucket := os.Getenv("TEST_S3_ENDPOINT"), os.Getenv("TEST_S3_BUCKET")
	if endpoint == "" || bucket == "" {
		t.Fatal("Нужны TEST_S3_ENDPOINT и TEST_S3_BUCKET")
	}
	client := s3.New(s3.Options{BaseEndpoint: aws.String(endpoint), Region: "us-east-1", UsePathStyle: true, Credentials: credentials.NewStaticCredentialsProvider(os.Getenv("TEST_S3_ACCESS_KEY"), os.Getenv("TEST_S3_SECRET_KEY"), "")})
	// Удаляем только объекты, записанные в нашей временной схеме.
	t.Cleanup(func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		rows, err := db.Query(ctx, `SELECT bucket, object_key FROM files`)
		if err != nil {
			t.Error(err)
			return
		}
		defer rows.Close()
		for rows.Next() {
			var b, k string
			if err := rows.Scan(&b, &k); err != nil {
				t.Error(err)
				continue
			}
			if _, err := client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(b), Key: aws.String(k)}); err != nil {
				t.Error(err)
			}
		}
	})
	return client, bucket
}

func pngBytes(t *testing.T, shade uint8) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	img.Set(0, 0, color.RGBA{shade, shade, shade, 255})
	var b bytes.Buffer
	if err := png.Encode(&b, img); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func TestCandidateAvatarService(t *testing.T) {
	db := companyTestDB(t)
	client, bucket := testS3(t, db)
	ctx := context.Background()
	storage := &faultyObjects{Objects: files.NewS3(client)}
	repo := candidaterepo.NewRepository(db)
	profiles := candidateservice.NewProfileService(repo)
	avatars := candidateservice.NewAvatarService(repo, storage, bucket, slog.New(slog.NewTextHandler(io.Discard, nil)))

	newCandidate := func(withProfile bool) string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if withProfile {
			if _, err := profiles.Create(ctx, id, entity.ProfileInput{}); err != nil {
				t.Fatal(err)
			}
		}
		return id
	}
	status := func(fileID string) string {
		var s string
		if err := db.QueryRow(ctx, `SELECT status FROM files WHERE id=$1`, fileID).Scan(&s); err != nil {
			t.Fatal(err)
		}
		return s
	}
	rowCount := func(owner string) (n int) {
		if err := db.QueryRow(ctx, `SELECT count(*) FROM files WHERE owner_user_id=$1`, owner).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return
	}
	objectExists := func(fileID string) bool {
		var key string
		if err := db.QueryRow(ctx, `SELECT object_key FROM files WHERE id=$1`, fileID).Scan(&key); err != nil {
			t.Fatal(err)
		}
		_, err := client.HeadObject(ctx, &s3.HeadObjectInput{Bucket: aws.String(bucket), Key: aws.String(key)})
		return err == nil
	}
	avatarID := func(user string) string {
		p, err := profiles.Get(ctx, user)
		if err != nil || p.AvatarFileID == nil {
			t.Fatalf("у профиля нет аватара: %+v %v", p, err)
		}
		return *p.AvatarFileID
	}

	noProfile := newCandidate(false)
	if _, err := avatars.Upload(ctx, noProfile, "a.png", pngBytes(t, 1)); !errors.Is(err, entity.ErrNotFound) || rowCount(noProfile) != 0 {
		t.Fatalf("загрузка без профиля: %v, строк в files: %d", err, rowCount(noProfile))
	}

	user := newCandidate(true)
	first := pngBytes(t, 10)
	p, err := avatars.Upload(ctx, user, "я.png", first)
	if err != nil || p.AvatarFileID == nil {
		t.Fatalf("загрузка: %+v %v", p, err)
	}
	var purpose, visibility, owner string
	if err := db.QueryRow(ctx, `SELECT purpose, visibility, owner_user_id::text FROM files WHERE id=$1`, *p.AvatarFileID).Scan(&purpose, &visibility, &owner); err != nil {
		t.Fatal(err)
	}
	if status(*p.AvatarFileID) != "ready" || purpose != "candidate_avatar" || visibility != "private" || owner != user || !objectExists(*p.AvatarFileID) {
		t.Fatalf("метаданные аватара: status=%s purpose=%s visibility=%s owner=%s", status(*p.AvatarFileID), purpose, visibility, owner)
	}
	_, body, err := avatars.Download(ctx, user)
	if err != nil {
		t.Fatal(err)
	}
	got, _ := io.ReadAll(body)
	body.Close()
	if !bytes.Equal(got, first) {
		t.Fatal("скачанный аватар не совпадает с загруженным")
	}
	other := newCandidate(true)
	if _, _, err := avatars.Download(ctx, other); !errors.Is(err, entity.ErrAvatarNotFound) {
		t.Fatalf("чужой аватар недоступен: %v", err)
	}
	if _, _, err := avatars.Download(ctx, noProfile); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("без профиля: %v", err)
	}

	// Замена: старый файл и объект удаляются, профиль указывает на новый.
	old := *p.AvatarFileID
	p, err = avatars.Upload(ctx, user, "b.png", pngBytes(t, 20))
	if err != nil || *p.AvatarFileID == old || status(old) != "deleted" || objectExists(old) || status(*p.AvatarFileID) != "ready" {
		t.Fatalf("замена: %+v %v, старый статус %s", p, err, status(old))
	}
	current := *p.AvatarFileID

	// Сбой S3 при записи: профиль не меняется, новая запись закрыта.
	storage.failPut = true
	if _, err := avatars.Upload(ctx, user, "c.png", pngBytes(t, 30)); !errors.Is(err, candidateservice.ErrStorage) {
		t.Fatalf("сбой записи: %v", err)
	}
	storage.failPut = false
	if avatarID(user) != current || status(current) != "ready" || rowCount(user) != 3 {
		t.Fatalf("после сбоя записи профиль изменился или остались записи: строк %d", rowCount(user))
	}
	var pending int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM files WHERE owner_user_id=$1 AND status NOT IN ('ready','deleted')`, user).Scan(&pending); err != nil || pending != 0 {
		t.Fatalf("остались незавершённые записи: %d (%v)", pending, err)
	}

	// Сбой удаления старого объекта: профиль уже новый, старая запись ждёт повторного удаления.
	storage.failDelete = true
	p, err = avatars.Upload(ctx, user, "d.png", pngBytes(t, 40))
	storage.failDelete = false
	if err != nil || *p.AvatarFileID == current || status(current) != "deleting" || avatarID(user) != *p.AvatarFileID {
		t.Fatalf("сбой удаления старого: %+v %v, статус старого %s", p, err, status(current))
	}
	current = *p.AvatarFileID

	if err := avatars.Delete(ctx, user); err != nil {
		t.Fatal(err)
	}
	if after, _ := profiles.Get(ctx, user); after.AvatarFileID != nil || status(current) != "deleted" || objectExists(current) {
		t.Fatalf("после удаления: %+v, статус %s", after, status(current))
	}
	if err := avatars.Delete(ctx, user); !errors.Is(err, entity.ErrAvatarNotFound) {
		t.Fatalf("повторное удаление: %v", err)
	}

	// Заблокированный пользователь не может менять аватар.
	blocked := newCandidate(true)
	if _, err := db.Exec(ctx, `UPDATE users SET status='blocked' WHERE id=$1`, blocked); err != nil {
		t.Fatal(err)
	}
	if _, err := avatars.Upload(ctx, blocked, "e.png", pngBytes(t, 50)); !errors.Is(err, entity.ErrForbidden) || rowCount(blocked) != 0 {
		t.Fatalf("заблокированный: %v, строк %d", err, rowCount(blocked))
	}
	// Файл, не прошедший проверку, не создаёт запись.
	if _, err := avatars.Upload(ctx, other, "x.png", []byte("не картинка")); !errors.Is(err, files.ErrType) || rowCount(other) != 0 {
		t.Fatalf("не картинка: %v, строк %d", err, rowCount(other))
	}
}

// DiscardFile закрывает только незавершённую загрузку: готовый файл (живой аватар) он трогать не должен.
func TestCandidateRepositoryDiscardFile(t *testing.T) {
	db := companyTestDB(t)
	repo := candidaterepo.NewRepository(db)
	profiles := candidateservice.NewProfileService(repo)
	ctx := context.Background()
	var user string
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
		t.Fatal(err)
	}
	if _, err := profiles.Create(ctx, user, entity.ProfileInput{}); err != nil {
		t.Fatal(err)
	}
	reserve := func(key string) files.File {
		f, err := files.Prepare("a.png", files.PurposeCandidateAvatar, pngBytes(t, 7))
		if err != nil {
			t.Fatal(err)
		}
		f.Bucket, f.ObjectKey = "bucket", key
		f, err = repo.ReserveAvatar(ctx, user, f)
		if err != nil {
			t.Fatal(err)
		}
		return f
	}
	pending := reserve("candidates/discard-pending")
	if err := repo.DiscardFile(ctx, pending.ID); err != nil {
		t.Fatalf("закрытие pending-файла: %v", err)
	}
	if err := repo.DiscardFile(ctx, pending.ID); !errors.Is(err, entity.ErrFileNotPending) {
		t.Fatalf("повторное закрытие: %v", err)
	}
	ready := reserve("candidates/discard-ready")
	if _, _, err := repo.CompleteAvatar(ctx, user, ready.ID); err != nil {
		t.Fatal(err)
	}
	if err := repo.DiscardFile(ctx, ready.ID); !errors.Is(err, entity.ErrFileNotPending) {
		t.Fatalf("готовый файл нельзя закрывать как незавершённый: %v", err)
	}
	var status string
	if err := db.QueryRow(ctx, `SELECT status FROM files WHERE id=$1`, ready.ID).Scan(&status); err != nil || status != "ready" {
		t.Fatalf("готовый файл изменился: %s (%v)", status, err)
	}
}

// Аватар уже отвязан от профиля, поэтому сбой S3 при DELETE не должен превращаться в ошибку клиенту.
func TestCandidateAvatarDeleteWhenStorageFails(t *testing.T) {
	db := companyTestDB(t)
	client, bucket := testS3(t, db)
	ctx := context.Background()
	storage := &faultyObjects{Objects: files.NewS3(client)}
	repo := candidaterepo.NewRepository(db)
	profiles := candidateservice.NewProfileService(repo)
	avatars := candidateservice.NewAvatarService(repo, storage, bucket, slog.New(slog.NewTextHandler(io.Discard, nil)))
	var user string
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
		t.Fatal(err)
	}
	if _, err := profiles.Create(ctx, user, entity.ProfileInput{}); err != nil {
		t.Fatal(err)
	}
	p, err := avatars.Upload(ctx, user, "a.png", pngBytes(t, 9))
	if err != nil {
		t.Fatal(err)
	}
	storage.failDelete = true
	err = avatars.Delete(ctx, user)
	storage.failDelete = false
	if err != nil {
		t.Fatalf("DELETE после отвязки аватара должен завершиться успехом, получили %v", err)
	}
	after, _ := profiles.Get(ctx, user)
	var status string
	if err := db.QueryRow(ctx, `SELECT status FROM files WHERE id=$1`, *p.AvatarFileID).Scan(&status); err != nil || after.AvatarFileID != nil || status != "deleting" {
		t.Fatalf("после сбоя S3: аватар %v, статус записи %q (%v)", after.AvatarFileID, status, err)
	}
}
