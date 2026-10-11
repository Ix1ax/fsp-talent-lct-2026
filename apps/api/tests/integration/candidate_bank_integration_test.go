//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

func TestCandidateBankVisibilityAndAccess(t *testing.T) {
	f := newOfferFixture(t)
	confirmBankCandidate(t, f, "candidate")
	confirmBankCandidate(t, f, "other_candidate")
	old := f.auth.Store.Users
	f.auth = testutil.NewAuthEnvWithOptions(t, httpapi.Options{CandidateBank: service.New(repository.New(f.db))})
	f.auth.Store.Users = old
	for who := range f.tokens {
		f.tokens[who] = f.auth.Token(t, who)
	}
	base := "/api/v1/companies/" + f.company + "/candidates"
	card := base + "/" + f.profiles["candidate"]
	// Даже если контакты случайно внесли в описание, банк их не публикует.
	f.exec(t, `UPDATE candidate_profiles SET headline='mail@example.test',summary='+79991234567' WHERE id=$1`, f.profiles["candidate"])
	f.exec(t, `INSERT INTO candidate_work_formats(candidate_id,work_format_id) SELECT $1,id FROM work_formats ORDER BY id LIMIT 1`, f.profiles["candidate"])
	for _, who := range []string{"owner", "recruiter", "viewer"} {
		w := f.request(t, "GET", base, who, "", 200)
		var page entity.Page
		if err := json.Unmarshal(w.Body.Bytes(), &page); err != nil {
			t.Fatal(err)
		}
		if page.Total != 2 || len(page.Items) != 2 || page.Limit != 20 || page.Offset != 0 {
			t.Fatalf("Неверная страница: %+v", page)
		}
		for _, secret := range []string{"user_id", "email", "phone", "avatar_file_id", "summary", "headline", "+7999"} {
			if strings.Contains(w.Body.String(), secret) {
				t.Fatalf("В выдаче лишние данные: %s", w.Body)
			}
		}
		w = f.request(t, "GET", card, who, "", 200)
		var c entity.Card
		if err := json.Unmarshal(w.Body.Bytes(), &c); err != nil || len(c.WorkFormatIDs) != 1 || c.ID != f.profiles["candidate"] {
			t.Fatalf("Неверная карточка: %s", w.Body)
		}
	}
	w := f.request(t, "GET", base+"?limit=1&offset=1", "owner", "", 200)
	var page entity.Page
	json.Unmarshal(w.Body.Bytes(), &page)
	if len(page.Items) != 1 || page.Total != 2 {
		t.Fatal("Пагинация потеряла total")
	}
	w = f.request(t, "GET", base+"?offset=100", "owner", "", 200)
	if !strings.Contains(w.Body.String(), `"items":[]`) || !strings.Contains(w.Body.String(), `"total":2`) {
		t.Fatal("Пустая страница должна сохранять total")
	}
	f.request(t, "GET", base, "", "", 401)
	f.request(t, "GET", base, "candidate", "", 403)
	f.request(t, "GET", base, "blocked", "", 403)
	f.request(t, "GET", base, "outsider", "", 404)
	f.request(t, "GET", card, "outsider", "", 404)
	f.request(t, "GET", base+"/not-a-uuid", "owner", "", 400)
	for _, query := range []string{"limit=0", "limit=101", "offset=-1", "offset=10001", "limit=abc", "limit=", "offset=", "limit=1&limit=2", "grade=middle"} {
		f.request(t, "GET", base+"?"+query, "owner", "", 400)
	}
	f.exec(t, `UPDATE candidate_profiles SET search_status='passive' WHERE id=$1`, f.profiles["candidate"])
	f.request(t, "GET", card, "owner", "", 200)
	f.exec(t, `UPDATE candidate_profiles SET search_status='hidden' WHERE id=$1`, f.profiles["candidate"])
	f.request(t, "GET", card, "owner", "", 404)
	f.exec(t, `UPDATE users SET status='blocked' WHERE id=$1`, f.ids["other_candidate"])
	w = f.request(t, "GET", base, "owner", "", 200)
	if !strings.Contains(w.Body.String(), `"items":[]`) || !strings.Contains(w.Body.String(), `"total":0`) {
		t.Fatal("Скрытые и заблокированные кандидаты попали в каталог")
	}
	// Проверка в БД не должна доверять устаревшему статусу из middleware.
	f.exec(t, `UPDATE company_members SET status='inactive' WHERE company_id=$1 AND user_id=$2`, f.company, f.ids["viewer"])
	f.request(t, "GET", base, "viewer", "", 404)
	f.exec(t, `UPDATE users SET status='blocked' WHERE id=$1`, f.ids["owner"])
	f.request(t, "GET", base, "owner", "", 404)
}

func TestCandidateBankFilters(t *testing.T) {
	f := newOfferFixture(t)
	confirmBankCandidate(t, f, "candidate")
	confirmBankCandidate(t, f, "other_candidate")
	old := f.auth.Store.Users
	f.auth = testutil.NewAuthEnvWithOptions(t, httpapi.Options{CandidateBank: service.New(repository.New(f.db))})
	f.auth.Store.Users = old
	for who := range f.tokens {
		f.tokens[who] = f.auth.Token(t, who)
	}
	base := "/api/v1/companies/" + f.company + "/candidates"
	var format int16
	if err := f.db.QueryRow(context.Background(), `SELECT id FROM work_formats ORDER BY id LIMIT 1`).Scan(&format); err != nil {
		t.Fatal(err)
	}
	f.exec(t, `UPDATE candidate_profiles SET experience_months=36,salary_min_rub=180000 WHERE id=$1`, f.profiles["candidate"])
	f.exec(t, `UPDATE candidate_profiles SET experience_months=12,salary_min_rub=NULL WHERE id=$1`, f.profiles["other_candidate"])
	f.exec(t, `INSERT INTO candidate_work_formats(candidate_id,work_format_id) VALUES($1,$2)`, f.profiles["candidate"], format)
	for _, tc := range []struct {
		query string
		total int64
	}{
		{"experience_min_months=36&experience_max_months=36", 1},
		{"experience_max_months=12", 1},
		{"salary_max_rub=180000", 1}, {"salary_max_rub=179999", 0},
		{fmt.Sprintf("work_format_ids=%d", format), 1},
		{fmt.Sprintf("work_format_ids=%d&experience_min_months=36&salary_max_rub=180000&offset=1", format), 1},
		{fmt.Sprintf("work_format_ids=%d&experience_max_months=12", format), 0},
	} {
		w := f.request(t, "GET", base+"?"+tc.query, "owner", "", 200)
		var page entity.Page
		if err := json.Unmarshal(w.Body.Bytes(), &page); err != nil {
			t.Fatal(err)
		}
		if page.Total != tc.total {
			t.Fatalf("%s: %+v", tc.query, page)
		}
		if strings.Contains(tc.query, "offset=1") && len(page.Items) != 0 {
			t.Fatal("Пагинация применяется после фильтра")
		}
	}
	f.request(t, "GET", base+"?work_format_ids=32767", "owner", "", 400)
	f.exec(t, `UPDATE candidate_profiles SET search_status='hidden' WHERE id=$1`, f.profiles["candidate"])
	w := f.request(t, "GET", base+"?salary_max_rub=200000", "owner", "", 200)
	if !strings.Contains(w.Body.String(), `"total":0`) {
		t.Fatal("Фильтры раскрыли скрытый профиль")
	}
}
