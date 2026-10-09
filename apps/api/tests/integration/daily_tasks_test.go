//go:build integration

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/dailytask/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

type taskObjects struct {
	mu       sync.Mutex
	data     map[string][]byte
	fail     bool
	afterPut func()
}

func (o *taskObjects) Put(_ context.Context, f files.File, data []byte) error {
	o.mu.Lock()
	o.data[f.ObjectKey] = append([]byte(nil), data...)
	fail, after := o.fail, o.afterPut
	o.mu.Unlock()
	if after != nil {
		after()
	}
	if fail {
		return errors.New("S3 failed after upload")
	}
	return nil
}
func (o *taskObjects) Get(_ context.Context, f files.File) (io.ReadCloser, error) {
	o.mu.Lock()
	defer o.mu.Unlock()
	data, ok := o.data[f.ObjectKey]
	if !ok {
		return nil, errors.New("missing object")
	}
	return io.NopCloser(bytes.NewReader(data)), nil
}
func (o *taskObjects) Delete(_ context.Context, f files.File) error {
	o.mu.Lock()
	defer o.mu.Unlock()
	delete(o.data, f.ObjectKey)
	return nil
}
func (o *taskObjects) count() int { o.mu.Lock(); defer o.mu.Unlock(); return len(o.data) }

type taskFixture struct {
	*offerFixture
	objects *taskObjects
	tasks   *service.Service
}

func newTaskFixture(t *testing.T) *taskFixture {
	t.Helper()
	f := newOfferFixture(t)
	objects := &taskObjects{data: map[string][]byte{}}
	tasks := service.New(repository.New(f.db), objects, "tasks-test", slog.New(slog.NewTextHandler(io.Discard, nil)))
	users := f.auth.Store.Users
	f.auth = testutil.NewAuthEnvWithOptions(t, httpapi.Options{DailyTasks: tasks})
	f.auth.Store.Users = users
	for name := range f.ids {
		f.tokens[name] = f.auth.Token(t, name)
	}
	for _, who := range []string{"candidate", "other_candidate"} {
		grantConsentRows(t, f.db, f.ids[who], "processing", "publication")
	}
	return &taskFixture{f, objects, tasks}
}
func (f *taskFixture) taskBase() string { return "/api/v1/companies/" + f.company + "/tasks" }
func (f *taskFixture) multipart(t *testing.T, path, who, name string, data []byte, fields map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	for k, v := range fields {
		if err := form.WriteField(k, v); err != nil {
			t.Fatal(err)
		}
	}
	file, err := form.CreateFormFile("file", name)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = file.Write(data); err != nil {
		t.Fatal(err)
	}
	if err = form.Close(); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest("POST", path, &body)
	req.Header.Set("Content-Type", form.FormDataContentType())
	if who != "" {
		req.Header.Set("Authorization", "Bearer "+f.tokens[who])
	}
	w := httptest.NewRecorder()
	f.auth.Router.ServeHTTP(w, req)
	return w
}
func (f *taskFixture) upload(t *testing.T, path, who string, fields map[string]string, status int) *httptest.ResponseRecorder {
	t.Helper()
	w := f.multipart(t, path, who, "решение.md", []byte("Решение задачи на Go"), fields)
	if w.Code != status {
		t.Fatalf("POST %s (%s): %d %s; ожидали %d", path, who, w.Code, w.Body, status)
	}
	return w
}
func (f *taskFixture) publish(t *testing.T) entity.Task {
	t.Helper()
	w := f.upload(t, f.taskBase(), "recruiter", map[string]string{"title": "Задача Go", "description": "Реализовать API", "specialization_id": "1", "grade_id": "1"}, 201)
	var task entity.Task
	if err := json.Unmarshal(w.Body.Bytes(), &task); err != nil {
		t.Fatal(err)
	}
	return task
}
func (f *taskFixture) submit(t *testing.T, task entity.Task, who string) entity.Submission {
	t.Helper()
	w := f.upload(t, "/api/v1/tasks/"+task.ID+"/submissions", who, nil, 201)
	var s entity.Submission
	if err := json.Unmarshal(w.Body.Bytes(), &s); err != nil {
		t.Fatal(err)
	}
	return s
}
func taskTotal(t *testing.T, w *httptest.ResponseRecorder, want int64) {
	t.Helper()
	var page struct{ Total int64 }
	if err := json.Unmarshal(w.Body.Bytes(), &page); err != nil {
		t.Fatal(err)
	}
	if page.Total != want {
		t.Fatalf("total %d, ожидали %d: %s", page.Total, want, w.Body)
	}
}
func (f *taskFixture) counts(t *testing.T, tasks, submissions, objects int) {
	t.Helper()
	var tc, sc, fc int
	if err := f.db.QueryRow(context.Background(), `SELECT (SELECT count(*) FROM company_daily_tasks),(SELECT count(*) FROM company_task_submissions),(SELECT count(*) FROM files)`).Scan(&tc, &sc, &fc); err != nil {
		t.Fatal(err)
	}
	if tc != tasks || sc != submissions || fc != tasks+submissions || f.objects.count() != objects {
		t.Fatalf("tasks=%d submissions=%d files=%d objects=%d", tc, sc, fc, f.objects.count())
	}
}

func TestDailyTasksWorkflowAndAccess(t *testing.T) {
	f := newTaskFixture(t)
	base := f.taskBase()
	fields := map[string]string{"title": "Задача"}
	f.upload(t, base, "", fields, 401)
	f.upload(t, base, "candidate", fields, 403)
	f.upload(t, base, "viewer", fields, 403)
	f.upload(t, base, "outsider", fields, 404)
	task := f.publish(t)
	taskPath := base + "/" + task.ID
	publicPath := "/api/v1/tasks/" + task.ID
	f.upload(t, base, "owner", fields, 409)
	other := f.upload(t, "/api/v1/companies/"+f.otherCompany+"/tasks", "outsider", fields, 201)
	if !strings.Contains(other.Body.String(), f.otherCompany) {
		t.Fatal("Потеряна компания")
	}
	for _, who := range []string{"owner", "recruiter", "viewer"} {
		f.request(t, "GET", taskPath, who, "", 200)
		f.request(t, "GET", taskPath+"/file", who, "", 200)
	}
	f.request(t, "GET", taskPath, "outsider", "", 404)
	f.request(t, "GET", "/api/v1/companies/"+f.otherCompany+"/tasks/"+task.ID, "outsider", "", 404)
	f.request(t, "GET", publicPath, "owner", "", 403)
	for _, who := range []string{"candidate", "other_candidate", "no_profile"} {
		f.request(t, "GET", publicPath, who, "", 200)
		f.request(t, "GET", publicPath+"/file", who, "", 200)
	}
	f.upload(t, publicPath+"/submissions", "no_profile", nil, 404)
	s := f.submit(t, task, "candidate")
	f.upload(t, publicPath+"/submissions", "candidate", nil, 409)
	companySolution := taskPath + "/submissions/" + s.ID
	mine := "/api/v1/me/task-submissions/" + s.ID
	for _, who := range []string{"owner", "recruiter", "viewer"} {
		w := f.request(t, "GET", companySolution, who, "", 200)
		for _, secret := range []string{"candidate@example.test", `"phone"`, `"object_key"`, `"bucket"`, f.ids["candidate"]} {
			if strings.Contains(w.Body.String(), secret) {
				t.Fatalf("Раскрыты личные данные или ключ S3: %s", w.Body)
			}
		}
		file := f.request(t, "GET", companySolution+"/file", who, "", 200)
		if !strings.HasPrefix(file.Header().Get("Content-Disposition"), "attachment") || file.Header().Get("X-Content-Type-Options") != "nosniff" || file.Body.String() != "Решение задачи на Go" {
			t.Fatal("Неверное скачивание решения")
		}
	}
	f.request(t, "GET", mine, "candidate", "", 200)
	f.request(t, "GET", mine+"/file", "candidate", "", 200)
	f.request(t, "GET", mine, "other_candidate", "", 404)
	f.request(t, "GET", mine+"/file", "other_candidate", "", 404)
	taskTotal(t, f.request(t, "GET", "/api/v1/me/task-submissions", "other_candidate", "", 200), 0)
	f.request(t, "GET", companySolution, "outsider", "", 404)
	f.request(t, "GET", "/api/v1/companies/"+f.otherCompany+"/tasks/"+task.ID+"/submissions/"+s.ID, "outsider", "", 404)
	f.request(t, "PATCH", companySolution+"/review", "viewer", `{"score":80}`, 403)
	for _, body := range []string{`{}`, `{"score":101}`, `{"score":-1}`, `{"score":50,"candidate_id":"fake"}`, `{"feedback":"  "}`} {
		f.request(t, "PATCH", companySolution+"/review", "owner", body, 400)
	}
	f.request(t, "PATCH", companySolution+"/review", "recruiter", `{"score":85,"feedback":"Хорошая работа"}`, 200)
	w := f.request(t, "GET", mine, "candidate", "", 200)
	var reviewed entity.Submission
	if err := json.Unmarshal(w.Body.Bytes(), &reviewed); err != nil || reviewed.Score == nil || *reviewed.Score != 85 || reviewed.ReviewedAt == nil || reviewed.ReviewedAt.Before(reviewed.SubmittedAt) {
		t.Fatalf("Оценка не дошла: %s %v", w.Body, err)
	}
	// Закрытие не освобождает квоту дня; просмотр не закрывает задание.
	f.request(t, "POST", taskPath+"/close", "viewer", "", 403)
	f.request(t, "POST", taskPath+"/close", "owner", "", 200)
	f.request(t, "POST", taskPath+"/close", "owner", "", 200)
	f.upload(t, publicPath+"/submissions", "other_candidate", nil, 409)
	f.upload(t, base, "owner", fields, 409)
	f.request(t, "GET", publicPath+"/file", "candidate", "", 200)
	f.counts(t, 2, 1, 3)
	// Проверяем SQL-права независимо от тестовой JWT-идентичности.
	f.exec(t, `UPDATE company_members SET status='inactive' WHERE company_id=$1 AND user_id=$2`, f.company, f.ids["recruiter"])
	f.request(t, "GET", companySolution, "recruiter", "", 404)
	f.exec(t, `UPDATE candidate_consents SET revoked_at=now() WHERE user_id=$1 AND kind='publication'`, f.ids["candidate"])
	taskTotal(t, f.request(t, "GET", taskPath+"/submissions", "owner", "", 200), 0)
	f.request(t, "GET", companySolution, "owner", "", 404)
	f.request(t, "GET", companySolution+"/file", "owner", "", 404)
	f.request(t, "GET", mine, "candidate", "", 200)
	f.exec(t, `UPDATE users SET status='blocked' WHERE id=$1`, f.ids["candidate"])
	f.request(t, "GET", publicPath, "candidate", "", 404)
	f.request(t, "GET", mine, "candidate", "", 404)
}

func TestDailyTasksFiltersValidationAndDeadline(t *testing.T) {
	f := newTaskFixture(t)
	base := f.taskBase()
	for _, fields := range []map[string]string{
		{}, {"title": " "}, {"title": strings.Repeat("я", 201)}, {"title": "Задача", "company_id": f.otherCompany},
		{"title": "Задача", "specialization_id": "32767"}, {"title": "Задача", "grade_id": "0"},
		{"title": "Задача", "deadline_at": "2020-01-01T00:00:00Z"}, {"title": "Задача", "deadline_at": "bad"},
	} {
		f.upload(t, base, "owner", fields, 400)
	}
	for _, file := range []struct {
		name   string
		data   []byte
		status int
	}{{"x.md", nil, 400}, {"x.html", []byte("<html>bad</html>"), 415}, {"x.txt", bytes.Repeat([]byte("a"), files.MaxSize+1), 413}} {
		w := f.multipart(t, base, "owner", file.name, file.data, map[string]string{"title": "Задача"})
		if w.Code != file.status {
			t.Fatalf("Файл: %d %s", w.Code, w.Body)
		}
	}
	f.counts(t, 0, 0, 0)
	task := f.publish(t)
	f.submit(t, task, "candidate")
	f.upload(t, "/api/v1/companies/"+f.otherCompany+"/tasks", "outsider", map[string]string{"title": "Python"}, 201)
	for _, item := range []struct {
		query string
		count int64
	}{
		{"", 2}, {"?company_id=" + f.company, 1}, {"?specialization_id=1&grade_id=1", 1}, {"?q=go", 1}, {"?q=%25", 0}, {"?submitted=true", 1}, {"?submitted=false", 1}, {"?status=closed", 0}, {"?published_from=" + task.PublishedOn + "&published_to=" + task.PublishedOn, 2},
	} {
		taskTotal(t, f.request(t, "GET", "/api/v1/tasks"+item.query, "candidate", "", 200), item.count)
	}
	for _, query := range []string{"?unknown=1", "?company_id=wrong", "?status=reviewed", "?limit=0", "?limit=1&limit=2", "?grade_id=hi", "?submitted=yes", "?published_from=bad", "?published_from=2026-10-10&published_to=2026-10-09"} {
		f.request(t, "GET", "/api/v1/tasks"+query, "candidate", "", 400)
	}
	f.request(t, "GET", "/api/v1/tasks/bad", "candidate", "", 400)
	f.request(t, "GET", "/api/v1/me/task-submissions?candidate_id="+f.profiles["other_candidate"], "candidate", "", 400)
	taskTotal(t, f.request(t, "GET", "/api/v1/me/task-submissions?status=submitted&company_id="+f.company+"&task_id="+task.ID, "candidate", "", 200), 1)
	// На следующую дату можно публиковать снова; истёкший deadline закрывает приём без cron.
	f.exec(t, `UPDATE company_daily_tasks SET published_at=published_at-interval '2 days',deadline_at=now()-interval '1 day' WHERE id=$1`, task.ID)
	f.upload(t, "/api/v1/tasks/"+task.ID+"/submissions", "other_candidate", nil, 409)
	taskTotal(t, f.request(t, "GET", "/api/v1/tasks?status=closed", "candidate", "", 200), 1)
	f.publish(t)
	// Согласия требуются для нового ответа; поиск open не обязателен для добровольного участия.
	f.exec(t, `UPDATE candidate_consents SET revoked_at=now() WHERE user_id=$1 AND kind='processing'`, f.ids["other_candidate"])
	latest := f.request(t, "GET", base, "owner", "", 200)
	var page entity.TaskPage
	if err := json.Unmarshal(latest.Body.Bytes(), &page); err != nil {
		t.Fatal(err)
	}
	f.upload(t, "/api/v1/tasks/"+page.Items[0].ID+"/submissions", "other_candidate", nil, 403)
	f.exec(t, `UPDATE candidate_profiles SET search_status='hidden' WHERE id=$1`, f.profiles["candidate"])
	f.submit(t, page.Items[0], "candidate")
}

func TestDailyTasksUploadFailureAndRecheck(t *testing.T) {
	f := newTaskFixture(t)
	f.objects.fail = true
	f.upload(t, f.taskBase(), "owner", map[string]string{"title": "Ошибка хранилища"}, 503)
	f.counts(t, 0, 0, 0)
	f.objects.fail = false
	f.objects.afterPut = func() {
		f.exec(t, `UPDATE company_members SET status='inactive' WHERE company_id=$1 AND user_id=$2`, f.company, f.ids["recruiter"])
	}
	f.upload(t, f.taskBase(), "recruiter", map[string]string{"title": "Права отозваны во время загрузки"}, 404)
	f.counts(t, 0, 0, 0)
	f.objects.afterPut = nil
	task := f.upload(t, f.taskBase(), "owner", map[string]string{"title": "Задача после сбоя"}, 201)
	var published entity.Task
	if err := json.Unmarshal(task.Body.Bytes(), &published); err != nil {
		t.Fatal(err)
	}
	f.objects.afterPut = func() {
		f.exec(t, `UPDATE candidate_consents SET revoked_at=now() WHERE user_id=$1 AND kind='publication'`, f.ids["candidate"])
	}
	f.upload(t, "/api/v1/tasks/"+published.ID+"/submissions", "candidate", nil, 403)
	f.counts(t, 1, 0, 1)
	f.objects.afterPut = func() { f.exec(t, `UPDATE company_daily_tasks SET status='closed' WHERE id=$1`, published.ID) }
	f.upload(t, "/api/v1/tasks/"+published.ID+"/submissions", "other_candidate", nil, 409)
	f.counts(t, 1, 0, 1)
}

func TestDailyTasksConcurrentLimits(t *testing.T) {
	f := newTaskFixture(t)
	// Блокируем обе загрузки после preflight, проверяя повторные ограничения в БД.
	var wait sync.WaitGroup
	wait.Add(2)
	f.objects.afterPut = func() { wait.Done(); wait.Wait() }
	results := make(chan error, 2)
	start := make(chan struct{})
	for _, who := range []string{"owner", "recruiter"} {
		go func(who string) {
			<-start
			_, err := f.tasks.UploadTask(context.Background(), f.ids[who], f.company, entity.Input{Title: "Конкурентная публикация"}, "task.txt", []byte("Задание"))
			results <- err
		}(who)
	}
	close(start)
	ok, conflict := 0, 0
	for range 2 {
		err := <-results
		if err == nil {
			ok++
		} else if errors.Is(err, entity.ErrDailyLimit) {
			conflict++
		} else {
			t.Fatal(err)
		}
	}
	if ok != 1 || conflict != 1 {
		t.Fatalf("publication success=%d conflicts=%d", ok, conflict)
	}
	f.counts(t, 1, 0, 1)
	f.objects.afterPut = nil
	var task string
	if err := f.db.QueryRow(context.Background(), `SELECT id::text FROM company_daily_tasks`).Scan(&task); err != nil {
		t.Fatal(err)
	}
	wait.Add(2)
	f.objects.afterPut = func() { wait.Done(); wait.Wait() }
	for range 2 {
		go func() {
			_, err := f.tasks.UploadSolution(context.Background(), f.ids["candidate"], task, "solution.txt", []byte("Ответ"))
			results <- err
		}()
	}
	ok, conflict = 0, 0
	for range 2 {
		err := <-results
		if err == nil {
			ok++
		} else if errors.Is(err, entity.ErrAlreadySubmitted) {
			conflict++
		} else {
			t.Fatal(err)
		}
	}
	if ok != 1 || conflict != 1 {
		t.Fatalf("submission success=%d conflicts=%d", ok, conflict)
	}
	f.counts(t, 1, 1, 2)
}

func TestDailyTasksMoscowCalendarAndScoreSort(t *testing.T) {
	f := newTaskFixture(t)
	task := f.publish(t)
	// Дата хранится как дата публикации в МСК: 21:30 UTC уже следующий день.
	f.exec(t, `UPDATE company_daily_tasks SET published_at='2026-10-08T21:30:00Z' WHERE id=$1`, task.ID)
	var date string
	if err := f.db.QueryRow(context.Background(), `SELECT published_on::text FROM company_daily_tasks WHERE id=$1`, task.ID).Scan(&date); err != nil || date != "2026-10-09" {
		t.Fatalf("Московская дата: %s %v", date, err)
	}
	// Не привязываем тест квоты к текущему дню; проверка выше касается границы суток.
	f.exec(t, `UPDATE company_daily_tasks SET published_at=now() WHERE id=$1`, task.ID)
	a := f.submit(t, task, "candidate")
	b := f.submit(t, task, "other_candidate")
	path := f.taskBase() + "/" + task.ID + "/submissions"
	f.request(t, "PATCH", path+"/"+a.ID+"/review", "owner", `{"score":90}`, 200)
	f.request(t, "PATCH", path+"/"+b.ID+"/review", "owner", `{"score":0}`, 200)
	w := f.request(t, "GET", path+"?status=reviewed&sort=score", "viewer", "", 200)
	var page entity.SubmissionPage
	if err := json.Unmarshal(w.Body.Bytes(), &page); err != nil || len(page.Items) != 2 || page.Items[0].ID != a.ID {
		t.Fatalf("Сортировка: %s %v", w.Body, err)
	}
	taskTotal(t, f.request(t, "GET", path+"?candidate_id="+f.profiles["candidate"], "owner", "", 200), 1)
}

func TestDailyTasksMultipartLimits(t *testing.T) {
	f := newTaskFixture(t)
	for _, duplicate := range []string{"title", "file"} {
		var body bytes.Buffer
		form := multipart.NewWriter(&body)
		if err := form.WriteField("title", "Задача"); err != nil {
			t.Fatal(err)
		}
		if duplicate == "title" {
			if err := form.WriteField("title", "Подмена"); err != nil {
				t.Fatal(err)
			}
		}
		n := 1
		if duplicate == "file" {
			n = 2
		}
		for range n {
			file, err := form.CreateFormFile("file", "task.txt")
			if err != nil {
				t.Fatal(err)
			}
			if _, err = file.Write([]byte("Задание")); err != nil {
				t.Fatal(err)
			}
		}
		if err := form.Close(); err != nil {
			t.Fatal(err)
		}
		req := httptest.NewRequest("POST", f.taskBase(), &body)
		req.Header.Set("Content-Type", form.FormDataContentType())
		req.Header.Set("Authorization", "Bearer "+f.tokens["owner"])
		w := httptest.NewRecorder()
		f.auth.Router.ServeHTTP(w, req)
		if w.Code != 400 {
			t.Fatalf("Повторное поле принято: %d %s", w.Code, w.Body)
		}
	}
	// Файл больше общего JSON-лимита 2 МиБ должен пройти оба новых upload-маршрута.
	large := bytes.Repeat([]byte("a"), 3<<20)
	w := f.multipart(t, f.taskBase(), "owner", "task.txt", large, map[string]string{"title": "Объёмное задание"})
	if w.Code != 201 {
		t.Fatalf("3 МиБ: %d %s", w.Code, w.Body)
	}
	var task entity.Task
	if err := json.Unmarshal(w.Body.Bytes(), &task); err != nil {
		t.Fatal(err)
	}
	path := "/api/v1/tasks/" + task.ID + "/submissions"
	f.upload(t, path, "candidate", map[string]string{"candidate_id": f.profiles["other_candidate"]}, 400)
	w = f.multipart(t, path, "candidate", "solution.txt", large, nil)
	if w.Code != 201 {
		t.Fatalf("Решение 3 МиБ: %d %s", w.Code, w.Body)
	}
	var s entity.Submission
	if err := json.Unmarshal(w.Body.Bytes(), &s); err != nil {
		t.Fatal(err)
	}
	detail := f.request(t, "GET", "/api/v1/tasks/"+task.ID, "candidate", "", 200)
	var current entity.Task
	if err := json.Unmarshal(detail.Body.Bytes(), &current); err != nil || current.MySubmission == nil || current.MySubmission.ID != s.ID {
		t.Fatalf("my_submission: %s %v", detail.Body, err)
	}
	f.counts(t, 1, 1, 2)
}
