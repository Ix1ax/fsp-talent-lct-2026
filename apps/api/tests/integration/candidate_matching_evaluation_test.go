//go:build integration

package integration

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"reflect"
	"strings"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidatebank/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/httpapi"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/testutil"
)

type matchingEvaluation struct {
	Candidates []struct {
		Code, Specialization, Grade, Format string
		Score                               float64
		Salary                              int64
		Published, Tested                   bool
		Go, SQL                             string
	}
	Scenarios []struct {
		Code, Grade string
		GoRequired  bool `json:"go_required"`
		SQLRequired bool `json:"sql_required"`
		Expected    []string
		Scores      []float64
	}
}

// Исходные данные и ожидаемый порядок заданы отдельно от алгоритма.
// Это проверка подборки на синтетических результатах, а не измерение качества экзамена.
func TestCandidateMatchingEvaluation(t *testing.T) {
	data, err := os.ReadFile("testdata/candidate_matching.json")
	if err != nil {
		t.Fatal(err)
	}
	var sample matchingEvaluation
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err = decoder.Decode(&sample); err != nil {
		t.Fatal(err)
	}
	if len(sample.Candidates) == 0 || len(sample.Scenarios) == 0 {
		t.Fatal("Набор оценки не должен быть пустым")
	}
	f := newOfferFixture(t)
	// Профили общей фикстуры не относятся к демонстрационному набору.
	f.exec(t, `DELETE FROM candidate_profiles WHERE user_id IN ($1,$2)`, f.ids["candidate"], f.ids["other_candidate"])

	old := f.auth.Store.Users
	f.auth = testutil.NewAuthEnvWithOptions(t, httpapi.Options{CandidateBank: service.New(repository.New(f.db))})
	f.auth.Store.Users = old
	for who := range f.tokens {
		f.tokens[who] = f.auth.Token(t, who)
	}
	ctx := context.Background()
	names := map[string]string{}
	templates := map[string]string{}
	for _, c := range sample.Candidates {
		var user, profile string
		if err = f.db.QueryRow(ctx, `INSERT INTO users(role,status) VALUES('candidate','active') RETURNING id::text`).Scan(&user); err != nil {
			t.Fatal(err)
		}
		if err = f.db.QueryRow(ctx, `INSERT INTO candidate_profiles(user_id,search_status,salary_min_rub) VALUES($1,'open',$2) RETURNING id::text`, user, c.Salary).Scan(&profile); err != nil {
			t.Fatal(err)
		}
		names[profile] = c.Code
		grantConsentRows(t, f.db, user, "processing")
		if c.Published {
			grantConsentRows(t, f.db, user, "publication")
		}
		f.exec(t, `INSERT INTO candidate_work_formats(candidate_id,work_format_id) SELECT $1,id FROM work_formats WHERE code=$2`, profile, c.Format)
		spec, grade := pairIDs(t, f.db, c.Specialization, c.Grade)
		var attempt string
		if c.Tested {
			key := c.Specialization + "/" + c.Grade
			template := templates[key]
			if template == "" {
				if err = f.db.QueryRow(ctx, `INSERT INTO assessment_templates(specialization_id,grade_id,version,time_limit_sec,pass_score,status) VALUES($1,$2,100,1800,60,'draft') RETURNING id::text`, spec, grade).Scan(&template); err != nil {
					t.Fatal(err)
				}
				templates[key] = template
			}
			if err = f.db.QueryRow(ctx, `INSERT INTO assessment_attempts(candidate_id,template_id,specialization_id,grade_id,status,deadline_at,finished_at,time_limit_sec,pass_score,score_percent)
 VALUES($1,$2,$3,$4,'passed',clock_timestamp()+interval '30 minutes',clock_timestamp(),1800,60,$5) RETURNING id::text`, profile, template, spec, grade, c.Score).Scan(&attempt); err != nil {
				t.Fatal(err)
			}
			f.exec(t, `INSERT INTO candidate_categories(candidate_id,specialization_id,grade_id,attempt_id) VALUES($1,$2,$3,$4)`, profile, spec, grade, attempt)
		}
		for code, source := range map[string]string{"go": c.Go, "sql": c.SQL} {
			if source == "missing" {
				continue
			}
			if source != "test" && source != "claimed" {
				t.Fatalf("Неизвестный источник %q", source)
			}
			var skill string
			if err = f.db.QueryRow(ctx, `SELECT id::text FROM skills WHERE code=$1`, code).Scan(&skill); err != nil {
				t.Fatal(err)
			}
			f.exec(t, `INSERT INTO candidate_skills(candidate_id,skill_id,claimed_level) VALUES($1,$2,3)`, profile, skill)
			if source == "test" {
				if attempt == "" {
					t.Fatal("Подтверждение навыка требует результата теста")
				}
				f.exec(t, `INSERT INTO skill_evidence(candidate_id,skill_id,source,level,attempt_id) VALUES($1,$2,'test',4,$3)`, profile, skill, attempt)
			}
		}
	}
	for _, scenario := range sample.Scenarios {
		if len(scenario.Expected) != len(scenario.Scores) {
			t.Fatalf("Неверное ожидание %s", scenario.Code)
		}
		t.Run(scenario.Code, func(t *testing.T) {
			var need string
			var grade *int16
			spec, _ := pairIDs(t, f.db, "backend", "junior")
			if scenario.Grade != "" {
				_, id := pairIDs(t, f.db, "backend", scenario.Grade)
				grade = &id
			}
			if err := f.db.QueryRow(ctx, `INSERT INTO employer_needs(company_id,created_by,specialization_id,grade_id,title,description,status,salary_to_rub)
 VALUES($1,$2,$3,$4,'Go-разработчик','Демонстрационная потребность','active',200000) RETURNING id::text`, f.company, f.ids["owner"], spec, grade).Scan(&need); err != nil {
				t.Fatal(err)
			}
			f.exec(t, `INSERT INTO need_work_formats(need_id,work_format_id) SELECT $1,id FROM work_formats WHERE code='remote'`, need)
			f.exec(t, `INSERT INTO need_skills(need_id,skill_id,required,weight) SELECT $1,id,$2,3 FROM skills WHERE code='go'`, need, scenario.GoRequired)
			f.exec(t, `INSERT INTO need_skills(need_id,skill_id,required,weight) SELECT $1,id,$2,1 FROM skills WHERE code='sql'`, need, scenario.SQLRequired)
			path := fmt.Sprintf("/api/v1/companies/%s/needs/%s/candidates", f.company, need)
			response := f.request(t, "GET", path, "owner", "", 200)
			if response.Header().Get("Cache-Control") != "private, no-store" {
				t.Fatal("Подборку нельзя кэшировать")
			}
			var page entity.RecommendationPage
			if err := json.Unmarshal(response.Body.Bytes(), &page); err != nil {
				t.Fatal(err)
			}
			actual := []string{}
			scores := []float64{}
			for _, item := range page.Items {
				actual = append(actual, names[item.ID])
				if item.SkillMatchScore == nil {
					t.Fatal("Оценка стека отсутствует")
				}
				scores = append(scores, *item.SkillMatchScore)
				if item.Category.SpecializationID != spec || grade != nil && item.Category.GradeID != *grade {
					t.Fatal("В выдаче чужая категория")
				}
				for _, skill := range item.Skills {
					if skill.Source == "claimed" && skill.VerifiedLevel != nil {
						t.Fatal("Самооценка выдана за тест")
					}
					if skill.Required && skill.Source == "missing" {
						t.Fatal("Отсутствует обязательный навык")
					}
				}
				if len(item.Reasons) == 0 {
					t.Fatal("Нет объяснения подборки")
				}
				if grade == nil && strings.Contains(strings.Join(item.Reasons, " "), "подтверждённый грейд") {
					t.Fatal("Заявлено совпадение неуказанного грейда")
				}
			}
			if !reflect.DeepEqual(actual, scenario.Expected) || !reflect.DeepEqual(scores, scenario.Scores) || page.Total != int64(len(scenario.Expected)) {
				t.Fatalf("Ожидали %v (%v), получили %v (%v), total=%d", scenario.Expected, scenario.Scores, actual, scores, page.Total)
			}
			if page.MatchingMode != "qualification_and_conditions" || !reflect.DeepEqual(page.UnassessedCriteria, []string{"fsp_achievements"}) {
				t.Fatal("Неверно описаны критерии")
			}
			f.request(t, "GET", path, "outsider", "", 404)
			for offset, want := range scenario.Expected {
				w := f.request(t, "GET", fmt.Sprintf("%s?limit=1&offset=%d", path, offset), "viewer", "", 200)
				var part entity.RecommendationPage
				if err := json.Unmarshal(w.Body.Bytes(), &part); err != nil {
					t.Fatal(err)
				}
				if part.Total != page.Total || len(part.Items) != 1 || names[part.Items[0].ID] != want {
					t.Fatal("Пагинация изменила порядок или total")
				}
			}
			t.Logf("Ожидание совпало с выдачей: %v; покрытие стека: %v; total=%d", actual, scores, page.Total)
		})
	}
}
