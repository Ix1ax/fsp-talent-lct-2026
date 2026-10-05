package files

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/png"
	"strings"
	"testing"
)

func TestPrepare(t *testing.T) {
	img := image.NewRGBA(image.Rect(0, 0, 2, 2))
	img.Set(0, 0, color.White)
	var pngData bytes.Buffer
	if err := png.Encode(&pngData, img); err != nil {
		t.Fatal(err)
	}
	for _, tt := range []struct {
		name, purpose string
		data          []byte
		want          error
	}{
		{"договор.pdf", "company_document", []byte("%PDF-1.7\n%%EOF"), nil},
		{"лого.png", "company_logo", pngData.Bytes(), nil},
		{"evil.png", "company_logo", []byte("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), ErrType},
		{"empty.pdf", "company_document", nil, ErrInvalid},
		{"doc.pdf", "company_logo", []byte("%PDF-1.7"), ErrType},
		{"x.pdf", "avatar", []byte("%PDF-1.7"), ErrInvalid},
		{"large.pdf", "company_document", bytes.Repeat([]byte("a"), MaxSize+1), ErrSize},
		{"large.png", "company_logo", bytes.Repeat([]byte("a"), MaxLogoSize+1), ErrSize},
		{"broken.png", "company_document", pngData.Bytes()[:33], ErrInvalid},
	} {
		t.Run(tt.name+tt.purpose, func(t *testing.T) {
			_, err := Prepare(tt.name, tt.purpose, tt.data)
			if !errors.Is(err, tt.want) {
				t.Fatalf("ожидали %v, получили %v", tt.want, err)
			}
		})
	}
	first, err := Prepare("../../договор.pdf", "company_document", []byte("%PDF-1.7"))
	if err != nil {
		t.Fatal(err)
	}
	second, err := Prepare("../../договор.pdf", "company_document", []byte("%PDF-1.7"))
	if err != nil {
		t.Fatal(err)
	}
	if first.OriginalName != "договор.pdf" || first.ObjectKey == second.ObjectKey || strings.Contains(first.ObjectKey, "договор") || len(first.ChecksumSHA256) != 64 {
		t.Fatalf("небезопасные метаданные: %+v", first)
	}
}
