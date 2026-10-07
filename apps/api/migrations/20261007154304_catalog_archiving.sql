-- +goose Up

-- Архивирование скрывает значения из нового выбора, но не удаляет существующие связи.
ALTER TABLE grades ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE work_formats ADD COLUMN active boolean NOT NULL DEFAULT true;

-- Админские аккаунты отделены от users, поэтому для их действий используется отдельный журнал.
CREATE TABLE admin_catalog_events (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    uuid         REFERENCES admin_accounts (id) ON DELETE SET NULL,
    action      varchar(16)  NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
    catalog     varchar(32)  NOT NULL CHECK (catalog IN ('specializations', 'skills', 'grades', 'work_formats')),
    item_id     text         NOT NULL,
    created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX admin_catalog_events_item_idx
    ON admin_catalog_events (catalog, item_id, created_at DESC);

-- +goose Down

DROP TABLE admin_catalog_events;
ALTER TABLE work_formats DROP COLUMN active;
ALTER TABLE grades DROP COLUMN active;
