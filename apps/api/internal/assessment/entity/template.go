package entity

import (
	"math"
	"time"
)

type BlueprintRow struct {
	SkillID       string  `json:"skill_id"`
	Difficulty    int16   `json:"difficulty"`
	QuestionCount int     `json:"question_count"`
	Weight        float64 `json:"weight"`
}

type TemplateInput struct {
	SpecializationID int16          `json:"specialization_id"`
	GradeID          int16          `json:"grade_id"`
	TimeLimitSec     int            `json:"time_limit_sec"`
	PassScore        float64        `json:"pass_score"`
	Blueprint        []BlueprintRow `json:"blueprint"`
}

// BlueprintRowView — строка состава в ответе: добавлены название навыка и число доступных заданий.
type BlueprintRowView struct {
	BlueprintRow
	SkillName string `json:"skill_name"`
	Available int    `json:"available"`
}

type Template struct {
	ID               string             `json:"id"`
	SpecializationID int16              `json:"specialization_id"`
	GradeID          int16              `json:"grade_id"`
	Version          int                `json:"version"`
	TimeLimitSec     int                `json:"time_limit_sec"`
	PassScore        float64            `json:"pass_score"`
	Status           string             `json:"status"`
	CreatedAt        time.Time          `json:"created_at"`
	PublishedAt      *time.Time         `json:"published_at"`
	Blueprint        []BlueprintRowView `json:"blueprint"`
}

type TemplateFilter struct {
	SpecializationID, GradeID int16
	Status                    string
	Limit, Offset             int
}

type TemplatePage struct {
	Items  []Template `json:"items"`
	Total  int64      `json:"total"`
	Limit  int        `json:"limit"`
	Offset int        `json:"offset"`
}

func twoDecimals(v float64) bool { return math.Abs(v*100-math.Round(v*100)) < 1e-6 }

func (in *TemplateInput) Normalize() error {
	if in.SpecializationID <= 0 || in.GradeID <= 0 {
		return invalid("Выберите специализацию и грейд из справочника")
	}
	if in.TimeLimitSec < 300 || in.TimeLimitSec > 14400 {
		return invalid("Время на тест (time_limit_sec) должно быть от 300 до 14400 секунд")
	}
	if math.IsNaN(in.PassScore) || in.PassScore < 1 || in.PassScore > 100 || !twoDecimals(in.PassScore) {
		return invalid("Проходной балл (pass_score) должен быть от 1 до 100 процентов, не более двух знаков после запятой")
	}
	if len(in.Blueprint) < 1 || len(in.Blueprint) > 30 {
		return invalid("В составе (blueprint) должно быть от 1 до 30 строк")
	}
	seen := map[string]bool{}
	for i := range in.Blueprint {
		row := &in.Blueprint[i]
		id, err := NormalizeID(row.SkillID)
		if err != nil {
			return invalid("Укажите корректный UUID навыка в строке состава")
		}
		row.SkillID = id
		if row.Difficulty < 1 || row.Difficulty > 5 {
			return invalid("Сложность в строке состава должна быть от 1 до 5")
		}
		if row.QuestionCount < 1 || row.QuestionCount > 50 {
			return invalid("Количество заданий в строке состава должно быть от 1 до 50")
		}
		if math.IsNaN(row.Weight) || row.Weight < 0.01 || row.Weight > 100 || !twoDecimals(row.Weight) {
			return invalid("Вес строки состава должен быть от 0.01 до 100, не более двух знаков после запятой")
		}
		key := row.SkillID + "/" + string(rune('0'+row.Difficulty))
		if seen[key] {
			return invalid("Пара навык и сложность в составе не должна повторяться")
		}
		seen[key] = true
	}
	return nil
}

func (f *TemplateFilter) Normalize() error {
	skill, difficulty, kind := "", int16(0), ""
	if f.SpecializationID < 0 || f.GradeID < 0 {
		return invalid("Некорректные специализация или грейд в фильтре")
	}
	return normalizeFilter(&skill, difficulty, kind, f.Status, &f.Limit, &f.Offset)
}
