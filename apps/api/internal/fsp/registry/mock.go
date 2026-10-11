// Пакет registry содержит сменный адаптер реестра. Здесь только синтетические данные хакатона.
package registry

import (
	"context"
	"crypto/sha256"
	"encoding/hex"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/entity"
)

type Mock struct{}

// Lookup не принимает произвольный ID: участник определяется проверенной сервером идентичностью.
// Это демосвязь, а не подтверждение принадлежности реального аккаунта ФСП.
func (Mock) Lookup(ctx context.Context, identity entity.Identity) (entity.Record, error) {
	if err := ctx.Err(); err != nil {
		return entity.Record{}, err
	}
	if identity.Issuer == "" || identity.Subject == "" {
		return entity.Record{}, entity.ErrForbidden
	}
	sum := sha256.Sum256([]byte(identity.Issuer + "\x00" + identity.Subject))
	record := entity.Record{ParticipantID: "mock-" + hex.EncodeToString(sum[:]), Source: "fsp_mock", Items: []entity.Achievement{}}
	switch sum[0] % 3 {
	case 0:
		place := 1
		record.Items = append(record.Items, entity.Achievement{ID: "demo-prize", EventID: "demo-championship-2026", EventName: "Тестовый чемпионат по спортивному программированию", Discipline: "Алгоритмическое программирование", OccurredOn: "2026-09-01", Result: "Первое место", Place: &place, Source: record.Source})
	case 1:
		record.Items = append(record.Items, entity.Achievement{ID: "demo-participation", EventID: "demo-cup-2026", EventName: "Тестовый кубок по спортивному программированию", Discipline: "Программирование систем информационной безопасности", OccurredOn: "2026-09-10", Result: "Участие", Source: record.Source})
	}
	return record, nil
}
