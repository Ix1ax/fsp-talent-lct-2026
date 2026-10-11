//go:build integration

package integration

import (
	"context"
	"errors"
	"strconv"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/entity"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/repository"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/admincatalog/service"
	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/catalog"
)

func TestAdminCatalogStore(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	var actor string
	if err := db.QueryRow(ctx, `SELECT id::text FROM admin_accounts WHERE role='superadmin'`).Scan(&actor); err != nil {
		t.Fatal(err)
	}
	svc := service.New(repository.New(db))
	rank := int16(5)
	inputs := map[string]entity.CreateInput{
		"specializations": {Code: "design", Name: "Дизайн"},
		"skills":          {Code: "figma", Name: "Figma", Aliases: []string{"Фигма"}},
		"grades":          {Code: "lead", Name: "Lead", Rank: &rank},
		"work_formats":    {Code: "flexible", Name: "Гибкий формат"},
	}
	for kind, in := range inputs {
		item, err := svc.Create(ctx, actor, kind, in)
		if err != nil {
			t.Fatalf("%s: %v", kind, err)
		}
		if kind != "skills" {
			id, _ := strconv.Atoi(item.ID)
			if id <= 3 {
				t.Fatalf("ID пересёкся с исходными записями: %s", item.ID)
			}
		}
		if _, err = svc.Create(ctx, actor, kind, in); !errors.Is(err, entity.ErrConflict) {
			t.Fatalf("Дубликат %s: %v", kind, err)
		}
		items, total, err := svc.List(ctx, actor, kind, in.Name, 100, 0)
		if err != nil || len(items) != 1 || total != 1 {
			t.Fatalf("Список %s: %+v total %d %v", kind, items, total, err)
		}
		newName := "Новое название"
		update := entity.UpdateInput{Name: &newName}
		if kind == "skills" || kind == "specializations" {
			active := false
			update.Active = &active
		}
		if kind == "skills" {
			update.Aliases = []string{}
		}
		changed, err := svc.Update(ctx, actor, kind, item.ID, update)
		if err != nil {
			t.Fatal(err)
		}
		if changed.Code != in.Code || changed.Name != *update.Name {
			t.Fatalf("Изменился стабильный код: %+v", changed)
		}
		if kind == "grades" && (changed.Rank == nil || *changed.Rank != rank) {
			t.Fatal("Изменился порядок грейда")
		}
		if kind == "skills" {
			if len(changed.Aliases) != 0 {
				t.Fatal("Не очистились альтернативные названия")
			}
			public := catalog.NewService(catalog.NewRepository(db))
			visible, _, err := public.Skills(ctx, "figma", 100, 0)
			if err != nil || len(visible) != 0 {
				t.Fatal("Отключённый навык остался доступен в публичном поиске", err)
			}
		}
	}
	if _, _, err := svc.List(ctx, actor, "skills", "%", 100, 0); err != nil {
		t.Fatal(err)
	}
	var staff string
	if err := db.QueryRow(ctx, `INSERT INTO admin_accounts(email,password_hash,role) VALUES('catalog-admin@example.test','test-hash','admin') RETURNING id::text`).Scan(&staff); err != nil {
		t.Fatal(err)
	}
	if _, _, err := svc.List(ctx, staff, "grades", "", 100, 0); err != nil {
		t.Fatal("Обычному админу закрыт справочник", err)
	}
	if _, err := db.Exec(ctx, `UPDATE admin_accounts SET status='blocked' WHERE id=$1`, staff); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Create(ctx, staff, "skills", entity.CreateInput{Code: "blocked", Name: "Не создавать"}); !errors.Is(err, entity.ErrForbidden) {
		t.Fatal("Заблокированный админ изменил справочник", err)
	}
	if _, err := svc.Update(ctx, actor, "skills", "00000000-0000-4000-8000-999999999999", entity.UpdateInput{Active: new(bool)}); !errors.Is(err, entity.ErrNotFound) {
		t.Fatal(err)
	}
}
