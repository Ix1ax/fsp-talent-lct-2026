package registry

import (
	"context"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/fsp/entity"
	"reflect"
	"strconv"
	"testing"
)

func TestMockIdentityAndScenarios(t *testing.T) {
	seen := map[string]bool{}
	ids := map[string]bool{}
	for i := 0; i < 40; i++ {
		identity := entity.Identity{Issuer: "https://issuer.test", Subject: strconv.Itoa(i)}
		a, err := (Mock{}).Lookup(context.Background(), identity)
		if err != nil {
			t.Fatal(err)
		}
		b, err := (Mock{}).Lookup(context.Background(), identity)
		if err != nil || !reflect.DeepEqual(a, b) {
			t.Fatal("Mock нестабилен")
		}
		if ids[a.ParticipantID] {
			t.Fatal("Разные аккаунты получили одинаковую привязку")
		}
		ids[a.ParticipantID] = true
		if len(a.Items) == 0 {
			seen["empty"] = true
		} else if a.Items[0].Place == nil {
			seen["participation"] = true
		} else {
			seen["prize"] = true
		}
	}
	if len(seen) != 3 {
		t.Fatal("Нет всех демонстрационных сценариев")
	}
	if _, err := (Mock{}).Lookup(context.Background(), entity.Identity{}); err == nil {
		t.Fatal("Принята пустая идентичность")
	}
}
