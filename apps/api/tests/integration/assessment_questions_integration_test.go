//go:build integration

package integration

import (
	"context"
	"errors"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	adminrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/repository"
	adminservice "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admin/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
)

// assessmentAdmin создаёт администратора и возвращает его ID (для автора заданий и журнала).
func assessmentAdmin(t *testing.T, db *pgxpool.Pool) string {
	t.Helper()
	ctx := context.Background()
	if err := adminservice.New(adminrepo.New(db)).Bootstrap(ctx, "assessments@example.test", "Assessments-Admin-Password-2026"); err != nil {
		t.Fatal(err)
	}
	var id string
	if err := db.QueryRow(ctx, `SELECT id::text FROM admin_accounts ORDER BY created_at LIMIT 1`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func shortQuestion(skill string, difficulty int16) entity.QuestionInput {
	return entity.QuestionInput{SkillID: skill, Difficulty: difficulty, Kind: entity.KindShortAnswer,
		Prompt: entity.Prompt{Text: "Какая команда показывает статус репозитория?"}, GradingSpec: entity.GradingSpec{Type: "text", Accepted: []string{"git status"}}}
}

func newSkill(t *testing.T, db *pgxpool.Pool, code string, active bool, status string) string {
	t.Helper()
	var id string
	if err := db.QueryRow(context.Background(), `INSERT INTO skills(code,name,active,moderation_status) VALUES($1,$2,$3,$4) RETURNING id::text`, code, "Навык "+code, active, status).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

func TestAssessmentQuestions(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	admin := assessmentAdmin(t, db)
	var validation *entity.ValidationError

	// Навык должен существовать, быть активным и одобренным.
	for name, skill := range map[string]string{
		"неизвестный":      "11111111-1111-4111-8111-111111111111",
		"выключенный":      newSkill(t, db, "off", false, "approved"),
		"ожидает проверки": newSkill(t, db, "wait", false, "pending"),
	} {
		if _, err := repo.CreateQuestion(ctx, admin, shortQuestion(skill, 2)); !errors.As(err, &validation) {
			t.Fatalf("навык %s: ожидали ValidationError, получили %v", name, err)
		}
	}

	q, err := repo.CreateQuestion(ctx, admin, shortQuestion(goSkill, 2))
	if err != nil {
		t.Fatal(err)
	}
	if q.ID == "" || q.SkillName != "Go" || q.Difficulty != 2 || q.Kind != entity.KindShortAnswer || !q.Active || q.LatestVersion != 1 || q.PublishedVersion != nil || len(q.Versions) != 1 {
		t.Fatalf("созданное задание: %+v", q)
	}
	if v := q.Versions[0]; v.Version != 1 || v.Status != entity.StatusDraft || v.Prompt.Text == "" || v.GradingSpec.Accepted[0] != "git status" || v.PublishedAt != nil {
		t.Fatalf("версия 1: %+v", v)
	}

	// Версии нумеруются без пропусков.
	good := entity.VersionInput{Prompt: entity.Prompt{Text: "Уточнённый вопрос"}, GradingSpec: entity.GradingSpec{Type: "text", Accepted: []string{"git status", "git st"}}}
	for want := 2; want <= 3; want++ {
		v, err := repo.CreateVersion(ctx, admin, q.ID, good)
		if err != nil || v.Version != want || v.Status != entity.StatusDraft {
			t.Fatalf("версия %d: %+v %v", want, v, err)
		}
	}
	if _, err = repo.CreateVersion(ctx, admin, "22222222-2222-4222-8222-222222222222", good); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("версия несуществующего задания: %v", err)
	}

	// Публикация и замена опубликованной версии.
	v2, err := repo.PublishVersion(ctx, admin, q.ID, 2)
	if err != nil || v2.Status != entity.StatusPublished || v2.PublishedAt == nil {
		t.Fatalf("публикация версии 2: %+v %v", v2, err)
	}
	if got, _ := repo.GetQuestion(ctx, q.ID); got.PublishedVersion == nil || *got.PublishedVersion != 2 || got.LatestVersion != 3 {
		t.Fatalf("после публикации 2: %+v", got)
	}
	if _, err = repo.PublishVersion(ctx, admin, q.ID, 3); err != nil {
		t.Fatal(err)
	}
	got, _ := repo.GetQuestion(ctx, q.ID)
	statuses := map[int]string{}
	for _, v := range got.Versions {
		statuses[v.Version] = v.Status
	}
	if statuses[1] != "draft" || statuses[2] != "archived" || statuses[3] != "published" || *got.PublishedVersion != 3 {
		t.Fatalf("статусы после публикации версии 3: %v", statuses)
	}
	if _, err = repo.PublishVersion(ctx, admin, q.ID, 3); !errors.Is(err, entity.ErrConflict) {
		t.Fatalf("повторная публикация: %v", err)
	}
	if _, err = repo.PublishVersion(ctx, admin, q.ID, 2); !errors.Is(err, entity.ErrConflict) {
		t.Fatalf("публикация архивной версии: %v", err)
	}
	if _, err = repo.PublishVersion(ctx, admin, q.ID, 99); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("несуществующая версия: %v", err)
	}
	if _, err = repo.PublishVersion(ctx, admin, "22222222-2222-4222-8222-222222222222", 1); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("несуществующее задание: %v", err)
	}

	// Выключенное задание: новые версии и публикация невозможны, статусы версий не меняются.
	archived, err := repo.ArchiveQuestion(ctx, admin, q.ID)
	if err != nil || archived.Active {
		t.Fatalf("архивирование: %+v %v", archived, err)
	}
	if _, err = repo.ArchiveQuestion(ctx, admin, q.ID); !errors.Is(err, entity.ErrConflict) {
		t.Fatalf("повторное архивирование: %v", err)
	}
	if _, err = repo.CreateVersion(ctx, admin, q.ID, good); !errors.Is(err, entity.ErrConflict) {
		t.Fatalf("версия выключенного задания: %v", err)
	}
	if _, err = repo.PublishVersion(ctx, admin, q.ID, 1); !errors.Is(err, entity.ErrConflict) {
		t.Fatalf("публикация у выключенного задания: %v", err)
	}
	if after, _ := repo.GetQuestion(ctx, q.ID); *after.PublishedVersion != 3 {
		t.Fatalf("архивирование задания не должно менять статусы версий: %+v", after)
	}
	if _, err = repo.ArchiveQuestion(ctx, admin, "22222222-2222-4222-8222-222222222222"); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("архивирование несуществующего: %v", err)
	}

	// Список и фильтры.
	for _, in := range []entity.QuestionInput{shortQuestion(goSkill, 1), shortQuestion(goSkill, 3), shortQuestion(jsSkill, 3)} {
		created, err := repo.CreateQuestion(ctx, admin, in)
		if err != nil {
			t.Fatal(err)
		}
		if in.SkillID == jsSkill {
			if _, err = repo.PublishVersion(ctx, admin, created.ID, 1); err != nil {
				t.Fatal(err)
			}
		}
	}
	list := func(f entity.QuestionFilter) entity.QuestionPage {
		t.Helper()
		if f.Limit == 0 {
			f.Limit = 20
		}
		page, err := repo.ListQuestions(ctx, f)
		if err != nil {
			t.Fatal(err)
		}
		return page
	}
	yes, no := true, false
	for name, c := range map[string]struct {
		filter entity.QuestionFilter
		total  int64
	}{
		"все":                {entity.QuestionFilter{}, 4},
		"навык Go":           {entity.QuestionFilter{SkillID: goSkill}, 3},
		"сложность 3":        {entity.QuestionFilter{Difficulty: 3}, 2},
		"вид short_answer":   {entity.QuestionFilter{Kind: entity.KindShortAnswer}, 4},
		"вид choice":         {entity.QuestionFilter{Kind: entity.KindChoice}, 0},
		"только активные":    {entity.QuestionFilter{Active: &yes}, 3},
		"только выключенные": {entity.QuestionFilter{Active: &no}, 1},
		"с опубликованной":   {entity.QuestionFilter{Status: entity.StatusPublished}, 2},
		"с черновиком":       {entity.QuestionFilter{Status: entity.StatusDraft}, 3},
	} {
		if page := list(c.filter); page.Total != c.total || int64(len(page.Items)) != c.total {
			t.Fatalf("%s: total %d, элементов %d, ожидали %d", name, page.Total, len(page.Items), c.total)
		}
	}
	if page := list(entity.QuestionFilter{Limit: 2}); len(page.Items) != 2 || page.Total != 4 {
		t.Fatalf("страница: %+v", page)
	}
	if page := list(entity.QuestionFilter{Limit: 2, Offset: 3}); len(page.Items) != 1 {
		t.Fatalf("последняя страница: %d", len(page.Items))
	}
	if page := list(entity.QuestionFilter{}); page.Items[0].Versions != nil {
		t.Fatal("в списке версии не возвращаются")
	}

	// Журнал: действия администратора записаны.
	counts := map[string]int{}
	rows, err := db.Query(ctx, `SELECT action,count(*) FROM assessment_events WHERE actor_id=$1 GROUP BY action`, admin)
	if err != nil {
		t.Fatal(err)
	}
	for rows.Next() {
		var action string
		var n int
		if err = rows.Scan(&action, &n); err != nil {
			t.Fatal(err)
		}
		counts[action] = n
	}
	rows.Close()
	if counts["question.created"] != 4 || counts["question.version_created"] != 2 || counts["question.version_published"] != 3 || counts["question.archived"] != 1 {
		t.Fatalf("журнал: %v", counts)
	}
}

// Параллельная публикация разных версий одного задания: в итоге ровно одна опубликованная.
func TestAssessmentPublishConcurrency(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	admin := assessmentAdmin(t, db)
	q, err := repo.CreateQuestion(ctx, admin, shortQuestion(goSkill, 2))
	if err != nil {
		t.Fatal(err)
	}
	good := entity.VersionInput{Prompt: entity.Prompt{Text: "Вопрос"}, GradingSpec: entity.GradingSpec{Type: "text", Accepted: []string{"x"}}}
	for i := 0; i < 9; i++ {
		if _, err = repo.CreateVersion(ctx, admin, q.ID, good); err != nil {
			t.Fatal(err)
		}
	}
	var wg sync.WaitGroup
	for version := 1; version <= 10; version++ {
		wg.Add(1)
		go func(version int) {
			defer wg.Done()
			if _, err := repo.PublishVersion(ctx, admin, q.ID, version); err != nil && !errors.Is(err, entity.ErrConflict) {
				t.Errorf("версия %d: %v", version, err)
			}
		}(version)
	}
	wg.Wait()
	var published int
	if err = db.QueryRow(ctx, `SELECT count(*) FROM assessment_question_versions WHERE question_id=$1 AND status='published'`, q.ID).Scan(&published); err != nil || published != 1 {
		t.Fatalf("опубликованных версий %d (%v)", published, err)
	}
}
