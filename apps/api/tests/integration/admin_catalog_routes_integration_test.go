//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"testing"

	adminentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/entity"
	adminrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/repository"
	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/entity"
	catalogrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/repository"
	catalogservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/service"
	candidateentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
	companyentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/entity"
	companyrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/company/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

func TestAdminCatalogRoutes(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	admins := adminservice.New(adminrepo.New(db))
	const password = "Catalog-Admin-Password-2026"
	if err := admins.Bootstrap(ctx, "root@example.test", password); err != nil {
		t.Fatal(err)
	}
	root, err := admins.Login(ctx, adminentity.Credentials{Email: "root@example.test", Password: password}, "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	staff, err := admins.Create(ctx, root.Admin, adminentity.Credentials{Email: "staff@example.test", Password: password})
	if err != nil {
		t.Fatal(err)
	}
	login, err := admins.Login(ctx, adminentity.Credentials{Email: staff.Email, Password: password}, "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	env := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Admins: admins, AdminCatalogs: catalogservice.New(catalogrepo.New(db)), Catalogs: catalog.NewService(catalog.NewRepository(db))})
	request := func(method, path, token, body string, status int) string {
		t.Helper()
		w := env.Do(t, method, path, token, body)
		if w.Code != status {
			t.Fatalf("%s %s: %d %s, ожидали %d", method, path, w.Code, w.Body, status)
		}
		if w.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("Админский ответ можно кешировать")
		}
		return w.Body.String()
	}
	base := "/api/v1/admin/catalogs"
	request("GET", base, "", "", 401)
	request("GET", base, env.Token(t, "site-user"), "", 401)
	request("GET", base, login.AccessToken, "", 200)
	request("GET", base+"/roles", login.AccessToken, "", 404)
	request("GET", base+"/skills/not-a-uuid", login.AccessToken, "", 400)
	for _, kind := range []string{"skills", "specializations", "grades", "work_formats"} {
		body := `{"code":"new_value","name":"Новое значение"}`
		if kind == "grades" {
			body = `{"code":"new_value","name":"Новое значение","rank":5}`
		}
		raw := request("POST", base+"/"+kind, login.AccessToken, body, 201)
		var item entity.Item
		if err = json.Unmarshal([]byte(raw), &item); err != nil {
			t.Fatal(err)
		}
		path := base + "/" + kind + "/" + item.ID
		request("GET", path, login.AccessToken, "", 200)
		request("POST", base+"/"+kind, login.AccessToken, body, 409)
		request("PATCH", path, login.AccessToken, `{}`, 400)
		request("PATCH", path, login.AccessToken, `{"code":"changed"}`, 400)
		archived := request("PATCH", path, login.AccessToken, `{"active":false}`, 200)
		var changed entity.Item
		if err = json.Unmarshal([]byte(archived), &changed); err != nil || changed.Active == nil || *changed.Active {
			t.Fatal("Не архивировано", changed, err)
		}
		if changed.Name != item.Name || changed.Code != item.Code {
			t.Fatal("Архивирование изменило название или код")
		}
		request("PATCH", path, login.AccessToken, `{"active":true,"name":"Другое название"}`, 200)
		request("DELETE", path, login.AccessToken, "", 204)
		request("GET", path, login.AccessToken, "", 404)
		request("DELETE", path, login.AccessToken, "", 404)
	}
	var events int
	if err = db.QueryRow(ctx, `SELECT count(*) FROM admin_catalog_events WHERE actor_id=$1`, staff.ID).Scan(&events); err != nil || events != 16 {
		t.Fatal("Не все изменения попали в аудит", events, err)
	}
	var pending string
	if err = db.QueryRow(ctx, `INSERT INTO skills(code,name,active,moderation_status) VALUES('pending_skill','Предложение',false,'pending') RETURNING id::text`).Scan(&pending); err != nil {
		t.Fatal(err)
	}
	wantPage(t, "навыки на модерации", bodyRecorder(request("GET", base+"/skills/pending", login.AccessToken, "", 200)), 1, 1, 20, 0)
	wantPage(t, "навыки на модерации, offset за пределами", bodyRecorder(request("GET", base+"/skills/pending?offset=5", login.AccessToken, "", 200)), 0, 1, 20, 5)
	wantPage(t, "справочник навыков по запросу", bodyRecorder(request("GET", base+"/skills?q=pending_skill&limit=1", login.AccessToken, "", 200)), 1, 1, 1, 0)
	wantPage(t, "справочник навыков без совпадений", bodyRecorder(request("GET", base+"/skills?q=zzzнетзатакого", login.AccessToken, "", 200)), 0, 0, 20, 0)
	request("PATCH", base+"/skills/"+pending, login.AccessToken, `{"active":true}`, 409)
	request("DELETE", base+"/skills/"+pending, login.AccessToken, "", 409)
	if _, err = db.Exec(ctx, `UPDATE admin_accounts SET status='blocked' WHERE id=$1`, staff.ID); err != nil {
		t.Fatal(err)
	}
	request("GET", base, login.AccessToken, "", 401)
}

func TestCatalogArchiveKeepsReferences(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	svc := catalogservice.New(catalogrepo.New(db))
	var actor, candidate, profile, owner, company, need string
	if err := db.QueryRow(ctx, `SELECT id::text FROM admin_accounts WHERE role='superadmin'`).Scan(&actor); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&candidate); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1) RETURNING id::text`, candidate).Scan(&profile); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level) VALUES($1,$2,3)`, profile, goSkill); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO candidate_work_formats(candidate_id,work_format_id) VALUES($1,1)`, profile); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('employer') RETURNING id::text`).Scan(&owner); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `INSERT INTO companies(name,contact_email) VALUES('Компания','hr@example.test') RETURNING id::text`).Scan(&company); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO company_members(company_id,user_id,role) VALUES($1,$2,'owner')`, company, owner); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,grade_id,title,description) VALUES($1,$2,1,1,'Потребность','Описание') RETURNING id::text`, company, owner).Scan(&need); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO need_skills(need_id,skill_id,required,weight) VALUES($1,$2,true,1)`, need, goSkill); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO need_work_formats(need_id,work_format_id) VALUES($1,1)`, need); err != nil {
		t.Fatal(err)
	}
	for kind, id := range map[string]string{"specializations": "1", "grades": "1", "work_formats": "1", "skills": goSkill} {
		if err := svc.Delete(ctx, actor, kind, id); err != entity.ErrInUse {
			t.Fatalf("Удаление используемого %s: %v", kind, err)
		}
		active := false
		if _, err := svc.Update(ctx, actor, kind, id, entity.UpdateInput{Active: &active}); err != nil {
			t.Fatal(err)
		}
	}
	public := catalog.NewService(catalog.NewRepository(db))
	values, err := public.Get(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range values.Grades {
		if item.ID == 1 {
			t.Fatal("Архивный грейд в новом выборе")
		}
	}
	for _, item := range values.WorkFormats {
		if item.ID == 1 {
			t.Fatal("Архивный формат в новом выборе")
		}
	}
	skills, err := candidaterepo.NewRepository(db).ListSkills(ctx, candidate)
	if err != nil || len(skills) != 1 {
		t.Fatal("Архивный навык исчез из резюме", err)
	}
	_, err = candidaterepo.NewRepository(db).Update(ctx, candidate, candidateentity.Patch{"headline": json.RawMessage(`"Новый заголовок"`)})
	if err != nil {
		t.Fatal("Архивный формат мешает редактировать профиль", err)
	}
	_, err = companyrepo.NewRepository(db).UpdateNeed(ctx, owner, company, need, map[string]json.RawMessage{"title": json.RawMessage(`"Новое название"`)})
	if err != nil {
		t.Fatal("Архивные значения мешают редактировать потребность", err)
	}
	// Новый профиль не может выбрать формат, который остался у старого владельца.
	var other string
	if err = db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&other); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1)`, other); err != nil {
		t.Fatal(err)
	}
	if _, err = candidaterepo.NewRepository(db).Update(ctx, other, candidateentity.Patch{"work_format_ids": json.RawMessage(`[1]`)}); err == nil {
		t.Fatal("Новый профиль выбрал архивный формат")
	}
	// Проверяем каждый архивный справочник отдельно, остальные поля оставляем действующими.
	companyStore := companyrepo.NewRepository(db)
	grade := int16(2)
	valid := companyentity.NeedInput{SpecializationID: 2, GradeID: &grade, Title: "Новая потребность", Description: "Описание", Status: "draft", WorkFormatIDs: []int16{2}}
	for _, kind := range []string{"specializations", "grades", "work_formats", "skills"} {
		input := valid
		switch kind {
		case "specializations":
			input.SpecializationID = 1
		case "grades":
			archived := int16(1)
			input.GradeID = &archived
		case "work_formats":
			input.WorkFormatIDs = []int16{1}
		case "skills":
			input.Skills = []companyentity.NeedSkill{{SkillID: goSkill, Required: true, Weight: 1}}
		}
		if _, err = companyStore.CreateNeed(ctx, owner, company, input); err == nil {
			t.Fatalf("Новая потребность выбрала архивный %s", kind)
		}
	}

}
