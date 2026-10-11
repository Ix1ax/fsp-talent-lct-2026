package entity

import "testing"

func TestPreviewIdempotencyKeyValidation(t *testing.T) {
	for _, key := range []string{"", "preview-2026:one", "0123456789abcdef"} {
		if err := NormalizePreviewKey(key); err != nil {
			t.Fatalf("%q: %v", key, err)
		}
	}
	for _, key := range []string{" has-space", "has space", "trailing ", "line\nbreak", "ключ", string(make([]byte, 129))} {
		if err := NormalizePreviewKey(key); err == nil {
			t.Fatalf("принят ключ %q", key)
		}
	}
}
