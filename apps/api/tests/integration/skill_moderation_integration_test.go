//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	adminentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/entity"
	adminrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/repository"
	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/entity"
	catalogrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/repository"
	catalogservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/service"
	candidateentity "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

func TestSkillModeration(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	admins := adminservice.New(adminrepo.New(db))
	const password = "Moderation-Password-2026"
	if err := admins.Bootstrap(ctx, "moderator@example.test", password); err != nil {
		t.Fatal(err)
	}
	login, err := admins.Login(ctx, adminentity.Credentials{Email: "moderator@example.test", Password: password}, "127.0.0.1")
	if err != nil {
		t.Fatal(err)
	}
	svc := catalogservice.New(catalogrepo.New(db))
	env := testutil.NewAuthEnvWithOptions(t, httpapi.Options{Admins: admins, AdminCatalogs: svc})
	base := "/api/v1/admin/catalogs/skills"
	do := func(path, body string, status int) entity.ModerationResult {
		t.Helper()
		w := env.Do(t, "POST", base+path, login.AccessToken, body)
		if w.Code != status {
			t.Fatalf("POST %s: %d %s ожидали %d", path, w.Code, w.Body, status)
		}
		var result entity.ModerationResult
		if status == 200 {
			if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
		}
		return result
	}
	users, profiles := []string{}, []string{}
	for i := 0; i < 2; i++ {
		var user, profile string
		if err = db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
			t.Fatal(err)
		}
		if err = db.QueryRow(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1) RETURNING id::text`, user).Scan(&profile); err != nil {
			t.Fatal(err)
		}
		users = append(users, user)
		profiles = append(profiles, profile)
	}
	candidates := candidateservice.NewSkillsService(candidaterepo.NewRepository(db))
	level := int16(3)
	submitted, err := candidates.Submit(ctx, users[0], candidateentity.SkillSubmissionInput{Name: "Go язык", ClaimedLevel: &level})
	if err != nil {
		t.Fatal(err)
	}
	queue := env.Do(t, "GET", base+"/pending", login.AccessToken, "")
	if queue.Code != 200 {
		t.Fatalf("Очередь: %d %s", queue.Code, queue.Body)
	}
	var page struct{ Items []entity.Item }
	if err = json.Unmarshal(queue.Body.Bytes(), &page); err != nil || len(page.Items) != 1 || page.Items[0].SubmittedBy == nil {
		t.Fatal("Нет автора предложения", page, err)
	}
	do("/"+submitted.SkillID+"/merge", `{}`, 400)
	do("/"+submitted.SkillID+"/reject", `{}`, 400)
	do("/"+submitted.SkillID+"/merge", `{"target_id":"`+submitted.SkillID+`"}`, 400)
	approved := do("/"+submitted.SkillID+"/approve", "", 200)
	if approved.Skill.ModerationStatus == nil || *approved.Skill.ModerationStatus != "approved" || approved.Skill.ModeratedBy == nil {
		t.Fatal("Не одобрено", approved)
	}
	visible, _, err := catalog.NewService(catalog.NewRepository(db)).Skills(ctx, "Go язык", 100, 0)
	if err != nil || len(visible) != 1 {
		t.Fatal("Одобренное не опубликовано", err)
	}
	do("/"+submitted.SkillID+"/approve", "", 409)
	// Более раннее объединение должно вести сразу к окончательной цели.
	var old string
	if err = db.QueryRow(ctx, `INSERT INTO skills(code,name,active,moderation_status) VALUES('old_name','Старое имя',false,'pending') RETURNING id::text`).Scan(&old); err != nil {
		t.Fatal(err)
	}
	do("/"+old+"/merge", `{"target_id":"`+submitted.SkillID+`"}`, 200)
	if _, err = db.Exec(ctx, `INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level) VALUES($1,$2,5),($3,$4,4)`, profiles[0], goSkill, profiles[1], submitted.SkillID); err != nil {
		t.Fatal(err)
	}
	var owner, company, need, only string
	if err = db.QueryRow(ctx, `INSERT INTO users(role) VALUES('employer') RETURNING id::text`).Scan(&owner); err != nil {
		t.Fatal(err)
	}
	if err = db.QueryRow(ctx, `INSERT INTO companies(name,contact_email) VALUES('Компания','hr@example.test') RETURNING id::text`).Scan(&company); err != nil {
		t.Fatal(err)
	}
	for _, dest := range []*string{&need, &only} {
		if err = db.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,title,description,status) VALUES($1,$2,1,'Потребность','Описание','active') RETURNING id::text`, company, owner).Scan(dest); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = db.Exec(ctx, `INSERT INTO need_skills(need_id,skill_id,required,weight) VALUES($1,$2,true,5),($1,$3,false,10),($4,$2,true,1)`, need, submitted.SkillID, goSkill, only); err != nil {
		t.Fatal(err)
	}
	merged := do("/"+submitted.SkillID+"/merge", `{"target_id":"`+goSkill+`"}`, 200)
	if merged.CandidateLinks != 2 || merged.NeedLinks != 2 || merged.Skill.MergedInto == nil || *merged.Skill.MergedInto != goSkill {
		t.Fatal("Неверный перенос", merged)
	}
	var gotLevel int16
	if err = db.QueryRow(ctx, `SELECT claimed_level FROM candidate_skills WHERE candidate_id=$1 AND skill_id=$2`, profiles[0], goSkill).Scan(&gotLevel); err != nil || gotLevel != 5 {
		t.Fatal("Потеряна самооценка", gotLevel, err)
	}
	var required bool
	var weight float64
	if err = db.QueryRow(ctx, `SELECT required,weight FROM need_skills WHERE need_id=$1 AND skill_id=$2`, need, goSkill).Scan(&required, &weight); err != nil || !required || weight != 10 {
		t.Fatal("Потеряны требования", required, weight, err)
	}
	var target string
	if err = db.QueryRow(ctx, `SELECT merged_into::text FROM skills WHERE id=$1`, old).Scan(&target); err != nil || target != goSkill {
		t.Fatal("Осталась цепочка объединений", target, err)
	}
	reused, err := candidates.Submit(ctx, users[0], candidateentity.SkillSubmissionInput{Name: "Старое имя", ClaimedLevel: &level})
	if err != nil || reused.SkillID != goSkill {
		t.Fatal("Старое название не привело к каноническому навыку", reused, err)
	}
	do("/"+submitted.SkillID+"/reject", `{"reason":"Нельзя менять историю"}`, 409)
	rejected := do("/"+goSkill+"/reject", `{"reason":"Ошибочная запись"}`, 200)
	if rejected.CandidateLinks != 2 || rejected.NeedLinks != 2 || rejected.DraftedNeeds != 2 {
		t.Fatal("Не удалены связи", rejected)
	}
	var left int
	if err = db.QueryRow(ctx, `SELECT count(*) FROM candidate_skills WHERE skill_id=$1`, goSkill).Scan(&left); err != nil || left != 0 {
		t.Fatal(left, err)
	}
	if _, err = candidates.Submit(ctx, users[0], candidateentity.SkillSubmissionInput{Name: "Go", ClaimedLevel: &level}); err == nil {
		t.Fatal("Отклонённый навык вернулся")
	}
	if _, err = svc.Moderate(ctx, login.Admin.ID, goSkill, "approved", entity.ModerationInput{}); !errors.Is(err, entity.ErrInvalidTransition) {
		t.Fatal(err)
	}
	if w := env.Do(t, "POST", base+"/"+old+"/approve", env.Token(t, "site-user"), ""); w.Code != 401 {
		t.Fatal("Токен сайта позволил модерацию", w.Code)
	}
	var events int
	if err = db.QueryRow(ctx, `SELECT count(*) FROM admin_catalog_events WHERE action IN ('approved','merged','rejected')`).Scan(&events); err != nil || events != 4 {
		t.Fatal("Аудит модерации", events, err)
	}
}

func TestSkillMergeDuringSubmission(t *testing.T) {
	db := testDB(t)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	svc := catalogservice.New(catalogrepo.New(db))
	candidates := candidateservice.NewSkillsService(candidaterepo.NewRepository(db))
	var actor, source string
	if err := db.QueryRow(ctx, `SELECT id::text FROM admin_accounts WHERE role='superadmin'`).Scan(&actor); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `INSERT INTO skills(code,name,active,moderation_status) VALUES('parallel_name','Параллельный навык',false,'pending') RETURNING id::text`).Scan(&source); err != nil {
		t.Fatal(err)
	}
	users := []string{}
	for i := 0; i < 8; i++ {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1)`, id); err != nil {
			t.Fatal(err)
		}
		users = append(users, id)
	}
	start := make(chan struct{})
	errs := make(chan error, 9)
	var wg sync.WaitGroup
	for _, user := range users {
		wg.Add(1)
		go func(user string) {
			defer wg.Done()
			<-start
			level := int16(3)
			_, err := candidates.Submit(ctx, user, candidateentity.SkillSubmissionInput{Name: "Параллельный навык", ClaimedLevel: &level})
			errs <- err
		}(user)
	}
	wg.Add(1)
	go func() {
		defer wg.Done()
		<-start
		_, err := svc.Moderate(ctx, actor, source, "merged", entity.ModerationInput{TargetID: goSkill})
		errs <- err
	}()
	close(start)
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	var count int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM candidate_skills WHERE skill_id=$1`, source).Scan(&count); err != nil || count != 0 {
		t.Fatal("Связи остались у исходного навыка", count, err)
	}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM candidate_skills WHERE skill_id=$1`, goSkill).Scan(&count); err != nil || count != 8 {
		t.Fatal("Потеряны параллельные предложения", count, err)
	}
}
