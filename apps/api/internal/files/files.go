// Пакет files проверяет загружаемые файлы и работает с приватным хранилищем.
package files

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"net/http"
	"path"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

const MaxSize = 10 << 20
const MaxLogoSize = 2 << 20

// PurposeCandidateAvatar — аватар кандидата: только JPEG и PNG, лимит как у логотипа.
const PurposeCandidateAvatar = "candidate_avatar"
const PurposeCompanyTask = "company_task"
const PurposeTaskSolution = "task_solution"

var ErrSize = errors.New("размер файла превышает допустимый")
var ErrType = errors.New("допустимы PDF, JPEG и PNG; для логотипа и аватара — только JPEG и PNG")
var ErrTaskType = errors.New("для задания и решения допустимы PDF, JPEG, PNG, ZIP, TXT и Markdown")
var ErrInvalid = errors.New("файл пустой, повреждён или содержит неверные параметры")

type File struct {
	ID             string    `json:"id"`
	OwnerUserID    string    `json:"-"`
	Bucket         string    `json:"-"`
	ObjectKey      string    `json:"-"`
	Purpose        string    `json:"purpose"`
	OriginalName   string    `json:"original_name"`
	MediaType      string    `json:"media_type"`
	SizeBytes      int64     `json:"size_bytes"`
	ChecksumSHA256 string    `json:"checksum_sha256"`
	Status         string    `json:"status"`
	CreatedAt      time.Time `json:"created_at"`
}

type Objects interface {
	Put(context.Context, File, []byte) error
	Get(context.Context, File) (io.ReadCloser, error)
	Delete(context.Context, File) error
}

// Prepare не доверяет Content-Type браузера. SVG и HTML не принимаем.
func Prepare(name, purpose string, data []byte) (File, error) {
	taskFile := purpose == PurposeCompanyTask || purpose == PurposeTaskSolution
	if purpose != "company_document" && purpose != "company_logo" && purpose != PurposeCandidateAvatar && !taskFile {
		return File{}, ErrInvalid
	}
	imageOnly := purpose == "company_logo" || purpose == PurposeCandidateAvatar
	if len(data) > MaxSize || imageOnly && len(data) > MaxLogoSize {
		return File{}, ErrSize
	}
	if len(data) == 0 {
		return File{}, ErrInvalid
	}
	media := http.DetectContentType(data)
	switch media {
	case "image/jpeg", "image/png":
		cfg, _, err := image.DecodeConfig(bytes.NewReader(data))
		if err != nil || cfg.Width <= 0 || cfg.Height <= 0 || int64(cfg.Width)*int64(cfg.Height) > 4_000_000 {
			return File{}, ErrInvalid
		}
		if _, _, err := image.Decode(bytes.NewReader(data)); err != nil {
			return File{}, ErrInvalid
		}
	case "application/pdf":
		if imageOnly {
			return File{}, ErrType
		}
	case "application/zip":
		if !taskFile {
			return File{}, ErrType
		}
		// Архив сохраняем для скачивания; не распаковываем и не исполняем решения.
		archive, err := zip.NewReader(bytes.NewReader(data), int64(len(data)))
		if err != nil || len(archive.File) == 0 || len(archive.File) > 1000 {
			return File{}, ErrInvalid
		}
		var total uint64
		for _, entry := range archive.File {
			if entry.UncompressedSize64 > 100<<20 || total > (100<<20)-entry.UncompressedSize64 {
				return File{}, ErrInvalid
			}
			total += entry.UncompressedSize64
		}
	default:
		if taskFile {
			ext := strings.ToLower(path.Ext(name))
			if (ext == ".txt" || ext == ".md") && strings.HasPrefix(media, "text/plain") && utf8.Valid(data) && !bytes.ContainsRune(data, 0) {
				media = "text/plain; charset=utf-8"
				break
			}
			return File{}, ErrTaskType
		}
		return File{}, ErrType
	}
	name = path.Base(strings.ReplaceAll(name, "\\", "/"))
	name = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, name)
	name = strings.TrimSpace(name)
	if name == "" || name == "." || name == "/" || len([]rune(name)) > 255 {
		return File{}, ErrInvalid
	}
	hash := sha256.Sum256(data)
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return File{}, err
	}
	prefix := "companies/"
	if purpose == PurposeCandidateAvatar {
		prefix = "candidates/"
	}
	if taskFile {
		prefix = "tasks/"
	}
	return File{ObjectKey: prefix + hex.EncodeToString(key), Purpose: purpose, OriginalName: name, MediaType: media, SizeBytes: int64(len(data)), ChecksumSHA256: hex.EncodeToString(hash[:]), Status: "pending"}, nil
}
