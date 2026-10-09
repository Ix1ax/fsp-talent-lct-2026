package entity

import (
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

// Filter хранит только параметры из закрытого списка каждой сущности.
type Filter struct {
	Limit, Offset                                   int
	Query, Status, Role, Source, Action, EntityType string
	CompanyID, CandidateID, ActorID, EntityID       *string
	SpecializationID, GradeID                       *int16
	From, To                                        *time.Time
}

func ParseFilter(raw, kind string) (Filter, error) {
	f := Filter{Limit: 20, Status: "all"}
	q, err := url.ParseQuery(raw)
	if err != nil {
		return f, &ValidationError{"Некорректные параметры запроса"}
	}
	allowed := map[string]bool{"limit": true, "offset": true}
	var statuses []string
	switch kind {
	case "companies":
		statuses = []string{"all", "unverified", "pending", "verified", "rejected"}
		allowed["q"] = true
	case "users":
		statuses = []string{"all", "active", "blocked", "deleted"}
		allowed["role"] = true
	case "needs":
		statuses = []string{"all", "draft", "active", "archived"}
		for _, key := range []string{"q", "company_id", "specialization_id", "grade_id"} {
			allowed[key] = true
		}
	case "offers":
		statuses = []string{"all", "sent", "viewed", "accepted", "rejected"}
		allowed["company_id"], allowed["candidate_id"] = true, true
	case "tasks":
		statuses = []string{"all", "published", "hidden"}
		for _, key := range []string{"q", "company_id", "specialization_id", "grade_id"} {
			allowed[key] = true
		}
	case "attempts":
		statuses = []string{"all", "active", "passed", "failed", "expired"}
		for _, key := range []string{"candidate_id", "specialization_id", "grade_id"} {
			allowed[key] = true
		}
	case "audit":
		for _, key := range []string{"source", "action", "entity_type", "entity_id", "actor_id", "from", "to"} {
			allowed[key] = true
		}
	case "members", "files":
	default:
		return f, &ValidationError{"Неизвестный тип списка"}
	}
	if len(statuses) > 0 {
		allowed["status"] = true
	}
	for key, values := range q {
		if !allowed[key] || len(values) != 1 || values[0] == "" {
			return f, &ValidationError{"Неизвестный, повторный или пустой параметр: " + key}
		}
	}
	for _, key := range []string{"limit", "offset"} {
		if value := q.Get(key); value != "" {
			v, e := strconv.Atoi(value)
			min, max := 0, 10000
			if key == "limit" {
				min, max = 1, 100
			}
			if e != nil || v < min || v > max {
				return f, &ValidationError{"Некорректный " + key}
			}
			if key == "limit" {
				f.Limit = v
			} else {
				f.Offset = v
			}
		}
	}
	if value := q.Get("status"); value != "" {
		found := false
		for _, v := range statuses {
			if v == value {
				found = true
			}
		}
		if !found {
			return f, &ValidationError{"Некорректный status"}
		}
		f.Status = value
	}
	f.Query = strings.TrimSpace(q.Get("q"))
	if !utf8.ValidString(f.Query) || strings.ContainsRune(f.Query, 0) || utf8.RuneCountInString(f.Query) > 200 {
		return f, &ValidationError{"q должен содержать до 200 символов"}
	}
	f.Role = q.Get("role")
	if f.Role != "" && f.Role != "candidate" && f.Role != "employer" && f.Role != "admin" {
		return f, &ValidationError{"Некорректная роль"}
	}
	for name, dst := range map[string]**string{"company_id": &f.CompanyID, "candidate_id": &f.CandidateID, "actor_id": &f.ActorID} {
		if v := q.Get(name); v != "" {
			id, e := ID(v)
			if e != nil {
				return f, e
			}
			*dst = &id
		}
	}
	for name, dst := range map[string]**int16{"specialization_id": &f.SpecializationID, "grade_id": &f.GradeID} {
		if v := q.Get(name); v != "" {
			n, e := strconv.ParseInt(v, 10, 16)
			if e != nil || n <= 0 {
				return f, &ValidationError{"Некорректный " + name}
			}
			id := int16(n)
			*dst = &id
		}
	}
	f.Source = q.Get("source")
	if f.Source != "" && f.Source != "operations" && f.Source != "catalogs" && f.Source != "assessments" && f.Source != "admins" && f.Source != "activity" {
		return f, &ValidationError{"Некорректный source"}
	}
	if v := q.Get("entity_id"); v != "" {
		if !utf8.ValidString(v) || strings.ContainsRune(v, 0) || len(v) > 128 {
			return f, &ValidationError{"Некорректный entity_id"}
		}
		f.EntityID = &v
	}
	f.Action, f.EntityType = q.Get("action"), q.Get("entity_type")
	for _, v := range []string{f.Action, f.EntityType} {
		if !utf8.ValidString(v) || strings.ContainsRune(v, 0) || utf8.RuneCountInString(v) > 64 {
			return f, &ValidationError{"action и entity_type должны содержать до 64 символов"}
		}
	}
	for name, dst := range map[string]**time.Time{"from": &f.From, "to": &f.To} {
		if v := q.Get(name); v != "" {
			at, e := time.Parse(time.RFC3339Nano, v)
			if e != nil {
				return f, &ValidationError{"Дата должна иметь формат RFC3339: " + name}
			}
			*dst = &at
		}
	}
	if f.From != nil && f.To != nil && f.From.After(*f.To) {
		return f, &ValidationError{"from позже to"}
	}
	return f, nil
}
