//go:build integration

package integration

import (
	"context"
	"testing"

	"github.com/ix1ax/lct-fsp-hackaton-2026/apps/api/internal/audit"
)

func TestAuditRecord(t *testing.T) {
	db := testDB(t)
	ctx := context.Background()
	var user string
	if err := db.QueryRow(ctx, `INSERT INTO users(role) VALUES('candidate') RETURNING id::text`).Scan(&user); err != nil {
		t.Fatal(err)
	}
	entity := user
	tx, err := db.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err = audit.Record(ctx, tx, audit.Event{ActorUserID: &user, Action: "consent.granted", EntityType: "candidate_consents", EntityID: &entity, Metadata: map[string]any{"kind": "processing", "policy_version": "v1"}}); err != nil {
		t.Fatal(err)
	}
	if err = audit.Record(ctx, tx, audit.Event{Action: "test.empty", EntityType: "test"}); err != nil {
		t.Fatal(err)
	}
	if err = tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	var actor, action, kind string
	if err = db.QueryRow(ctx, `SELECT actor_user_id::text, action, metadata->>'kind' FROM audit_events WHERE action='consent.granted'`).Scan(&actor, &action, &kind); err != nil || actor != user || kind != "processing" {
		t.Fatalf("запись журнала: actor=%q kind=%q (%v)", actor, kind, err)
	}
	var metadata string
	if err = db.QueryRow(ctx, `SELECT metadata::text FROM audit_events WHERE action='test.empty'`).Scan(&metadata); err != nil || metadata != "{}" {
		t.Fatalf("пустые метаданные: %q (%v)", metadata, err)
	}
	// Запись живёт в транзакции вызывающего: при откате исчезает.
	tx, err = db.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if err = audit.Record(ctx, tx, audit.Event{Action: "test.rollback", EntityType: "test"}); err != nil {
		t.Fatal(err)
	}
	if err = tx.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	var count int
	if err = db.QueryRow(ctx, `SELECT count(*) FROM audit_events WHERE action='test.rollback'`).Scan(&count); err != nil || count != 0 {
		t.Fatalf("откат не убрал запись: %d (%v)", count, err)
	}
}
