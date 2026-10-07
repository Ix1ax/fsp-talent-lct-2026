//go:build integration

package integration

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	candidaterepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/repository"
)

// careerUser создаёт пользователя заданной роли и статуса, при необходимости с профилем.
func careerUser(t *testing.T, db *pgxpool.Pool, role, status string, profile bool) string {
	t.Helper()
	ctx := context.Background()
	var id string
	if err := db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES($1,$2) RETURNING id::text`, role, status).Scan(&id); err != nil {
		t.Fatal(err)
	}
	if profile {
		if _, err := db.Exec(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1)`, id); err != nil {
			t.Fatal(err)
		}
	}
	return id
}

func exp(t *testing.T, company, from, to string) entity.ExperienceInput {
	t.Helper()
	started, err := entity.ParseMonth(from)
	if err != nil {
		t.Fatal(err)
	}
	in := entity.ExperienceInput{Company: company, Position: "Разработчик", StartedOn: started}
	if to != "" {
		end, err := entity.ParseMonth(to)
		if err != nil {
			t.Fatal(err)
		}
		in.EndedOn = &end
	}
	return in
}

func edu(institution string, year int) entity.EducationInput {
	return entity.EducationInput{Level: "higher", Institution: institution, GraduationYear: year}
}

func TestCareerCRUD(t *testing.T) {
	db := testDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()
	user := careerUser(t, db, "candidate", "active", true)

	created, err := repo.CreateExperience(ctx, user, exp(t, "Компания", "2022-11", ""))
	if err != nil || created.ID == "" || created.Company != "Компания" || created.EndedOn != nil || created.StartedOn.String() != "2022-11" {
		t.Fatalf("создание: %+v (%v)", created, err)
	}
	replaced, err := repo.ReplaceExperience(ctx, user, created.ID, exp(t, "Другая", "2020-01", "2021-06"))
	if err != nil || replaced.ID != created.ID || replaced.Company != "Другая" || replaced.EndedOn == nil || replaced.EndedOn.String() != "2021-06" {
		t.Fatalf("замена: %+v (%v)", replaced, err)
	}
	if !replaced.CreatedAt.Equal(created.CreatedAt) || !replaced.UpdatedAt.After(created.UpdatedAt) {
		t.Fatalf("created_at должен сохраниться, updated_at вырасти: %v %v / %v", created.CreatedAt, replaced.CreatedAt, replaced.UpdatedAt)
	}
	if err = repo.DeleteExperience(ctx, user, created.ID); err != nil {
		t.Fatal(err)
	}
	if items, err := repo.ListExperience(ctx, user); err != nil || len(items) != 0 {
		t.Fatalf("после удаления: %+v (%v)", items, err)
	}
	if err = repo.DeleteExperience(ctx, user, created.ID); !errors.Is(err, entity.ErrExperienceNotFound) {
		t.Fatalf("повторное удаление: %v", err)
	}

	e, err := repo.CreateEducation(ctx, user, entity.EducationInput{Level: "master", Institution: "МГУ", Specialty: "Математика", GraduationYear: 2027})
	if err != nil || e.Level != "master" || e.Specialty != "Математика" || e.GraduationYear != 2027 {
		t.Fatalf("образование: %+v (%v)", e, err)
	}
	e2, err := repo.ReplaceEducation(ctx, user, e.ID, edu("ВШЭ", 2025))
	if err != nil || e2.Institution != "ВШЭ" || e2.Level != "higher" || e2.Specialty != "" || !e2.UpdatedAt.After(e.UpdatedAt) {
		t.Fatalf("замена образования: %+v (%v)", e2, err)
	}
	if err = repo.DeleteEducation(ctx, user, e.ID); err != nil {
		t.Fatal(err)
	}
	if err = repo.DeleteEducation(ctx, user, e.ID); !errors.Is(err, entity.ErrEducationNotFound) {
		t.Fatalf("повторное удаление образования: %v", err)
	}
}

func TestCareerOrdering(t *testing.T) {
	db := testDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()
	user := careerUser(t, db, "candidate", "active", true)
	for _, in := range []entity.ExperienceInput{
		exp(t, "Старая", "2018-01", "2019-12"),
		exp(t, "Закрытая новая", "2021-01", "2022-06"),
		exp(t, "Текущая ранняя", "2020-03", ""),
		exp(t, "Текущая поздняя", "2023-05", ""),
	} {
		if _, err := repo.CreateExperience(ctx, user, in); err != nil {
			t.Fatal(err)
		}
	}
	items, err := repo.ListExperience(ctx, user)
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"Текущая поздняя", "Текущая ранняя", "Закрытая новая", "Старая"}
	for i, w := range want {
		if items[i].Company != w {
			t.Fatalf("порядок: %d = %s, ожидали %s", i, items[i].Company, w)
		}
	}
	for _, in := range []entity.EducationInput{edu("А", 2015), edu("Б", 2027), edu("В", 2020)} {
		if _, err = repo.CreateEducation(ctx, user, in); err != nil {
			t.Fatal(err)
		}
	}
	list, err := repo.ListEducation(ctx, user)
	if err != nil || list[0].GraduationYear != 2027 || list[1].GraduationYear != 2020 || list[2].GraduationYear != 2015 {
		t.Fatalf("порядок образования: %+v (%v)", list, err)
	}
}

// Лимит не обходится параллельными запросами: проверка идёт под блокировкой профиля.
func TestCareerLimitsRace(t *testing.T) {
	db := testDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()
	race := func(prefill int, table string, create func() error) {
		t.Helper()
		var ok, limited atomic.Int32
		var wg sync.WaitGroup
		for i := 0; i < 10; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				switch err := create(); {
				case err == nil:
					ok.Add(1)
				case errors.Is(err, entity.ErrLimitReached):
					limited.Add(1)
				default:
					t.Error(err)
				}
			}()
		}
		wg.Wait()
		if ok.Load() != 1 || limited.Load() != 9 {
			t.Fatalf("%s: успехов %d, отказов %d", table, ok.Load(), limited.Load())
		}
	}

	user := careerUser(t, db, "candidate", "active", true)
	for i := 0; i < entity.MaxExperiences-1; i++ {
		if _, err := repo.CreateExperience(ctx, user, exp(t, "К", "2020-01", "")); err != nil {
			t.Fatal(err)
		}
	}
	race(entity.MaxExperiences-1, "опыт", func() error {
		_, err := repo.CreateExperience(ctx, user, exp(t, "Гонка", "2021-01", ""))
		return err
	})
	if n := countRows(t, db, `SELECT count(*) FROM candidate_experiences`); n != entity.MaxExperiences {
		t.Fatalf("записей опыта: %d", n)
	}

	other := careerUser(t, db, "candidate", "active", true)
	for i := 0; i < entity.MaxEducation-1; i++ {
		if _, err := repo.CreateEducation(ctx, other, edu("У", 2020)); err != nil {
			t.Fatal(err)
		}
	}
	race(entity.MaxEducation-1, "образование", func() error { _, err := repo.CreateEducation(ctx, other, edu("Гонка", 2021)); return err })
	if n := countRows(t, db, `SELECT count(*) FROM candidate_education`); n != entity.MaxEducation {
		t.Fatalf("записей образования: %d", n)
	}
	// Замена и удаление при полном списке работают.
	list, _ := repo.ListEducation(ctx, other)
	if _, err := repo.ReplaceEducation(ctx, other, list[0].ID, edu("Новая", 2022)); err != nil {
		t.Fatalf("замена при полном списке: %v", err)
	}
}

func TestCareerOwnership(t *testing.T) {
	db := testDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()
	owner, stranger := careerUser(t, db, "candidate", "active", true), careerUser(t, db, "candidate", "active", true)
	e, err := repo.CreateExperience(ctx, owner, exp(t, "Моя", "2020-01", ""))
	if err != nil {
		t.Fatal(err)
	}
	d, err := repo.CreateEducation(ctx, owner, edu("Мой", 2020))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.ReplaceExperience(ctx, stranger, e.ID, exp(t, "Чужая", "2020-01", "")); !errors.Is(err, entity.ErrExperienceNotFound) {
		t.Fatalf("чужая замена: %v", err)
	}
	if err = repo.DeleteExperience(ctx, stranger, e.ID); !errors.Is(err, entity.ErrExperienceNotFound) {
		t.Fatalf("чужое удаление: %v", err)
	}
	if _, err = repo.ReplaceEducation(ctx, stranger, d.ID, edu("Чужой", 2020)); !errors.Is(err, entity.ErrEducationNotFound) {
		t.Fatalf("чужая замена образования: %v", err)
	}
	if err = repo.DeleteEducation(ctx, stranger, d.ID); !errors.Is(err, entity.ErrEducationNotFound) {
		t.Fatalf("чужое удаление образования: %v", err)
	}
	if _, err = repo.ReplaceExperience(ctx, owner, "not-a-uuid", exp(t, "К", "2020-01", "")); !errors.Is(err, entity.ErrExperienceNotFound) {
		t.Fatalf("не uuid: %v", err)
	}
	if err = repo.DeleteEducation(ctx, owner, "not-a-uuid"); !errors.Is(err, entity.ErrEducationNotFound) {
		t.Fatalf("не uuid: %v", err)
	}
	if mine, _ := repo.ListExperience(ctx, owner); len(mine) != 1 || mine[0].Company != "Моя" {
		t.Fatalf("запись владельца изменилась: %+v", mine)
	}
	if theirs, err := repo.ListExperience(ctx, stranger); err != nil || len(theirs) != 0 {
		t.Fatalf("чужой список: %+v (%v)", theirs, err)
	}
}

func TestCareerAccess(t *testing.T) {
	db := testDB(t)
	repo := candidaterepo.NewRepository(db)
	ctx := context.Background()
	noProfile := careerUser(t, db, "candidate", "active", false)
	if _, err := repo.ListExperience(ctx, noProfile); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("без профиля, список: %v", err)
	}
	if _, err := repo.CreateEducation(ctx, noProfile, edu("У", 2020)); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("без профиля, создание: %v", err)
	}
	for _, other := range []string{careerUser(t, db, "employer", "active", false), careerUser(t, db, "candidate", "blocked", true)} {
		if _, err := repo.ListEducation(ctx, other); !errors.Is(err, entity.ErrForbidden) {
			t.Fatalf("список: %v", err)
		}
		if _, err := repo.CreateExperience(ctx, other, exp(t, "К", "2020-01", "")); !errors.Is(err, entity.ErrForbidden) {
			t.Fatalf("создание: %v", err)
		}
		if err := repo.DeleteExperience(ctx, other, "11111111-1111-4111-8111-111111111111"); !errors.Is(err, entity.ErrForbidden) {
			t.Fatalf("удаление: %v", err)
		}
	}
}
