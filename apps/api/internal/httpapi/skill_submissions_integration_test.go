//go:build integration

package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
	candidateservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/user"
)

func TestSkillSubmissions(t *testing.T) {
	db := companyTestDB(t)
	ctx := context.Background()
	repo := candidaterepo.NewRepository(db)
	svc := candidateservice.NewSkillsService(repo)
	createCandidate := func() string {
		t.Helper()
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1)`, id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	first, second := createCandidate(), createCandidate()
	level := int16(3)
	in := entity.SkillSubmissionInput{Name: "  Новый   стек ", ClaimedLevel: &level}
	a, err := svc.Submit(ctx, first, in)
	if err != nil {
		t.Fatal(err)
	}
	if a.ModerationStatus != "pending" || a.Name != "Новый стек" {
		t.Fatalf("Статус предложения: %+v", a)
	}
	b, err := svc.Submit(ctx, second, entity.SkillSubmissionInput{Name: "НОВЫЙ СТЕК", ClaimedLevel: &level})
	if err != nil || b.SkillID != a.SkillID {
		t.Fatal("Появился дубликат", b, err)
	}
	list, err := catalog.NewService(catalog.NewRepository(db)).Skills(ctx, "Новый", 100, 0)
	if err != nil || len(list) != 0 {
		t.Fatal("Предложение попало в публичный справочник", err)
	}
	if _, err = svc.Put(ctx, createCandidate(), a.SkillID, entity.SkillInput{ClaimedLevel: &level}); err == nil {
		t.Fatal("Чужой pending можно добавить по UUID")
	}
	if _, err = svc.Put(ctx, first, a.SkillID, entity.SkillInput{ClaimedLevel: &level}); err != nil {
		t.Fatal("Нельзя изменить собственную самооценку pending", err)
	}
	existing, err := svc.Submit(ctx, first, entity.SkillSubmissionInput{Name: "golang", ClaimedLevel: &level})
	if err != nil || existing.SkillID != goSkill || existing.ModerationStatus != "approved" {
		t.Fatal("Не переиспользовано альтернативное название Go", existing, err)
	}
	// Отказ модерации блокирует повторное предложение, даже если оно передано другим регистром.
	if _, err = db.Exec(ctx, `UPDATE skills SET moderation_status='rejected' WHERE id=$1`, a.SkillID); err != nil {
		t.Fatal(err)
	}
	if _, err = svc.Submit(ctx, first, in); err == nil {
		t.Fatal("Повторно добавлен отклонённый навык")
	}
	// Проверяем реальный маршрут и запрет клиенту выдавать себе одобрение.
	env := newAuthEnvWithOptions(t, Options{CandidateSkills: svc})
	env.store.users[testIssuer+"|submit"] = user.User{ID: first, Role: "candidate", Status: "active"}
	token := env.token(t, "submit")
	body := `{"name":"API-навык","claimed_level":4}`
	w := env.do(t, "POST", "/api/v1/me/skills", token, body)
	if w.Code != 200 {
		t.Fatalf("POST: %d %s", w.Code, w.Body)
	}
	var skill entity.Skill
	if err = json.Unmarshal(w.Body.Bytes(), &skill); err != nil || skill.ModerationStatus != "pending" {
		t.Fatal(skill, err)
	}
	w = env.do(t, "POST", "/api/v1/me/skills", token, `{"name":"Подлог","claimed_level":3,"moderation_status":"approved"}`)
	if w.Code != 400 {
		t.Fatalf("Клиент задал статус: %d", w.Code)
	}
	if w = env.do(t, "POST", "/api/v1/me/skills", "", body); w.Code != 401 {
		t.Fatalf("Без авторизации: %d", w.Code)
	}
	quotaUser := createCandidate()
	for i := 0; i < 20; i++ {
		if _, err = svc.Submit(ctx, quotaUser, entity.SkillSubmissionInput{Name: fmt.Sprintf("Предложение %d", i), ClaimedLevel: &level}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = svc.Submit(ctx, quotaUser, entity.SkillSubmissionInput{Name: "Сверх лимита", ClaimedLevel: &level}); err == nil {
		t.Fatal("Превышен лимит предложений")
	}
	if _, err = svc.Submit(ctx, quotaUser, entity.SkillSubmissionInput{Name: "Go", ClaimedLevel: &level}); err != nil {
		t.Fatal("Лимит предложений запретил существующий навык", err)
	}
	var count int
	if err = db.QueryRow(ctx, `SELECT count(*) FROM skills WHERE name_key='сверх лимита'`).Scan(&count); err != nil || count != 0 {
		t.Fatal("Осталась запись после отказа", count, err)
	}
	var validation *entity.ValidationError
	if _, err = svc.Submit(ctx, first, entity.SkillSubmissionInput{Name: "  ", ClaimedLevel: &level}); !errors.As(err, &validation) {
		t.Fatal("Принято пустое название", err)
	}
}

func TestSkillSubmissionConcurrency(t *testing.T) {
	db := companyTestDB(t)
	ctx := context.Background()
	svc := candidateservice.NewSkillsService(candidaterepo.NewRepository(db))
	users := []string{}
	for i := 0; i < 6; i++ {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1)`, id); err != nil {
			t.Fatal(err)
		}
		users = append(users, id)
	}
	var wg sync.WaitGroup
	errs := make(chan error, len(users))
	level := int16(2)
	for _, id := range users {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			_, err := svc.Submit(ctx, id, entity.SkillSubmissionInput{Name: "Общий новый навык", ClaimedLevel: &level})
			errs <- err
		}(id)
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	var count int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM skills WHERE name_key='общий новый навык'`).Scan(&count); err != nil || count != 1 {
		t.Fatal("Дубликаты предложений", count, err)
	}
	if err := db.QueryRow(ctx, `SELECT count(*) FROM candidate_skills cs JOIN skills s ON s.id=cs.skill_id WHERE s.name_key='общий новый навык'`).Scan(&count); err != nil || count != 6 {
		t.Fatal("Потеряны связи с резюме", count, err)
	}
}
