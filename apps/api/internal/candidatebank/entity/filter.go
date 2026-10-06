package entity

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// Filter объединяет условия через И. Несколько форматов работы означают любой из выбранных.
type Filter struct {
	Limit, Offset                            int
	WorkFormatIDs                            []int16
	ExperienceMinMonths, ExperienceMaxMonths *int
	SalaryMaxRUB                             *int64
}

func ParseFilter(raw string) (Filter, error) {
	f := Filter{Limit: 20}
	q, err := url.ParseQuery(raw)
	if err != nil {
		return f, fmt.Errorf("Некорректная строка параметров")
	}
	allowed := map[string]bool{"limit": true, "offset": true, "work_format_ids": true, "experience_min_months": true, "experience_max_months": true, "salary_max_rub": true}
	for key, values := range q {
		if !allowed[key] {
			return f, fmt.Errorf("Неизвестный параметр: %s", key)
		}
		if len(values) != 1 || values[0] == "" {
			return f, fmt.Errorf("Параметр %s должен иметь одно непустое значение", key)
		}
	}
	for _, p := range []struct {
		name     string
		min, max int64
	}{{"limit", 1, 100}, {"offset", 0, 10000}, {"experience_min_months", 0, 600}, {"experience_max_months", 0, 600}, {"salary_max_rub", 0, 1000000000}} {
		if v, ok := q[p.name]; ok {
			n, e := strconv.ParseInt(v[0], 10, 64)
			if e != nil || n < p.min || n > p.max {
				return f, fmt.Errorf("Некорректный параметр %s", p.name)
			}
			i := int(n)
			switch p.name {
			case "limit":
				f.Limit = i
			case "offset":
				f.Offset = i
			case "experience_min_months":
				f.ExperienceMinMonths = &i
			case "experience_max_months":
				f.ExperienceMaxMonths = &i
			case "salary_max_rub":
				f.SalaryMaxRUB = &n
			}
		}
	}
	if f.ExperienceMinMonths != nil && f.ExperienceMaxMonths != nil && *f.ExperienceMinMonths > *f.ExperienceMaxMonths {
		return f, fmt.Errorf("Минимальный стаж не должен превышать максимальный")
	}
	if v, ok := q["work_format_ids"]; ok {
		parts := strings.Split(v[0], ",")
		if len(parts) > 10 {
			return f, fmt.Errorf("Допустимо до 10 форматов работы")
		}
		seen := map[int16]bool{}
		for _, part := range parts {
			n, e := strconv.ParseInt(part, 10, 16)
			if e != nil || n <= 0 || seen[int16(n)] {
				return f, fmt.Errorf("Форматы работы должны быть уникальными положительными ID")
			}
			seen[int16(n)] = true
			f.WorkFormatIDs = append(f.WorkFormatIDs, int16(n))
		}
	}
	return f, nil
}

// ValidationError означает некорректное значение справочника в фильтре.
type ValidationError struct{ Message string }

func (e *ValidationError) Error() string { return e.Message }
