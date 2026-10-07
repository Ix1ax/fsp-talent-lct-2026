//go:build integration

package integration

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// attemptFixture создаёт кандидата с профилем и находит опубликованный демо-шаблон backend Junior.
func attemptFixture(t *testing.T, db *pgxpool.Pool) (profileID, templateID string, spec, grade int16) {
	t.Helper()
	ctx := context.Background()
	var user string
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1) RETURNING id::text`, user).Scan(&profileID); err != nil {
		t.Fatal(err)
	}
	spec, grade = pairIDs(t, db, "backend", "junior")
	if err := db.QueryRow(ctx, `SELECT id::text FROM assessment_templates WHERE specialization_id=$1 AND grade_id=$2 AND status='published'`, spec, grade).Scan(&templateID); err != nil {
		t.Fatal(err)
	}
	return
}

func insertAttempt(db *pgxpool.Pool, profile, template string, spec, grade int16, status string, score any) error {
	finished := "NULL"
	if status != "active" {
		finished = "now()"
	}
	_, err := db.Exec(context.Background(), `INSERT INTO assessment_attempts(candidate_id,template_id,specialization_id,grade_id,status,deadline_at,finished_at,time_limit_sec,pass_score,score_percent)
 VALUES($1,$2,$3,$4,$5,now()+interval '30 minutes',`+finished+`,1800,60,$6)`, profile, template, spec, grade, status, score)
	return err
}

func TestAttemptSchemaConstraints(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	profile, template, spec, grade := attemptFixture(t, db)

	if err := insertAttempt(db, profile, template, spec, grade, "active", nil); err != nil {
		t.Fatal(err)
	}
	if err := insertAttempt(db, profile, template, spec, grade, "active", nil); pgCode(err) != "23505" {
		t.Fatalf("вторая активная попытка: %v", err)
	}
	for i := 0; i < 2; i++ {
		if err := insertAttempt(db, profile, template, spec, grade, "passed", 80); err != nil {
			t.Fatalf("закрытых попыток может быть несколько: %v", err)
		}
	}
	if err := insertAttempt(db, profile, template, spec, grade, "bogus", nil); pgCode(err) != "23514" {
		t.Fatalf("неизвестный статус: %v", err)
	}
	if err := insertAttempt(db, profile, template, spec, grade, "failed", 101); pgCode(err) != "23514" {
		t.Fatalf("процент больше 100: %v", err)
	}

	// Активная попытка с заданиями и ответом.
	var attempt, question string
	if err := db.QueryRow(ctx, `SELECT id::text FROM assessment_attempts WHERE status='active'`).Scan(&attempt); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(ctx, `INSERT INTO attempt_questions(attempt_id,position,question_version_id,skill_id,difficulty,points,prompt_snapshot,grading_snapshot)
 SELECT $1,1,v.id,q.skill_id,q.difficulty,1,v.prompt,v.grading_spec FROM assessment_question_versions v JOIN assessment_questions q ON q.id=v.question_id WHERE v.status='published' LIMIT 1 RETURNING id::text`, attempt).Scan(&question); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO attempt_answers(attempt_question_id,answer) VALUES($1,'{"text":"x"}')`, question); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `UPDATE attempt_questions SET prompt_snapshot='{}' WHERE id=$1`, question); err == nil {
		t.Fatal("снимок задания должен быть неизменяемым")
	}
	if _, err := db.Exec(ctx, `DELETE FROM assessment_question_versions WHERE id=(SELECT question_version_id FROM attempt_questions WHERE id=$1)`, question); pgCode(err) != "23503" {
		t.Fatalf("использованную версию удалить нельзя: %v", err)
	}
	if _, err := db.Exec(ctx, `DELETE FROM assessment_templates WHERE id=$1`, template); pgCode(err) != "23503" {
		t.Fatalf("использованный шаблон удалить нельзя: %v", err)
	}

	// Закрытую попытку и ответы в ней менять нельзя.
	if _, err := db.Exec(ctx, `UPDATE assessment_attempts SET status='passed',finished_at=now(),score_percent=90 WHERE id=$1`, attempt); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `UPDATE assessment_attempts SET score_percent=10 WHERE id=$1`, attempt); err == nil {
		t.Fatal("закрытая попытка должна быть неизменяемой")
	}
	if _, err := db.Exec(ctx, `UPDATE attempt_answers SET answer='{"text":"y"}' WHERE attempt_question_id=$1`, question); err == nil {
		t.Fatal("ответ закрытой попытки должен быть неизменяемым")
	}

	// Итоги: уровень 1–5, одно подтверждение теста на навык, одна запись истории на попытку, категория по кандидату.
	if _, err := db.Exec(ctx, `INSERT INTO skill_evidence(candidate_id,skill_id,source,level,attempt_id) VALUES($1,$2,'test',6,$3)`, profile, goSkill, attempt); pgCode(err) != "23514" {
		t.Fatalf("уровень 6: %v", err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO skill_evidence(candidate_id,skill_id,source,level,attempt_id) VALUES($1,$2,'test',3,$3)`, profile, goSkill, attempt); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO skill_evidence(candidate_id,skill_id,source,level,attempt_id) VALUES($1,$2,'test',4,$3)`, profile, goSkill, attempt); pgCode(err) != "23505" {
		t.Fatalf("второе подтверждение теста по навыку: %v", err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO grade_history(candidate_id,specialization_id,grade_id,attempt_id) VALUES($1,$2,$3,$4)`, profile, spec, grade, attempt); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `INSERT INTO grade_history(candidate_id,specialization_id,grade_id,attempt_id) VALUES($1,$2,$3,$4)`, profile, spec, grade, attempt); pgCode(err) != "23505" {
		t.Fatalf("две записи истории на попытку: %v", err)
	}
	for i := 0; i < 2; i++ {
		_, err := db.Exec(ctx, `INSERT INTO candidate_categories(candidate_id,specialization_id,grade_id,attempt_id) VALUES($1,$2,$3,$4)`, profile, spec, grade, attempt)
		if (i == 0) != (err == nil) || (i == 1 && pgCode(err) != "23505") {
			t.Fatalf("категория кандидата одна, шаг %d: %v", i, err)
		}
	}

	// Удаление профиля убирает попытки и итоги целиком.
	if _, err := db.Exec(ctx, `DELETE FROM candidate_profiles WHERE id=$1`, profile); err != nil {
		t.Fatalf("удаление профиля: %v", err)
	}
	var left int
	if err := db.QueryRow(ctx, `SELECT (SELECT count(*) FROM assessment_attempts)+(SELECT count(*) FROM attempt_questions)+(SELECT count(*) FROM skill_evidence)+(SELECT count(*) FROM grade_history)+(SELECT count(*) FROM candidate_categories)`).Scan(&left); err != nil || left != 0 {
		t.Fatalf("после удаления профиля осталось %d строк (%v)", left, err)
	}
}
