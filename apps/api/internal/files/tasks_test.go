package files

import (
	"archive/zip"
	"bytes"
	"errors"
	"strings"
	"testing"
)

func taskZip(t *testing.T, name string, data []byte) []byte {
	t.Helper()
	var out bytes.Buffer
	z := zip.NewWriter(&out)
	w, err := z.Create(name)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = w.Write(data); err != nil {
		t.Fatal(err)
	}
	if err = z.Close(); err != nil {
		t.Fatal(err)
	}
	return out.Bytes()
}
func TestPrepareTaskFiles(t *testing.T) {
	archive := taskZip(t, "main.go", []byte("package main"))
	oversized := taskZip(t, "large.txt", bytes.Repeat([]byte("a"), 101<<20))
	for _, purpose := range []string{PurposeCompanyTask, PurposeTaskSolution} {
		for _, tc := range []struct {
			name string
			data []byte
			want error
		}{
			{"task.md", []byte("# Задание\nРеализуйте API"), nil}, {"answer.txt", []byte("Ответ на вопрос"), nil},
			{"solution.zip", archive, nil}, {"task.pdf", []byte("%PDF-1.7\n%%EOF"), nil},
			{"fake.zip", []byte("PK\x03\x04broken"), ErrInvalid}, {"evil.txt", []byte("<html>test</html>"), ErrTaskType},
			{"fake.md", []byte{0xff, 0xfe, 0x41, 0x00}, ErrTaskType}, {"run.exe", []byte("plain text"), ErrTaskType},
			{"huge.zip", oversized, ErrInvalid},
		} {
			f, err := Prepare(tc.name, purpose, tc.data)
			if !errors.Is(err, tc.want) {
				t.Fatalf("%s %s: %v ожидали %v", purpose, tc.name, err, tc.want)
			}
			if err == nil && (!strings.HasPrefix(f.ObjectKey, "tasks/") || f.Purpose != purpose) {
				t.Fatalf("Неверные метаданные: %+v", f)
			}
		}
	}
	// Новые типы файлов разрешены только для заданий/решений.
	if _, err := Prepare("archive.zip", "company_document", archive); !errors.Is(err, ErrType) {
		t.Fatal(err)
	}
	if _, err := Prepare("answer.md", PurposeCandidateAvatar, []byte("Ответ")); !errors.Is(err, ErrType) {
		t.Fatal(err)
	}
}
