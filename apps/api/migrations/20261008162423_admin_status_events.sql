-- +goose Up
CREATE TABLE admin_status_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES admin_accounts(id),
    admin_id uuid NOT NULL REFERENCES admin_accounts(id),
    old_status varchar(16) NOT NULL CHECK (old_status IN ('active','blocked')),
    new_status varchar(16) NOT NULL CHECK (new_status IN ('active','blocked')),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX admin_status_events_target_idx ON admin_status_events(admin_id,created_at DESC);

-- +goose Down
DROP TABLE admin_status_events;
