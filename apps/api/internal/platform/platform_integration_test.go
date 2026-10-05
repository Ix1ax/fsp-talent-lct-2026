//go:build integration

package platform

import (
	"context"
	"fmt"
	"io"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/config"
)

func TestStorageRoundTrip(t *testing.T) {
	cfg, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	deps, err := Open(ctx, cfg)
	if err != nil {
		t.Fatal(err)
	}
	defer deps.Close()

	t.Run("postgres", func(t *testing.T) {
		tx, err := deps.DB.Begin(ctx)
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback(ctx)
		if _, err := tx.Exec(ctx, "CREATE TEMP TABLE integration_probe (value text NOT NULL) ON COMMIT DROP"); err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(ctx, "INSERT INTO integration_probe (value) VALUES ($1)", "storage works"); err != nil {
			t.Fatal(err)
		}
		var value string
		if err := tx.QueryRow(ctx, "SELECT value FROM integration_probe").Scan(&value); err != nil {
			t.Fatal(err)
		}
		if value != "storage works" {
			t.Fatalf("чтение Postgres: %q", value)
		}
	})

	t.Run("redis", func(t *testing.T) {
		key := fmt.Sprintf("integration:%d", time.Now().UnixNano())
		t.Cleanup(func() { deps.Cache.Del(context.Background(), key) })
		if err := deps.Cache.Set(ctx, key, "ready", time.Minute).Err(); err != nil {
			t.Fatal(err)
		}
		value, err := deps.Cache.Get(ctx, key).Result()
		if err != nil || value != "ready" {
			t.Fatalf("чтение кеша: %q, %v", value, err)
		}
	})

	t.Run("s3", func(t *testing.T) {
		key := fmt.Sprintf("integration/%d.txt", time.Now().UnixNano())
		t.Cleanup(func() {
			_, _ = deps.Objects.DeleteObject(context.Background(), &s3.DeleteObjectInput{Bucket: aws.String(cfg.S3Bucket), Key: aws.String(key)})
		})
		_, err := deps.Objects.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(cfg.S3Bucket), Key: aws.String(key), Body: strings.NewReader("storage works"), ContentType: aws.String("text/plain")})
		if err != nil {
			t.Fatal(err)
		}
		result, err := deps.Objects.GetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(cfg.S3Bucket), Key: aws.String(key)})
		if err != nil {
			t.Fatal(err)
		}
		defer result.Body.Close()
		body, err := io.ReadAll(result.Body)
		if err != nil || string(body) != "storage works" {
			t.Fatalf("чтение S3: %q, %v", body, err)
		}
	})
}
