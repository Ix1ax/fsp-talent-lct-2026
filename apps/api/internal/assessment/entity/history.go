package entity

import (
	"net/url"
	"strconv"
	"time"
)

type HistoryItem struct {
	ID               string       `json:"id"`
	Status           string       `json:"status"`
	SpecializationID int16        `json:"specialization_id"`
	GradeID          int16        `json:"grade_id"`
	StartedAt        time.Time    `json:"started_at"`
	FinishedAt       *time.Time   `json:"finished_at"`
	ScorePercent     *float64     `json:"score_percent"`
	Category         *CategoryRef `json:"category"`
}
type HistoryPage struct {
	Items  []HistoryItem `json:"items"`
	Total  int64         `json:"total"`
	Limit  int           `json:"limit"`
	Offset int           `json:"offset"`
}

func ParseHistoryQuery(raw string) (int, int, error) {
	q, err := url.ParseQuery(raw)
	if err != nil {
		return 0, 0, invalid("Некорректная строка параметров")
	}
	limit, offset := 20, 0
	for key, values := range q {
		if (key != "limit" && key != "offset") || len(values) != 1 || values[0] == "" {
			return 0, 0, invalid("История принимает только один limit и offset")
		}
		n, e := strconv.Atoi(values[0])
		if e != nil {
			return 0, 0, invalid("Параметры истории должны быть целыми числами")
		}
		if key == "limit" {
			limit = n
		} else {
			offset = n
		}
	}
	if limit < 1 || limit > 100 || offset < 0 || offset > 10000 {
		return 0, 0, invalid("limit: 1–100, offset: 0–10000")
	}
	return limit, offset, nil
}
