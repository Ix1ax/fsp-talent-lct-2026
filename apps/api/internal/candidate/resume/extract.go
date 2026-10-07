// Пакет resume разбирает PDF-резюме в черновик профиля. Он не зависит от HTTP и PostgreSQL.
package resume

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"math"
	"sort"
	"strings"

	"github.com/ledongthuc/pdf"
)

// maxFragments — предел числа символов (глифов) во всём документе: у настоящего резюме их тысячи, сотни тысяч уже не резюме.
const maxFragments = 200000

var (
	ErrNotPDF       = errors.New("файл не является PDF")
	ErrTooManyPages = errors.New("в файле слишком много страниц")
	ErrNoText       = errors.New("в файле нет текстового слоя")
)

// BrokenError — PDF не удалось прочитать (повреждён, зашифрован или библиотека упала).
type BrokenError struct{ Err error }

func (e *BrokenError) Error() string {
	return "не удалось прочитать PDF: " + e.Err.Error()
}
func (e *BrokenError) Unwrap() error { return e.Err }

// Line — сегмент текста на странице. X — левая граница, Y — высота над нижним краем страницы (выше значит выше на странице),
// Size — размер шрифта. Одна визуальная строка делится на несколько Line, если между фрагментами большой зазор:
// так колонки и «чипы» навыков не склеиваются.
type Line struct {
	Page       int
	X, Y, Size float64
	Text       string
}

type fragment struct {
	x, y, w, size float64
	text          string
}

// readFragments читает фрагменты текста по страницам. Переменная нужна, чтобы подменить чтение в тесте на панику.
var readFragments = defaultReadFragments

func defaultReadFragments(data []byte, maxPages int) ([][]fragment, error) {
	rd, err := pdf.NewReader(bytes.NewReader(data), int64(len(data)))
	if err != nil {
		return nil, &BrokenError{Err: err}
	}
	if rd.NumPage() > maxPages {
		return nil, ErrTooManyPages
	}
	pages := make([][]fragment, 0, rd.NumPage())
	total := 0
	for i := 1; i <= rd.NumPage(); i++ {
		page := rd.Page(i)
		var frags []fragment
		if !page.V.IsNull() {
			for _, t := range page.Content().Text {
				// Библиотека не знает ширин многих кириллических глифов (W=0) и не двигает X внутри слова: настоящими остаются
				// начала отдельных блоков текста. Поэтому ширину не додумываем: зазор между блоками считается от известной ширины.
				text := strings.ReplaceAll(t.S, "\ufffd", "")
				if text == "" {
					continue
				}
				frags = append(frags, fragment{x: t.X, y: t.Y, w: math.Max(t.W, 0), size: t.FontSize, text: text})
			}
			total += len(frags)
			if total > maxFragments {
				return nil, &BrokenError{Err: errors.New("в документе слишком много текста")}
			}
		}
		pages = append(pages, frags)
	}
	return pages, nil
}

func safeRead(data []byte, maxPages int) (pages [][]fragment, err error) {
	defer func() {
		if rec := recover(); rec != nil {
			pages, err = nil, &BrokenError{Err: fmt.Errorf("внутренняя ошибка разбора: %v", rec)}
		}
	}()
	return readFragments(data, maxPages)
}

// ExtractLines читает PDF целиком в память (размер ограничивает вызывающий) и возвращает строки в порядке чтения:
// страницы по порядку, сверху вниз, слева направо. Колонтитулы «Резюме обновлено …» отбрасываются.
func ExtractLines(r io.ReaderAt, size int64, maxPages int) ([]Line, error) {
	head := make([]byte, 5)
	if size < 8 {
		return nil, ErrNotPDF
	}
	if _, err := r.ReadAt(head, 0); err != nil || string(head) != "%PDF-" {
		return nil, ErrNotPDF
	}
	data := make([]byte, size)
	if n, err := r.ReadAt(data, 0); int64(n) != size && err != nil {
		return nil, &BrokenError{Err: err}
	}
	pages, err := safeRead(data, maxPages)
	if err != nil {
		return nil, err
	}
	var lines []Line
	for i, frags := range pages {
		lines = append(lines, pageLines(i+1, frags)...)
	}
	if len(lines) == 0 {
		return nil, ErrNoText
	}
	return lines, nil
}

func pageLines(page int, frags []fragment) []Line {
	sort.SliceStable(frags, func(i, j int) bool {
		if frags[i].y != frags[j].y {
			return frags[i].y > frags[j].y
		}
		return frags[i].x < frags[j].x
	})
	var lines []Line
	var footerY []float64
	for i := 0; i < len(frags); {
		// Группа: фрагменты одной визуальной строки (допуск по вертикали — половина размера шрифта).
		j := i + 1
		for j < len(frags) && math.Abs(frags[j].y-frags[i].y) <= 0.5*maxFloat(frags[i].size, 1) {
			j++
		}
		group := append([]fragment(nil), frags[i:j]...)
		sort.SliceStable(group, func(a, b int) bool { return group[a].x < group[b].x })
		for _, seg := range segments(group) {
			text := strings.TrimSpace(seg.text)
			if text == "" {
				continue
			}
			if strings.Contains(text, "Резюме обновлено") {
				footerY = append(footerY, seg.y)
				continue
			}
			lines = append(lines, Line{Page: page, X: seg.x, Y: seg.y, Size: seg.size, Text: text})
		}
		i = j
	}
	// Сегменты колонтитула могут быть разорваны: убираем всё на его высоте.
	if len(footerY) > 0 {
		kept := lines[:0]
		for _, l := range lines {
			drop := false
			for _, y := range footerY {
				if math.Abs(l.Y-y) <= 0.5*maxFloat(l.Size, 1) {
					drop = true
				}
			}
			if !drop {
				kept = append(kept, l)
			}
		}
		lines = kept
	}
	return lines
}

type segment struct {
	x, y, size float64
	text       string
}

// cleanText убирает управляющие символы (кроме перевода строки): табуляция превращается в пробел.
func cleanText(s string) string {
	if !strings.ContainsFunc(s, func(r rune) bool { return r < 0x20 || r == 0x7f }) {
		return s
	}
	return strings.Map(func(r rune) rune {
		switch {
		case r == '\n':
			return r
		case r == '\t':
			return ' '
		case r < 0x20 || r == 0x7f:
			return -1
		}
		return r
	}, s)
}

// segments делит строку на сегменты по зазорам шире размера шрифта; внутри сегмента фрагменты склеиваются,
// с пробелом при заметном зазоре. Склейка линейная: текст копится в strings.Builder.
func segments(group []fragment) []segment {
	type open struct {
		segment
		b    strings.Builder
		last byte
	}
	var opened []*open
	var cur *open
	var end float64
	for _, f := range group {
		text := cleanText(f.text)
		if text == "" {
			continue
		}
		gap := f.x - end
		if cur == nil || gap > 1.0*maxFloat(f.size, 1) {
			cur = &open{segment: segment{x: f.x, y: f.y, size: f.size}}
			opened = append(opened, cur)
		} else {
			if gap > 0.15*maxFloat(f.size, 1) && cur.last != ' ' && text[0] != ' ' {
				cur.b.WriteByte(' ')
			}
			cur.size = maxFloat(cur.size, f.size)
		}
		cur.b.WriteString(text)
		cur.last = text[len(text)-1]
		end = f.x + f.w
	}
	out := make([]segment, len(opened))
	for i, o := range opened {
		out[i] = o.segment
		out[i].text = o.b.String()
	}
	return out
}

func maxFloat(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}
