//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	adminentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/entity"
	adminrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/repository"
	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
	assessmentservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

func TestAssessmentRoutes(t *testing.T) {
	db := testDB(t)
	clearDemoBank(t, db)
	ctx := context.Background()
	admins := adminservice.New(adminrepo.New(db))
	const password = "Assessments-Admin-Password-2026"
	if err := admins.Bootstrap(ctx, "root@example.test", password); err != nil {
		t.Fatal(err)
	}
	login, err := admins.Login(ctx, adminentity.Credentials{Email: "root@example.test", Password: password}, "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	env := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Admins: admins, Assessments: assessmentservice.New(assessmentrepo.New(db))})
	token := login.AccessToken
	const base = "/api/v1/admin/assessments"
	call := func(method, path, who, body string, status int) string {
		t.Helper()
		w := env.Do(t, method, path, who, body)
		if w.Code != status {
			t.Fatalf("%s %s: %d %s, ожидали %d", method, path, w.Code, w.Body, status)
		}
		if w.Header().Get("Cache-Control") != "no-store" {
			t.Fatalf("%s %s: админский ответ можно кешировать", method, path)
		}
		return w.Body.String()
	}
	code := func(raw string) string {
		var e struct{ Error struct{ Code string } }
		_ = json.Unmarshal([]byte(raw), &e)
		return e.Error.Code
	}
	const uuid = "22222222-2222-4222-8222-222222222222"

	// Доступ: без сессии и с обычным токеном пользователя все методы закрыты.
	for _, route := range [][2]string{
		{"GET", "/questions"}, {"POST", "/questions"}, {"GET", "/questions/" + uuid}, {"POST", "/questions/" + uuid + "/versions"},
		{"POST", "/questions/" + uuid + "/versions/1/publish"}, {"POST", "/questions/" + uuid + "/archive"},
		{"GET", "/templates"}, {"POST", "/templates"}, {"GET", "/templates/" + uuid}, {"POST", "/templates/" + uuid + "/publish"}, {"POST", "/templates/" + uuid + "/archive"},
	} {
		call(route[0], base+route[1], "", `{}`, 401)
		call(route[0], base+route[1], env.Token(t, "site-user"), `{}`, 401)
	}

	question := func(difficulty int) string {
		return `{"skill_id":"` + goSkill + `","difficulty":` + string(rune('0'+difficulty)) + `,"kind":"short_answer","prompt":{"text":"Какая команда показывает статус?"},"grading_spec":{"type":"text","accepted":["git status"]}}`
	}
	var q struct {
		ID       string
		Versions []struct {
			Version int
			Status  string
		}
	}
	raw := call("POST", base+"/questions", token, question(1), 201)
	if err = json.Unmarshal([]byte(raw), &q); err != nil || q.ID == "" || len(q.Versions) != 1 || q.Versions[0].Status != "draft" {
		t.Fatalf("созданное задание: %s %v", raw, err)
	}
	if got := call("GET", base+"/questions/"+q.ID, token, "", 200); !strings.Contains(got, `"accepted":["git status"]`) {
		t.Fatalf("админ видит правила проверки: %s", got)
	}
	if got := call("GET", base+"/questions?skill_id="+goSkill+"&difficulty=1&kind=short_answer&limit=5", token, "", 200); !strings.Contains(got, q.ID) || !strings.Contains(got, `"total":1`) {
		t.Fatalf("список: %s", got)
	}
	call("GET", base+"/questions?difficulty=9", token, "", 400)
	call("GET", base+"/questions?active=maybe", token, "", 400)
	call("GET", base+"/questions?difficulty=abc", token, "", 400)
	call("POST", base+"/questions/"+q.ID+"/versions", token, `{"prompt":{"text":"Уточнённый вопрос"},"grading_spec":{"type":"text","accepted":["git status"]}}`, 201)
	call("POST", base+"/questions/"+q.ID+"/versions", token, `{"prompt":{"text":"Вопрос"},"grading_spec":{"type":"choice","correct":["a"]}}`, 400)
	call("POST", base+"/questions/"+q.ID+"/versions/1/publish", token, "", 200)
	if code(call("POST", base+"/questions/"+q.ID+"/versions/1/publish", token, "", 409)) != "assessment_conflict" {
		t.Fatal("повторная публикация должна давать assessment_conflict")
	}
	call("POST", base+"/questions/"+q.ID+"/versions/0/publish", token, "", 400)
	call("POST", base+"/questions/"+q.ID+"/versions/abc/publish", token, "", 400)
	call("POST", base+"/questions/"+q.ID+"/versions/99/publish", token, "", 404)

	// Некорректные тела.
	for name, body := range map[string]string{
		"битый JSON": `{`,
		"вложенное неизвестное поле": `{"skill_id":"` + goSkill + `","difficulty":1,"kind":"short_answer","prompt":{"text":"x","hint":"y"},"grading_spec":{"type":"text","accepted":["a"]}}`,
		"correct вне вариантов":      `{"skill_id":"` + goSkill + `","difficulty":1,"kind":"choice","prompt":{"text":"x","options":[{"id":"a","text":"1"},{"id":"b","text":"2"}]},"grading_spec":{"type":"choice","correct":["z"]}}`,
		"сложность 9":                question(9),
		"плохой UUID навыка":         `{"skill_id":"abc","difficulty":1,"kind":"short_answer","prompt":{"text":"x"},"grading_spec":{"type":"text","accepted":["a"]}}`,
	} {
		if code(call("POST", base+"/questions", token, body, 400)) != "validation_error" {
			t.Fatalf("%s: ожидали validation_error", name)
		}
	}
	call("POST", base+"/questions", token, `{"note":"`+strings.Repeat("a", 3<<20)+`"}`, 413)
	call("GET", base+"/questions/abc", token, "", 400)
	for _, route := range [][2]string{{"GET", "/questions/" + uuid}, {"POST", "/questions/" + uuid + "/archive"}, {"POST", "/questions/" + uuid + "/versions/1/publish"}, {"GET", "/templates/" + uuid}, {"POST", "/templates/" + uuid + "/publish"}, {"POST", "/templates/" + uuid + "/archive"}} {
		if code(call(route[0], base+route[1], token, "", 404)) != "assessment_not_found" {
			t.Fatalf("%s %s: ожидали assessment_not_found", route[0], route[1])
		}
	}

	// Шаблон: нехватка заданий, затем успешная публикация.
	var specID, gradeID int
	if err = db.QueryRow(ctx, `SELECT (SELECT id FROM specializations WHERE code='backend'),(SELECT id FROM grades WHERE code='junior')`).Scan(&specID, &gradeID); err != nil {
		t.Fatal(err)
	}
	template := `{"specialization_id":` + itoa(specID) + `,"grade_id":` + itoa(gradeID) + `,"time_limit_sec":1800,"pass_score":60,"blueprint":[{"skill_id":"` + goSkill + `","difficulty":1,"question_count":2,"weight":1}]}`
	var tpl struct{ ID string }
	if err = json.Unmarshal([]byte(call("POST", base+"/templates", token, template, 201)), &tpl); err != nil || tpl.ID == "" {
		t.Fatal(err)
	}
	shortage := call("POST", base+"/templates/"+tpl.ID+"/publish", token, "", 409)
	var short struct {
		Error     struct{ Code, Message string }
		Shortages []struct {
			SkillID    string `json:"skill_id"`
			Difficulty int
			Required   int
			Available  int
		}
	}
	if err = json.Unmarshal([]byte(shortage), &short); err != nil || short.Error.Code != "insufficient_questions" || short.Error.Message == "" || len(short.Shortages) != 1 || short.Shortages[0].Required != 2 || short.Shortages[0].Available != 1 || short.Shortages[0].SkillID != goSkill {
		t.Fatalf("нехватка: %s %v", shortage, err)
	}
	var second struct{ ID string }
	if err = json.Unmarshal([]byte(call("POST", base+"/questions", token, question(1), 201)), &second); err != nil {
		t.Fatal(err)
	}
	call("POST", base+"/questions/"+second.ID+"/versions/1/publish", token, "", 200)
	call("POST", base+"/templates/"+tpl.ID+"/publish", token, "", 200)
	if got := call("GET", base+"/templates/"+tpl.ID, token, "", 200); !strings.Contains(got, `"status":"published"`) || !strings.Contains(got, `"available":2`) || !strings.Contains(got, `"skill_name":"Go"`) {
		t.Fatalf("опубликованный шаблон: %s", got)
	}
	if got := call("GET", base+"/templates?status=published&specialization_id="+itoa(specID), token, "", 200); !strings.Contains(got, `"total":1`) {
		t.Fatalf("список шаблонов: %s", got)
	}
	call("GET", base+"/templates?status=live", token, "", 400)
	call("POST", base+"/templates", token, `{"specialization_id":1}`, 400)
	if code(call("POST", base+"/templates/"+tpl.ID+"/publish", token, "", 409)) != "assessment_conflict" {
		t.Fatal("повторная публикация шаблона")
	}
	call("POST", base+"/templates/"+tpl.ID+"/archive", token, "", 200)
	call("POST", base+"/templates/"+tpl.ID+"/archive", token, "", 409)
	call("POST", base+"/questions/"+q.ID+"/archive", token, "", 200)
	call("POST", base+"/questions/"+q.ID+"/archive", token, "", 409)

	// Сервис не настроен.
	off := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Admins: admins})
	if w := off.Do(t, "GET", base+"/questions", token, ""); w.Code != 503 || code(w.Body.String()) != "assessments_unavailable" {
		t.Fatalf("без сервиса ожидали 503 assessments_unavailable: %d %s", w.Code, w.Body)
	}
}

func itoa(n int) string {
	b, _ := json.Marshal(n)
	return string(b)
}
