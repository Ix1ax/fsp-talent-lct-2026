//go:build integration

package httpapi

import (
	"context"
	"testing"
)

func TestOfferSchemaConstraints(t *testing.T) {
	// Общий помощник создаёт отдельную схему и проверяет Up -> Down -> Up новой миграции.
	db := companyTestDB(t)
	ctx := context.Background()
	var employer, candidate, profile, company, otherCompany, need string
	for _, item := range []struct {
		role   string
		target *string
	}{{"employer", &employer}, {"candidate", &candidate}} {
		if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES($1) RETURNING id::text`, item.role).Scan(item.target); err != nil {
			t.Fatal(err)
		}
	}
	if err := db.QueryRow(ctx, `INSERT INTO candidate_profiles(user_id) VALUES($1) RETURNING id::text`, candidate).Scan(&profile); err != nil {
		t.Fatal(err)
	}
	for _, target := range []*string{&company, &otherCompany} {
		if err := db.QueryRow(ctx, `INSERT INTO companies(name,contact_email) VALUES('Компания','hr@example.test') RETURNING id::text`).Scan(target); err != nil {
			t.Fatal(err)
		}
	}
	if err := db.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,title,description) VALUES($1,$2,1,'Go-разработчик','Команда') RETURNING id::text`, company, employer).Scan(&need); err != nil {
		t.Fatal(err)
	}
	insert := `INSERT INTO candidate_offers(company_id,candidate_id,created_by,need_id,company_name,title,description,salary_from_rub,salary_to_rub,contact_email)
 VALUES($1,$2,$3,$4,'Компания','Go-разработчик','Продуктовая команда',150000,250000,'hr@example.test') RETURNING id::text,status`
	var id, status string
	if err := db.QueryRow(ctx, insert, company, profile, employer, need).Scan(&id, &status); err != nil {
		t.Fatal(err)
	}
	if status != "sent" {
		t.Fatalf("Начальный статус: %s", status)
	}
	var independentID string
	if err := db.QueryRow(ctx, insert, company, profile, employer, nil).Scan(&independentID, &status); err != nil {
		t.Fatalf("Предложение без потребности: %v", err)
	}
	if err := db.QueryRow(ctx, insert, otherCompany, profile, employer, need).Scan(&independentID, &status); pgCode(err) != "23503" {
		t.Fatalf("Потребность чужой компании: %v", err)
	}
	if err := db.QueryRow(ctx, insert, company, "00000000-0000-4000-8000-000000000099", employer, nil).Scan(&independentID, &status); pgCode(err) != "23503" {
		t.Fatalf("Неизвестный кандидат: %v", err)
	}
	for name, clause := range map[string]string{
		"нет нижней границы":        "salary_from_rub=NULL",
		"нет верхней границы":       "salary_to_rub=NULL",
		"нулевая зарплата":          "salary_from_rub=0",
		"обратная вилка":            "salary_from_rub=300000",
		"пустое описание":           "description='   '",
		"пустое название компании":  "company_name='   '",
		"неизвестный статус":        "status='draft'",
		"ответ без дат":             "status='accepted'",
		"просмотр без даты":         "status='viewed'",
		"отправлено с датой ответа": "responded_at=now()",
		"просмотр до создания":      "status='viewed',viewed_at=created_at-interval '1 second'",
		"ответ до просмотра":        "status='accepted',viewed_at=created_at,responded_at=created_at-interval '1 second'",
	} {
		t.Run(name, func(t *testing.T) {
			_, err := db.Exec(ctx, `UPDATE candidate_offers SET `+clause+` WHERE id=$1`, id)
			code := pgCode(err)
			if code != "23514" && code != "23502" {
				t.Fatalf("Ограничение не сработало: %v", err)
			}
		})
	}
	if _, err := db.Exec(ctx, `UPDATE candidate_offers SET status='viewed',viewed_at=now() WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `UPDATE candidate_offers SET status='accepted',responded_at=now() WHERE id=$1`, id); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(ctx, `UPDATE companies SET name='Новое имя',contact_email='new@example.test' WHERE id=$1`, company); err != nil {
		t.Fatal(err)
	}
	var name, email string
	if err := db.QueryRow(ctx, `SELECT company_name,contact_email FROM candidate_offers WHERE id=$1`, id).Scan(&name, &email); err != nil {
		t.Fatal(err)
	}
	if name != "Компания" || email != "hr@example.test" {
		t.Fatal("Изменение компании затронуло отправленное предложение")
	}
}
