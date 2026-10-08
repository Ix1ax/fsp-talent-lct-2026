// Пакет exportpdf строит стандартное резюме из разрешённого снимка профиля, без сетевых запросов.
package exportpdf

import (
	"bytes"
	_ "embed"
	"fmt"
	"strings"
	"unicode"

	"github.com/go-pdf/fpdf"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
)

//go:embed fonts/NotoSans-Regular.ttf
var regular []byte

//go:embed fonts/NotoSans-Bold.ttf
var bold []byte

func clean(s string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsControl(r) && r != '\n' {
			return ' '
		}
		return r
	}, s)
}
func ptr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func Render(p entity.FullProfile) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 18, 20)
	pdf.SetAutoPageBreak(true, 20)
	pdf.AddUTF8FontFromBytes("Noto", "", regular)
	pdf.AddUTF8FontFromBytes("Noto", "B", bold)
	pdf.SetTitle("Резюме кандидата ФСП", true)
	pdf.SetFooterFunc(func() {
		pdf.SetY(-13)
		pdf.SetFont("Noto", "", 8)
		pdf.SetTextColor(100, 110, 125)
		pdf.CellFormat(0, 5, fmt.Sprintf("ФСП · Профиль кандидата · %d", pdf.PageNo()), "", 0, "C", false, 0, "")
	})
	pdf.AddPage()
	heading := func(title string) {
		if pdf.GetY() > 255 {
			pdf.AddPage()
		}
		pdf.Ln(4)
		pdf.SetFont("Noto", "B", 12)
		pdf.SetTextColor(30, 70, 120)
		pdf.MultiCell(0, 7, title, "", "L", false)
		pdf.SetTextColor(25, 35, 50)
		pdf.SetFont("Noto", "", 10)
	}
	line := func(text string) {
		if text != "" {
			pdf.MultiCell(0, 5.5, clean(text), "", "L", false)
		}
	}
	pdf.SetFont("Noto", "B", 20)
	pdf.SetTextColor(25, 35, 50)
	name := "Профиль кандидата"
	if p.Contacts != nil {
		name = p.Contacts.FullName
	}
	pdf.MultiCell(0, 10, clean(name), "", "L", false)
	pdf.SetFont("Noto", "", 11)
	if p.Profile != nil {
		line(ptr(p.Profile.Headline))
		parts := []string{}
		if p.Profile.City != nil {
			parts = append(parts, *p.Profile.City)
		}
		if p.Profile.Timezone != nil {
			parts = append(parts, *p.Profile.Timezone)
		}
		line(strings.Join(parts, " · "))
	}
	if p.Contacts != nil {
		heading("Контакты")
		line(p.Contacts.Email)
		line(ptr(p.Contacts.Phone))
		if p.Contacts.Telegram != nil {
			line("Telegram: @" + *p.Contacts.Telegram)
		}
	}
	heading("Квалификация")
	if p.Category != nil {
		line(p.Category.Specialization + " · " + p.Category.Grade + " — подтверждено тестом")
	} else {
		line("Грейд пока не подтверждён тестом")
	}
	if p.Onboarding.Survey != nil {
		line("Отрасль: " + p.Onboarding.Survey.Industry)
	}
	if p.Profile != nil {
		heading("О себе")
		line(ptr(p.Profile.Summary))
		heading("Условия работы")
		line(strings.Join(p.WorkFormatNames, ", "))
		line(fmt.Sprintf("Стаж: %d месяцев", p.Profile.ExperienceMonths))
		if p.Profile.SalaryMinRUB != nil {
			line(fmt.Sprintf("Ожидания: от %d ₽ в месяц", *p.Profile.SalaryMinRUB))
		}
		status := map[string]string{"open": "Ищу работу", "passive": "Рассматриваю предложения", "hidden": "Профиль скрыт"}
		line(status[p.Profile.SearchStatus])
	}
	if len(p.Skills) > 0 {
		heading("Навыки")
		for _, s := range p.Skills {
			label := map[string]string{"test": "подтверждён тестом", "claimed": "самооценка", "fsp": "реестр ФСП"}[s.Source]
			if s.ModerationStatus == "pending" {
				label += "; ожидает модерации"
			}
			line(s.Name + " · " + label)
		}
	}
	if p.Onboarding.Survey != nil && len(p.Onboarding.Survey.SoftSkills) > 0 {
		heading("Софт-скиллы · самооценка")
		line(strings.Join(p.Onboarding.Survey.SoftSkills, ", "))
	}
	if len(p.Experience) > 0 {
		heading("Опыт работы")
		for _, e := range p.Experience {
			end := "по настоящее время"
			if e.EndedOn != nil {
				end = e.EndedOn.String()
			}
			line(e.Position + " · " + e.Company)
			line(e.StartedOn.String() + " — " + end)
			line(e.Description)
			pdf.Ln(3)
		}
	}
	if len(p.Education) > 0 {
		heading("Образование")
		for _, e := range p.Education {
			line(fmt.Sprintf("%s · %d", e.Institution, e.GraduationYear))
			line(e.Specialty)
		}
	}
	if len(p.Achievements) > 0 {
		heading("Достижения ФСП")
		for _, a := range p.Achievements {
			line(a.EventName + " · " + a.OccurredOn)
			line(a.Discipline + " · " + a.Result)
			if a.Source == "fsp_mock" {
				line("Тестовые данные реестра ФСП")
			}
		}
	}
	var out bytes.Buffer
	if err := pdf.Output(&out); err != nil {
		return nil, err
	}
	return out.Bytes(), nil
}
