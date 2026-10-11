package web_test

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/png"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

type memAvatars struct {
	hasProfile map[string]bool
	current    map[string]files.File
	reserved   map[string]files.File
	n          int
}

func (m *memAvatars) ReserveAvatar(_ context.Context, userID string, f files.File) (files.File, error) {
	if !m.hasProfile[userID] {
		return f, entity.ErrNotFound
	}
	m.n++
	f.ID = fmt.Sprintf("file-%d", m.n)
	m.reserved[f.ID] = f
	return f, nil
}
func (m *memAvatars) CompleteAvatar(_ context.Context, userID, fileID string) (*files.File, entity.Profile, error) {
	var replaced *files.File
	if old, ok := m.current[userID]; ok {
		replaced = &old
	}
	f := m.reserved[fileID]
	f.Status = "ready"
	m.current[userID] = f
	return replaced, entity.Profile{ID: "profile-" + userID, AvatarFileID: &fileID}, nil
}
func (m *memAvatars) Avatar(_ context.Context, userID string) (files.File, error) {
	if !m.hasProfile[userID] {
		return files.File{}, entity.ErrNotFound
	}
	f, ok := m.current[userID]
	if !ok {
		return files.File{}, entity.ErrAvatarNotFound
	}
	return f, nil
}
func (m *memAvatars) DetachAvatar(ctx context.Context, userID string) (files.File, error) {
	f, err := m.Avatar(ctx, userID)
	delete(m.current, userID)
	return f, err
}
func (m *memAvatars) DiscardFile(context.Context, string) error  { return nil }
func (m *memAvatars) FinishDelete(context.Context, string) error { return nil }

type memObjects struct{ data map[string][]byte }

func (m *memObjects) Put(_ context.Context, f files.File, data []byte) error {
	m.data[f.ObjectKey] = data
	return nil
}
func (m *memObjects) Get(_ context.Context, f files.File) (io.ReadCloser, error) {
	return io.NopCloser(bytes.NewReader(m.data[f.ObjectKey])), nil
}
func (m *memObjects) Delete(_ context.Context, f files.File) error {
	delete(m.data, f.ObjectKey)
	return nil
}

func avatarEnv(t *testing.T) *testutil.AuthEnv {
	t.Helper()
	store := &memAvatars{hasProfile: map[string]bool{"u-cand1": true, "u-cand2": true}, current: map[string]files.File{}, reserved: map[string]files.File{}}
	avatars := candidateservice.NewAvatarService(store, &memObjects{data: map[string][]byte{}}, "bucket", slog.New(slog.NewTextHandler(io.Discard, nil)))
	profiles := candidateservice.NewProfileService(&memProfiles{byUser: map[string]entity.Profile{}})
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Candidates: profiles, Avatars: avatars})
	for sub, u := range map[string]user.User{
		"cand1":     {ID: "u-cand1", Role: "candidate", Status: "active"},
		"cand2":     {ID: "u-cand2", Role: "candidate", Status: "active"},
		"noprofile": {ID: "u-none", Role: "candidate", Status: "active"},
		"emp":       {ID: "u-emp", Role: "employer", Status: "active"},
	} {
		e.Store.Users[testutil.Issuer+"|"+sub] = u
	}
	return e
}

func upload(t *testing.T, e *testutil.AuthEnv, sub, field, name string, data []byte) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile(field, name)
	if err != nil {
		t.Fatal(err)
	}
	part.Write(data)
	w.Close()
	req := httptest.NewRequest("PUT", "/api/v1/me/profile/avatar", &body)
	req.Header.Set("Authorization", "Bearer "+e.Token(t, sub))
	req.Header.Set("Content-Type", w.FormDataContentType())
	rec := httptest.NewRecorder()
	e.Router.ServeHTTP(rec, req)
	return rec
}

func TestCandidateAvatarRoutes(t *testing.T) {
	e := avatarEnv(t)
	var image1 bytes.Buffer
	if err := png.Encode(&image1, image.NewRGBA(image.Rect(0, 0, 2, 2))); err != nil {
		t.Fatal(err)
	}
	do := func(method, sub string, status int) *httptest.ResponseRecorder {
		t.Helper()
		w := e.Do(t, method, "/api/v1/me/profile/avatar", e.Token(t, sub), "")
		if w.Code != status {
			t.Fatalf("%s avatar (%s): %d %s, ожидали %d", method, sub, w.Code, w.Body, status)
		}
		return w
	}
	check := func(w *httptest.ResponseRecorder, status int, code string) {
		t.Helper()
		if w.Code != status || testutil.ErrorCode(t, w) != code {
			t.Fatalf("ожидали %d %s, получили %d %s", status, code, w.Code, w.Body)
		}
	}

	if w := e.Do(t, "PUT", "/api/v1/me/profile/avatar", e.Token(t, "cand1"), `{}`); w.Code != 400 || testutil.ErrorCode(t, w) != "invalid_file" {
		t.Fatalf("не multipart: %d %s", w.Code, w.Body)
	}
	check(upload(t, e, "cand1", "avatar", "a.png", image1.Bytes()), 400, "invalid_file")
	check(upload(t, e, "cand1", "file", "a.png", []byte("просто текст под видом картинки")), 415, "unsupported_file_type")
	check(upload(t, e, "cand1", "file", "a.png", bytes.Repeat([]byte{0}, files.MaxLogoSize+128<<10)), 413, "file_too_large")
	check(upload(t, e, "noprofile", "file", "a.png", image1.Bytes()), 404, "profile_not_found")
	check(upload(t, e, "emp", "file", "a.png", image1.Bytes()), 403, "forbidden")
	check(do("GET", "cand1", 404), 404, "avatar_not_found")
	check(do("GET", "emp", 403), 403, "forbidden")
	check(do("DELETE", "emp", 403), 403, "forbidden")
	check(do("DELETE", "cand1", 404), 404, "avatar_not_found")

	up := upload(t, e, "cand1", "file", "я.png", image1.Bytes())
	if up.Code != 200 || !strings.Contains(up.Body.String(), `"avatar_file_id":"file-`) {
		t.Fatalf("загрузка: %d %s", up.Code, up.Body)
	}
	got := do("GET", "cand1", 200)
	if got.Header().Get("Content-Type") != "image/png" || got.Header().Get("Cache-Control") != "private, no-store" || !strings.HasPrefix(got.Header().Get("Content-Disposition"), "inline") || got.Header().Get("X-Content-Type-Options") != "nosniff" || !bytes.Equal(got.Body.Bytes(), image1.Bytes()) {
		t.Fatalf("скачивание: заголовки %v, %d байт", got.Header(), got.Body.Len())
	}
	check(do("GET", "cand2", 404), 404, "avatar_not_found")
	do("DELETE", "cand1", 204)
	check(do("GET", "cand1", 404), 404, "avatar_not_found")
}

func TestCandidateAvatarUnavailable(t *testing.T) {
	e := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Candidates: candidateservice.NewProfileService(&memProfiles{byUser: map[string]entity.Profile{}})})
	e.Store.Users[testutil.Issuer+"|cand1"] = user.User{ID: "u-cand1", Role: "candidate", Status: "active"}
	w := e.Do(t, "GET", "/api/v1/me/profile/avatar", e.Token(t, "cand1"), "")
	if w.Code != http.StatusServiceUnavailable || testutil.ErrorCode(t, w) != "avatar_unavailable" {
		t.Fatalf("без сервиса аватара ожидали 503 avatar_unavailable: %d %s", w.Code, w.Body)
	}
}
