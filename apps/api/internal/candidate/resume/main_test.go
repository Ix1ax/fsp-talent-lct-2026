package resume

import (
	"os"
	"testing"
)

// Тесты изоляции запускают этот же тестовый бинарник как дочерний процесс разбора.
func TestMain(m *testing.M) {
	if IsChild() {
		RunChild()
		return
	}
	os.Exit(m.Run())
}
