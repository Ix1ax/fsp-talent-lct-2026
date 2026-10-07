//go:build integration

package integration

import (
	"context"
	"testing"
)

func TestAssessmentSchema(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	exec := func(query string, args ...any) error {
		_, err := db.Exec(ctx, query, args...)
		return err
	}
	expect := func(name, code string, err error) {
		t.Helper()
		if pgCode(err) != code {
			t.Fatalf("%s: код %q, ожидали %s (%v)", name, pgCode(err), code, err)
		}
	}
	mustFail := func(name string, err error) {
		t.Helper()
		if err == nil {
			t.Fatalf("%s: ожидали ошибку, получили успех", name)
		}
	}
	newQuestion := func(difficulty int, kind string) (string, error) {
		var id string
		err := db.QueryRow(ctx, `INSERT INTO assessment_questions(skill_id,difficulty,kind) VALUES($1,$2,$3) RETURNING id::text`, goSkill, difficulty, kind).Scan(&id)
		return id, err
	}
	version := func(question string, number int, status string) error {
		return exec(`INSERT INTO assessment_question_versions(question_id,version,prompt,grading_spec,status) VALUES($1,$2,'{"text":"a"}','{"type":"text","accepted":["x"]}',$3)`, question, number, status)
	}

	// Задания и версии.
	for name, args := range map[string][2]any{"сложность 0": {0, "choice"}, "сложность 6": {6, "choice"}, "неизвестный вид": {3, "essay"}} {
		_, err := newQuestion(args[0].(int), args[1].(string))
		expect(name, "23514", err)
	}
	q, err := newQuestion(3, "short_answer")
	if err != nil {
		t.Fatal(err)
	}
	expect("версия 0", "23514", version(q, 0, "draft"))
	expect("неизвестный статус версии", "23514", version(q, 1, "deleted"))
	if err = version(q, 1, "published"); err != nil {
		t.Fatal(err)
	}
	expect("повтор номера версии", "23505", version(q, 1, "draft"))
	expect("вторая опубликованная версия", "23505", version(q, 2, "published"))
	if err = exec(`UPDATE assessment_question_versions SET status='archived' WHERE question_id=$1 AND version=1`, q); err != nil {
		t.Fatalf("смена только статуса опубликованной версии должна проходить: %v", err)
	}
	if err = version(q, 2, "published"); err != nil {
		t.Fatalf("после архивации первой вторая публикуется: %v", err)
	}
	mustFail("правка prompt опубликованной версии", exec(`UPDATE assessment_question_versions SET prompt='{"text":"b"}' WHERE question_id=$1 AND version=2`, q))
	mustFail("правка grading_spec опубликованной версии", exec(`UPDATE assessment_question_versions SET grading_spec='{"type":"text","accepted":["y"]}' WHERE question_id=$1 AND version=2`, q))
	mustFail("правка prompt архивной версии", exec(`UPDATE assessment_question_versions SET prompt='{"text":"b"}' WHERE question_id=$1 AND version=1`, q))
	if err = version(q, 3, "draft"); err != nil {
		t.Fatal(err)
	}
	if err = exec(`UPDATE assessment_question_versions SET prompt='{"text":"черновик"}' WHERE question_id=$1 AND version=3`, q); err != nil {
		t.Fatalf("черновик можно менять: %v", err)
	}
	if err = exec(`DELETE FROM assessment_questions WHERE id=$1`, q); err != nil {
		t.Fatal(err)
	}
	var left int
	if err = db.QueryRow(ctx, `SELECT count(*) FROM assessment_question_versions WHERE question_id=$1`, q).Scan(&left); err != nil || left != 0 {
		t.Fatalf("версии должны удаляться вместе с заданием: %d (%v)", left, err)
	}

	// Шаблоны.
	template := func(version int, seconds int, pass float64, status string) (string, error) {
		var id string
		err := db.QueryRow(ctx, `INSERT INTO assessment_templates(specialization_id,grade_id,version,time_limit_sec,pass_score,status)
 VALUES((SELECT id FROM specializations WHERE code='backend'),(SELECT id FROM grades WHERE code='junior'),$1,$2,$3,$4) RETURNING id::text`, version, seconds, pass, status).Scan(&id)
		return id, err
	}
	for name, c := range map[string]struct {
		version, seconds int
		pass             float64
		status           string
	}{"версия 0": {0, 600, 60, "draft"}, "время 299": {1, 299, 60, "draft"}, "время 14401": {1, 14401, 60, "draft"}, "балл 0": {1, 600, 0, "draft"}, "балл 101": {1, 600, 101, "draft"}, "статус": {1, 600, 60, "live"}} {
		_, err := template(c.version, c.seconds, c.pass, c.status)
		expect(name, "23514", err)
	}
	t1, err := template(1, 600, 60, "draft")
	if err != nil {
		t.Fatal(err)
	}
	t2, err := template(2, 900, 70, "draft")
	if err != nil {
		t.Fatalf("две версии одной пары допустимы: %v", err)
	}
	if _, err = template(1, 600, 60, "draft"); pgCode(err) != "23505" {
		t.Fatalf("повтор версии шаблона пары: код %q (%v)", pgCode(err), err)
	}

	// Состав шаблона.
	row := func(template string, difficulty, count int, weight float64) error {
		return exec(`INSERT INTO assessment_blueprints(template_id,skill_id,difficulty,question_count,weight) VALUES($1,$2,$3,$4,$5)`, template, goSkill, difficulty, count, weight)
	}
	expect("сложность 0 в составе", "23514", row(t1, 0, 1, 1))
	expect("сложность 6 в составе", "23514", row(t1, 6, 1, 1))
	expect("количество 0", "23514", row(t1, 1, 0, 1))
	expect("количество 51", "23514", row(t1, 1, 51, 1))
	expect("вес 0", "23514", row(t1, 1, 1, 0))
	expect("вес 101", "23514", row(t1, 1, 1, 101))
	if err = row(t1, 1, 2, 1.5); err != nil {
		t.Fatalf("строка состава черновика: %v", err)
	}
	expect("повтор навыка и сложности", "23505", row(t1, 1, 3, 1))
	if err = exec(`UPDATE assessment_blueprints SET question_count=4 WHERE template_id=$1`, t1); err != nil {
		t.Fatalf("состав черновика можно менять: %v", err)
	}

	// Публикация шаблона и неизменяемость.
	if err = exec(`UPDATE assessment_templates SET status='published' WHERE id=$1`, t1); err != nil {
		t.Fatalf("смена статуса черновика: %v", err)
	}
	expect("второй опубликованный шаблон пары", "23505", exec(`UPDATE assessment_templates SET status='published' WHERE id=$1`, t2))
	mustFail("время опубликованного шаблона", exec(`UPDATE assessment_templates SET time_limit_sec=700 WHERE id=$1`, t1))
	mustFail("проходной балл опубликованного шаблона", exec(`UPDATE assessment_templates SET pass_score=50 WHERE id=$1`, t1))
	mustFail("добавление строки в опубликованный шаблон", row(t1, 2, 1, 1))
	mustFail("правка состава опубликованного шаблона", exec(`UPDATE assessment_blueprints SET question_count=1 WHERE template_id=$1`, t1))
	mustFail("удаление состава опубликованного шаблона", exec(`DELETE FROM assessment_blueprints WHERE template_id=$1`, t1))
	if err = exec(`UPDATE assessment_templates SET status='archived' WHERE id=$1`, t1); err != nil {
		t.Fatalf("архивация опубликованного шаблона: %v", err)
	}
	if err = exec(`UPDATE assessment_templates SET status='published' WHERE id=$1`, t2); err != nil {
		t.Fatalf("после архивации первого второй публикуется: %v", err)
	}

	// Журнал.
	if err = exec(`INSERT INTO assessment_events(action,entity_type,entity_id) VALUES('question.created','assessment_questions',gen_random_uuid())`); err != nil {
		t.Fatal(err)
	}
	expect("неизвестное действие журнала", "23514", exec(`INSERT INTO assessment_events(action,entity_type,entity_id) VALUES('question.exploded','assessment_questions',gen_random_uuid())`))
}
