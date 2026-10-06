// Пакет company отвечает за профиль компании и доступ её участников.
package company

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/mail"
	"net/url"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

var ErrNotFound = errors.New("компания или файл не найдены")
var ErrForbidden = errors.New("изменять компанию может только её владелец")
var ErrConflict = errors.New("компания с таким ИНН уже существует")
var ErrStorage = errors.New("хранилище файлов временно недоступно")

type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }
func invalid(message string) error       { return &ValidationError{message} }

type Company struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Description        *string   `json:"description"`
	INN                *string   `json:"inn"`
	ContactEmail       string    `json:"contact_email"`
	ContactURL         *string   `json:"contact_url"`
	LogoFileID         *string   `json:"logo_file_id"`
	VerificationStatus string    `json:"verification_status"`
	CreatedAt          time.Time `json:"created_at"`
	MemberRole         string    `json:"member_role"`
}

type Input struct {
	Name         string  `json:"name"`
	Description  *string `json:"description"`
	INN          *string `json:"inn"`
	ContactEmail string  `json:"contact_email"`
	ContactURL   *string `json:"contact_url"`
}

// В PATCH отсутствие поля сохраняет значение, null очищает необязательное поле.
type Patch map[string]json.RawMessage

func (p Patch) Apply(current Company) (Input, error) {
	in := Input{current.Name, current.Description, current.INN, current.ContactEmail, current.ContactURL}
	if len(p) == 0 {
		return in, invalid("Передайте хотя бы одно поле компании")
	}
	for field, raw := range p {
		var target any
		switch field {
		case "name":
			target = &in.Name
		case "description":
			target = &in.Description
		case "inn":
			target = &in.INN
		case "contact_email":
			target = &in.ContactEmail
		case "contact_url":
			target = &in.ContactURL
		default:
			return in, invalid("Неизвестное или недоступное для изменения поле: " + field)
		}
		if (field == "name" || field == "contact_email") && string(raw) == "null" {
			return in, invalid("Поле " + field + " нельзя очистить")
		}
		if json.Unmarshal(raw, target) != nil {
			return in, invalid("Некорректное значение поля " + field)
		}
	}
	return in, in.Normalize()
}

func (in *Input) Normalize() error {
	in.Name = strings.TrimSpace(in.Name)
	in.ContactEmail = strings.TrimSpace(in.ContactEmail)
	if n := utf8.RuneCountInString(in.Name); n < 1 || n > 200 {
		return invalid("Название должно содержать от 1 до 200 символов")
	}
	addr, err := mail.ParseAddress(in.ContactEmail)
	if err != nil || addr.Address != in.ContactEmail || len(in.ContactEmail) > 254 {
		return invalid("Укажите корректный контактный email")
	}
	for _, ptr := range []**string{&in.Description, &in.INN, &in.ContactURL} {
		if *ptr != nil {
			s := strings.TrimSpace(**ptr)
			if s == "" {
				*ptr = nil
			} else {
				*ptr = &s
			}
		}
	}
	values := []string{in.Name, in.ContactEmail}
	for _, value := range []*string{in.Description, in.INN, in.ContactURL} {
		if value != nil {
			values = append(values, *value)
		}
	}
	for _, value := range values {
		if strings.ContainsRune(value, 0) {
			return invalid("Поля компании не должны содержать нулевой символ")
		}
	}
	if in.Description != nil && utf8.RuneCountInString(*in.Description) > 10000 {
		return invalid("Описание не должно превышать 10000 символов")
	}
	if in.INN != nil && !validINN(*in.INN) {
		return invalid("ИНН должен содержать 10 или 12 цифр с корректной контрольной суммой")
	}
	if in.ContactURL != nil {
		u, err := url.Parse(*in.ContactURL)
		if err != nil || u.Hostname() == "" || u.User != nil || (u.Scheme != "https" && u.Scheme != "http") || len(*in.ContactURL) > 2048 {
			return invalid("Укажите ссылку с протоколом http или https")
		}
	}
	return nil
}
func validINN(s string) bool {
	if len(s) != 10 && len(s) != 12 {
		return false
	}
	nonzero := false
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
		nonzero = nonzero || c != '0'
	}
	if !nonzero {
		return false
	}
	check := func(weights []int, pos int) bool {
		sum := 0
		for i, w := range weights {
			sum += w * int(s[i]-'0')
		}
		return sum%11%10 == int(s[pos]-'0')
	}
	if len(s) == 10 {
		return check([]int{2, 4, 10, 3, 5, 9, 4, 6, 8}, 9)
	}
	return check([]int{7, 2, 4, 10, 3, 5, 9, 4, 6, 8}, 10) && check([]int{3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8}, 11)
}

type Store interface {
	Create(context.Context, string, Input) (Company, error)
	List(context.Context, string, int, int) ([]Company, error)
	Get(context.Context, string, string) (Company, error)
	Update(context.Context, string, string, Patch) (Company, error)
	ReserveFile(context.Context, string, string, files.File) (files.File, error)
	CompleteFile(context.Context, string, string, string) (files.File, error)
	File(context.Context, string, string, string) (files.File, error)
	ListFiles(context.Context, string, string, int, int) ([]files.File, error)
	MarkDeleting(context.Context, string, string, string) (files.File, error)
	FinishDelete(context.Context, string) error
}

type Service struct {
	store   Store
	objects files.Objects
	bucket  string
	log     *slog.Logger
}

func NewService(store Store, objects files.Objects, bucket string, log *slog.Logger) *Service {
	return &Service{store, objects, bucket, log}
}
func (s *Service) Create(ctx context.Context, user string, in Input) (Company, error) {
	if err := in.Normalize(); err != nil {
		return Company{}, err
	}
	return s.store.Create(ctx, user, in)
}
func (s *Service) Get(ctx context.Context, user, id string) (Company, error) {
	return s.store.Get(ctx, user, id)
}
func (s *Service) List(ctx context.Context, user string, limit, offset int) ([]Company, error) {
	return s.store.List(ctx, user, limit, offset)
}
func (s *Service) Update(ctx context.Context, user, id string, patch Patch) (Company, error) {
	return s.store.Update(ctx, user, id, patch)
}
func (s *Service) ListFiles(ctx context.Context, user, id string, limit, offset int) ([]files.File, error) {
	return s.store.ListFiles(ctx, user, id, limit, offset)
}

func (s *Service) Upload(ctx context.Context, user, id, name, purpose string, data []byte) (files.File, error) {
	f, err := files.Prepare(name, purpose, data)
	if err != nil {
		return f, err
	}
	f.Bucket = s.bucket
	f.OwnerUserID = user
	f, err = s.store.ReserveFile(ctx, user, id, f)
	if err != nil {
		return f, err
	}
	if err = s.objects.Put(ctx, f, data); err == nil {
		var ready files.File
		ready, err = s.store.CompleteFile(ctx, user, id, f.ID)
		if err == nil {
			return ready, nil
		}
	} else {
		err = fmt.Errorf("%w: %v", ErrStorage, err)
	}
	// У запроса уже мог истечь контекст. Незавершённый файл всё равно пробуем удалить.
	cleanup, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if cleanupErr := s.Delete(cleanup, user, id, f.ID); cleanupErr != nil {
		s.log.Error("Не удалось убрать незавершённую загрузку; файл можно удалить повторно", "file_id", f.ID, "error", cleanupErr)
	}
	return files.File{}, err
}
func (s *Service) Download(ctx context.Context, user, id, fileID string) (files.File, io.ReadCloser, error) {
	f, err := s.store.File(ctx, user, id, fileID)
	if err != nil {
		return f, nil, err
	}
	if f.Status != "ready" {
		return f, nil, ErrNotFound
	}
	body, err := s.objects.Get(ctx, f)
	if err != nil {
		return f, nil, fmt.Errorf("%w: %v", ErrStorage, err)
	}
	return f, body, nil
}
func (s *Service) Delete(ctx context.Context, user, id, fileID string) error {
	f, err := s.store.MarkDeleting(ctx, user, id, fileID)
	if err != nil {
		return err
	}
	// Повторный DELETE также убирает объект: загрузка могла закончиться уже после первого удаления.
	if f.Status == "deleted" {
		if err := s.objects.Delete(ctx, f); err != nil {
			return fmt.Errorf("%w: %v", ErrStorage, err)
		}
		return nil
	}
	if err = s.objects.Delete(ctx, f); err != nil {
		return fmt.Errorf("%w: %v", ErrStorage, err)
	}
	return s.store.FinishDelete(ctx, f.ID)
}
