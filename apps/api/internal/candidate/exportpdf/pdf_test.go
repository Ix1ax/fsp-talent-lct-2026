package exportpdf

import (
	"bytes"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/candidate/entity"
	"github.com/ledongthuc/pdf"
	"os"
	"strings"
	"testing"
)

func TestResumePDFUnicodeAndPagination(t *testing.T) {
	summary := "Разрабатываю сервисы на Go и PostgreSQL. Работал над поиском кандидатов и интеграциями."
	p := entity.FullProfile{Profile: &entity.Profile{ProfileInput: entity.ProfileInput{Summary: &summary, SearchStatus: "open", ExperienceMonths: 36}}, Contacts: &entity.Contacts{ContactsInput: entity.ContactsInput{FullName: "Иван Петров", Email: "ivan@example.test"}}, Category: &entity.Category{Specialization: "Бэкенд", Grade: "Middle"}, Onboarding: entity.Onboarding{Survey: &entity.Survey{SurveyInput: entity.SurveyInput{Industry: "Информационные технологии", SoftSkills: []string{"Работа в команде"}}}}}
	data, err := Render(p)
	if err != nil || !bytes.HasPrefix(data, []byte("%PDF-")) {
		t.Fatal(err)
	}
	reader, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		t.Fatal(err)
	}
	text, err := reader.GetPlainText()
	if err != nil {
		t.Fatal(err)
	}
	var out bytes.Buffer
	out.ReadFrom(text)
	if !strings.Contains(out.String(), "Middle") {
		t.Fatal("Потерян текст PDF", out.String())
	}
	if path := os.Getenv("TEST_PDF_OUTPUT"); path != "" {
		if err = os.WriteFile(path, data, 0600); err != nil {
			t.Fatal(err)
		}
	}
	summary = strings.Repeat("Большое описание опыта и выполненных проектов. ", 250)
	data, err = Render(p)
	if err != nil {
		t.Fatal(err)
	}
	reader, err = pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil || reader.NumPage() < 2 {
		t.Fatal("Длинный текст не перенесён на страницы", err)
	}
}
