// Package service реализует публикацию заданий и приём файлов решений.
package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"time"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

var ErrStorage = errors.New("Хранилище файлов временно недоступно")

type Store interface {
	CanCreate(context.Context, string, string, entity.Input) error
	Create(context.Context, string, string, entity.Input, files.File) (entity.Task, error)
	List(context.Context, string, string, entity.Filter) (entity.TaskPage, error)
	Get(context.Context, string, string, string) (entity.Task, error)
	Close(context.Context, string, string, string) (entity.Task, error)
	TaskFile(context.Context, string, string, string) (files.File, error)
	CanSubmit(context.Context, string, string) error
	Submit(context.Context, string, string, files.File) (entity.Submission, error)
	ListSubmissions(context.Context, string, string, string, entity.Filter) (entity.SubmissionPage, error)
	GetSubmission(context.Context, string, string, string, string) (entity.Submission, error)
	Review(context.Context, string, string, string, string, entity.ReviewInput) (entity.Submission, error)
	SubmissionFile(context.Context, string, string, string, string) (files.File, error)
	FileExists(context.Context, files.File) (bool, error)
}

type Service struct {
	Store
	objects files.Objects
	bucket  string
	log     *slog.Logger
}

func New(store Store, objects files.Objects, bucket string, log *slog.Logger) *Service {
	return &Service{store, objects, bucket, log}
}

func (s *Service) cleanup(file files.File, check bool) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if check {
		exists, err := s.FileExists(ctx, file)
		if err != nil {
			s.log.Error("Не удалось проверить сохранение файла задания", "error", err)
			return
		}
		if exists {
			return
		}
	}
	if err := s.objects.Delete(ctx, file); err != nil {
		s.log.Error("Не удалось удалить файл неуспешной загрузки задания", "error", err)
	}
}

func (s *Service) UploadTask(ctx context.Context, user, company string, in entity.Input, name string, data []byte) (entity.Task, error) {
	var result entity.Task
	if err := in.Validate(time.Now()); err != nil {
		return result, err
	}
	file, err := files.Prepare(name, files.PurposeCompanyTask, data)
	if err != nil {
		return result, err
	}
	file.Bucket, file.OwnerUserID = s.bucket, user
	if err = s.CanCreate(ctx, user, company, in); err != nil {
		return result, err
	}
	if err = s.objects.Put(ctx, file, data); err != nil {
		s.cleanup(file, false)
		s.log.Error("Не удалось загрузить файл задания", "error", err)
		return result, ErrStorage
	}
	result, err = s.Create(ctx, user, company, in, file)
	if err != nil {
		s.cleanup(file, true)
	}
	return result, err
}

func (s *Service) UploadSolution(ctx context.Context, user, task, name string, data []byte) (entity.Submission, error) {
	var result entity.Submission
	file, err := files.Prepare(name, files.PurposeTaskSolution, data)
	if err != nil {
		return result, err
	}
	file.Bucket, file.OwnerUserID = s.bucket, user
	if err = s.CanSubmit(ctx, user, task); err != nil {
		return result, err
	}
	if err = s.objects.Put(ctx, file, data); err != nil {
		s.cleanup(file, false)
		s.log.Error("Не удалось загрузить файл решения", "error", err)
		return result, ErrStorage
	}
	result, err = s.Submit(ctx, user, task, file)
	if err != nil {
		s.cleanup(file, true)
	}
	return result, err
}

func (s *Service) Review(ctx context.Context, user, company, task, id string, in entity.ReviewInput) (entity.Submission, error) {
	if err := in.Validate(); err != nil {
		return entity.Submission{}, err
	}
	return s.Store.Review(ctx, user, company, task, id, in)
}

func (s *Service) DownloadTask(ctx context.Context, user, company, task string) (files.File, io.ReadCloser, error) {
	file, err := s.TaskFile(ctx, user, company, task)
	if err != nil {
		return file, nil, err
	}
	body, err := s.objects.Get(ctx, file)
	if err != nil {
		s.log.Error("Не удалось прочитать файл задания", "error", err)
		return file, nil, ErrStorage
	}
	return file, body, nil
}
func (s *Service) DownloadSolution(ctx context.Context, user, company, task, id string) (files.File, io.ReadCloser, error) {
	file, err := s.SubmissionFile(ctx, user, company, task, id)
	if err != nil {
		return file, nil, err
	}
	body, err := s.objects.Get(ctx, file)
	if err != nil {
		s.log.Error("Не удалось прочитать файл решения", "error", err)
		return file, nil, ErrStorage
	}
	return file, body, nil
}
