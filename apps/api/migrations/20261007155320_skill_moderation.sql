-- +goose Up

ALTER TABLE skills
    ADD COLUMN merged_into uuid REFERENCES skills (id),
    ADD COLUMN moderated_by uuid REFERENCES admin_accounts (id) ON DELETE SET NULL,
    ADD COLUMN moderated_at timestamptz,
    ADD COLUMN moderation_reason text CHECK (length(moderation_reason) BETWEEN 1 AND 1000),
    ADD CONSTRAINT skills_merge_target_check
        CHECK ((moderation_status = 'merged') = (merged_into IS NOT NULL) AND merged_into IS DISTINCT FROM id);

CREATE INDEX skills_merged_into_idx ON skills (merged_into) WHERE merged_into IS NOT NULL;

ALTER TABLE admin_catalog_events DROP CONSTRAINT admin_catalog_events_action_check;
ALTER TABLE admin_catalog_events
    ADD CONSTRAINT admin_catalog_events_action_check
        CHECK (action IN ('created', 'updated', 'deleted', 'approved', 'rejected', 'merged')),
    ADD COLUMN details jsonb NOT NULL DEFAULT '{}';

-- +goose Down

-- Новые события не выбрасываем: при откате сохраняем их как изменение справочника.
UPDATE admin_catalog_events SET action = 'updated' WHERE action IN ('approved', 'rejected', 'merged');
ALTER TABLE admin_catalog_events DROP CONSTRAINT admin_catalog_events_action_check;
ALTER TABLE admin_catalog_events
    ADD CONSTRAINT admin_catalog_events_action_check CHECK (action IN ('created', 'updated', 'deleted')),
    DROP COLUMN details;

DROP INDEX skills_merged_into_idx;
ALTER TABLE skills
    DROP CONSTRAINT skills_merge_target_check,
    DROP COLUMN moderation_reason,
    DROP COLUMN moderated_at,
    DROP COLUMN moderated_by,
    DROP COLUMN merged_into;
