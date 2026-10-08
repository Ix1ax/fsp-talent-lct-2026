//go:build integration

package integration

import (
	"encoding/json"
	"strings"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

func TestCandidateDetailsDataAndPrivacy(t *testing.T) {
	f := newOfferFixture(t)
	confirmBankCandidate(t, f, "candidate")
	grantConsentRows(t, f.db, f.ids["other_candidate"], "processing", "publication")
	old := f.auth.Store.Users
	f.auth = testutil.NewAuthEnvWithOptions(t, httpapi.Options{CandidateBank: service.New(repository.New(f.db))})
	f.auth.Store.Users = old
	for who := range f.tokens {
		f.tokens[who] = f.auth.Token(t, who)
	}
	id := f.profiles["candidate"]
	f.exec(t, `UPDATE candidate_profiles SET headline='secret@example.test',summary='+79998887766' WHERE id=$1`, id)
	f.exec(t, `UPDATE candidate_skills SET claimed_level=2 WHERE candidate_id=$1 AND skill_id=$2`, id, goSkill)
	f.exec(t, `INSERT INTO candidate_experiences(candidate_id,company,position,started_on,description) VALUES($1,'secret@example.test','+79998887766','2024-05-01','telegram-secret')`, id)
	f.exec(t, `INSERT INTO candidate_experiences(candidate_id,company,position,started_on,ended_on) VALUES($1,'Компания','Разработчик','2022-01-01','2023-12-01')`, id)
	f.exec(t, `INSERT INTO candidate_education(candidate_id,level,institution,specialty,graduation_year) VALUES($1,'higher','secret@example.test','telegram-secret',2023)`, id)
	base := "/api/v1/companies/" + f.company + "/candidates/"
	for _, who := range []string{"owner", "recruiter", "viewer"} {
		w := f.request(t, "GET", base+id, who, "", 200)
		if w.Header().Get("Cache-Control") != "private, no-store" {
			t.Fatal("Карточка допускает кеширование")
		}
		var d entity.Details
		if err := json.Unmarshal(w.Body.Bytes(), &d); err != nil {
			t.Fatal(err)
		}
		if d.Category == nil || d.Assessment == nil || d.Assessment.ScorePercent != 100 || d.Assessment.ConfirmedAt.IsZero() {
			t.Fatalf("Нет результата подтверждения: %s", w.Body)
		}
		if len(d.Experience) != 2 || d.Experience[0].StartedOn != "2024-05" || d.Experience[0].EndedOn != nil || *d.Experience[1].EndedOn != "2023-12" {
			t.Fatalf("Неверные периоды: %+v", d.Experience)
		}
		if len(d.Education) != 1 || d.Education[0].Level != "higher" || d.Education[0].GraduationYear != 2023 {
			t.Fatalf("Неверное образование: %+v", d.Education)
		}
		found := false
		for _, sk := range d.Skills {
			if sk.ID == goSkill {
				found = true
				if sk.ClaimedLevel == nil || *sk.ClaimedLevel != 2 || sk.VerifiedLevel == nil || sk.Source != "test" {
					t.Fatalf("Уровни смешаны: %+v", sk)
				}
			}
		}
		if !found {
			t.Fatal("Нет подтверждённого навыка")
		}
		for _, secret := range []string{"secret@example.test", "+79998887766", "telegram-secret", `"email"`, `"phone"`, `"user_id"`, `"attempt_id"`, `"grading_spec"`, `"summary"`} {
			if strings.Contains(w.Body.String(), secret) {
				t.Fatalf("Утечка %s: %s", secret, w.Body)
			}
		}
	}
	// Неодобренный навык не должен попадать в подробную карточку.
	f.exec(t, `UPDATE skills SET active=false WHERE id=$1`, goSkill)
	w := f.request(t, "GET", base+id, "owner", "", 200)
	var d entity.Details
	if err := json.Unmarshal(w.Body.Bytes(), &d); err != nil {
		t.Fatal(err)
	}
	for _, sk := range d.Skills {
		if sk.ID == goSkill {
			t.Fatal("Архивный навык раскрыт")
		}
	}
	w = f.request(t, "GET", base+f.profiles["other_candidate"], "owner", "", 200)
	if err := json.Unmarshal(w.Body.Bytes(), &d); err != nil {
		t.Fatal(err)
	}
	if d.Category != nil || d.Assessment != nil || d.GradeStatus != "unconfirmed" || len(d.Skills) != 0 || len(d.Experience) != 0 || len(d.Education) != 0 {
		t.Fatalf("Неверная пустая карточка: %s", w.Body)
	}
	for _, key := range []string{`"skills":[]`, `"experience":[]`, `"education":[]`, `"assessment":null`} {
		if !strings.Contains(w.Body.String(), key) {
			t.Fatal("Пустые разделы должны иметь стабильный формат")
		}
	}
	f.request(t, "GET", base+id, "outsider", "", 404)
	f.request(t, "GET", base+id, "candidate", "", 403)
	f.request(t, "GET", base+id, "", "", 401)
	f.exec(t, `UPDATE company_members SET status='inactive' WHERE company_id=$1 AND user_id=$2`, f.company, f.ids["viewer"])
	f.request(t, "GET", base+id, "viewer", "", 404)
	f.exec(t, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1 AND kind='publication'`, f.ids["candidate"])
	f.request(t, "GET", base+id, "owner", "", 404)
	f.exec(t, `UPDATE candidate_consents SET revoked_at=NULL WHERE user_id=$1 AND kind='publication'`, f.ids["candidate"])
	f.exec(t, `UPDATE candidate_consents SET revoked_at=clock_timestamp() WHERE user_id=$1 AND kind='processing'`, f.ids["candidate"])
	f.request(t, "GET", base+id, "owner", "", 404)
}
