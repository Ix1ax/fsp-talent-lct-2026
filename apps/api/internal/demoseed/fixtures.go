package demoseed

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"strings"

	"github.com/go-pdf/fpdf"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/files"
)

func fixture(f files.File) ([]byte, error) {
	switch f.Purpose {
	case "company_document":
		pdf := fpdf.New("P", "mm", "A4", "")
		pdf.AddPage()
		pdf.SetFont("Arial", "B", 20)
		pdf.Cell(0, 15, "FSP Scout - jury demonstration")
		pdf.Ln(20)
		pdf.SetFont("Arial", "", 12)
		pdf.MultiCell(0, 8, "SYNTHETIC DOCUMENT. Not an official certificate.\nCompany: Demo Scout Technologies\nFixture: "+f.ObjectKey+"\nPrepared solely for testing document downloads and company verification.", "", "L", false)
		var b bytes.Buffer
		err := pdf.Output(&b)
		return b.Bytes(), err
	case "company_logo", files.PurposeCandidateAvatar:
		img := image.NewRGBA(image.Rect(0, 0, 256, 256))
		for y := 0; y < 256; y++ {
			for x := 0; x < 256; x++ {
				c := color.RGBA{71, 35, 255, 255}
				if (x-128)*(x-128)+(y-128)*(y-128) < 70*70 {
					c = color.RGBA{245, 245, 249, 255}
				}
				if f.Purpose == files.PurposeCandidateAvatar && (x-128)*(x-128)+(y-100)*(y-100) < 30*30 {
					c = color.RGBA{71, 35, 255, 255}
				}
				img.SetRGBA(x, y, c)
			}
		}
		var b bytes.Buffer
		err := png.Encode(&b, img)
		return b.Bytes(), err
	case files.PurposeCompanyTask:
		return []byte("# Демонстрационное задание\n\n" + f.OriginalName + "\n\nРеализуйте на Go HTTP API списка кандидатов.\n\n- GET /candidates: пагинация limit/offset и фильтр по городу.\n- Валидация параметров и обработка ошибок.\n- Кеширование запросов с TTL.\n- Тесты успешных запросов, неверных параметров и пустого списка.\n\nПриложите Markdown или ZIP с решением и пояснением. Все данные задания вымышлены.\n"), nil
	case files.PurposeTaskSolution:
		return []byte("# Демонстрационное решение\n\n" + f.OriginalName + "\n\nИспользованы Go, PostgreSQL и Redis. Пагинация стабильна по created_at и id.\nВходные параметры валидируются, кеш имеет TTL, ошибки возвращаются в едином формате.\n\n```go\nfunc validLimit(limit int) bool { return limit > 0 && limit <= 100 }\n```\n\nТестовые сценарии: пустой список, две страницы, неверный limit, недоступный кеш.\nЭто синтетический пример для просмотра, скачивания и оценки решения.\n"), nil
	default:
		return nil, fmt.Errorf("неизвестный демо-файл: %s", strings.TrimPrefix(f.ObjectKey, "demo/jury-v1/"))
	}
}
