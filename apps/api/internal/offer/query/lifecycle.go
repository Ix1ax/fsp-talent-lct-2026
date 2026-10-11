// Package query содержит общие SQL-выражения жизненного цикла предложения.
package query

import (
	"fmt"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/offer/entity"
)

// Alias и now — SQL-фрагменты из кода, никогда не пользовательские параметры.
func Expired(alias, now string) string {
	return fmt.Sprintf("(%s.status IN ('sent','viewed') AND %s.created_at <= %s - interval '%d hours')", alias, alias, now, int(entity.Lifetime.Hours()))
}

func Status(alias, now string) string {
	return "CASE WHEN " + Expired(alias, now) + " THEN 'expired' ELSE " + alias + ".status END"
}
