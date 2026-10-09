package entity

import (
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5/pgtype"
)

type Filter struct {
	Limit, Offset                  int
	CompanyID, TaskID, CandidateID *string
	SpecializationID, GradeID      *int16
	Query, Status, Sort            string
	PublishedFrom, PublishedTo     *string
	Submitted                      *bool
}

func ParseFilter(raw string, submissions, company bool) (Filter, error) {
	f := Filter{Limit: 20, Status: "all", Sort: "newest"}
	q, err := url.ParseQuery(raw)
	if err != nil {
		return f, &ValidationError{"Некорректная строка параметров"}
	}
	allowed := map[string]bool{"limit": true, "offset": true, "status": true, "company_id": true}
	if submissions {
		allowed["task_id"], allowed["sort"] = true, true
		if company {
			allowed["candidate_id"] = true
		}
	} else {
		for _, name := range []string{"specialization_id", "grade_id", "q", "published_from", "published_to"} {
			allowed[name] = true
		}
	}
	if !submissions && !company {
		allowed["submitted"] = true
	}
	for k, v := range q {
		if !allowed[k] || len(v) != 1 || v[0] == "" {
			return f, &ValidationError{"Неизвестный, пустой или повторный параметр: " + k}
		}
	}
	for _, p := range []struct {
		name string
		max  int
	}{{"limit", 100}, {"offset", 10000}} {
		if v := q.Get(p.name); v != "" {
			n, e := strconv.Atoi(v)
			min := 0
			if p.name == "limit" {
				min = 1
			}
			if e != nil || n < min || n > p.max {
				return f, &ValidationError{"Некорректный параметр " + p.name}
			}
			if p.name == "limit" {
				f.Limit = n
			} else {
				f.Offset = n
			}
		}
	}
	for name, dst := range map[string]**string{"company_id": &f.CompanyID, "task_id": &f.TaskID, "candidate_id": &f.CandidateID} {
		if v := q.Get(name); v != "" {
			var id pgtype.UUID
			if id.Scan(v) != nil || !id.Valid {
				return f, &ValidationError{"Некорректный UUID: " + name}
			}
			v = id.String()
			*dst = &v
		}
	}
	for name, dst := range map[string]**int16{"specialization_id": &f.SpecializationID, "grade_id": &f.GradeID} {
		if v := q.Get(name); v != "" {
			n, e := strconv.ParseInt(v, 10, 16)
			if e != nil || n <= 0 {
				return f, &ValidationError{"Некорректный ID: " + name}
			}
			id := int16(n)
			*dst = &id
		}
	}
	if v := q.Get("status"); v != "" {
		if submissions && v != "all" && v != "submitted" && v != "reviewed" || !submissions && v != "all" && v != "open" && v != "closed" {
			return f, &ValidationError{"Некорректный status"}
		}
		f.Status = v
	}
	if v := q.Get("sort"); v != "" {
		if v != "newest" && v != "score" {
			return f, &ValidationError{"sort должен быть newest или score"}
		}
		f.Sort = v
	}
	f.Query = strings.TrimSpace(q.Get("q"))
	if !utf8.ValidString(f.Query) || strings.ContainsRune(f.Query, 0) || utf8.RuneCountInString(f.Query) > 200 {
		return f, &ValidationError{"Поиск должен содержать не более 200 символов"}
	}
	for name, dst := range map[string]**string{"published_from": &f.PublishedFrom, "published_to": &f.PublishedTo} {
		if v := q.Get(name); v != "" {
			if _, err := time.Parse("2006-01-02", v); err != nil {
				return f, &ValidationError{"Дата должна быть в формате YYYY-MM-DD: " + name}
			}
			*dst = &v
		}
	}
	if f.PublishedFrom != nil && f.PublishedTo != nil && *f.PublishedFrom > *f.PublishedTo {
		return f, &ValidationError{"Начальная дата позже конечной"}
	}
	if v := q.Get("submitted"); v != "" {
		if v != "true" && v != "false" {
			return f, &ValidationError{"submitted должен быть true или false"}
		}
		b := v == "true"
		f.Submitted = &b
	}
	return f, nil
}
