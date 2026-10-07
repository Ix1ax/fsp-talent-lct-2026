//go:build integration

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/entity"
	assessmentrepo "github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/assessment/repository"
)

func strictJSON(t *testing.T, raw []byte, target any) {
	t.Helper()
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(target); err != nil {
		t.Fatalf("неверный JSON демо-банка: %v: %s", err, raw)
	}
}

func TestAssessmentDemoBank(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	repo := assessmentrepo.New(db)

	// Опубликованные шаблоны демо-банка и достаточность заданий (с запасом на каждую строку).
	for _, c := range []struct {
		spec     string
		seconds  int
		skills   []string
		rowCount int
	}{{"backend", 1800, []string{"Go", "SQL", "Git"}, 5}, {"frontend", 1500, []string{"JavaScript", "TypeScript", "React"}, 4}} {
		var id string
		var published int
		if err := db.QueryRow(ctx, `SELECT count(*) FROM assessment_templates t WHERE t.status='published' AND t.specialization_id=(SELECT id FROM specializations WHERE code=$1) AND t.grade_id=(SELECT id FROM grades WHERE code='junior')`, c.spec).Scan(&published); err != nil || published != 1 {
			t.Fatalf("%s: опубликованных шаблонов %d (%v)", c.spec, published, err)
		}
		if err := db.QueryRow(ctx, `SELECT id::text FROM assessment_templates WHERE status='published' AND specialization_id=(SELECT id FROM specializations WHERE code=$1)`, c.spec).Scan(&id); err != nil {
			t.Fatal(err)
		}
		tpl, err := repo.GetTemplate(ctx, id)
		if err != nil {
			t.Fatal(err)
		}
		if tpl.TimeLimitSec != c.seconds || tpl.PassScore != 60 || tpl.Version != 1 || tpl.PublishedAt == nil {
			t.Fatalf("%s: параметры шаблона %+v", c.spec, tpl)
		}
		if len(tpl.Blueprint) != c.rowCount {
			t.Fatalf("%s: строк состава %d, ожидали %d", c.spec, len(tpl.Blueprint), c.rowCount)
		}
		names := map[string]bool{}
		for _, row := range tpl.Blueprint {
			names[row.SkillName] = true
			if row.Available < row.QuestionCount+1 {
				t.Fatalf("%s: %s сложности %d: доступно %d заданий, нужно %d плюс запас", c.spec, row.SkillName, row.Difficulty, row.Available, row.QuestionCount)
			}
		}
		for _, skill := range c.skills {
			if !names[skill] {
				t.Fatalf("%s: в составе нет навыка %s", c.spec, skill)
			}
		}
	}

	// Каждое демо-задание: одна опубликованная версия, содержимое проходит проверку формата, навык из списка.
	rows, err := db.Query(ctx, `SELECT q.kind,s.code,q.difficulty,count(v.*),min(v.status),v.prompt,v.grading_spec
 FROM assessment_questions q JOIN skills s ON s.id=q.skill_id JOIN assessment_question_versions v ON v.question_id=q.id
 WHERE q.created_by IS NULL GROUP BY q.id,s.code,v.prompt,v.grading_spec ORDER BY q.id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	allowed := map[string]bool{"go": true, "sql": true, "git": true, "javascript": true, "typescript": true, "react": true}
	total := 0
	for rows.Next() {
		var kind, skill, status string
		var difficulty int16
		var versions int
		var prompt, spec []byte
		if err = rows.Scan(&kind, &skill, &difficulty, &versions, &status, &prompt, &spec); err != nil {
			t.Fatal(err)
		}
		var p entity.Prompt
		var g entity.GradingSpec
		strictJSON(t, prompt, &p)
		strictJSON(t, spec, &g)
		if err = entity.ValidateContent(kind, &p, &g); err != nil {
			t.Fatalf("задание %s сложности %d (%s): %v", skill, difficulty, kind, err)
		}
		if !allowed[skill] || versions != 1 || status != "published" {
			t.Fatalf("задание %s: версий %d, статус %s", skill, versions, status)
		}
		total++
	}
	if err = rows.Err(); err != nil {
		t.Fatal(err)
	}
	if total != 32 {
		t.Fatalf("демо-заданий %d, ожидали 32", total)
	}
}
