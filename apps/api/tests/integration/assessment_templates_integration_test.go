//go:build integration

package integration

import (
	"context"
	"errors"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
)

func pairIDs(t *testing.T, db *pgxpool.Pool, spec, grade string) (int16, int16) {
	t.Helper()
	var s, g int16
	if err := db.QueryRow(context.Background(), `SELECT (SELECT id FROM specializations WHERE code=$1),(SELECT id FROM grades WHERE code=$2)`, spec, grade).Scan(&s, &g); err != nil {
		t.Fatal(err)
	}
	return s, g
}

// publishedQuestion создаёт задание и публикует его первую версию.
func publishedQuestion(t *testing.T, repo *assessmentrepo.Repository, admin, skill string, difficulty int16) string {
	t.Helper()
	ctx := context.Background()
	q, err := repo.CreateQuestion(ctx, admin, shortQuestion(skill, difficulty))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.PublishVersion(ctx, admin, q.ID, 1); err != nil {
		t.Fatal(err)
	}
	return q.ID
}

func goTemplate(spec, grade int16) entity.TemplateInput {
	return entity.TemplateInput{SpecializationID: spec, GradeID: grade, TimeLimitSec: 1800, PassScore: 60, Blueprint: []entity.BlueprintRow{
		{SkillID: goSkill, Difficulty: 1, QuestionCount: 2, Weight: 1},
		{SkillID: goSkill, Difficulty: 2, QuestionCount: 1, Weight: 2.5},
	}}
}

func availability(t *testing.T, repo *assessmentrepo.Repository, id string) map[int16]int {
	t.Helper()
	tpl, err := repo.GetTemplate(context.Background(), id)
	if err != nil {
		t.Fatal(err)
	}
	result := map[int16]int{}
	for _, row := range tpl.Blueprint {
		result[row.Difficulty] = row.Available
	}
	return result
}

func TestAssessmentTemplates(t *testing.T) {
	db := testDB(t)
	clearDemoBank(t, db)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	admin := assessmentAdmin(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	var validation *entity.ValidationError

	// Создание и версии пары.
	first, err := repo.CreateTemplate(ctx, admin, goTemplate(spec, grade))
	if err != nil {
		t.Fatal(err)
	}
	if first.Version != 1 || first.Status != entity.StatusDraft || first.TimeLimitSec != 1800 || first.PassScore != 60 || len(first.Blueprint) != 2 {
		t.Fatalf("созданный шаблон: %+v", first)
	}
	if row := first.Blueprint[0]; row.SkillName != "Go" || row.Difficulty != 1 || row.QuestionCount != 2 || row.Weight != 1 || row.Available != 0 {
		t.Fatalf("строка состава: %+v", row)
	}
	if first.Blueprint[1].Weight != 2.5 {
		t.Fatalf("вес 2.5 должен сохраняться: %+v", first.Blueprint[1])
	}
	second, err := repo.CreateTemplate(ctx, admin, goTemplate(spec, grade))
	if err != nil || second.Version != 2 {
		t.Fatalf("вторая версия пары: %+v %v", second, err)
	}

	// Ссылки на справочники проверяются.
	inactiveSkill := newSkill(t, db, "retired", false, "approved")
	pendingSkill := newSkill(t, db, "pending", false, "pending")
	if _, err = db.Exec(ctx, `UPDATE specializations SET active=false WHERE code='devops'; UPDATE grades SET active=false WHERE code='intern'`); err != nil {
		t.Fatal(err)
	}
	devops, intern := func() int16 { s, _ := pairIDs(t, db, "devops", "junior"); return s }(), func() int16 { _, g := pairIDs(t, db, "backend", "intern"); return g }()
	for name, mutate := range map[string]func(*entity.TemplateInput){
		"неизвестная специализация": func(in *entity.TemplateInput) { in.SpecializationID = 999 },
		"неизвестный грейд":         func(in *entity.TemplateInput) { in.GradeID = 999 },
		"выключенная специализация": func(in *entity.TemplateInput) { in.SpecializationID = devops },
		"выключенный грейд":         func(in *entity.TemplateInput) { in.GradeID = intern },
		"неизвестный навык":         func(in *entity.TemplateInput) { in.Blueprint[0].SkillID = "11111111-1111-4111-8111-111111111111" },
		"выключенный навык":         func(in *entity.TemplateInput) { in.Blueprint[0].SkillID = inactiveSkill },
		"навык на модерации":        func(in *entity.TemplateInput) { in.Blueprint[0].SkillID = pendingSkill },
	} {
		in := goTemplate(spec, grade)
		mutate(&in)
		if _, err := repo.CreateTemplate(ctx, admin, in); !errors.As(err, &validation) {
			t.Fatalf("%s: ожидали ValidationError, получили %v", name, err)
		}
	}

	// Нехватка заданий: в банке одно опубликованное задание Go сложности 1.
	publishedQuestion(t, repo, admin, goSkill, 1)
	var shortage *entity.InsufficientError
	if _, err = repo.PublishTemplate(ctx, admin, first.ID); !errors.As(err, &shortage) {
		t.Fatalf("публикация при нехватке: %v", err)
	}
	got := map[int16][2]int{}
	for _, item := range shortage.Items {
		if item.SkillID != goSkill {
			t.Fatalf("навык в перечне нехватки: %+v", item)
		}
		got[item.Difficulty] = [2]int{item.Required, item.Available}
	}
	if len(got) != 2 || got[1] != [2]int{2, 1} || got[2] != [2]int{1, 0} {
		t.Fatalf("перечень нехватки: %+v", shortage.Items)
	}
	if after, _ := repo.GetTemplate(ctx, first.ID); after.Status != entity.StatusDraft || after.PublishedAt != nil {
		t.Fatalf("неудачная публикация не должна ничего менять: %+v", after)
	}
	if av := availability(t, repo, first.ID); av[1] != 1 || av[2] != 0 {
		t.Fatalf("доступно: %+v", av)
	}

	// Что не засчитывается в доступные задания.
	if _, err = repo.CreateQuestion(ctx, admin, shortQuestion(goSkill, 1)); err != nil { // только черновик
		t.Fatal(err)
	}
	disabled := publishedQuestion(t, repo, admin, goSkill, 1)
	if _, err = repo.ArchiveQuestion(ctx, admin, disabled); err != nil { // выключено
		t.Fatal(err)
	}
	archivedVersion, err := repo.CreateQuestion(ctx, admin, shortQuestion(goSkill, 1))
	if err != nil {
		t.Fatal(err)
	}
	if _, err = repo.PublishVersion(ctx, admin, archivedVersion.ID, 1); err != nil {
		t.Fatal(err)
	}
	if _, err = repo.CreateVersion(ctx, admin, archivedVersion.ID, entity.VersionInput{Prompt: entity.Prompt{Text: "Новая версия"}, GradingSpec: entity.GradingSpec{Type: "text", Accepted: []string{"x"}}}); err != nil {
		t.Fatal(err)
	}
	// Здесь есть опубликованная версия 1, она засчитывается; версия 2 (черновик) нет. Проверим архивную версию ниже.
	publishedQuestion(t, repo, admin, goSkill, 3) // другая сложность
	publishedQuestion(t, repo, admin, jsSkill, 1) // другой навык
	if av := availability(t, repo, first.ID); av[1] != 2 || av[2] != 0 {
		t.Fatalf("после посторонних заданий ожидали d1=2 (опубликованные: первое и «archivedVersion»), d2=0, получили %+v", av)
	}
	if _, err = repo.PublishVersion(ctx, admin, archivedVersion.ID, 2); err != nil { // версия 1 архивируется, версия 2 публикуется
		t.Fatal(err)
	}
	if av := availability(t, repo, first.ID); av[1] != 2 {
		t.Fatalf("замена версии не должна менять число заданий: %+v", av)
	}

	// Достаточный банк: публикация проходит, предыдущий опубликованный шаблон пары архивируется.
	publishedQuestion(t, repo, admin, goSkill, 2)
	published, err := repo.PublishTemplate(ctx, admin, first.ID)
	if err != nil || published.Status != entity.StatusPublished || published.PublishedAt == nil {
		t.Fatalf("публикация первого шаблона: %+v %v", published, err)
	}
	if _, err = repo.PublishTemplate(ctx, admin, first.ID); !errors.Is(err, entity.ErrConflict) {
		t.Fatalf("повторная публикация: %v", err)
	}
	next, err := repo.PublishTemplate(ctx, admin, second.ID)
	if err != nil || next.Status != entity.StatusPublished {
		t.Fatalf("публикация второго шаблона: %+v %v", next, err)
	}
	if prev, _ := repo.GetTemplate(ctx, first.ID); prev.Status != entity.StatusArchived {
		t.Fatalf("предыдущий опубликованный шаблон пары должен архивироваться: %+v", prev)
	}
	if _, err = repo.PublishTemplate(ctx, admin, first.ID); !errors.Is(err, entity.ErrConflict) {
		t.Fatalf("публикация архивного шаблона: %v", err)
	}
	if _, err = repo.PublishTemplate(ctx, admin, "22222222-2222-4222-8222-222222222222"); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("публикация несуществующего: %v", err)
	}

	// Архивирование.
	archived, err := repo.ArchiveTemplate(ctx, admin, second.ID)
	if err != nil || archived.Status != entity.StatusArchived {
		t.Fatalf("архивирование: %+v %v", archived, err)
	}
	if _, err = repo.ArchiveTemplate(ctx, admin, second.ID); !errors.Is(err, entity.ErrConflict) {
		t.Fatalf("повторное архивирование: %v", err)
	}
	if _, err = repo.ArchiveTemplate(ctx, admin, "22222222-2222-4222-8222-222222222222"); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("архивирование несуществующего: %v", err)
	}
	if _, err = repo.GetTemplate(ctx, "22222222-2222-4222-8222-222222222222"); !errors.Is(err, entity.ErrNotFound) {
		t.Fatalf("чтение несуществующего: %v", err)
	}

	// Список и фильтры.
	other, err := repo.CreateTemplate(ctx, admin, goTemplate(func() int16 { s, _ := pairIDs(t, db, "frontend", "junior"); return s }(), grade))
	if err != nil {
		t.Fatal(err)
	}
	frontend, _ := pairIDs(t, db, "frontend", "junior")
	for name, c := range map[string]struct {
		filter entity.TemplateFilter
		total  int64
	}{
		"все":            {entity.TemplateFilter{}, 3},
		"backend":        {entity.TemplateFilter{SpecializationID: spec}, 2},
		"frontend":       {entity.TemplateFilter{SpecializationID: frontend}, 1},
		"грейд junior":   {entity.TemplateFilter{GradeID: grade}, 3},
		"архивные":       {entity.TemplateFilter{Status: entity.StatusArchived}, 2},
		"черновики":      {entity.TemplateFilter{Status: entity.StatusDraft}, 1},
		"опубликованные": {entity.TemplateFilter{Status: entity.StatusPublished}, 0},
	} {
		c.filter.Limit = 20
		page, err := repo.ListTemplates(ctx, c.filter)
		if err != nil || page.Total != c.total || int64(len(page.Items)) != c.total {
			t.Fatalf("%s: %+v %v", name, page, err)
		}
		for _, item := range page.Items {
			if item.Blueprint != nil {
				t.Fatalf("%s: в списке состав не возвращается", name)
			}
		}
	}
	_ = other

	// Журнал.
	counts := map[string]int{}
	rows, err := db.Query(ctx, `SELECT action,count(*) FROM assessment_events WHERE actor_id=$1 AND action LIKE 'template.%' GROUP BY action`, admin)
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
	if counts["template.created"] != 3 || counts["template.published"] != 2 || counts["template.archived"] != 1 {
		t.Fatalf("журнал: %v", counts)
	}
}

// Два черновика шаблонов одной пары публикуются параллельно: в итоге ровно один опубликованный.
func TestAssessmentTemplatePublishConcurrency(t *testing.T) {
	db := testDB(t)
	clearDemoBank(t, db)
	ctx := context.Background()
	repo := assessmentrepo.New(db)
	admin := assessmentAdmin(t, db)
	spec, grade := pairIDs(t, db, "backend", "junior")
	publishedQuestion(t, repo, admin, goSkill, 1)
	publishedQuestion(t, repo, admin, goSkill, 1)
	publishedQuestion(t, repo, admin, goSkill, 2)
	var ids []string
	for i := 0; i < 6; i++ {
		tpl, err := repo.CreateTemplate(ctx, admin, goTemplate(spec, grade))
		if err != nil {
			t.Fatal(err)
		}
		ids = append(ids, tpl.ID)
	}
	var wg sync.WaitGroup
	for _, id := range ids {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			if _, err := repo.PublishTemplate(ctx, admin, id); err != nil && !errors.Is(err, entity.ErrConflict) {
				t.Errorf("шаблон %s: %v", id, err)
			}
		}(id)
	}
	wg.Wait()
	var published int
	if err := db.QueryRow(ctx, `SELECT count(*) FROM assessment_templates WHERE specialization_id=$1 AND grade_id=$2 AND status='published'`, spec, grade).Scan(&published); err != nil || published != 1 {
		t.Fatalf("опубликованных шаблонов пары %d (%v)", published, err)
	}
}
