package resume

import (
	"bytes"
	"compress/zlib"
	"context"
	"errors"
	"fmt"
	"runtime"
	"strings"
	"testing"
	"time"
)

// buildPDF собирает минимальный корректный PDF с таблицей xref из тел объектов (нумерация с 1).
func buildPDF(objects ...string) []byte {
	var b bytes.Buffer
	b.WriteString("%PDF-1.4\n")
	offsets := make([]int, 0, len(objects))
	for i, o := range objects {
		offsets = append(offsets, b.Len())
		fmt.Fprintf(&b, "%d 0 obj\n%s\nendobj\n", i+1, o)
	}
	xref := b.Len()
	fmt.Fprintf(&b, "xref\n0 %d\n0000000000 65535 f \n", len(objects)+1)
	for _, off := range offsets {
		fmt.Fprintf(&b, "%010d 00000 n \n", off)
	}
	fmt.Fprintf(&b, "trailer\n<</Size %d/Root 1 0 R>>\nstartxref\n%d\n%%%%EOF\n", len(objects)+1, xref)
	return b.Bytes()
}

// cyclicPDF — дерево страниц ссылается само на себя: библиотека зацикливается при чтении страницы.
func cyclicPDF() []byte {
	return buildPDF(`<</Type/Catalog/Pages 2 0 R>>`, `<</Type/Pages/Count 1/Kids[2 0 R]>>`)
}

// bombPDF — небольшой файл, поток которого после распаковки занимает десятки мегабайт операторов вывода текста.
func bombPDF(t *testing.T, decompressed int) []byte {
	t.Helper()
	var packed bytes.Buffer
	zw := zlib.NewWriter(&packed)
	if _, err := zw.Write([]byte("BT /F1 12 Tf 10 10 Td\n")); err != nil {
		t.Fatal(err)
	}
	// Один оператор вывода на 6 байт: десятки мегабайт дают миллионы глифов.
	chunk := []byte(strings.Repeat("(a)Tj\n", 10000))
	for written := 0; written < decompressed; written += len(chunk) {
		if _, err := zw.Write(chunk); err != nil {
			t.Fatal(err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	stream := fmt.Sprintf("<</Length %d/Filter/FlateDecode>>\nstream\n%s\nendstream", packed.Len(), packed.String())
	return buildPDF(
		`<</Type/Catalog/Pages 2 0 R>>`,
		`<</Type/Pages/Count 1/Kids[3 0 R]>>`,
		`<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>`,
		stream,
		`<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>`,
	)
}

func TestParseIsolatedFixture(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	draft, warnings, err := ParseIsolated(ctx, readFixture(t, "resume_hh.pdf"), 10, testNow)
	if err != nil {
		t.Fatal(err)
	}
	if len(warnings) != 0 || s(draft.Headline) != "Backend разработчик (Go)" || s(draft.City) != "Тверь" {
		t.Fatalf("должность и город: %s %s %v", s(draft.Headline), s(draft.City), warnings)
	}
	if len(draft.Experience) != 2 || draft.Experience[0].StartedOn.String() != "2022-11" || draft.Experience[0].EndedOn != nil ||
		draft.Experience[1].EndedOn == nil || draft.Experience[1].EndedOn.String() != "2022-10" {
		t.Fatalf("опыт через дочерний процесс: %+v", draft.Experience)
	}
	if len(draft.Education) != 2 || len(draft.Skills) != 7 || len(draft.Languages) != 2 || draft.Contacts == nil || s(draft.Contacts.Email) != "ivan.ivanov@example.test" {
		t.Fatalf("образование %d, навыки %d, языки %d, контакты %+v", len(draft.Education), len(draft.Skills), len(draft.Languages), draft.Contacts)
	}
}

func TestParseIsolatedErrors(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	fixture := readFixture(t, "resume_hh.pdf")
	var broken *BrokenError
	if _, _, err := ParseIsolated(ctx, []byte("это не PDF"), 10, testNow); !errors.Is(err, ErrNotPDF) {
		t.Errorf("не PDF: %v", err)
	}
	if _, _, err := ParseIsolated(ctx, readFixture(t, "blank.pdf"), 10, testNow); !errors.Is(err, ErrNoText) {
		t.Errorf("пустой PDF: %v", err)
	}
	if _, _, err := ParseIsolated(ctx, fixture[:len(fixture)/2], 10, testNow); !errors.As(err, &broken) {
		t.Errorf("обрезанный файл: %v", err)
	}
	if _, _, err := ParseIsolated(ctx, fixture, 2, testNow); !errors.Is(err, ErrTooManyPages) {
		t.Errorf("слишком много страниц: %v", err)
	}
}

// Файл, на котором библиотека зацикливается, не должен держать процессор: дочерний процесс убивается по таймауту.
func TestParseIsolatedKillsHungParser(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	started := time.Now()
	_, _, err := ParseIsolated(ctx, cyclicPDF(), 10, testNow)
	if !errors.Is(err, ErrParseTimeout) {
		t.Fatalf("ожидали ErrParseTimeout: %v", err)
	}
	if elapsed := time.Since(started); elapsed > 5*time.Second {
		t.Fatalf("возврат занял %v", elapsed)
	}
}

// «Бомба»: маленький файл, который после распаковки превращается в гигабайты данных. Дочерний процесс завершается
// сторожем памяти, а сам сервер память не набирает.
func TestParseIsolatedSurvivesMemoryBomb(t *testing.T) {
	bomb := bombPDF(t, 24<<20)
	if len(bomb) > 5<<20 {
		t.Fatalf("бомба больше лимита файла: %d", len(bomb))
	}
	// Под детектором гонок дочерний процесс заметно медленнее: сторож памяти может не успеть, и тогда разбор убьёт таймаут.
	// В обоих случаях возврат ограничен таймаутом, а память сервера не растёт.
	ctx, cancel := context.WithTimeout(context.Background(), 6*time.Second)
	defer cancel()
	started := time.Now()
	var before, after runtime.MemStats
	runtime.ReadMemStats(&before)
	_, _, err := ParseIsolated(ctx, bomb, 10, testNow)
	runtime.ReadMemStats(&after)
	var broken *BrokenError
	if !errors.As(err, &broken) && !errors.Is(err, ErrParseTimeout) {
		t.Fatalf("бомба должна давать ошибку разбора: %v", err)
	}
	if elapsed := time.Since(started); elapsed > 9*time.Second {
		t.Fatalf("возврат занял %v при таймауте 6с", elapsed)
	}
	if after.HeapAlloc > before.HeapAlloc+256<<20 {
		t.Fatalf("процесс сервера набрал память: %d МиБ", (after.HeapAlloc-before.HeapAlloc)>>20)
	}
}
