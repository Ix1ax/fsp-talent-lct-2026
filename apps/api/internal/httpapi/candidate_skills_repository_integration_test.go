//go:build integration

package httpapi

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
)

const (
	jsSkill     = "00000000-0000-4000-8000-000000000002"
	dockerSkill = "00000000-0000-4000-8000-000000000009"
)

func skillLevel(n int16) entity.SkillInput { return entity.SkillInput{ClaimedLevel: &n} }

func TestCandidateSkillsRepository(t *testing.T) {
	db := companyTestDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()
	newUser := func(role, status string, withProfile bool) string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES($1,$2) RETURNING id::text`, role, status).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if withProfile {
			if _, err := db.Exec(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1)`, id); err != nil {
				t.Fatal(err)
			}
		}
		return id
	}

	// Без профиля и не активный кандидат.
	noProfile := newUser("candidate", "active", false)
	if _, err := repo.ListSkills(ctx, noProfile); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("список без профиля: %v", err)
	}
	if _, err := repo.PutSkill(ctx, noProfile, goSkill, skillLevel(3)); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("добавление без профиля: %v", err)
	}
	if err := repo.DeleteSkill(ctx, noProfile, goSkill); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("удаление без профиля: %v", err)
	}
	for _, other := range []string{newUser("employer", "active", false), newUser("candidate", "blocked", true)} {
		if _, err := repo.ListSkills(ctx, other); !errors.Is(err, entity.ErrForbidden) {
			t.Fatalf("список не активным кандидатом: %v", err)
		}
		if _, err := repo.PutSkill(ctx, other, goSkill, skillLevel(3)); !errors.Is(err, entity.ErrForbidden) {
			t.Fatalf("добавление не активным кандидатом: %v", err)
		}
		if err := repo.DeleteSkill(ctx, other, goSkill); !errors.Is(err, entity.ErrForbidden) {
			t.Fatalf("удаление не активным кандидатом: %v", err)
		}
	}

	user := newUser("candidate", "active", true)
	first, err := repo.PutSkill(ctx, user, goSkill, skillLevel(4))
	if err != nil || first.Code != "go" || first.Name != "Go" || *first.ClaimedLevel != 4 || first.Source != "claimed" || first.Confidence != 0.3 || first.UpdatedAt.IsZero() {
		t.Fatalf("добавление: %+v %v", first, err)
	}
	second, err := repo.PutSkill(ctx, user, goSkill, skillLevel(2))
	if err != nil || *second.ClaimedLevel != 2 || second.UpdatedAt.Before(first.UpdatedAt) {
		t.Fatalf("смена уровня: %+v %v", second, err)
	}
	for _, id := range []string{jsSkill, dockerSkill} {
		if _, err := repo.PutSkill(ctx, user, id, skillLevel(3)); err != nil {
			t.Fatal(err)
		}
	}
	list, err := repo.ListSkills(ctx, user)
	if err != nil || len(list) != 3 || list[0].Name != "Docker" || list[1].Name != "Go" || list[2].Name != "JavaScript" || *list[1].ClaimedLevel != 2 {
		t.Fatalf("список (по названию, без дублей): %+v %v", list, err)
	}

	var validation *entity.ValidationError
	if _, err := repo.PutSkill(ctx, user, "11111111-1111-4111-8111-111111111111", skillLevel(3)); !errors.As(err, &validation) {
		t.Fatalf("неизвестный навык: %v", err)
	}

	// Выключенный навык нельзя добавить, а добавленный ранее остаётся и редактируется.
	var retired string
	if err := db.QueryRow(ctx, `INSERT INTO skills(code,name,active) VALUES('retired','Устаревший',false) RETURNING id::text`).Scan(&retired); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.PutSkill(ctx, user, retired, skillLevel(3)); !errors.As(err, &validation) {
		t.Fatalf("добавление выключенного навыка: %v", err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level) SELECT p.id,$2,2 FROM candidate_profiles p WHERE p.user_id=$1`, user, retired); err != nil {
		t.Fatal(err)
	}
	if list, _ = repo.ListSkills(ctx, user); len(list) != 4 {
		t.Fatalf("уже добавленный выключенный навык должен остаться в списке: %+v", list)
	}
	if updated, err := repo.PutSkill(ctx, user, retired, skillLevel(5)); err != nil || *updated.ClaimedLevel != 5 {
		t.Fatalf("изменение выключенного навыка: %+v %v", updated, err)
	}
	if err := repo.DeleteSkill(ctx, user, retired); err != nil {
		t.Fatalf("удаление выключенного навыка: %v", err)
	}

	// Удаление и повторное удаление.
	if err := repo.DeleteSkill(ctx, user, goSkill); err != nil {
		t.Fatal(err)
	}
	if err := repo.DeleteSkill(ctx, user, goSkill); !errors.Is(err, entity.ErrSkillNotFound) {
		t.Fatalf("повторное удаление: %v", err)
	}

	// Другой кандидат не видит и не удаляет чужие навыки.
	other := newUser("candidate", "active", true)
	if theirs, err := repo.ListSkills(ctx, other); err != nil || len(theirs) != 0 {
		t.Fatalf("чужие навыки в списке: %+v %v", theirs, err)
	}
	if err := repo.DeleteSkill(ctx, other, dockerSkill); !errors.Is(err, entity.ErrSkillNotFound) {
		t.Fatalf("удаление чужого навыка: %v", err)
	}
	if mine, _ := repo.ListSkills(ctx, user); len(mine) != 2 {
		t.Fatalf("навыки владельца изменились: %+v", mine)
	}
}

func TestCandidateSkillsConcurrency(t *testing.T) {
	db := companyTestDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()
	rows, err := db.Query(ctx, `INSERT INTO skills(code,name) SELECT 'extra'||g, 'Extra '||g FROM generate_series(1,60) g RETURNING id::text`)
	if err != nil {
		t.Fatal(err)
	}
	var extra []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			t.Fatal(err)
		}
		extra = append(extra, id)
	}
	rows.Close()
	newCandidate := func() string {
		var id string
		if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&id); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1)`, id); err != nil {
			t.Fatal(err)
		}
		return id
	}
	count := func(user string) (n int) {
		if err := db.QueryRow(ctx, `SELECT count(*) FROM candidate_skills cs JOIN candidate_profiles p ON p.id=cs.candidate_id WHERE p.user_id=$1`, user).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return
	}

	// 60 разных навыков одновременно: лимит 50 не обходится.
	user := newCandidate()
	var ok, limited, other int32
	var wg sync.WaitGroup
	for _, id := range extra {
		id := id
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := repo.PutSkill(ctx, user, id, skillLevel(3))
			var validation *entity.ValidationError
			switch {
			case err == nil:
				atomic.AddInt32(&ok, 1)
			case errors.As(err, &validation):
				atomic.AddInt32(&limited, 1)
			default:
				atomic.AddInt32(&other, 1)
				t.Error(err)
			}
		}()
	}
	wg.Wait()
	if ok != 50 || limited != 10 || other != 0 || count(user) != 50 {
		t.Fatalf("лимит навыков: успехов %d, отказов %d, прочее %d, в БД %d", ok, limited, other, count(user))
	}

	// Один навык с разными уровнями одновременно: одна строка и ни одной ошибки.
	same := newCandidate()
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(level int16) {
			defer wg.Done()
			if _, err := repo.PutSkill(ctx, same, goSkill, skillLevel(level)); err != nil {
				t.Error(err)
			}
		}(int16(i%5 + 1))
	}
	wg.Wait()
	if count(same) != 1 {
		t.Fatalf("параллельные PUT одного навыка: строк %d", count(same))
	}
}
