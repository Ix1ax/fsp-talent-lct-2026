//go:build integration

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"image"
	"image/png"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/repository"
	companyservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type faultyObjects struct {
	files.Objects
	failPut, failDelete bool
}

func (s *faultyObjects) Put(ctx context.Context, f files.File, data []byte) error {
	if s.failPut {
		return errors.New("тестовая ошибка S3")
	}
	return s.Objects.Put(ctx, f, data)
}
func (s *faultyObjects) Delete(ctx context.Context, f files.File) error {
	if s.failDelete {
		return errors.New("тестовая ошибка S3")
	}
	return s.Objects.Delete(ctx, f)
}

func TestCompaniesAndPrivateS3(t *testing.T) {
	db := testDB(t)
	endpoint := os.Getenv("TEST_S3_ENDPOINT")
	if endpoint == "" {
		t.Fatal("Нужен TEST_S3_ENDPOINT")
	}
	bucket := os.Getenv("TEST_S3_BUCKET")
	if bucket == "" {
		t.Fatal("Нужен TEST_S3_BUCKET")
	}
	client := s3.New(s3.Options{BaseEndpoint: aws.String(endpoint), Region: "us-east-1", UsePathStyle: true, Credentials: credentials.NewStaticCredentialsProvider(os.Getenv("TEST_S3_ACCESS_KEY"), os.Getenv("TEST_S3_SECRET_KEY"), "")})
	// Даже при падении проверки удаляем только объекты, созданные в нашей временной схеме.
	t.Cleanup(func() {
		cleanup, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		rows, err := db.Query(cleanup, `SELECT bucket, object_key FROM files`)
		if err != nil {
			t.Error(err)
			return
		}
		defer rows.Close()
		for rows.Next() {
			var bucket, key string
			if err := rows.Scan(&bucket, &key); err != nil {
				t.Error(err)
				continue
			}
			if _, err := client.DeleteObject(cleanup, &s3.DeleteObjectInput{Bucket: aws.String(bucket), Key: aws.String(key)}); err != nil {
				t.Error(err)
			}
		}
		if err := rows.Err(); err != nil {
			t.Error(err)
		}
	})
	storage := &faultyObjects{Objects: files.NewS3(client)}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	repo := repository.NewRepository(db)
	profileService := companyservice.NewCompanyService(repo)
	documentService := companyservice.NewDocumentService(repo, storage, bucket, log)
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Companies: profileService, Documents: documentService})
	tokens := map[string]string{}
	ids := map[string]string{}
	ctx := context.Background()
	for _, name := range []string{"owner", "other", "viewer", "candidate", "blocked"} {
		role, status := "employer", "active"
		if name == "candidate" {
			role = "candidate"
		}
		if name == "blocked" {
			status = "blocked"
		}
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES($1,$2) RETURNING id::text`, role, status).Scan(&id); err != nil {
			t.Fatal(err)
		}
		ids[name] = id
		e.Store.Users[testutil.Issuer+"|"+name] = user.User{ID: id, Role: role, Status: status}
		tokens[name] = e.Token(t, name)
	}
	request := func(method, path, who, body string, status int) *httptest.ResponseRecorder {
		t.Helper()
		w := e.Do(t, method, path, tokens[who], body)
		if w.Code != status {
			t.Fatalf("%s %s (%s): %d %s, ожидали %d", method, path, who, w.Code, w.Body, status)
		}
		return w
	}
	decodeCompany := func(w *httptest.ResponseRecorder) entity.Company {
		t.Helper()
		var c entity.Company
		if err := json.Unmarshal(w.Body.Bytes(), &c); err != nil {
			t.Fatal(err)
		}
		return c
	}
	decodeFile := func(w *httptest.ResponseRecorder) files.File {
		t.Helper()
		var f files.File
		if err := json.Unmarshal(w.Body.Bytes(), &f); err != nil {
			t.Fatal(err)
		}
		return f
	}
	body := `{"name":"Компания","contact_email":"hr@example.test","inn":"7707083893"}`
	request("POST", "/api/v1/companies", "", body, 401)
	request("POST", "/api/v1/companies", "candidate", body, 403)
	request("POST", "/api/v1/companies", "blocked", body, 403)
	request("POST", "/api/v1/companies", "owner", `{"name":"Тест","contact_email":"hr@example.test","verification_status":"verified"}`, 400)
	a := decodeCompany(request("POST", "/api/v1/companies", "owner", body, 201))
	if a.MemberRole != "owner" || a.VerificationStatus != "unverified" {
		t.Fatalf("неверные права при создании: %+v", a)
	}
	request("POST", "/api/v1/companies", "other", body, 409)
	var count int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM companies`).Scan(&count); err != nil || count != 1 {
		t.Fatalf("дубликат компании: %d, %v", count, err)
	}
	b := decodeCompany(request("POST", "/api/v1/companies", "other", `{"name":"Другая","contact_email":"other@example.test"}`, 201))
	path := "/api/v1/companies/" + a.ID
	request("GET", path, "other", "", 404)
	request("PATCH", path, "other", `{"name":"Взлом"}`, 404)
	request("GET", "/api/v1/companies/not-a-uuid", "owner", "", 400)
	request("GET", "/api/v1/companies?limit=101", "owner", "", 400)
	listed := request("GET", "/api/v1/companies", "other", "", 200)
	if strings.Contains(listed.Body.String(), a.ID) || !strings.Contains(listed.Body.String(), b.ID) {
		t.Fatalf("утечка списка: %s", listed.Body)
	}
	if _, err := db.Exec(ctx, `INSERT INTO company_members(company_id,user_id,role) VALUES($1,$2,'viewer')`, a.ID, ids["viewer"]); err != nil {
		t.Fatal(err)
	}
	request("GET", path, "viewer", "", 200)
	request("PATCH", path, "viewer", `{"name":"Нет"}`, 403)
	request("PATCH", path, "owner", `{"logo_file_id":"`+b.ID+`"}`, 400)
	request("PATCH", path, "owner", `{"description":"Описание"}`, 200)
	patched := decodeCompany(request("PATCH", path, "owner", `{"description":null}`, 200))
	if patched.Description != nil || patched.Name != a.Name {
		t.Fatalf("неверный PATCH: %+v", patched)
	}
	// Два независимых поля должны сохраниться даже при одновременных PATCH.
	var wg sync.WaitGroup
	errs := make(chan string, 2)
	for _, patch := range []string{`{"name":"Обновлённая"}`, `{"description":"Параллельно"}`} {
		wg.Add(1)
		go func(patch string) {
			defer wg.Done()
			w := e.Do(t, "PATCH", path, tokens["owner"], patch)
			if w.Code != 200 {
				errs <- w.Body.String()
			}
		}(patch)
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		t.Fatal(err)
	}
	patched = decodeCompany(request("GET", path, "owner", "", 200))
	if patched.Name != "Обновлённая" || patched.Description == nil || *patched.Description != "Параллельно" {
		t.Fatalf("потеря данных PATCH: %+v", patched)
	}
	upload := func(who, purpose, name string, data []byte, status int) *httptest.ResponseRecorder {
		t.Helper()
		var buf bytes.Buffer
		mp := multipart.NewWriter(&buf)
		part, err := mp.CreateFormFile("file", name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = part.Write(data); err != nil {
			t.Fatal(err)
		}
		if err = mp.WriteField("purpose", purpose); err != nil {
			t.Fatal(err)
		}
		if err = mp.Close(); err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest("POST", path+"/files", &buf)
		req.Header.Set("Content-Type", mp.FormDataContentType())
		req.Header.Set("Authorization", "Bearer "+tokens[who])
		w := httptest.NewRecorder()
		e.Router.ServeHTTP(w, req)
		if w.Code != status {
			t.Fatalf("загрузка (%s): %d %s, ожидали %d", who, w.Code, w.Body, status)
		}
		return w
	}
	pdf := append([]byte("%PDF-1.7\n"), bytes.Repeat([]byte("x"), 3<<20)...)
	pdf = append(pdf, []byte("\n%%EOF")...)
	upload("other", "company_document", "договор.pdf", pdf, 404)
	upload("viewer", "company_document", "договор.pdf", pdf, 403)
	upload("owner", "company_logo", "fake.png", []byte("<html>bad</html>"), 415)
	upload("owner", "company_document", "big.pdf", bytes.Repeat([]byte("x"), files.MaxSize+1), 413)
	document := decodeFile(upload("owner", "company_document", "договор.pdf", pdf, 201))
	filePath := path + "/files/" + document.ID
	downloaded := request("GET", filePath+"/download", "viewer", "", 200)
	if !bytes.Equal(downloaded.Body.Bytes(), pdf) || downloaded.Header().Get("Content-Disposition") == "" || downloaded.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatal("скачивание изменило файл или заголовки")
	}
	request("GET", filePath+"/download", "other", "", 404)
	request("GET", "/api/v1/companies/"+b.ID+"/files/"+document.ID+"/download", "other", "", 404)
	request("DELETE", filePath, "viewer", "", 403)
	// Ключи и бакет не должны попадать в API. Прямой анонимный доступ в S3 закрыт.
	meta := request("GET", path+"/files", "owner", "", 200)
	if strings.Contains(meta.Body.String(), "object_key") || strings.Contains(meta.Body.String(), "bucket") {
		t.Fatalf("раскрыты внутренние адреса: %s", meta.Body)
	}
	var key string
	if err := db.QueryRow(ctx, `SELECT object_key FROM files WHERE id=$1`, document.ID).Scan(&key); err != nil {
		t.Fatal(err)
	}
	response, err := (&http.Client{Timeout: 5 * time.Second}).Get(endpoint + "/" + bucket + "/" + key)
	if err != nil {
		t.Fatal(err)
	}
	response.Body.Close()
	if response.StatusCode < 400 {
		t.Fatalf("S3 доступен без авторизации: %d", response.StatusCode)
	}
	var logoData bytes.Buffer
	if err := png.Encode(&logoData, image.NewRGBA(image.Rect(0, 0, 2, 2))); err != nil {
		t.Fatal(err)
	}
	logo := decodeFile(upload("owner", "company_logo", "logo.png", logoData.Bytes(), 201))
	withLogo := decodeCompany(request("GET", path, "owner", "", 200))
	if withLogo.LogoFileID == nil || *withLogo.LogoFileID != logo.ID {
		t.Fatal("логотип не привязан")
	}
	request("DELETE", path+"/files/"+logo.ID, "owner", "", 204)
	withoutLogo := decodeCompany(request("GET", path, "owner", "", 200))
	if withoutLogo.LogoFileID != nil {
		t.Fatal("ссылка на удалённый логотип осталась")
	}
	// Ошибка S3 не оставляет готовый файл. Удаление можно повторить после восстановления S3.
	storage.failPut = true
	upload("owner", "company_document", "failed.pdf", pdf, 503)
	storage.failPut = false
	if err := db.QueryRow(ctx, `SELECT count(*) FROM files WHERE original_name='failed.pdf' AND status<>'deleted'`).Scan(&count); err != nil || count != 0 {
		t.Fatalf("зависшая загрузка: %d %v", count, err)
	}
	storage.failDelete = true
	request("DELETE", filePath, "owner", "", 503)
	storage.failDelete = false
	request("GET", filePath+"/download", "owner", "", 404)
	request("DELETE", filePath, "owner", "", 204)
	request("DELETE", filePath, "owner", "", 204)
	// Отключённое членство блокирует доступ независимо от валидности JWT.
	if _, err := db.Exec(ctx, `UPDATE company_members SET status='inactive' WHERE company_id=$1 AND user_id=$2`, a.ID, ids["viewer"]); err != nil {
		t.Fatal(err)
	}
	request("GET", path, "viewer", "", 404)
}
